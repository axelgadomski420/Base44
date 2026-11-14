import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest } from "../lib/errors.js";
import { loadWallet, saveWallet } from "../lib/wallet.js";

export const stripeRouter = Router();

export const COIN_PACKAGES = [
  { id: "coins_100", coins: 100, amount: 999, currency: "pln", label: "100 monet" },
  { id: "coins_500", coins: 500, amount: 3999, currency: "pln", label: "500 monet" },
  { id: "coins_1200", coins: 1200, amount: 7999, currency: "pln", label: "1200 monet" },
  { id: "coins_3000", coins: 3000, amount: 17999, currency: "pln", label: "3000 monet" },
];

const checkoutSchema = z.object({
  package_id: z.string(),
});

function packageById(id) {
  return COIN_PACKAGES.find((item) => item.id === id) ?? null;
}

stripeRouter.get("/packages", (_req, res) => {
  res.json({
    configured: Boolean(config.stripeSecret),
    currency: "pln",
    packages: COIN_PACKAGES,
  });
});

stripeRouter.post(
  "/create-checkout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { package_id } = checkoutSchema.parse(req.body ?? {});
    const pack = packageById(package_id);
    if (!pack) throw badRequest("Nieznany pakiet monet");
    if (!config.stripeSecret) {
      res.status(503).json({
        error: { message: "Stripe nie jest jeszcze skonfigurowany", code: "STRIPE_DISABLED" },
        configured: false,
        packages: COIN_PACKAGES,
      });
      return;
    }

    const origin = config.publicBaseUrl.replace(/\/$/, "");
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${origin}/rewards?paid=1&session_id={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", `${origin}/rewards?paid=0`);
    body.set("client_reference_id", req.user.id);
    body.set("customer_email", req.user.email);
    body.set("metadata[user_id]", req.user.id);
    body.set("metadata[package_id]", pack.id);
    body.set("metadata[coins]", String(pack.coins));
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", pack.currency);
    body.set("line_items[0][price_data][unit_amount]", String(pack.amount));
    body.set("line_items[0][price_data][product_data][name]", `PURRE Coins — ${pack.label}`);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw badRequest(payload?.error?.message || "Nie udało się otworzyć płatności Stripe");
    }
    res.json({ url: payload.url, id: payload.id, configured: true });
  })
);

function stripeSignatureOk(req) {
  const secret = config.stripeWebhookSecret;
  const header = req.headers["stripe-signature"];
  if (!secret || !header || !req.rawBody) return false;
  const parts = Object.fromEntries(
    String(header)
      .split(",")
      .map((piece) => {
        const index = piece.indexOf("=");
        return [piece.slice(0, index), piece.slice(index + 1)];
      })
  );
  if (!parts.t) return false;
  const signed = `${parts.t}.${req.rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  const signatures = String(header)
    .split(",")
    .filter((piece) => piece.startsWith("v1="))
    .map((piece) => piece.slice(3));
  return signatures.some((signature) => {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

async function creditSession(session) {
  const sessionId = session?.id;
  const userId = session?.metadata?.user_id || session?.client_reference_id;
  const coins = Number(session?.metadata?.coins);
  const packageId = session?.metadata?.package_id || "custom";
  if (!sessionId || !userId || !Number.isFinite(coins) || coins <= 0) return null;
  const existing = await prisma.coinPurchase.findUnique({ where: { stripe_session_id: sessionId } });
  if (existing) return existing;
  const amount = Number(session.amount_total ?? 0);
  await prisma.coinPurchase.create({
    data: {
      user_id: userId,
      package_id: packageId,
      coins,
      amount,
      currency: session.currency || "pln",
      stripe_session_id: sessionId,
      status: "paid",
    },
  });
  const wallet = await loadWallet(userId);
  await saveWallet(userId, { coins: (wallet.coins ?? 0) + coins });
  return { sessionId, coins };
}

stripeRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    if (!stripeSignatureOk(req)) {
      res.status(400).json({ error: { message: "Invalid Stripe signature", code: "BAD_SIGNATURE" } });
      return;
    }
    const event = JSON.parse(req.rawBody.toString("utf8"));
    if (event.type === "checkout.session.completed") {
      await creditSession(event.data?.object);
    }
    res.json({ received: true });
  })
);
