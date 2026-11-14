// Drop-in replacement for the Base44 SDK client.
//
// Keeps the same exported API surface used across the app (`base44.entities.*`,
// `base44.auth.*`, `base44.integrations.Core.UploadPublicFile`) but talks to the
// self-hosted backend (Express + PostgreSQL + Socket.IO) instead of Base44.
//
// Requires: npm i socket.io-client
// Env: VITE_API_URL (e.g. "" when same-origin behind nginx, or "http://92.5.154.243")

import { io } from "socket.io-client";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "purre_access_token";

if (typeof window !== "undefined") {
  try {
    const current = new URL(window.location.href);
    const googleToken = current.searchParams.get("google_token");
    if (googleToken) {
      localStorage.setItem(TOKEN_KEY, googleToken);
      current.searchParams.delete("google_token");
      window.history.replaceState({}, "", current.toString());
    }
  } catch {}
}

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || payload?.detail || `Request failed (${status})`);
    this.status = status;
    this.data = payload;
  }
}

function token() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", body, formData } = {}) {
  const headers = {};
  const current = token();
  if (current) headers.Authorization = `Bearer ${current}`;
  if (formData === undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "omit",
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

// ---------------------------------------------------------------- Socket.IO

let socket = null;

function getSocket() {
  if (socket) return socket;
  socket = io(API_URL || window.location.origin, {
    path: "/socket.io",
    auth: { token: token() },
    transports: ["websocket", "polling"],
  });
  return socket;
}

// ---------------------------------------------------------------- Entities

const ENTITY_PATHS = {
  Profile: "Profile",
  Listing: "Listing",
  Pet: "Pet",
  Post: "Post",
  Comment: "Comment",
  Like: "Like",
  Follow: "Follow",
  Conversation: "Conversation",
  Message: "Message",
  Wallet: "Wallet",
  Redemption: "Redemption",
  GameScore: "GameScore",
};

function pageOptions(opts = {}) {
  const params = new URLSearchParams();
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  if (opts.skip != null) params.set("skip", String(opts.skip));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function createEntity(name) {
  const base = `/api/entities/${ENTITY_PATHS[name]}`;
  return {
    async list(params, opts) {
      return request(`${base}/list${pageOptions({ ...(params ?? {}), ...(opts ?? {}) })}`);
    },
    async filter(where, opts) {
      return request(`${base}/query`, {
        method: "POST",
        body: { where: where ?? {}, ...(opts ?? {}) },
      });
    },
    async count(where) {
      const result = await request(`${base}/count`, { method: "POST", body: { where: where ?? {} } });
      return typeof result === "number" ? result : result?.count ?? 0;
    },
    async get(id) {
      return request(`${base}/${id}`);
    },
    async create(data) {
      return request(base, { method: "POST", body: data ?? {} });
    },
    async update(id, data) {
      return request(`${base}/${id}`, { method: "PATCH", body: data ?? {} });
    },
    async delete(id) {
      return request(`${base}/${id}`, { method: "DELETE" });
    },
    // Same event shape as Base44: { type: "create" | "update" | "delete", data }
    subscribe(callback) {
      const client = getSocket();
      const handler = (event) => callback(event);
      client.on("entity:event", handler);
      client.emit("subscribe", { entity: name });
      return () => {
        client.off("entity:event", handler);
        client.emit("unsubscribe", {});
      };
    },
  };
}

const entities = Object.fromEntries(Object.keys(ENTITY_PATHS).map((name) => [name, createEntity(name)]));

// ---------------------------------------------------------------- Auth

export const auth = {
  hasToken: () => !!token(),
  setToken: (value) => {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  },
  async me() {
    if (!token()) {
      const error = new Error("Unauthorized");
      error.status = 401;
      throw error;
    }
    return request("/api/auth/me");
  },
  async loginWithPassword(email, password) {
    const result = await request("/api/auth/login", { method: "POST", body: { email, password } });
    if (result.access_token) auth.setToken(result.access_token);
    return result;
  },
  async register(email, password, fullName) {
    return request("/api/auth/register", { method: "POST", body: { email, password, full_name: fullName } });
  },
  async verifyOtp(email, otpCode) {
    const result = await request("/api/auth/verify-otp", { method: "POST", body: { email, otp_code: otpCode } });
    if (result.access_token) auth.setToken(result.access_token);
    return result;
  },
  async resendOtp(email) {
    return request("/api/auth/resend-otp", { method: "POST", body: { email } });
  },
  async logout() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      // token cleanup happens regardless
    }
    auth.setToken(null);
  },
  // Social login is not available on the self-hosted backend; send users to /login.
  loginWithProvider: (provider, returnTo) => {
    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo ?? window.location.href)}`);
  },
  redirectToLogin: (returnTo) => {
    window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo ?? window.location.href)}`);
  },
};

// ---------------------------------------------------------------- Server functions

export const functions = {
  submitScore: (data) => request("/api/games/submit", { method: "POST", body: data }),
  redeemReward: (data) => request("/api/rewards/redeem", { method: "POST", body: data }),
  createListing: (data) => request("/api/listings/with-cost", { method: "POST", body: { data } }),
  moderateListing: (data) => request(`/api/listings/${data.listing_id}/moderate`, { method: "POST", body: {} }),
  askAssistant: (data) => request("/api/assistant/ask", { method: "POST", body: data }),
};

// ---------------------------------------------------------------- Public client

export const base44 = {
  auth,
  functions,
  entities,
  integrations: {
    Core: {
      // Replaces base44.integrations.Core.UploadPublicFile({ file }) â { file_url }
      async UploadPublicFile({ file }) {
        const formData = new FormData();
        formData.append("file", file);
        return request("/api/uploads", { method: "POST", formData });
      },
    },
  },
};

export default base44;
