import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, isAdmin } from "../lib/auth.js";
import { asyncHandler, badRequest, forbidden } from "../lib/errors.js";
import { loadWallet } from "../lib/wallet.js";
import { notify } from "./notifications.routes.js";

export const premiumRouter = Router();

export const PREMIUM_COST_COINS = 500; // 30 dni PREMIUM za PURRE Coins
export const PREMIUM_DAYS = 30;

export function isPremium(user) {
  return !!user?.premium_until && new Date(user.premium_until) > new Date();
}

function serialize(user) {
  return {
    premium: isPremium(user),
    premium_until: user?.premium_until ?? null,
  };
}

// GET /api/premium/status — frontend używa tego, by ukrywać reklamy.
premiumRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(serialize(user));
  })
);

// POST /api/premium/activate — aktywacja za PURRE Coins (500 → 30 dni).
premiumRouter.post(
  "/activate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (isPremium(user)) {
      return res.json({ ...serialize(user), already: true });
    }
    const wallet = await loadWallet(req.user.id);
    if ((wallet.coins ?? 0) < PREMIUM_COST_COINS) {
      throw badRequest(`Za mało PURRE Coins (potrzeba ${PREMIUM_COST_COINS})`);
    }
    const base = isPremium(user) ? new Date(user.premium_until) : new Date();
    const until = new Date(base.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);
    const [, updated] = await prisma.$transaction([
      prisma.wallet.update({ where: { user_id: req.user.id }, data: { coins: { decrement: PREMIUM_COST_COINS } } }),
      prisma.user.update({ where: { id: req.user.id }, data: { premium_until: until } }),
    ]);
    await notify(req.user.id, {
      type: "system",
      title: "PURRE Premium aktywowane 🎉",
      body: `Bez reklam do ${until.toLocaleDateString("pl-PL")}. Dziękujemy!`,
      link: "/rewards",
    });
    res.json({ ...serialize(updated), coins_spent: PREMIUM_COST_COINS });
  })
);

// POST /api/premium/grant — nadanie premium przez admina.
premiumRouter.post(
  "/grant",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!isAdmin(req)) throw forbidden("Tylko administrator");
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const days = Math.max(1, Math.min(3650, Number(req.body?.days ?? 30)));
    if (!email) throw badRequest("Brak email");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw badRequest("Nie znaleziono konta");
    const base = isPremium(user) ? new Date(user.premium_until) : new Date();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { premium_until: new Date(base.getTime() + days * 24 * 60 * 60 * 1000) },
    });
    await notify(user.id, {
      type: "system",
      title: "PURRE Premium 🎁",
      body: `Administrator przyznał Ci Premium na ${days} dni.`,
    });
    res.json({ email, ...serialize(updated) });
  })
);
