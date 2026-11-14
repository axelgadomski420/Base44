import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound, forbidden } from "../lib/errors.js";
import { notify } from "./notifications.routes.js";

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

const sendSchema = z.object({
  conversation_id: z.string().trim().min(1).optional(),
  recipient_id: z.string().trim().min(1).optional(),
  content: z.string().trim().max(4000).optional(),
  media_url: z.string().trim().max(500).optional(),
  media_type: z.enum(["image", "video"]).optional(),
}).refine((d) => d.conversation_id || d.recipient_id, { message: "conversation_id albo recipient_id" })
  .refine((d) => (d.content && d.content.length) || d.media_url, { message: "Treść albo załącznik" });

async function getOrCreateConversation(userId, { conversationId, recipientId }) {
  if (conversationId) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw notFound("Nie znaleziono rozmowy");
    if (!conv.members.includes(userId)) throw forbidden("Nie jesteś uczestnikiem rozmowy");
    return conv;
  }
  const existing = await prisma.conversation.findFirst({
    where: { members: { has: userId }, AND: { members: { has: recipientId } } },
  });
  if (existing) return existing;
  const [me, them] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { id: recipientId } }),
  ]);
  if (!them) throw notFound("Nie znaleziono adresata");
  return prisma.conversation.create({
    data: {
      members: [userId, recipientId],
      member_names: [me?.full_name || me?.email || "", them?.full_name || them?.email || ""],
      created_by_id: userId,
    },
  });
}

// GET /api/messages/conversations?q= — lista rozmów + wyszukiwarka.
messagesRouter.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const q = (typeof req.query.q === "string" ? req.query.q : "").trim();
    const conversations = await prisma.conversation.findMany({
      where: {
        members: { has: req.user.id },
        ...(q ? { OR: [
          { member_names: { has: q } },
          { listing_title: { contains: q, mode: "insensitive" } },
          { last_message: { contains: q, mode: "insensitive" } },
        ] } : {}),
      },
      orderBy: { last_message_at: "desc" },
      take: 60,
    });
    res.json({ items: conversations });
  })
);

// GET /api/messages/conversations/:id/messages — historia + oznaczenie odczytu.
messagesRouter.get(
  "/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const conv = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conv) throw notFound("Nie znaleziono rozmowy");
    if (!conv.members.includes(req.user.id)) throw forbidden("Brak dostępu");
    const messages = await prisma.message.findMany({
      where: { conversation_id: conv.id, deleted: false },
      orderBy: { created_date: "asc" },
      take: 200,
    });
    await prisma.message.updateMany({
      where: { conversation_id: conv.id, seen: false, NOT: { sender_id: req.user.id } },
      data: { seen: true, read_at: new Date() },
    });
    const reactions = await prisma.messageReaction.findMany({
      where: { message_id: { in: messages.map((m) => m.id) } },
    });
    res.json({
      conversation: conv,
      items: messages.map((m) => ({
        ...m,
        reactions: reactions.filter((r) => r.message_id === m.id),
      })),
    });
  })
);

// POST /api/messages/send — wiadomość tekstowa lub z mediami.
messagesRouter.post(
  "/send",
  asyncHandler(async (req, res) => {
    const data = sendSchema.parse(req.body ?? {});
    const conv = await getOrCreateConversation(req.user.id, data);
    const profile = await prisma.profile.findFirst({ where: { user_id: req.user.id } });
    const message = await prisma.message.create({
      data: {
        conversation_id: conv.id,
        members: conv.members,
        sender_id: req.user.id,
        sender_name: profile?.display_name || req.user.full_name || req.user.email,
        content: data.content ?? "",
        media_url: data.media_url ?? null,
        media_type: data.media_type ?? null,
        delivered_at: new Date(),
        created_by_id: req.user.id,
      },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { last_message: data.media_url ? (data.media_type === "video" ? "📹 Wideo" : "🖼 Zdjęcie") : data.content.slice(0, 120), last_sender_id: req.user.id, last_message_at: new Date() },
    });
    for (const memberId of conv.members) {
      if (memberId !== req.user.id) {
        await notify(memberId, {
          type: "message",
          title: "Nowa wiadomość",
          body: (data.content || "Załącznik").slice(0, 120),
          link: "/messages",
          actor_name: message.sender_name,
          actor_id: req.user.id,
        });
      }
    }
    res.status(201).json({ message, conversation_id: conv.id });
  })
);

// POST /api/messages/:id/read — potwierdzenie odczytu (status „odczytano”).
messagesRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message || !message.members.includes(req.user.id)) throw notFound();
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { seen: true, read_at: new Date() },
    });
    res.json(updated);
  })
);

// POST /api/messages/:id/react — reakcja emoji.
messagesRouter.post(
  "/:id/react",
  asyncHandler(async (req, res) => {
    const emoji = String(req.body?.emoji ?? "").trim().slice(0, 8);
    if (!emoji) throw badRequest("Brak emoji");
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message || !message.members.includes(req.user.id)) throw notFound();
    const existing = await prisma.messageReaction.findUnique({
      where: { message_id_user_id: { message_id: message.id, user_id: req.user.id } },
    });
    let reaction;
    if (existing && existing.emoji === emoji) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      reaction = null;
    } else if (existing) {
      reaction = await prisma.messageReaction.update({ where: { id: existing.id }, data: { emoji } });
    } else {
      reaction = await prisma.messageReaction.create({
        data: { message_id: message.id, user_id: req.user.id, emoji },
      });
    }
    res.json({ reaction });
  })
);

// DELETE /api/messages/:id — usuwanie wiadomości (soft delete).
messagesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message || message.sender_id !== req.user.id) throw notFound("Nie znaleziono wiadomości");
    await prisma.message.update({ where: { id: message.id }, data: { deleted: true } });
    res.json({ ok: true });
  })
);
