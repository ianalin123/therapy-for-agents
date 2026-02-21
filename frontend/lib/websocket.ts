import { WS_RECONNECT_DELAY_MS } from "./constants";

type MessageHandler = (data: any) => void;

class GrieflyWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private connectGeneration = 0;
  private url: string;
  private sessionId: string;
  private messageQueue: any[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, sessionId: string = "default") {
    this.url = url;
    this.sessionId = sessionId;
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const generation = ++this.connectGeneration;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
    }

    const sep = this.url.includes("?") ? "&" : "?";
    this.ws = new WebSocket(`${this.url}${sep}session=${this.sessionId}`);

    this.ws.onopen = () => {
      if (generation !== this.connectGeneration) return;
      console.log("[WS] Connected");
      this.flushQueue();
    };

    this.ws.onmessage = (event) => {
      if (generation !== this.connectGeneration) return;
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

    this.ws.onclose = (event) => {
      if (generation !== this.connectGeneration) return;
      if (this.intentionalClose) {
        console.log("[WS] Closed intentionally");
        return;
      }
      console.log("[WS] Disconnected, reconnecting in 2s...");
      this.reconnectTimer = setTimeout(() => this.connect(), WS_RECONNECT_DELAY_MS);
    };

    this.ws.onerror = (error) => {
      if (generation !== this.connectGeneration) return;
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
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushQueue();
    }, 500);
  }

  private flushQueue() {
    if (this.ws?.readyState !== WebSocket.OPEN || this.messageQueue.length === 0) {
      if (this.messageQueue.length > 0) {
        this.scheduleFlush();
      }
      return;
    }
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.messageQueue = [];
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
