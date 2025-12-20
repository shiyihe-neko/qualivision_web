
import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle } from "../types";

const MODEL_NAME = "gemini-3-flash-preview"; 

export const generateTranscript = async (
  videoBase64: string, 
  mimeType: string
): Promise<Subtitle[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Listen to the audio and generate a precise, word-for-word transcript in Chinese.
      Return strictly a JSON array of objects with startTime (seconds), endTime (seconds), and text.
      Segments should be around 3-5 seconds each.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data: videoBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.NUMBER },
              endTime: { type: Type.NUMBER },
              text: { type: Type.STRING }
            },
            required: ["startTime", "endTime", "text"]
          }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Empty response from AI");
    
    const rawData = JSON.parse(jsonStr.trim());
    
    return rawData.map((item: any, index: number) => ({
      id: `ai_${Date.now()}_${index}`,
      startTime: item.startTime,
      endTime: item.endTime,
      html: item.text,
      codeId: undefined
    }));
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};
