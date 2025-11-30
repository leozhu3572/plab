import { Case, Thread, Material } from "../types";

// Construct the prompt for analyzing a specific thread
export const analyzeArgument = async (
  currentCase: Case,
  thread: Thread,
  newEvidence: Material[] = []
): Promise<string> => {
  try {
    const response = await fetch('/api/analyze-argument', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentCase,
        thread,
        newEvidence
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "I have no further objections at this time.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

// Generate a dossier summary for the Voice Agent
export const generateVoiceDossier = async (currentCase: Case): Promise<string> => {
  try {
    const response = await fetch('/api/generate-dossier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentCase
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.dossier || "";
  } catch (error) {
    console.error("Gemini Dossier Generation Error:", error);
    throw error;
  }
};
