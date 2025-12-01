import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { processPrompt as backendProcessPrompt } from "./api";

// Use backend proxy instead of direct API access
const getClient = () => {
  // No longer need direct API access - backend handles it
  return null; // Deprecated
};

const safeParseJSON = (text: string) => {
  try {
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return {};
  }
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, s, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const GeminiService = {
  async generateText(prompt: string, systemInstruction?: string) {
    const ai = getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text || "No response generated.";
    } catch (error) { throw error; }
  },

  async searchJobs(query: string, userRole: string) {
    const ai = getClient();
    try {
      const prompt = `Act as an Executive Recruiter. Find 5 highly relevant remote job listings for a ${userRole} suitable for an international professional applying to US companies. Search query: ${query}. 
      Focus on roles that sponsor visas or accept remote contractors.
      Return strictly a JSON array: [{title, company, location, description, url}]`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });
      return safeParseJSON(response.text || "[]");
    } catch (error) { return []; }
  },

  async analyzeAccent(audioBase64: string, referenceText: string) {
    const ai = getClient();
    try {
      const prompt = `Act as a Linguistic Coach specializing in General American Accent (GenAm). 
      Analyze this audio recording of a speaker reading: "${referenceText}".
      Provide feedback in JSON format: { "score": number, "feedback": ["string"] }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'audio/webm', data: audioBase64 } }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      return safeParseJSON(response.text || "{}");
    } catch (error) { throw error; }
  },

  async connectLive(
    ctx: AudioContext,
    systemInstruction: string,
    persona: string,
    onAudioData: (buffer: AudioBuffer) => void,
    onInterrupted: () => void,
    onClose: () => void
  ) {
    const ai = getClient();
    const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";
    
    const personaInstructions = {
        'default': "ROLE: Expert Communication Coach. TONE: Professional, encouraging. OBJECTIVE: Improve American Business English.",
        'skeptic': "ROLE: Skeptical Senior Hiring Manager. TONE: Critical, detail-oriented. OBJECTIVE: Drill down into vague answers.",
        'ally': "ROLE: Supportive Mentor. TONE: Warm, patient. OBJECTIVE: Build confidence.",
        'executive': "ROLE: Fortune 500 CEO. TONE: Direct, impatient. OBJECTIVE: Test high-value communication."
    };

    const finalSystemInstruction = `${systemInstruction}\n\n${personaInstructions[persona as keyof typeof personaInstructions] || personaInstructions['default']}`;

    return ai.live.connect({
      model: MODEL,
      config: {
        systemInstruction: finalSystemInstruction,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
      callbacks: {
        onopen: () => console.log("Session Opened"),
        onmessage: async (msg: LiveServerMessage) => {
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            const uint8Array = base64ToUint8Array(audioData);
            const int16Array = new Int16Array(uint8Array.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
              float32Array[i] = int16Array[i] / 32768.0;
            }
            const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
            audioBuffer.copyToChannel(float32Array, 0);
            onAudioData(audioBuffer);
          }
          if (msg.serverContent?.interrupted) {
            onInterrupted();
          }
        },
        onclose: () => onClose(),
        onerror: (err) => onClose()
      }
    });
  },

  sendLiveAudioChunk(session: any, float32Data: Float32Array) {
    if (!session) return;
    const pcm16 = floatTo16BitPCM(float32Data);
    const base64Params = arrayBufferToBase64(pcm16);
    session.sendRealtimeInput({
      media: { mimeType: "audio/pcm;rate=16000", data: base64Params }
    });
  },

  async analyzeVideoSession(frames: string[], audioTranscript: string, question: string) {
    const ai = getClient();
    try {
      const parts = [];
      parts.push({ text: `ROLE: Non-Verbal Communication Expert. QUESTION: "${question}". TRANSCRIPT: "${audioTranscript}". Analyze confidence evolution, non-verbal cues, and consistency. Output JSON.` });
      frames.forEach(frameData => {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: frameData } });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: { responseMimeType: "application/json" }
      });
      return safeParseJSON(response.text || "{}");
    } catch (error) { throw error; }
  },

  async culturalTranslate(phrase: string) {
    const ai = getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze phrase: "${phrase}" for US Corporate Culture. JSON: { perception, hiddenMeaning, alternatives: string[] }`,
        config: { responseMimeType: "application/json" }
      });
      return safeParseJSON(response.text || "{}");
    } catch (error) { throw error; }
  },

  async gapAnalysis(resumeText: string, jobDescription: string) {
    const ai = getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Resume Gap Analysis.\nRESUME: ${resumeText.substring(0, 10000)}\nJOB: ${jobDescription.substring(0, 10000)}\nJSON: { missingHardSkills: string[], missingSoftSkills: string[], experienceGaps: string[], score: number }`,
        config: { 
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      return safeParseJSON(response.text || "{}");
    } catch (error) { throw error; }
  },

  async analyzePresentation(text: string) {
    const ai = getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze presentation text.\nCONTENT: "${text.substring(0, 10000)}..."\nJSON: { summary, qa: [{ question, answer }], improvements: string[] }`,
        config: { 
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      return safeParseJSON(response.text || "{}");
    } catch (error) { throw error; }
  },
  
  async generateListeningScenario(topic: string, difficulty: string) {
    const ai = getClient();
    try {
      const prompt = `Create a realistic workplace listening scenario for an English learner. 
      TOPIC: ${topic}. 
      DIFFICULTY: ${difficulty}.
      CONTEXT: Create a scenario with a specific 'Audio Texture' (e.g., Busy Coffee Shop, Quiet Office, Zoom Call with slight echo).
      TASKS:
      1. Write a script (~150 words).
      2. Extract 3-5 key idioms/vocabulary words used in the script.
      3. Create 3 comprehension questions.
      
      Output strictly JSON: 
      { 
        "title": string, 
        "context": string,
        "transcript": string, 
        "vocabulary": [{ "term": string, "definition": string }],
        "questions": [{ "id": number, "question": string, "options": string[], "correctAnswer": number }] 
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return safeParseJSON(response.text || "{}");
    } catch (error) { throw error; }
  },

  async generateSpeech(text: string, voiceName: string = 'Kore'): Promise<string | null> {
    const ai = getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) { throw error; }
  },

  async decodeAudio(base64: string, ctx: AudioContext) {
     const binaryString = atob(base64);
     const len = binaryString.length;
     const bytes = new Uint8Array(len);
     for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
     const int16 = new Int16Array(bytes.buffer);
     const float32 = new Float32Array(int16.length);
     for (let i = 0; i < int16.length; i++) { float32[i] = int16[i] / 32768.0; }
     const buffer = ctx.createBuffer(1, float32.length, 24000);
     buffer.copyToChannel(float32, 0);
     return buffer;
  },
  
  async analyzeATS(resumeText: string, jobDescription: string) {
      const ai = getClient();
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `ATS Analysis. RESUME: ${resumeText}\nJOB: ${jobDescription}\nJSON: {score, missingKeywords, formattingIssues, improvementTips}`,
              config: { responseMimeType: "application/json" }
          });
          return safeParseJSON(response.text || "{}");
      } catch (e) { throw e; }
  },
  
  async optimizeResumeJSON(resumeText: string, jobDescription: string, intensity: 'strict' | 'creative' = 'strict') {
      const ai = getClient();
      const instruction = intensity === 'strict' 
          ? "Enhance existing content. Do not invent facts. Improve grammar, formatting, and impact verbs." 
          : "Rewrite to align with JD. You may rephrase bullets significantly but maintain core truth.";

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Act as a Resume Writer. ${instruction}\nRESUME: ${resumeText}\nJOB: ${jobDescription}\nOutput JSON: {fullName, contactInfo, summary, experience[{company,role,dates,bullets}], education[{school,degree,year}], skills:{technical,soft,tools}}`,
              config: { responseMimeType: "application/json" }
          });
          return safeParseJSON(response.text || "{}");
      } catch (e) { throw e; }
  },

  async generateBio(context: string, platform: string) {
      const ai = getClient();
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Write professional ${platform} bio for: ${context}.`
          });
          return response.text;
      } catch (e) { throw e; }
  },
};