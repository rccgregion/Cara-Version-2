import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const client = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface GeminiRequest {
  userId: string;
  prompt: string;
  role?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  featureType?: string;
}

export interface GeminiResponse {
  text: string;
  tokensUsed: number;
  model: string;
}

// System prompts for different features
const SYSTEM_PROMPTS: Record<string, string> = {
  conversation: `You are an elite communication coach helping international professionals master negotiation and high-stakes conversations. Provide real-time feedback on tone, pace, clarity, and confidence. Simulate realistic corporate scenarios and adapt difficulty based on performance.`,

  writing: `You are a professional resume and communication expert. Analyze resume gaps, identify industry keywords, and simulate tough interview questions. Provide specific, actionable improvements with before/after examples.`,

  accent: `You are a speech coach for international professionals. Focus on clarity over perfection. Provide specific exercises for problematic phonemes and track improvement over sessions.`,

  listening: `You are a listening comprehension coach. After presenting an audio scenario, ask comprehension questions and provide constructive feedback on understanding.`,
};

export const callGemini = async (req: GeminiRequest): Promise<GeminiResponse> => {
  try {
    const systemPrompt = SYSTEM_PROMPTS[req.featureType || 'conversation'];

    // Build messages array
    const messages = req.conversationHistory || [];
    messages.push({
      role: 'user',
      content: req.prompt,
    });

    // Call Gemini API
    const model = client.getGenerativeModel({ model: 'gemini-pro' });
    const response = await model.generateContent({
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    });

    const text = response.response.text();
    
    // Estimate tokens used (rough approximation: 1 token ≈ 4 characters)
    const tokensUsed = Math.ceil((req.prompt.length + text.length) / 4);

    // Log quota usage
    await prisma.quotaUsage.create({
      data: {
        userId: req.userId,
        tokensUsed,
        requestType: 'gemini_' + (req.featureType || 'chat'),
      },
    });

    return {
      text,
      tokensUsed,
      model: 'gemini-2.0-flash',
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to process request with Gemini');
  }
};

export const generateStructuredFeedback = async (
  sessionData: any
): Promise<any> => {
  // This would call Gemini to generate structured feedback
  // For now, return a template structure

  return {
    overview: {
      score: 0,
      scoreChange: 0,
      timeOnTask: 0,
      completionRate: 0,
    },
    breakdown: {
      communication: {
        clarity: { score: 0, feedback: '' },
        pace: { score: 0, feedback: '' },
        tone: { score: 0, feedback: '' },
        confidence: { score: 0, feedback: '' },
      },
      content: {
        relevance: { score: 0, feedback: '' },
        structure: { score: 0, feedback: '' },
      },
    },
    highlights: [],
    actionItems: [],
  };
};
