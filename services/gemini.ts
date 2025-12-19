import { GoogleGenAI, Modality } from "@google/genai";
import { Message } from "../types";
import { db } from "./db";

// Вспомогательные функции для работы с аудио
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

const getApiKey = () => {
  const key = process.env.API_KEY || "";
  // Очистка ключа от кавычек и пробелов, которые могут попасть из окружения
  return key.replace(/['"]+/g, '').trim();
};

export const speakText = async (text: string, isStory: boolean = false) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return;
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text.substring(0, 500) }] }],
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
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

export const generateImage = async (prompt: string, isStory: boolean = false): Promise<string | null> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
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
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API_KEY_MISSING");

    const ai = new GoogleGenAI({ apiKey });
    const settings = db.getSettings();

    const contents: any[] = history.slice(-10).map(msg => ({
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
        systemInstruction: isStoryMode ? "You are a master storyteller." : settings.systemRule,
        temperature: settings.temperature,
      }
    });
    return response.text || "No response from Nexus.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("400")) {
      return "ОШИБКА 400: Ключ недействителен. Пожалуйста, используйте кнопку 'Обновить ключ' в панели управления.";
    }
    return `ОШИБКА UPLINK: ${error.message}`;
  }
};

export const isImageRequest = (prompt: string): boolean => {
  const triggers = ["нарисуй", "картинка", "фото", "draw", "image"];
  return triggers.some(t => prompt.toLowerCase().includes(t));
};
