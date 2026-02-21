type MessageHandler = (data: any) => void;

// #region agent log
function _dbg(location: string, message: string, data: Record<string, any> = {}, hypothesis = "") {
  fetch('http://127.0.0.1:7428/ingest/837bf3f5-162e-4382-8587-0ded3961c63b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8d6127'},body:JSON.stringify({sessionId:'8d6127',location,message,data,timestamp:Date.now(),hypothesisId:hypothesis})}).catch(()=>{});
}
// #endregion

class GrieflyWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private connectGeneration = 0;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Bump generation so stale onclose handlers become no-ops
    const generation = ++this.connectGeneration;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
    }

    // #region agent log
    _dbg("websocket.ts:connect", "Creating new WebSocket", { url: this.url, generation }, "H1");
    // #endregion
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      if (generation !== this.connectGeneration) return;
      console.log("[WS] Connected");
      // #region agent log
      _dbg("websocket.ts:onopen", "WS opened", { generation }, "H1");
      // #endregion
    };

    this.ws.onmessage = (event) => {
      if (generation !== this.connectGeneration) return;
      try {
        const data = JSON.parse(event.data);
        // #region agent log
        _dbg("websocket.ts:onmessage", "Received message", { type: data.type, keys: Object.keys(data) }, "H5");
        // #endregion
        const handlers = this.handlers.get(data.type) || [];
        handlers.forEach((handler) => handler(data));
        const anyHandlers = this.handlers.get("*") || [];
        anyHandlers.forEach((handler) => handler(data));
      } catch (e) {
        console.error("[WS] Message parse error:", e);
      }
    };

    this.ws.onclose = (event) => {
      // Stale WS — ignore its close event entirely
      if (generation !== this.connectGeneration) return;

      // #region agent log
      _dbg("websocket.ts:onclose", "WS closed", { code: event.code, reason: event.reason, wasClean: event.wasClean, intentional: this.intentionalClose, generation }, "H1");
      // #endregion
      if (this.intentionalClose) {
        console.log("[WS] Closed intentionally");
        return;
      }
      console.log("[WS] Disconnected, reconnecting in 2s...");
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (error) => {
      if (generation !== this.connectGeneration) return;
      // #region agent log
      _dbg("websocket.ts:onerror", "WS error event", { generation }, "H1");
      // #endregion
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
    // #region agent log
    _dbg("websocket.ts:send", "Attempting send", { type: data.type, readyState: this.ws?.readyState }, "H5");
    // #endregion
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WS] Sending:", data.type);
      this.ws.send(JSON.stringify(data));
      // #region agent log
      _dbg("websocket.ts:send", "Sent successfully", { type: data.type }, "H5");
      // #endregion
    } else {
      console.warn("[WS] Not connected, readyState:", this.ws?.readyState, "— retrying in 500ms");
      // #region agent log
      _dbg("websocket.ts:send", "NOT connected, will retry", { readyState: this.ws?.readyState }, "H5");
      // #endregion
      setTimeout(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log("[WS] Retry send:", data.type);
          this.ws.send(JSON.stringify(data));
          // #region agent log
          _dbg("websocket.ts:send", "Retry send OK", { type: data.type }, "H5");
          // #endregion
        } else {
          console.error("[WS] Still not connected, message dropped:", data);
          // #region agent log
          _dbg("websocket.ts:send", "MESSAGE DROPPED", { type: data.type, readyState: this.ws?.readyState }, "H5");
          // #endregion
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
    ++this.connectGeneration;
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
