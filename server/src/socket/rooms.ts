import type { LevelId, PlayerInfo, RoomState, RoomStatus } from '@shared/types';

interface Room {
  code: string;
  hostId: string;
  players: Map<string, PlayerInfo>;
  currentLevel: LevelId | null;
  sharedProgress: number;
  status: RoomStatus;
}

const rooms = new Map<string, Room>();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = Array.from({ length: 4 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
    if (!rooms.has(code)) return code;
  }
  // Extremely unlikely, but fallback with timestamp suffix
  return `R${Date.now().toString(36).toUpperCase()}`;
}

export function createRoom(hostId: string, displayName: string): Room {
  const code = generateCode();
  const player: PlayerInfo = {
    userId: hostId,
    displayName,
    isReady: false,
    joinedAt: new Date().toISOString(),
  };

  const room: Room = {
    code,
    hostId,
    players: new Map([[hostId, player]]),
    currentLevel: null,
    sharedProgress: 0,
    status: 'waiting',
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, userId: string, displayName: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.status !== 'waiting') return null;
  if (room.players.size >= 4) return null;

  const player: PlayerInfo = {
    userId,
    displayName,
    isReady: false,
    joinedAt: new Date().toISOString(),
  };

  room.players.set(userId, player);
  return room;
}

export function leaveRoom(code: string, userId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;

  room.players.delete(userId);

  if (room.players.size === 0) {
    rooms.delete(code);
    return null;
  }

  // Transfer host if needed
  if (room.hostId === userId) {
    const nextHost = room.players.keys().next().value;
    if (nextHost) room.hostId = nextHost;
  }

  return room;
}

export function setReady(code: string, userId: string, ready: boolean): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.get(userId);
  if (!player) return null;
  player.isReady = ready;
  return room;
}

export function startGame(code: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.players.size < 2) return null;
  // All non-host players must be ready
  const allReady = [...room.players.entries()]
    .filter(([id]) => id !== room.hostId)
    .every(([, p]) => p.isReady);
  if (!allReady) return null;

  room.status = 'playing';
  room.currentLevel = 'tutorial';
  room.sharedProgress = 0;
  return room;
}

export function updateProgress(code: string, progress: number): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.sharedProgress = progress;
  return room;
}

export function setLevel(code: string, level: LevelId): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.currentLevel = level;
  return room;
}

export function finishRoom(code: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.status = 'finished';

  // Auto-delete after 5 minutes
  setTimeout(() => rooms.delete(code), 300_000);
  return room;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code) ?? null;
}

export function getRoomState(code: string): RoomState | null {
  const room = rooms.get(code);
  if (!room) return null;

  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()],
    currentLevel: room.currentLevel,
    sharedProgress: room.sharedProgress,
    status: room.status,
  };
}

export function roomExists(code: string): boolean {
  return rooms.has(code);
}
