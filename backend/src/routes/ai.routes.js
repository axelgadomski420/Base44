import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const aiRouter = Router();

aiRouter.post('/chat', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Symulacja / integracja odpowiedzi LLM dla asystenta Purre Pets
    const aiResponse = `Purre Pets AI Assistant: Otrzymałem Twoje zapytanie dotyczące "${prompt}". Dbaj o swojego zwierzaka najlepiej jak potrafisz!`;

    if (userId) {
      await prisma.aILog.create({
        data: { prompt, response: aiResponse, userId }
      }).catch(() => {}); // Ignorujemy błąd zapisu logu, jeśli userId jest tymczasowe
    }

    return res.json({ result: aiResponse });
  } catch (err) {
    console.error('AI LLM error:', err);
    return res.status(500).json({ error: 'AI processing failed' });
  }
});

export { aiRouter };
export default aiRouter;
