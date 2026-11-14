import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { config } from "../config.js";

const prisma = new PrismaClient();
const authRouter = Router();

const handleMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.json({ 
      id: user.id, 
      email: user.email, 
      full_name: user.full_name,
      user: { id: user.id, email: user.email, full_name: user.full_name } 
    });
  } catch (err) {
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
    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    return res.json({
      access_token: token,
      token: token,
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
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
    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    return res.json({
      access_token: token,
      token: token,
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message });
  }
};

authRouter.post("/register", handleRegister);
authRouter.post("/verify-otp", handleRegister);
authRouter.post("/resend-otp", (req, res) => res.json({ ok: true }));
authRouter.post("/login", handleLogin);
authRouter.post("/", handleLogin);
authRouter.get("/me", handleMe);
authRouter.get("/", handleMe);

export { authRouter };
