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

// Limity per typ (Moduł 2): zdjęcia 10 MB, wideo 100 MB (Reels), audio 20 MB.
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = Number(config.maxUploadBytes) || 100 * 1024 * 1024;
const AUDIO_LIMIT = 20 * 1024 * 1024;
const LIMITS = { image: IMAGE_LIMIT, video: VIDEO_LIMIT, audio: AUDIO_LIMIT };

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
};

const ALLOWED = new Set(Object.keys(MIME_EXT));
const EXT_TYPE = Object.fromEntries(Object.entries(MIME_EXT).map(([mime, ext]) => [ext, mime]));

function categoryOf(mime) {
  if (typeof mime !== "string") return null;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

// Unikalne nazwy: timestamp + UUID v4 — zero kolizji.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : (MIME_EXT[file.mimetype] ?? "");
    cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: VIDEO_LIMIT, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(badRequest(`Nieobsługiwany typ pliku: ${file.mimetype}`));
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

/**
 * GET/HEAD /api/uploads/file/:name — obsługa HTTP Range (206 Partial Content),
 * dzięki której wideo w Reels i czacie się przewija i streamuje płynnie.
 */
uploadsRouter.get("/file/:name", (req, res) => {
  const file = findFile(req.params.name);
  if (!file) return res.status(404).json({ error: { message: "File not found", code: "NOT_FOUND" } });

  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return res.status(404).json({ error: { message: "File not found", code: "NOT_FOUND" } });
  }

  const type = EXT_TYPE[path.extname(file).toLowerCase()] ?? "application/octet-stream";
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=2592000");
  res.setHeader("Content-Type", type);
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("ETag", `"${stat.size}-${Math.floor(stat.mtimeMs)}"`);

  if (req.method === "HEAD") {
    res.setHeader("Content-Length", stat.size);
    return res.end();
  }

  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim());
    if (match) {
      let start = match[1] === "" ? NaN : parseInt(match[1], 10);
      let end = match[2] === "" ? NaN : parseInt(match[2], 10);
      if (Number.isNaN(start)) {
        start = Math.max(0, stat.size - (Number.isNaN(end) ? 0 : end));
        end = stat.size - 1;
      } else if (Number.isNaN(end) || end >= stat.size) {
        end = stat.size - 1;
      }
      if (start <= end && start < stat.size) {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
        res.setHeader("Content-Length", end - start + 1);
        const stream = fs.createReadStream(file, { start, end });
        stream.on("error", () => res.destroy());
        return stream.pipe(res);
      }
      res.status(416);
      res.setHeader("Content-Range", `bytes */${stat.size}`);
      return res.end();
    }
  }

  res.setHeader("Content-Length", stat.size);
  const stream = fs.createReadStream(file);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).end();
    else res.destroy();
  });
  stream.pipe(res);
});

// POST /api/uploads (multipart, pole "file") → { file_url } — z limitem per kategoria.
uploadsRouter.post(
  "/",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded (expected multipart field "file")');
    const category = categoryOf(req.file.mimetype);
    const limit = LIMITS[category];
    if (limit && req.file.size > limit) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(413).json({
        error: {
          message: `Plik za duży (max ${Math.floor(limit / (1024 * 1024))} MB dla ${category})`,
          code: "FILE_TOO_LARGE",
        },
      });
    }
    const base = config.publicBaseUrl.replace(/\/$/, "");
    const url = `${base}/api/uploads/file/${req.file.filename}`;
    res.status(201).json({ file_url: url, url, size: req.file.size, type: req.file.mimetype });
  })
);
