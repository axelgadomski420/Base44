import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { levelFor } from "@/lib/format";
import { GAME_CAPS, DAILY_BONUS, dailyGame, todayKey, dailyTarget } from "@/lib/games";
import { REWARD_BY_KEY } from "@/lib/rewards";
import { coordsFor } from "@/lib/geo";

export const getServerInfo = createServerFn({ method: "GET" }).handler(async () => ({
  renderedAt: new Date().toISOString(),
}));

const coinReward = (game, score) => {
  const divisor = { "2048": 10, memory: 5, quiz: 8, puzzle: 6 }[game] ?? 10;
  return Math.min(200, Math.max(5, Math.round(score / divisor)));
};

async function loadWallet(service, userId) {
  const page = await service.entities.Wallet.filter({ user_id: userId }, { limit: 1 });
  const wallet = page.items?.[0];
  if (wallet) return wallet;
  return service.entities.Wallet.create({
    user_id: userId,
    coins: 0,
    xp: 0,
    level: 1,
    badges: [],
    extra_media: 0,
  });
}

export const submitScore = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      game: z.enum(["2048", "memory", "quiz", "puzzle"]),
      score: z.number().int().min(0).max(100000),
      duration_ms: z.number().int().min(1200).max(3_600_000),
    })
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;

    if (data.score > GAME_CAPS[data.game]) {
      throw Object.assign(new Error("Nieprawidłowy wynik"), { status: 400 });
    }

    const recent = await service.entities.GameScore.filter(
      { user_id: user.id, game: data.game },
      { sort: "-created_date", limit: 1 }
    );
    const last = recent.items?.[0];
    if (last && Date.now() - new Date(last.created_date).getTime() < 8000) {
      throw Object.assign(new Error("Zbyt szybkie zgłoszenie wyniku"), { status: 429 });
    }

    const wallet = await loadWallet(service, user.id);
    const day = todayKey();
    const today = dailyGame(day);
    const target = dailyTarget(today);
    const qualifiesDaily =
      data.game === today && data.score >= target && wallet.daily_done_on !== day;

    const earned = coinReward(data.game, data.score) + (qualifiesDaily ? DAILY_BONUS : 0);
    const nextXp = (wallet.xp ?? 0) + earned * 2;
    const nextLevel = levelFor(nextXp);

    await service.entities.GameScore.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      game: data.game,
      score: data.score,
      coins_earned: earned,
      duration_ms: data.duration_ms,
    });

    const updated = await service.entities.Wallet.update(wallet.id, {
      coins: (wallet.coins ?? 0) + earned,
      xp: nextXp,
      level: nextLevel,
      ...(qualifiesDaily ? { daily_done_on: day } : {}),
    });

    return {
      earned,
      dailyBonus: qualifiesDaily,
      coins: updated.coins,
      xp: updated.xp,
      level: updated.level,
    };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      reward_key: z.enum([
        "boost_listing",
        "boost_profile",
        "extra_media",
        "frame",
        "badge",
        "theme",
        "event",
        "partner",
        "verification",
      ]),
      target_id: z.string().max(64).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;
    const reward = REWARD_BY_KEY[data.reward_key];
    if (!reward) throw Object.assign(new Error("Nieznana nagroda"), { status: 400 });

    const wallet = await loadWallet(service, user.id);
    if ((wallet.coins ?? 0) < reward.cost) {
      throw Object.assign(new Error("Za mało monet"), { status: 400 });
    }

    const patch = { coins: (wallet.coins ?? 0) - reward.cost };
    let status = "pending";

    if (reward.key === "extra_media") {
      patch.extra_media = (wallet.extra_media ?? 0) + 3;
      status = "applied";
    }
    if (reward.key === "frame") {
      patch.frame = "aura";
      status = "applied";
    }
    if (reward.key === "theme") {
      patch.badges = Array.from(new Set([...(wallet.badges ?? []), "motyw-premium"]));
      status = "applied";
    }
    if (reward.key === "badge") {
      patch.badges = Array.from(new Set([...(wallet.badges ?? []), "hodowca-plus"]));
      status = "applied";
    }
    if (reward.key === "boost_profile") {
      patch.boost_until = new Date(Date.now() + 7 * 86400000).toISOString();
      status = "applied";
    }
    if (reward.key === "boost_listing") {
      if (!data.target_id) throw Object.assign(new Error("Wybierz ogłoszenie"), { status: 400 });
      const listing = await service.entities.Listing.get(data.target_id);
      if (listing.seller_id !== user.id) {
        throw Object.assign(new Error("Brak dostępu do ogłoszenia"), { status: 403 });
      }
      await service.entities.Listing.update(listing.id, {
        boosted_until: new Date(Date.now() + 86400000).toISOString(),
      });
      status = "applied";
    }

    await service.entities.Wallet.update(wallet.id, patch);
    const redemption = await service.entities.Redemption.create({
      user_id: user.id,
      reward_key: reward.key,
      reward_label: reward.key,
      cost: reward.cost,
      status,
      target_id: data.target_id,
    });

    return { redemption, coins: patch.coins };
  });

