import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { config } from "../config.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest } from "../lib/errors.js";

export const uploadsRouter = Router();

fs.mkdirSync(path.resolve(config.uploadDir), { recursive: true });

const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve(config.uploadDir)),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : "";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(badRequest(`Unsupported file type: ${file.mimetype}`));
    cb(null, true);
  },
});

// POST /api/uploads (multipart, field "file") â { file_url }
// Replaces base44.integrations.Core.UploadPublicFile.
uploadsRouter.post(
  "/",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded (expected multipart field \"file\")");
    const base = config.publicBaseUrl.replace(/\/$/, "");
    res.status(201).json({ file_url: `${base}/uploads/${req.file.filename}` });
  })
);
