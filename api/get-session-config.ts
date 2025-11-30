import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return the API key securely for initializing the live session
    // This is still a limitation - the Live API requires client-side connection
    // For production, consider using Gemini's server-side streaming or alternative approaches
    return res.status(200).json({
      apiKey: process.env.GEMINI_API_KEY
    });
  } catch (error) {
    console.error("Session config error:", error);
    return res.status(500).json({
      error: 'Failed to get session config',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
