// Mock realtime socket. Mimics a tiny subset of socket.io's emitter API so we
// can swap in a real `io()` client later without changing consumers.
//
// We intentionally do NOT open a network connection — the app should run
// stand-alone for demos. The interface stays compatible with socket.io-client.

type Handler = (payload: unknown) => void;

class MockSocket {
  private handlers = new Map<string, Set<Handler>>();
  public connected = true;
  public id = "mock-" + Math.random().toString(36).slice(2, 8);

  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return this;
  }
  off(event: string, fn?: Handler) {
    if (!fn) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(fn);
    return this;
  }
  emit(event: string, payload?: unknown) {
    this.handlers.get(event)?.forEach((fn) => fn(payload));
    return this;
  }
  disconnect() {
    this.connected = false;
    this.handlers.clear();
  }
}

export const socket = new MockSocket();

export const SocketEvents = {
  PodFailed: "pod:failed",
  PodRecovered: "pod:recovered",
  NodePressure: "node:pressure",
  MetricsTick: "metrics:tick",
  IncidentCreated: "incident:created",
  IncidentUpdated: "incident:updated",
  AIAction: "ai:action",
} as const;
