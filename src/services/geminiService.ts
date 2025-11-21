import { GoogleGenAI, Type } from "@google/genai";
import { AIBackendType, Clip, MediaType } from "../types";

// Ensure API key is present from environment
const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Simulates a local inference delay for the "Local" backend option.
 * In a real electron app, this would call the Python/C++ backend via IPC.
 */
const simulateLocalInference = async (durationMs: number = 2000) => {
  return new Promise(resolve => setTimeout(resolve, durationMs));
};

export const generateAssistantResponse = async (
  history: { role: string; content: string }[],
  currentMessage: string,
  backend: AIBackendType
): Promise<string> => {
  if (backend === AIBackendType.LOCAL) {
    await simulateLocalInference(1500);
    return `[LOCAL INFERENCE]: I've analyzed your request locally using 'Llama-3-8B-Instruct.safetensors'. I can help you edit the timeline or generate local assets.`;
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are Illumi, an advanced AI Assistant inside a professional Non-Linear Editor (NLE). 
        You help users edit video, generate assets, and script stories. 
        Keep responses concise, professional, and helpful. 
        If the user asks to cut a video, suggest using the Cut List tool.`,
      },
    });

    const contextPrompt = `
      Context: User is asking: "${currentMessage}"
      Previous conversation summary: ${history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}
    `;

    const result = await chat.sendMessage({ message: contextPrompt });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Error connecting to Gemini Cloud. Please check your API Key.";
  }
};

export const generateImageComponent = async (
  prompt: string,
  backend: AIBackendType
): Promise<{ url: string; prompt: string }> => {
  if (backend === AIBackendType.LOCAL) {
    await simulateLocalInference(3000);
    return {
      url: `https://picsum.photos/seed/${Math.random()}/1280/720`,
      prompt: `[LOCAL] ${prompt}`
    };
  }

  try {
    // Using gemini-3-pro-image-preview for high quality asset generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
        }
      }
    });

    // Extract image
    let imageUrl = '';
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("No image generated");

    return { url: imageUrl, prompt };
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    // Fallback if API fails
    return {
      url: `https://picsum.photos/seed/${Math.random()}/1280/720`,
      prompt: `(Fallback) ${prompt}`
    };
  }
};

export const generateScriptOrCutList = async (
  storyDescription: string
): Promise<any[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a structured cut list for a short video sequence based on this description: "${storyDescription}".
      Create 3-5 shots. Each shot should have a clear visual description and a duration in seconds.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              shotName: { type: Type.STRING, description: "Short title of the shot" },
              duration: { type: Type.NUMBER, description: "Duration in seconds" },
              description: { type: Type.STRING, description: "Visual description for the cameraman or AI generator" },
              type: { type: Type.STRING, enum: [MediaType.VIDEO, MediaType.IMAGE] }
            },
            required: ["shotName", "duration", "description", "type"]
          }
        }
      }
    });
    
    const text = response.text;
    if (text) {
        return JSON.parse(text);
    }
    return [];

  } catch (e) {
    console.error("Cut list error", e);
    return [];
  }
};

// --- NEW STUBS FOR UX BLUEPRINT ---

export const generateLipsync = async (videoId: string, audioId: string) => {
    await simulateLocalInference(2000);
    return true;
};

export const generateNextShot = async (clipId: string) => {
    await simulateLocalInference(2000);
    return {
        url: `https://picsum.photos/seed/${Math.random()}/1280/720`,
        prompt: "Next shot continuation"
    };
};

export const generateRemix = async (clipId: string) => {
     await simulateLocalInference(1500);
     return [
         `https://picsum.photos/seed/${Math.random()}/1280/720`,
         `https://picsum.photos/seed/${Math.random()}/1280/720`,
         `https://picsum.photos/seed/${Math.random()}/1280/720`
     ];
};