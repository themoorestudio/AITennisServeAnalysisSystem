import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisReportData, KeyMoments, ChatMessage, LandmarkFrame, PoseData } from '../types';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:mime/type;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const PROMPT_TEMPLATE = `
You are an elite, world-class tennis coach with deep expertise in biomechanics and serve technique. Your name is 'Coach AI'.

Analyze the user's tennis serve based on three inputs:
1. The original video.
2. A structured JSON object containing pose landmark data for the most critical frames.
3. A JSON object of pre-identified, biomechanically significant moments with their exact timestamps.

**CRITICAL INSTRUCTION:** When providing your critique, you MUST use the exact timestamps provided in the "Key Moments" section to refer to those specific events. Do not guess or calculate your own timestamps. Embed them in your text in the format [t=SECONDS.MILLISECONDSs].

Instructions:
1.  **Analyze Mechanics:** Evaluate each key mechanical component of the serve.
2.  **Integrate Key Moments Data:** In your critique for each component, reference the provided timestamps from the "Key Moments" data. For example, if the Trophy Pose is at 2.5s, say "Your trophy pose is solid [t=2.5s]...". Use the provided pose data for these key moments to inform your biomechanical analysis.
3.  **Rate Each Component:** Assign a rating from 1 (needs significant work) to 10 (excellent).
4.  **Provide Critique:** For each component, write a concise critique. Start by highlighting a positive aspect, then identify the main area for improvement, backing it up with pose data insights and the provided timestamp markers.
5.  **Key Takeaway:** For each component, provide a single, actionable key takeaway.
6.  **Overall Summary:** Write a brief, encouraging overall summary of the serve.
7.  **Recommend Drills:** Based on the analysis, recommend 3 specific, actionable drills.

Generate the analysis in the structured JSON format as defined in the schema. If pose or key moment data is not provided, perform a qualitative analysis based on the video alone, but you can still add your own estimated timestamps.
`;

export const analyzeServe = async (videoFile: File, poseData: PoseData | null, keyMoments: KeyMoments | null): Promise<AnalysisReportData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      overallSummary: {
        type: Type.STRING,
        description: "A brief, encouraging overall summary of the serve, highlighting a key strength and the primary area for improvement."
      },
      mechanics: {
        type: Type.ARRAY,
        description: "A detailed breakdown of each component of the tennis serve.",
        items: {
          type: Type.OBJECT,
          properties: {
            component: {
              type: Type.STRING,
              description: "The name of the serve component (e.g., 'Stance & Setup', 'Ball Toss', 'Trophy Pose', 'Swing Path & Racquet Drop', 'Contact Point', 'Follow-through')."
            },
            rating: {
              type: Type.NUMBER,
              description: "A rating from 1 to 10 for this specific component."
            },
            critique: {
              type: Type.STRING,
              description: "Constructive feedback on the component, highlighting strengths and areas for improvement. It MUST include timestamp markers like [t=1.5s] to reference specific moments in the video."
            },
            keyTakeaway: {
              type: Type.STRING,
              description: "A single, actionable tip for this component."
            }
          },
          required: ["component", "rating", "critique", "keyTakeaway"]
        }
      },
      drills: {
        type: Type.ARRAY,
        description: "A list of recommended drills to address weaknesses identified in the analysis.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the drill."
            },
            description: {
              type: Type.STRING,
              description: "A step-by-step guide on how to perform the drill."
            }
          },
          required: ["name", "description"]
        }
      }
    },
    required: ["overallSummary", "mechanics", "drills"]
  };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const base64Video = await fileToBase64(videoFile);
    const videoPart = {
      inlineData: {
        mimeType: videoFile.type,
        data: base64Video,
      },
    };

    let fullPrompt = PROMPT_TEMPLATE;

    if (keyMoments) {
        const momentsString = Object.entries(keyMoments)
            .filter(([, time]) => time !== null)
            .map(([name, time]) => `- ${name}: ${time!.toFixed(2)}s`)
            .join('\n');
        fullPrompt += `\n\n--- Key Moments (in seconds) ---\n${momentsString}`;

        if (poseData) {
            // Create a concise summary of pose data for key moments only to avoid exceeding token limit.
            const keyMomentFrames: { [key: string]: LandmarkFrame['landmarks'] | undefined } = {};
            for (const [name, time] of Object.entries(keyMoments)) {
                if (time !== null && poseData.length > 0) {
                    // Find the frame in poseData closest to this time
                    const closestFrame = poseData.reduce((prev, curr) => {
                        return (Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev);
                    });
                    keyMomentFrames[name] = closestFrame.landmarks;
                }
            }
            
            fullPrompt += `\n\n--- Pose Landmark Data for Key Moments ---\n${JSON.stringify(keyMomentFrames)}`;
        }
    }
    
    const textPart = { text: fullPrompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, videoPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    if (!result.overallSummary || !result.mechanics || !result.drills) {
      throw new Error("Invalid response structure from AI model.");
    }
    
    return result as AnalysisReportData;

  } catch (error) {
    console.error("Error analyzing serve:", error);
    throw new Error("Failed to get analysis from AI. The model may be unable to process this video. Please try a different video.");
  }
};

