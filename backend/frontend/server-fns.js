// Replacement for the TanStack Start server functions in src/lib/server-fns.js.
// All heavy logic now lives in the self-hosted backend; these are plain async
// client-side calls.
//
// Call-site changes (they used `useServerFn(...)`):
//   create.jsx:         const { listing, cost } = await createListing({ data: {...} });
//                       const result = await moderateListing({ data: { listing_id } });
//   rewards.jsx:        await redeemReward({ data: { reward_key, target_id } });
//   useGameSubmit.js:   const result = await submitScore({ data: { game, score, duration_ms } });
//   AssistantPanel.jsx: const { answer } = await askAssistant({ data: { question } });
//
// In those files remove `useServerFn` usage and call these functions directly.

import base44 from "@/api/base44Client";

export const getServerInfo = async () => ({ renderedAt: new Date().toISOString() });

export const submitScore = ({ data }) => base44.functions.submitScore(data);

export const redeemReward = ({ data }) => base44.functions.redeemReward(data);

export const createListing = ({ data }) => base44.functions.createListing(data);

export const moderateListing = ({ data }) => base44.functions.moderateListing(data);

export const askAssistant = ({ data }) => base44.functions.askAssistant(data);

export { LISTING_COST } from "@/lib/games"; // unchanged constant
