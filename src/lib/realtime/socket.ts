import type { Server as SocketServer } from "socket.io";

// The Socket.IO server is created inside the Pages API handler (src/pages/api/socket.ts).
// We stash it on globalThis so App Router route handlers (offers create/accept/reject),
// which run in the same Node process, can broadcast DB-first events to authorized chat rooms.
const globalForIo = globalThis as unknown as {
  certitechIo?: SocketServer;
};

export function setSocketServer(io: SocketServer) {
  globalForIo.certitechIo = io;
}

export function getSocketServer(): SocketServer | null {
  return globalForIo.certitechIo ?? null;
}

/**
 * Emit an event to everyone joined to a chat room. No-op when the socket server
 * has not been initialized yet — realtime is a UX enhancement and the API/reload
 * data remains the correctness fallback.
 */
export function emitToChat(chatId: string, event: string, payload: unknown) {
  const io = getSocketServer();
  if (!io) return;
  io.to(chatId).emit(event, payload);
}
