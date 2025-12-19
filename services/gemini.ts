
import { GoogleGenAI, Modality } from "@google/genai";
import { Message } from "../types";
import { db } from "./db";

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("MISSING_KEY");
  return new GoogleGenAI({ apiKey });
};

export const speakText = async (text: string, isStory: boolean = false) => {
  try {
    const ai = getAIClient();
    const prompt = isStory 
      ? `Read this story segment with deep emotion and narrative pacing: ${text.substring(0, 600)}`
      : `Read clearly: ${text.substring(0, 400)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: isStory ? 'Puck' : 'Kore' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Node Error:", error);
  }
};

export const generateImage = async (prompt: string, isStory: boolean = false): Promise<string | null> => {
  try {
    const ai = getAIClient();
    const style = isStory 
      ? "Cinematic concept art, moody lighting, detailed textures, book illustration style"
      : "High-detail digital art, Nexus Protocol Style";
      
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `${style}: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: isStory ? "16:9" : "1:1" } },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (error) {
    return null;
  }
};

export const askGemini = async (
  prompt: string, 
  history: Message[], 
  username: string, 
  isAdmin: boolean,
  isStoryMode: boolean = false,
  imageFile?: { data: string, mimeType: string }
) => {
  try {
    const ai = getAIClient();
    const settings = db.getSettings();

    const storyInstruction = `
[STORY FORGE MODE ACTIVE]
You are a master storyteller and world-builder. 
- Use rich, descriptive prose and immersive atmosphere.
- Maintain consistent character development and logical plot progression.
- If this is a roleplay, react dynamically to the user's actions.
- Language: Follow the user's language.
`;

    const systemInstruction = `
${isStoryMode ? storyInstruction : settings.systemRule}
Active User: ${username}
Access Level: ${isAdmin ? "ADMIN/ROOT" : "STANDARD"}
${isAdmin ? "Status: Master Atimenka confirmed. Creative blocks removed." : ""}
`;

    // Increased context for stories (15) vs standard (8)
    const contextLimit = isStoryMode ? 15 : 8;
    const contents: any[] = history.slice(-contextLimit).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const userParts: any[] = [{ text: prompt }];
    if (imageFile) {
      userParts.push({ inlineData: { data: imageFile.data, mimeType: imageFile.mimeType } });
    }
    contents.push({ role: 'user', parts: userParts });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: { 
        systemInstruction, 
        temperature: isStoryMode ? 0.95 : (isAdmin ? 0.9 : 0.7),
        topP: 0.9,
      }
    });
    return response.text || "Protocol Timeout: Empty response.";
  } catch (error: any) {
    if (error.message === "MISSING_KEY") return "CRITICAL: API_KEY missing.";
    if (error?.status === 429) return "SYSTEM RESTING: Too many requests. Wait a bit.";
    return "UPLINK ERROR: Connection lost.";
  }
};

export const isImageRequest = (prompt: string): boolean => {
  const triggers = ["нарисуй", "картинка", "фото", "draw", "generate image", "image", "создай фото", "иллюстрация"];
  return triggers.some(t => prompt.toLowerCase().includes(t));
};
