import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock socket.io-client before importing the module
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmit = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockRemoveAllListeners = vi.fn();

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    connect: mockConnect,
    disconnect: mockDisconnect,
    removeAllListeners: mockRemoveAllListeners,
    connected: true,
    id: 'test-socket-id',
  }),
}));

describe('SocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { socketService } = require('./socket');
    socketService.disconnect();
  });

  it('connects and sets connected flag', () => {
    const { socketService } = require('./socket');
    expect(socketService.isConnected()).toBe(false);

    socketService.connect('test-user', 'TestPlayer');
    expect(socketService.isConnected()).toBe(true);
    expect(socketService.getId()).toBe('test-socket-id');
  });

  it('emits room create event', () => {
    const { socketService } = require('./socket');
    socketService.connect('user', 'Player');
    socketService.createRoom();

    // Should have emitted room:create
    const emitCalls = mockEmit.mock.calls.filter(c => c[0] === 'room:create');
    expect(emitCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('can register and manage event handlers', () => {
    const { socketService } = require('./socket');
    socketService.connect('user', 'Player');

    const handler = vi.fn();
    socketService.onRoomCreated(handler);
    expect(mockOn).toHaveBeenCalledWith('room:created', handler);

    socketService.onRoomState(handler);
    expect(mockOn).toHaveBeenCalledWith('room:state', handler);

    socketService.off('room:created', handler);
    expect(mockOff).toHaveBeenCalledWith('room:created', handler);
  });

  it('disconnects and cleans up', () => {
    const { socketService } = require('./socket');
    socketService.connect('user', 'Player');
    socketService.disconnect();

    expect(mockRemoveAllListeners).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(socketService.isConnected()).toBe(false);
  });
});
