import { Router } from "express";
import { prisma } from "../prisma.js";
import { optionalAuth } from "../lib/auth.js";
import { asyncHandler } from "../lib/errors.js";

export const searchRouter = Router();

// GET /api/search?q=&type=all|people|posts|listings|groups|audio — globalna wyszukiwarka.
searchRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const q = (typeof req.query.q === "string" ? req.query.q : "").trim();
    const type = typeof req.query.type === "string" ? req.query.type : "all";
    if (q.length < 2) return res.json({ query: q, people: [], posts: [], listings: [], groups: [], audio: [] });
    const like = { contains: q, mode: "insensitive" };
    const want = (t) => type === "all" || type === t;

    const [people, posts, listings, groups, audio] = await Promise.all([
      want("people")
        ? prisma.profile.findMany({
            where: { OR: [{ display_name: like }, { kennel_name: like }, { handle: like }, { city: like }, { bio: like }] },
            orderBy: { followers: "desc" },
            take: 20,
            select: { id: true, user_id: true, display_name: true, handle: true, kennel_name: true, avatar_url: true, city: true, verified: true, account_type: true, followers: true },
          })
        : [],
      want("posts")
        ? prisma.post.findMany({
            where: { status: "published", OR: [{ caption: like }, { breed: like }, { city: like }, { tags: { has: q.toLowerCase() } }] },
            orderBy: { created_date: "desc" },
            take: 20,
            select: { id: true, author_name: true, author_avatar: true, caption: true, image_url: true, video_url: true, likes: true, created_date: true },
          })
        : [],
      want("listings")
        ? prisma.listing.findMany({
            where: { status: "active", OR: [{ title: like }, { description: like }, { breed: like }, { city: like }, { species: like }] },
            orderBy: { created_date: "desc" },
            take: 20,
            select: { id: true, title: true, price: true, city: true, image_urls: true, species: true, breed: true, seller_verified: true },
          })
        : [],
      want("groups")
        ? prisma.group.findMany({
            where: { OR: [{ name: like }, { description: like }, { breed: like }, { city: like }] },
            orderBy: { members_count: "desc" },
            take: 15,
            select: { id: true, name: true, description: true, type: true, members_count: true, cover_url: true },
          })
        : [],
      want("audio")
        ? prisma.reelAudio.findMany({
            where: { OR: [{ title: like }, { artist: like }, { mood: like }] },
            orderBy: { usage_count: "desc" },
            take: 15,
          })
        : [],
    ]);

    res.json({ query: q, people, posts, listings, groups, audio });
  })
);
