import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { config } from "../config.js";
import { signToken, requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest, forbidden, tooMany, unauthorized } from "../lib/errors.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
});

const OTP_TTL_MS = 15 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name ?? null,
    role: user.role,
    email_verified: user.email_verified,
    created_date: user.created_date,
  };
}

async function sendOtpEmail(email, code) {
  if (!config.smtp) {
    console.log(`[auth] OTP code for ${email}: ${code} (SMTP not configured)`);
    return false;
  }
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject: "PURRE PETS â kod weryfikacyjny",
    text: `TwÃ³j kod weryfikacyjny: ${code} (waÅ¼ny 15 minut).`,
  });
  return true;
}

async function issueOtp(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw unauthorized("Invalid email or password");
  if (user.email_verified) throw badRequest("Email already verified", { reason: "already_verified" });

  // Max 5 codes per email in 15 minutes.
  const recent = await prisma.otpCode.count({
    where: { email, created_date: { gte: new Date(Date.now() - OTP_TTL_MS) } },
  });
  if (recent >= 5) throw tooMany("Too many codes requested. Try again later.");

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      email,
      code_hash: await bcrypt.hash(code, 10),
      expires_at: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  const emailed = await sendOtpEmail(email, code);
  // Without SMTP the caller gets the code back outside production so the flow stays testable.
  if (!emailed && config.env !== "production") {
    return { otp_sent: true, dev_otp: code };
  }
  return { otp_sent: true };
}

async function consumeOtp(email, code) {
  const record = await prisma.otpCode.findFirst({
    where: { email, used: false, expires_at: { gt: new Date() } },
    orderBy: { created_date: "desc" },
  });
  if (!record) throw badRequest("Verification code expired or not found");
  const valid = await bcrypt.compare(String(code), record.code_hash);
  if (!valid) throw badRequest("Invalid verification code");
  await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });
}

// POST /api/auth/register  { email, password, full_name? }
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = credentialsSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw badRequest("An account with this email already exists");

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password_hash: await bcrypt.hash(body.password, 12),
        full_name: typeof req.body?.full_name === "string" ? req.body.full_name.slice(0, 120) : null,
      },
    });
    // Every user gets a wallet (coins/xp/level), matching the frontend's loadWallet helper.
    await prisma.wallet.create({
      data: { user_id: user.id, coins: 0, xp: 0, level: 1, badges: [], extra_media: 0 },
    });
    const verified = await prisma.user.update({ where: { id: user.id }, data: { email_verified: true } });
    res.status(201).json({ access_token: signToken(verified), user: publicUser(verified) });
  })
);

// POST /api/auth/resend-otp  { email }
authRouter.post(
  "/resend-otp",
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email().max(200) }).parse(req.body);
    res.json(await issueOtp(email));
  })
);

// POST /api/auth/verify-otp  { email, otp_code } â { access_token, user }
authRouter.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email().max(200), otp_code: z.string().min(4).max(8) })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw unauthorized();
    await consumeOtp(body.email, body.otp_code);
    const verified = await prisma.user.update({ where: { id: user.id }, data: { email_verified: true } });
    res.json({ access_token: signToken(verified), user: publicUser(verified) });
  })
);

// POST /api/auth/login  { email, password } â { access_token, user }
// (MFA is not enabled on this backend, so `mfa_required` is never returned.)
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = credentialsSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      throw unauthorized("Invalid email or password");
    }
    if (!user.email_verified) {
      throw forbidden("Email not verified. Confirm the code sent during registration.", {
        reason: "email_not_verified",
      });
    }
    res.json({ access_token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me â user (401 without a valid token)
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw unauthorized();
    res.json(publicUser(user));
  })
);

// POST /api/auth/logout â stateless JWT: the client drops the token.
authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ success: true });
  })
);

// GET /api/auth/login-info
// Compatibility shim: src/lib/authMfaFlow.js (loadSignInOptions) fetches the
// Base44 platform route /api/apps/public/login-info/by-id/<appId> on the sign-in
// screen. Nginx also aliases that path here, so the existing code keeps working:
// no MFA policy, no social providers on the self-hosted backend.
authRouter.get(
  "/login-info",
  asyncHandler(async (req, res) => {
    res.json({
      auth_config: { mfa_policy: "none", providers: [] },
      organization_id: null,
    });
  })
);

// --- Google OAuth ---
authRouter.get("/google", async (req, res) => {
  const crypto = await import("node:crypto");
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  res.redirect(url.toString());
});

authRouter.get("/google/callback", asyncHandler(async (req, res) => {
  const crypto = await import("node:crypto");
  const code = req.query.code;
  if (!code) throw badRequest("Missing Google authorization code");
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) throw badRequest("Google login failed");
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const info = await infoRes.json();
  if (!info.email) throw badRequest("Google account has no email");
  let user = await prisma.user.findUnique({ where: { email: info.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: info.email,
        full_name: info.name || null,
        password_hash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12),
      },
    });
    await prisma.wallet.create({
      data: { user_id: user.id, coins: 0, xp: 0, level: 1, badges: [], extra_media: 0 },
    });
  }
  user = await prisma.user.update({ where: { id: user.id }, data: { email_verified: true } });
  const token = signToken(user);
  const frontend = `${req.protocol}://${req.get("host")}/?google_token=${encodeURIComponent(token)}`;
  res.redirect(frontend);
}));
