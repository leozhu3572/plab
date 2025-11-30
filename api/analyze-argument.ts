import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL_REASONING = "gemini-3-pro-preview";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentCase, thread, newEvidence = [] } = req.body;

    if (!currentCase || !thread) {
      return res.status(400).json({ error: 'Missing required fields: currentCase and thread' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const parts: any[] = [];

    const systemPrompt = `You are a highly skilled, adversarial opposing counsel in a mock trial.
  Your goal is to scrutinize the user's argument strictly based on the provided evidence and case background.

  Case Title: ${currentCase.title}
  Case Background: ${currentCase.background}

  Instructions:
  1. Analyze the user's latest argument in the thread.
  2. Identify weaknesses, lack of evidence, or logical fallacies.
  3. If you make an objection, you MUST cite specific parts of the provided materials (documents, images, text).
  4. Be professional but firm. Do not be helpful; be challenging.
  5. Keep your response concise (under 200 words) but impactful unless the complexity requires more.
  `;

    parts.push({ text: systemPrompt });

    // Add Case Materials
    currentCase.materials.forEach((m: any) => {
      parts.push({
        inlineData: {
          mimeType: m.type,
          data: m.data
        }
      });
      parts.push({ text: `[Document: ${m.name}]` });
    });

    // Add New Evidence
    newEvidence.forEach((m: any) => {
      parts.push({
        inlineData: {
          mimeType: m.type,
          data: m.data
        }
      });
      parts.push({ text: `[New Evidence: ${m.name}]` });
    });

    // Add Thread History
    parts.push({ text: "--- Start of Argument Thread ---" });
    thread.messages.forEach((msg: any) => {
      parts.push({ text: `${msg.role === 'user' ? 'Defense Attorney' : 'Opposing Counsel'}: ${msg.content}` });
    });
    parts.push({ text: "--- End of Argument Thread ---" });
    parts.push({ text: "Opposing Counsel Response:" });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
        temperature: 0.7
      }
    });

    return res.status(200).json({
      response: response.text || "I have no further objections at this time."
    });
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return res.status(500).json({
      error: 'Failed to analyze argument',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