export const analyzeServeFromUrl = async (youtubeUrl: string): Promise<AnalysisReportData> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const URL_PROMPT = `
You are an elite, world-class tennis coach with deep expertise in biomechanics and serve technique. Your name is 'Coach AI'.

You have been provided a YouTube URL pointing to a video of a tennis serve. Using your access to Google Search, analyze the content of this video. If the video is unavailable or does not show a tennis serve, respond with a JSON object with an "error" key.

Provide a comprehensive, constructive, and encouraging analysis based on what you can gather about the video.

Instructions:
1.  **Analyze Mechanics:** Evaluate each key mechanical component of the serve (e.g., 'Stance & Setup', 'Ball Toss', 'Trophy Pose', 'Swing Path & Racquet Drop', 'Contact Point', 'Follow-through').
2.  **Rate Each Component:** Assign a rating from 1 to 10.
3.  **Provide Critique:** For each component, write a concise critique.
4.  **Key Takeaway:** For each component, provide a single, actionable key takeaway.
5.  **Overall Summary:** Write a brief, encouraging overall summary.
6.  **Recommend Drills:** Recommend 3 specific, actionable drills.
7.  **Do NOT include annotated images.**

Your response MUST be a single JSON object that strictly adheres to the following TypeScript interface:
\`\`\`json
{
  "overallSummary": "string",
  "mechanics": [
    {
      "component": "string",
      "rating": "number",
      "critique": "string",
      "keyTakeaway": "string"
    }
  ],
  "drills": [
    {
      "name": "string",
      "description": "string"
    }
  ]
}
\`\`\`

Analyze the video at this URL: ${youtubeUrl}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: URL_PROMPT,
      config: {
        tools: [{googleSearch: {}}],
      }
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3);
    }
    
    const result = JSON.parse(jsonText);
    
    if (result.error) {
        throw new Error(result.error);
    }
    if (!result.overallSummary || !result.mechanics || !result.drills) {
      throw new Error("Invalid response structure from AI model.");
    }
    
    return result as AnalysisReportData;

  } catch (error) {
    console.error("Error analyzing serve from URL:", error);
    if (error instanceof SyntaxError) {
        throw new Error("The AI returned a response that was not in the correct format. Please try again.");
    }
    
    // If the thrown object is an Error, it contains a specific message.
    // We re-throw it to preserve user-friendly feedback from the AI
    // (e.g., "This video does not contain a tennis serve.") instead of showing a generic message.
    if (error instanceof Error) {
        throw error;
    }

    // Fallback for cases where the thrown object is not an Error instance.
    throw new Error("Failed to get analysis from AI. The model may be unable to access or analyze the content from the provided URL. Please check the link or try a different video.");
  }
};

export const askFollowUpQuestion = async (
  originalReport: AnalysisReportData,
  chatHistory: ChatMessage[],
  question: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const FOLLOW_UP_PROMPT = `
You are 'Coach AI', an elite tennis coach. You have already provided the user with a detailed analysis of their serve. Now, they have a follow-up question.

**CONTEXT: ORIGINAL SERVE ANALYSIS**
\`\`\`json
${JSON.stringify(originalReport)}
\`\`\`

**CONTEXT: PREVIOUS CONVERSATION**
${chatHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Coach AI'}: ${msg.text}`).join('\n')}

**USER'S NEW QUESTION:**
${question}

Based on all the context above (the original analysis and the conversation history), answer the user's new question concisely and helpfully. Maintain your persona as a world-class, encouraging tennis coach.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: FOLLOW_UP_PROMPT,
    });

    // Use the full path for robustness
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
        return "Sorry, I couldn't generate a response. Please try again.";
    }
    return text;

  } catch (error) {
    console.error("Error asking follow-up question:", error);
    throw new Error("Failed to get a response from Coach AI. Please try again.");
  }
};