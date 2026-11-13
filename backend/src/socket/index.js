import { Server } from "socket.io";
import { verifyToken } from "../lib/auth.js";
import { prisma } from "../prisma.js";

let io = null;

// Rooms:
//   user:<userId>          â wallet updates for base44.entities.Wallet.subscribe
//   conversation:<convId>  â message events for base44.entities.Message.subscribe
//
// Clients send:  subscribe   { room } or { entity: "Message" | "Wallet" }
//                unsubscribe { room }
// Server emits:  entity:event { type, data }  â same shape as Base44 subscribe events.

export function initSocket(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    path: "/socket.io",
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

    socket.on("subscribe", async ({ room, entity } = {}, ack) => {
      try {
        const rooms = await roomsFor(user, room, entity);
        if (!rooms.length) throw new Error("forbidden");
        for (const r of rooms) socket.join(r);
        if (typeof ack === "function") ack({ ok: true, rooms });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, error: error.message });
      }
    });

    socket.on("unsubscribe", ({ room } = {}) => {
      if (typeof room === "string") socket.leave(room);
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

async function roomsFor(user, room, entity) {
  if (typeof room === "string") {
    return (await canJoin(user, room)) ? [room] : [];
  }
  // No room given: subscribe by entity, like base44.entities.<E>.subscribe(cb).
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
  if (conversationMatch) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationMatch[1] } });
    return !!conversation && Array.isArray(conversation.members) && conversation.members.includes(user.id);
  }
  return false;
}

export function emitToRoom(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

export function getIo() {
  return io;
}
