import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@shared/events';
import type { RoomState } from '@shared/types';

type EventHandler = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<EventHandler>>();
  private connected = false;

  connect(userId: string, displayName: string) {
    if (this.socket?.connected) return;

    this.socket = io({
      auth: { userId, displayName },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[SocketService] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('[SocketService] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketService] Connection error:', err.message);
    });

    // Re-attach all registered listeners
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.socket?.on(event, handler);
      }
    }
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.listeners.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  // ── High-level Room API ─────────────────────────────────

  createRoom() {
    this.emit(SOCKET_EVENTS.ROOM_CREATE);
  }

  joinRoom(code: string) {
    this.emit(SOCKET_EVENTS.ROOM_JOIN, { code });
  }

  leaveRoom(code: string) {
    this.emit(SOCKET_EVENTS.ROOM_LEAVE, { code });
  }

  setReady(code: string, ready: boolean) {
    this.emit(SOCKET_EVENTS.PLAYER_READY, { code, ready });
  }

  startGame(code: string) {
    this.emit('game:start', { code });
  }

  sendInput(code: string, progress: number) {
    this.emit(SOCKET_EVENTS.GAME_INPUT, { code, progress });
  }

  changeLevel(code: string, level: string) {
    this.emit('game:level', { code, level });
  }

  finishGame(code: string) {
    this.emit('game:finish', { code });
  }

  onRoomCreated(handler: (data: { code: string }) => void) {
    this.on(SOCKET_EVENTS.ROOM_CREATED, handler);
  }

  onRoomState(handler: (state: RoomState) => void) {
    this.on(SOCKET_EVENTS.ROOM_STATE, handler);
  }

  onRoomUpdate(handler: (state: RoomState) => void) {
    this.on(SOCKET_EVENTS.ROOM_UPDATE, handler);
  }

  onGameStart(handler: (data: { level: string; players: any[] }) => void) {
    this.on(SOCKET_EVENTS.GAME_START, handler);
  }

  onStateSync(handler: (data: { userId: string; progress: number }) => void) {
    this.on(SOCKET_EVENTS.STATE_SYNC, handler);
  }

  onError(handler: (data: { message: string }) => void) {
    this.on(SOCKET_EVENTS.ERROR, handler);
  }
}

export const socketService = new SocketService();
