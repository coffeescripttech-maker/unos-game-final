import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@shared/events';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  setReady,
  startGame,
  updateProgress,
  setLevel,
  finishRoom,
  getRoomState,
} from './rooms.js';

interface PlayerAuth {
  userId: string;
  displayName: string;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const auth = socket.handshake.auth as PlayerAuth;
    const userId = auth?.userId ?? `guest_${socket.id.slice(0, 6)}`;
    const displayName = auth?.displayName ?? `Player_${socket.id.slice(0, 4)}`;

    console.log(`[Socket] ${displayName} (${userId}) connected [${socket.id}]`);

    // ── Room: Create ──────────────────────────────────────

    socket.on(SOCKET_EVENTS.ROOM_CREATE, () => {
      const room = createRoom(userId, displayName);
      socket.join(room.code);
      socket.emit(SOCKET_EVENTS.ROOM_CREATED, { code: room.code });
      io.to(room.code).emit(SOCKET_EVENTS.ROOM_STATE, getRoomState(room.code));
      console.log(`[Socket] Room ${room.code} created by ${displayName}`);
    });

    // ── Room: Join ────────────────────────────────────────

    socket.on(SOCKET_EVENTS.ROOM_JOIN, ({ code }: { code: string }) => {
      const room = joinRoom(code, userId, displayName);
      if (!room) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Cannot join room — full, in-progress, or does not exist' });
        return;
      }
      socket.join(code);
      io.to(code).emit(SOCKET_EVENTS.ROOM_STATE, getRoomState(code));
      console.log(`[Socket] ${displayName} joined room ${code}`);
    });

    // ── Room: Leave ───────────────────────────────────────

    socket.on(SOCKET_EVENTS.ROOM_LEAVE, ({ code }: { code: string }) => {
      const room = leaveRoom(code, userId);
      socket.leave(code);
      if (room) {
        io.to(code).emit(SOCKET_EVENTS.ROOM_STATE, getRoomState(code));
      }
      console.log(`[Socket] ${displayName} left room ${code}`);
    });

    // ── Player: Ready ─────────────────────────────────────

    socket.on(SOCKET_EVENTS.PLAYER_READY, ({ code, ready }: { code: string; ready: boolean }) => {
      setReady(code, userId, ready);
      io.to(code).emit(SOCKET_EVENTS.ROOM_STATE, getRoomState(code));
    });

    // ── Game: Start ───────────────────────────────────────

    socket.on('game:start', ({ code }: { code: string }) => {
      if (userId !== getRoomState(code)?.hostId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only the host can start the game' });
        return;
      }
      const room = startGame(code);
      if (room) {
        io.to(code).emit(SOCKET_EVENTS.GAME_START, {
          level: room.currentLevel,
          players: [...room.players.values()],
        });
        console.log(`[Socket] Game started in room ${code}`);
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not enough players ready to start' });
      }
    });

    // ── Game: Input (co-op gameplay sync) ─────────────────

    socket.on(SOCKET_EVENTS.GAME_INPUT, ({ code, progress }: { code: string; progress: number }) => {
      updateProgress(code, progress);
      socket.to(code).emit(SOCKET_EVENTS.STATE_SYNC, {
        userId,
        progress,
        timestamp: Date.now(),
      });
    });

    // ── Game: Level Change ────────────────────────────────

    socket.on('game:level', ({ code, level }: { code: string; level: string }) => {
      if (userId !== getRoomState(code)?.hostId) return;
      setLevel(code, level as any);
      io.to(code).emit(SOCKET_EVENTS.ROOM_UPDATE, getRoomState(code));
    });

    // ── Game: Finish ──────────────────────────────────────

    socket.on('game:finish', ({ code }: { code: string }) => {
      if (userId !== getRoomState(code)?.hostId) return;
      finishRoom(code);
      io.to(code).emit(SOCKET_EVENTS.ROOM_UPDATE, getRoomState(code));
    });

    // ── Disconnect ────────────────────────────────────────

    socket.on('disconnect', () => {
      // Find and leave any rooms this socket was in
      const rooms = [...socket.rooms].filter(r => r !== socket.id);
      for (const code of rooms) {
        const room = leaveRoom(code, userId);
        if (room) {
          io.to(code).emit(SOCKET_EVENTS.ROOM_STATE, getRoomState(code));
        }
      }
      console.log(`[Socket] ${displayName} disconnected [${socket.id}]`);
    });
  });
}
