// Stripe webhook + checkout stubs for PURRE Coins
import express from "express";
import { asyncHandler } from "../lib/errors.js";

export const stripeRouter = express.Router();

// POST /api/stripe/create-checkout
stripeRouter.post("/create-checkout", asyncHandler(async (req, res) => {
  // TODO: create Stripe Checkout session for coin packages
  // packages: 100 (9.99), 500 (39.99), 1000 (69.99), 5000 (299.99)
  res.json({ url: "https://checkout.stripe.com/stub", message: "Stripe integration pending" });
}));

// POST /api/stripe/webhook
stripeRouter.post("/webhook", express.raw({ type: "application/json" }), asyncHandler(async (req, res) => {
  // TODO: verify signature, handle checkout.session.completed, credit wallet
  res.json({ received: true });
}));
