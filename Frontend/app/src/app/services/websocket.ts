// ================================================================
// WebSocket Service — Real-time Telemetry & Alerts
// ================================================================

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';

/* Muatan peristiwa ditentukan backend; 'unknown' memaksa pendengar
   memeriksa bentuknya sebelum memakai. */
type EventCallback = (data: unknown) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(`${WS_URL}/telemetry`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[WS] Connection error:', error.message);
    });

    // Re-register all existing listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.socket?.on(event, cb));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  subscribeTelemetry(deviceId: string) {
    this.socket?.emit('subscribe:telemetry', { deviceId });
  }

  subscribeAlerts(siteId: string) {
    this.socket?.emit('subscribe:alerts', { siteId });
  }

  sendGimbalCommand(deviceId: string, command: string, value?: unknown) {
    this.socket?.emit('gimbal:command', { deviceId, command, value });
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

const ws = new WebSocketService();
export default ws;
