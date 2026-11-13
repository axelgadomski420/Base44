import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest, tooMany } from "../lib/errors.js";
import { loadWallet, saveWallet } from "../lib/wallet.js";
import { GAME_CAPS, coinReward, levelFor, dailyGame, todayKey, dailyTarget, DAILY_BONUS } from "../lib/domain.js";

export const gamesRouter = Router();

const submitSchema = z.object({
  game: z.enum(["2048", "memory", "quiz", "puzzle"]),
  score: z.number().int().min(0).max(100000),
  duration_ms: z.number().int().min(1200).max(3_600_000),
});

// POST /api/games/submit â replaces the submitScore server function.
// Validates the score, applies the 8-second anti-spam window, awards coins/xp
// (including the daily bonus) and pushes the wallet update over Socket.IO.
gamesRouter.post(
  "/submit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = submitSchema.parse(req.body);
    const user = req.user;

    if (data.score > GAME_CAPS[data.game]) throw badRequest("NieprawidÅowy wynik");

    const recent = await prisma.gameScore.findFirst({
      where: { user_id: user.id, game: data.game },
      orderBy: { created_date: "desc" },
    });
    if (recent && Date.now() - new Date(recent.created_date).getTime() < 8000) {
      throw tooMany("Zbyt szybkie zgÅoszenie wyniku");
    }

    const wallet = await loadWallet(user.id);
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const day = todayKey();
    const today = dailyGame(day);
    const target = dailyTarget(today);
    const qualifiesDaily = data.game === today && data.score >= target && wallet.daily_done_on !== day;

    const earned = coinReward(data.game, data.score) + (qualifiesDaily ? DAILY_BONUS : 0);
    const nextXp = (wallet.xp ?? 0) + earned * 2;
    const nextLevel = levelFor(nextXp);

    await prisma.gameScore.create({
      data: {
        user_id: user.id,
        user_name: dbUser?.full_name || dbUser?.email || user.email,
        game: data.game,
        score: data.score,
        coins_earned: earned,
        duration_ms: data.duration_ms,
      },
    });

    const updated = await saveWallet(user.id, {
      coins: (wallet.coins ?? 0) + earned,
      xp: nextXp,
      level: nextLevel,
      ...(qualifiesDaily ? { daily_done_on: day } : {}),
    });

    res.json({
      earned,
      dailyBonus: qualifiesDaily,
      coins: updated.coins,
      xp: updated.xp,
      level: updated.level,
    });
  })
);
