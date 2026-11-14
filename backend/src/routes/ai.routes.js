import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Brak promptu" });
    }

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "speakleash/bielik-7b-instruct-v0.1:Q4_K_M",
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();
    res.json({ response: data.response });
  } catch (err) {
    console.error("Błąd LLM:", err);
    res.status(500).json({ error: "Błąd komunikacji z modelem AI" });
  }
});

export default router;
