import { Server } from "socket.io";
import { verifyToken } from "../lib/auth.js";
import { prisma } from "../prisma.js";

let io = null;
const onlineUsers = new Map(); // userId -> Set(socketId)

// Rooms:
//   user:<userId>          — powiadomienia / wallet / premium
//   conversation:<convId>  — realtime czat (Messenger PRO)
//   post:<postId>          — komentarze i polubienia w czasie rzeczywistym
//
// Client → Server:
//   subscribe / unsubscribe { room } lub { entity }
//   message:typing  { conversation_id }
//   message:read    { conversation_id, message_id }
// Server → Client:
//   entity:event { type, data }        — zgodność z base44.entities.*.subscribe
//   message:new | message:read | message:typing | message:react | message:delete
//   presence:update { user_id, online }

export function initSocket(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins.length ? corsOrigins : true, credentials: true },
    path: "/socket.io",
    pingInterval: 20000,
    pingTimeout: 25000,
    maxHttpBufferSize: 2e6,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token ?? null;
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyToken(token);
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    // presence
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
      broadcastPresence(user.id, true);
    }
    onlineUsers.get(user.id).add(socket.id);

    socket.on("subscribe", async ({ room, entity } = {}, ack) => {
      try {
        const rooms = await roomsFor(user, room, entity);
        for (const r of rooms) socket.join(r);
        if (typeof ack === "function") ack({ ok: true, rooms });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, error: error.message });
      }
    });

    socket.on("unsubscribe", ({ room } = {}) => {
      if (typeof room === "string") socket.leave(room);
    });

    // „User is typing…” — relay do reszty pokoju rozmowy.
    socket.on("message:typing", async ({ conversation_id } = {}) => {
      if (!conversation_id) return;
      if (!(await isMember(user.id, conversation_id))) return;
      socket.to(`conversation:${conversation_id}`).emit("message:typing", {
        conversation_id,
        user_id: user.id,
        name: user.email,
        ts: Date.now(),
      });
    });

    // Potwierdzenie odczytu w czasie rzeczywistym.
    socket.on("message:read", async ({ conversation_id, message_id } = {}) => {
      if (!conversation_id) return;
      if (!(await isMember(user.id, conversation_id))) return;
      try {
        if (message_id) {
          await prisma.message.updateMany({
            where: { id: message_id, conversation_id, NOT: { sender_id: user.id } },
            data: { seen: true, read_at: new Date() },
          });
        } else {
          await prisma.message.updateMany({
            where: { conversation_id, seen: false, NOT: { sender_id: user.id } },
            data: { seen: true, read_at: new Date() },
          });
        }
        io.to(`conversation:${conversation_id}`).emit("message:read", {
          conversation_id,
          message_id: message_id ?? null,
          user_id: user.id,
          ts: Date.now(),
        });
      } catch {}
    });

    socket.on("disconnect", () => {
      const set = onlineUsers.get(user.id);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(user.id);
          broadcastPresence(user.id, false);
        }
      }
    });
  });

  return io;
}

function broadcastPresence(userId, online) {
  if (!io) return;
  io.emit("presence:update", { user_id: userId, online });
}

export function isOnline(userId) {
  return onlineUsers.has(userId);
}

async function isMember(userId, conversationId) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  return !!conv && Array.isArray(conv.members) && conv.members.includes(userId);
}

async function roomsFor(user, room, entity) {
  if (typeof room === "string") {
    return (await canJoin(user, room)) ? [room] : [];
  }
  if (entity === "Wallet") return [`user:${user.id}`];
  if (entity === "Message") {
    const conversations = await prisma.conversation.findMany({
      where: { members: { has: user.id } },
      select: { id: true },
    });
    return conversations.map((c) => `conversation:${c.id}`);
  }
  return [];
}

async function canJoin(user, room) {
  if (typeof room !== "string" || !user) return false;
  if (room === `user:${user.id}`) return true;
  const conversationMatch = /^conversation:([A-Za-z0-9_-]+)$/.exec(room);
  if (conversationMatch) return isMember(user.id, conversationMatch[1]);
  const postMatch = /^post:([A-Za-z0-9_-]+)$/.exec(room);
  if (postMatch) return true; // publiczne komentarze posta
  return false;
}

export function emitToRoom(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

export function getIo() {
  return io;
}
