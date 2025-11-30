import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Case, Thread, Message, Role, Material } from "../types";

const MODEL_REASONING = "gemini-3-pro-preview"; // Best for legal analysis
const MODEL_VOICE = "gemini-2.5-flash-native-audio-preview-09-2025"; // For checking status or light tasks

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Construct the prompt for analyzing a specific thread
export const analyzeArgument = async (
  currentCase: Case,
  thread: Thread,
  newEvidence: Material[] = []
): Promise<string> => {
  const ai = getAI();

  // Combine case materials and thread context
  const parts: any[] = [];
  
  // System Instruction equivalent in prompt for clarity or use config
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
  currentCase.materials.forEach(m => {
    parts.push({
      inlineData: {
        mimeType: m.type,
        data: m.data
      }
    });
    parts.push({ text: `[Document: ${m.name}]` });
  });

  // Add New Evidence specifically for this reply
  newEvidence.forEach(m => {
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
  thread.messages.forEach(msg => {
    parts.push({ text: `${msg.role === Role.USER ? 'Defense Attorney' : 'Opposing Counsel'}: ${msg.content}` });
  });
  parts.push({ text: "--- End of Argument Thread ---" });
  parts.push({ text: "Opposing Counsel Response:" });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: { parts },
      config: {
        // High reasoning effort for legal analysis
        thinkingConfig: { thinkingBudget: 1024 }, 
        temperature: 0.7 
      }
    });

    return response.text || "I have no further objections at this time.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

// Generate a dossier summary for the Voice Agent
export const generateVoiceDossier = async (currentCase: Case): Promise<string> => {
  const ai = getAI();
  
  const prompt = `
  Analyze the following legal case and create a "Dossier" for an AI Voice Agent who will play the Opposing Counsel.
  
  Title: ${currentCase.title}
  Background: ${currentCase.background}
  
  Threads/Arguments Summary:
  ${currentCase.threads.map(t => `- Topic: ${t.title}\n  Last Status: ${t.messages[t.messages.length-1]?.content.substring(0, 50)}...`).join('\n')}
  
  Output a concise system instruction paragraph that tells the AI:
  1. Who they are (Opposing Counsel).
  2. The core facts of the case.
  3. The key points of contention to pressure the user on.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_REASONING,
    contents: prompt
  });

  return response.text || "";
};
