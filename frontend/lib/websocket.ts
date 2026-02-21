type MessageHandler = (data: any) => void;

class GrieflyWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    // Cancel any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close existing connection cleanly
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.intentionalClose = true;
      this.ws.close();
    }

    this.intentionalClose = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handlers = this.handlers.get(data.type) || [];
        handlers.forEach((handler) => handler(data));
        const anyHandlers = this.handlers.get("*") || [];
        anyHandlers.forEach((handler) => handler(data));
      } catch (e) {
        console.error("[WS] Message parse error:", e);
      }
    };

    this.ws.onclose = () => {
      if (this.intentionalClose) {
        console.log("[WS] Closed intentionally");
        return;
      }
      console.log("[WS] Disconnected, reconnecting in 2s...");
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    const handlers = this.handlers.get(type) || [];
    this.handlers.set(type, handlers.filter((h) => h !== handler));
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WS] Sending:", data.type);
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("[WS] Not connected, readyState:", this.ws?.readyState, "— retrying in 500ms");
      // Queue and retry once after connection
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log("[WS] Retry send:", data.type);
          this.ws.send(JSON.stringify(data));
        } else {
          console.error("[WS] Still not connected, message dropped:", data);
        }
      }, 500);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.intentionalClose = true;
    this.ws?.close();
  }
}

let instance: GrieflyWebSocket | null = null;

export function getWebSocket(): GrieflyWebSocket {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_BACKEND_WS || "ws://localhost:8000/ws";
    instance = new GrieflyWebSocket(url);
  }
  return instance;
}
