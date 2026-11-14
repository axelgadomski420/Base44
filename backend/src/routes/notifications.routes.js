import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler } from "../lib/errors.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// GET /api/notifications?unread=1
notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === "1";
    const items = await prisma.notification.findMany({
      where: { user_id: req.user.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { created_date: "desc" },
      take: 50,
    });
    const unread = await prisma.notification.count({ where: { user_id: req.user.id, read: false } });
    res.json({ items, unread });
  })
);

// POST /api/notifications/:id/read
notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, user_id: req.user.id },
      data: { read: true },
    });
    res.json({ ok: true });
  })
);

// POST /api/notifications/read-all
notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { user_id: req.user.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  })
);

// Helper używany przez inne moduły.
export async function notify(userId, data) {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        type: data.type ?? "system",
        title: String(data.title ?? "").slice(0, 200),
        body: data.body ? String(data.body).slice(0, 1000) : null,
        link: data.link ? String(data.link).slice(0, 300) : null,
        actor_name: data.actor_name ?? null,
        actor_avatar: data.actor_avatar ?? null,
        created_by_id: data.actor_id ?? null,
      },
    });
  } catch (err) {
    console.error("notify failed:", err?.message);
  }
}