const MODERATION_SCHEMA = {
  type: "object",
  properties: {
    risk: { type: "number" },
    category: { type: "string" },
    reason: { type: "string" },
    decision: { type: "string", enum: ["allow", "review"] },
  },
  required: ["risk", "category", "reason", "decision"],
};

export const moderateListing = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ listing_id: z.string().max(64) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;
    const listing = await service.entities.Listing.get(data.listing_id);
    if (!listing || (listing.seller_id !== user.id && user.role !== "admin")) {
      throw Object.assign(new Error("Brak dostępu"), { status: 403 });
    }

    const prompt = `Jesteś moderatorem marketplace'u hodowlanego PURRE PETS. Oceń ogłoszenie pod kątem: handlu zwierzętami bez dokumentacji, treści nielegalnych, spamu, prób oszustwa, zaniżonych/absurdalnych cen, presji emocjonalnej, braku informacji o hodowli.
Tytuł: ${listing.title}
Opis: ${listing.description ?? "(brak)"}
Cena: ${listing.price ?? 0} PLN
Gatunek: ${listing.species ?? "nie podano"} / rasa: ${listing.breed ?? "nie podano"}
Miasto: ${listing.city}
Zwróć risk 0-100 (100 = bardzo ryzykowne), category (krótka kategoria), reason po polsku (max 200 znaków) i decision: allow gdy risk < 60, review gdy >= 60.`;

    const result = await service.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: MODERATION_SCHEMA,
    });

    const risk = Math.max(0, Math.min(100, Number(result?.risk ?? 0)));
    const decision = result?.decision === "review" ? "review" : "allow";

    const updated = await service.entities.Listing.update(listing.id, {
      risk,
      status: decision === "review" ? "review" : listing.status === "review" ? "active" : listing.status,
      moderation_note: result?.reason ?? "",
    });

    return { risk, decision, reason: result?.reason ?? "", listing: updated };
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ question: z.string().min(2).max(600) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const answer = await service.integrations.Core.InvokeLLM({
      prompt: `Jesteś PURRE Assistant — asystentem marketplace'u hodowlanego PURRE PETS dla psów i kotów rasowych w Polsce. Odpowiadaj po polsku, rzeczowo, maksymalnie 900 znaków. Nie diagnozuj chorób — przy problemach zdrowotnych odeślij do weterynarza. Nie pomagaj w omijaniu prawa ani w handlu zwierzętami bez dokumentacji.
Pytanie użytkownika: ${data.question}`,
    });
    return { answer: typeof answer === "string" ? answer : String(answer ?? "") };
  });

export const LISTING_COST = 20;

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      kind: z.enum(["sale", "adoption"]),
      title: z.string().min(3).max(120),
      description: z.string().max(4000).optional(),
      price: z.number().min(0).max(1_000_000).optional(),
      species: z.enum(["dog", "cat"]),
      breed: z.string().max(80).optional(),
      age_months: z.number().int().min(0).max(480).optional(),
      city: z.string().min(2).max(80),
      image_urls: z.array(z.string().max(600)).max(6).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;

    const profilePage = await service.entities.Profile.filter({ user_id: user.id }, { limit: 1 });
    const profile = profilePage.items?.[0];
    if (profile?.account_type !== "breeder") {
      throw Object.assign(
        new Error("Ogłoszenia dodają konta hodowcy — przełącz konto na hodowcę."),
        { status: 403 }
      );
    }

    const owned = await service.entities.Listing.count({ seller_id: user.id });
    const cost = owned === 0 ? 0 : LISTING_COST;
    const wallet = await loadWallet(service, user.id);
    if (cost > 0 && (wallet.coins ?? 0) < cost) {
      throw Object.assign(
        new Error(`Potrzebujesz ${cost} PURRE coinów — zagraj w Arcade, aby je zdobyć.`),
        { status: 400 }
      );
    }

    const coords = coordsFor(data.city) ?? {};
    const listing = await service.entities.Listing.create({
      ...data,
      lat: coords.lat,
      lng: coords.lng,
      seller_id: user.id,
      seller_name: profile.kennel_name || profile.display_name || user.full_name,
      seller_verified: !!profile.verified,
      status: "active",
    });

    let coins = wallet.coins ?? 0;
    if (cost > 0) {
      coins -= cost;
      await service.entities.Wallet.update(wallet.id, { coins });
    }

    return { listing, cost, coins, free: cost === 0 };
  });
