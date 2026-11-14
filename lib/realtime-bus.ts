// Real-time Event Bus using BroadcastChannel and window events for 0ms cross-tab and in-tab sync

export type RealtimeEvent<T = unknown> = {
  type: string;
  payload?: T;
  timestamp: number;
};

const CHANNEL_NAME = "apolo_realtime_sync_bus";

class RealtimeBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          const { type, payload } = event.data as RealtimeEvent;
          this.notifyLocal(type, payload);
        };
      } catch (err) {
        console.warn("BroadcastChannel not supported or failed to initialize", err);
      }
    }
  }

  // Publish event to other tabs and current window
  public emit<T = unknown>(type: string, payload?: T) {
    const eventData: RealtimeEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // 1. Notify current window listeners
    this.notifyLocal(type, payload);

    // 2. Broadcast to other tabs
    if (this.channel) {
      try {
        this.channel.postMessage(eventData);
      } catch (err) {
        console.warn("Failed to broadcast message", err);
      }
    }

    // 3. Dispatch native CustomEvent as fallback
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("apolo_realtime_event", { detail: eventData })
      );
    }
  }

  // Subscribe to specific event type
  public on<T = unknown>(type: string, callback: (payload: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as (payload: unknown) => void);

    return () => {
      this.off(type, callback);
    };
  }

  public off<T = unknown>(type: string, callback: (payload: T) => void) {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(callback as (payload: unknown) => void);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  private notifyLocal(type: string, payload: unknown) {
    const notify = () => {
      const set = this.listeners.get(type);
      if (set) {
        set.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            console.error(`Error in realtime bus listener for ${type}:`, err);
          }
        });
      }

      // Wildcard listeners
      const wildcardSet = this.listeners.get("*");
      if (wildcardSet) {
        wildcardSet.forEach((cb) => {
          try {
            cb({ type, payload });
          } catch (err) {
            console.error("Error in wildcard realtime bus listener:", err);
          }
        });
      }
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(notify);
    } else {
      setTimeout(notify, 0);
    }
  }
}

export const realtimeBus = typeof window !== "undefined" ? new RealtimeBus() : (null as unknown as RealtimeBus);
