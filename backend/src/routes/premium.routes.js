import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, isAdmin } from "../lib/auth.js";
import { asyncHandler, badRequest, forbidden } from "../lib/errors.js";
import { loadWallet } from "../lib/wallet.js";
import { config } from "../config.js";
import { notify } from "./notifications.routes.js";

export const premiumRouter = Router();

export const PREMIUM_PRICE_PLN = 29.99; // miesięczna subskrypcja
export const PREMIUM_COST_COINS = 500; // alternatywnie za PURRE Coins
export const PREMIUM_DAYS = 30;

export function isPremium(user) {
  return (!!user?.is_premium && (!user?.premium_until || new Date(user.premium_until) > new Date()))
    || (!!user?.premium_until && new Date(user.premium_until) > new Date());
}

function serialize(user) {
  return {
    is_premium: isPremium(user),
    premium: isPremium(user),
    premium_until: user?.premium_until ?? null,
    price_pln: PREMIUM_PRICE_PLN,
    coins_price: PREMIUM_COST_COINS,
  };
}

// GET /api/premium/status — frontend używa tego, by całkowicie ukrywać reklamy.
premiumRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(serialize(user));
  })
);

// POST /api/premium/subscribe — subskrypcja 29,99 PLN/mies. (Stripe) albo 500 PURRE Coins.
premiumRouter.post(
  "/subscribe",
  requireAuth,
  asyncHandler(async (req, res) => {
    const method = req.body?.method === "coins" ? "coins" : "stripe";

    if (method === "coins") {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (isPremium(user)) return res.json({ ...serialize(user), already: true });
      const wallet = await loadWallet(req.user.id);
      if ((wallet.coins ?? 0) < PREMIUM_COST_COINS) {
        throw badRequest(`Za mało PURRE Coins (potrzeba ${PREMIUM_COST_COINS})`);
      }
      const base = user?.premium_until && new Date(user.premium_until) > new Date() ? new Date(user.premium_until) : new Date();
      const until = new Date(base.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);
      const [, updated] = await prisma.$transaction([
        prisma.wallet.update({ where: { user_id: req.user.id }, data: { coins: { decrement: PREMIUM_COST_COINS } } }),
        prisma.user.update({ where: { id: req.user.id }, data: { is_premium: true, premium_until: until } }),
      ]);
      await notify(req.user.id, {
        type: "system",
        title: "PURRE Premium aktywne 🎉",
        body: `Bez reklam do ${until.toLocaleDateString("pl-PL")}. Dziękujemy!`,
        link: "/rewards",
      });
      return res.json({ ...serialize(updated), coins_spent: PREMIUM_COST_COINS });
    }

    // Stripe Checkout: subskrypcja 29,99 PLN / miesiąc.
    if (!config.stripeSecret) {
      throw badRequest("Płatności kartą chwilowo niedostępne — użyj metody za PURRE Coins.");
    }
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${config.publicBaseUrl}/rewards?premium=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${config.publicBaseUrl}/rewards?premium=cancelled`);
    params.set("client_reference_id", req.user.id);
    params.set("customer_email", req.user.email);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "pln");
    params.set("line_items[0][price_data][unit_amount]", String(PREMIUM_PRICE_PLN * 100));
    params.set("line_items[0][price_data][recurring][interval]", "month");
    params.set("line_items[0][price_data][product_data][name]", "PURRE Premium — miesiąc");
    params.set("line_items[0][price_data][product_data][description]", "Bez reklam, pełny dostęp do PURRE PETS");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await response.json();
    if (!response.ok) throw badRequest(session?.error?.message ?? "Błąd Stripe");
    res.json({ checkout_url: session.url, session_id: session.id });
  })
);

// GET /api/premium/confirm?session_id=... — aktywacja po powrocie z Stripe Checkout.
premiumRouter.get(
  "/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId = String(req.query.session_id ?? "");
    if (!sessionId || !config.stripeSecret) throw badRequest("Brak session_id");
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${config.stripeSecret}` },
    });
    const session = await response.json();
    if (!response.ok || session.payment_status !== "paid") throw badRequest("Płatność nie została potwierdzona");
    const base = new Date();
    const until = new Date(base.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { is_premium: true, premium_until: until },
    });
    await notify(req.user.id, {
      type: "system",
      title: "PURRE Premium aktywne 🎉",
      body: `Subskrypcja ${PREMIUM_PRICE_PLN} PLN/mies. — reklamy wyłączone.`,
    });
    res.json(serialize(updated));
  })
);

// POST /api/premium/activate — skrót: aktywacja za coins (kompatybilność).
premiumRouter.post("/activate", requireAuth, asyncHandler(async (req, res) => {
  req.body = { method: "coins" };
  return premiumRouter.handle({ ...req, method: "POST", url: "/subscribe" }, res, () => {});
}));

// POST /api/premium/grant — nadanie premium przez administratora (effdoa@gmail.com).
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
    const base = user.premium_until && new Date(user.premium_until) > new Date() ? new Date(user.premium_until) : new Date();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { is_premium: true, premium_until: new Date(base.getTime() + days * 24 * 60 * 60 * 1000) },
    });
    await notify(user.id, {
      type: "system",
      title: "PURRE Premium 🎁",
      body: `Administrator przyznał Ci Premium na ${days} dni.`,
    });
    res.json({ email, ...serialize(updated) });
  })
);
