import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { config } from "../config.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest } from "../lib/errors.js";

export const uploadsRouter = Router();

const CANDIDATE_DIRS = [
  config.uploadDir,
  "/var/www/purrepets/uploads",
  "/home/ubuntu/Base44/uploads",
  "/home/ubuntu/Base44/backend/uploads",
].map((dir) => path.resolve(dir));

function writableDir() {
  for (const dir of CANDIDATE_DIRS) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      // try the next location
    }
  }
  const fallback = path.resolve("uploads");
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

const uploadRoot = writableDir();

const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/aac", "audio/mp4", "audio/x-m4a",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : "";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(badRequest(`Unsupported file type: ${file.mimetype}`));
    cb(null, true);
  },
});

function findFile(name) {
  const safe = path.basename(name);
  if (!safe || safe !== name || safe.includes("..")) return null;
  for (const dir of CANDIDATE_DIRS) {
    const file = path.resolve(dir, safe);
    if (!file.startsWith(dir + path.sep) && file !== dir) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

// Public file bytes. Lives under /api so Nginx (which 403s /uploads/) still serves media.
uploadsRouter.get("/file/:name", (req, res) => {
  const file = findFile(req.params.name);
  if (!file) return res.status(404).json({ error: { message: "File not found", code: "NOT_FOUND" } });
  res.setHeader("Cache-Control", "public, max-age=2592000");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.sendFile(file);
});

// POST /api/uploads (multipart, field "file") → { file_url }
uploadsRouter.post(
  "/",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded (expected multipart field "file")');
    const base = config.publicBaseUrl.replace(/\/$/, "");
    res.status(201).json({
      file_url: `${base}/api/uploads/file/${req.file.filename}`,
      url: `${base}/api/uploads/file/${req.file.filename}`,
    });
  })
);
