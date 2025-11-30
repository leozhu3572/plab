import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL_REASONING = "gemini-3-pro-preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentCase } = req.body;

    if (!currentCase) {
      return res.status(400).json({ error: 'Missing required field: currentCase' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
  Analyze the following legal case and create a "Dossier" for an AI Voice Agent who will play the Opposing Counsel.

  Title: ${currentCase.title}
  Background: ${currentCase.background}

  Threads/Arguments Summary:
  ${currentCase.threads.map((t: any) => `- Topic: ${t.title}\n  Last Status: ${t.messages[t.messages.length - 1]?.content.substring(0, 50)}...`).join('\n')}

  Output a concise system instruction paragraph that tells the AI:
  1. Who they are (Opposing Counsel).
  2. The core facts of the case.
  3. The key points of contention to pressure the user on.
  `;

    const response = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: prompt
    });

    return res.status(200).json({
      dossier: response.text || ""
    });
  } catch (error) {
    console.error("Gemini Dossier Generation Error:", error);
    return res.status(500).json({
      error: 'Failed to generate dossier',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
