import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { signToken, verifyToken } from "../lib/auth.js";

const authRouter = Router();

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: String(user.role || "user").toLowerCase(),
  };
}

const handleMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    const id = decoded.sub || decoded.userId;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const payload = publicUser(user);
    return res.json({ ...payload, user: payload });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const handleRegister = async (req, res) => {
  try {
    const { email, password, full_name, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email,
          password_hash: hashedPassword,
          full_name: full_name || name || email.split("@")[0],
        },
      });
    }
    const token = signToken(user);
    const payload = publicUser(user);
    return res.json({ access_token: token, token, user: payload });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken(user);
    const payload = publicUser(user);
    return res.json({ access_token: token, token, user: payload });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message });
  }
};

authRouter.post("/register", handleRegister);
authRouter.post("/verify-otp", handleRegister);
authRouter.post("/resend-otp", (_req, res) => res.json({ ok: true }));
authRouter.post("/login", handleLogin);
authRouter.post("/", handleLogin);
authRouter.get("/me", handleMe);
authRouter.get("/", handleMe);

export { authRouter };
