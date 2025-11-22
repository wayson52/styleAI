
import { GoogleGenAI } from "@google/genai";
import { Sample, SubjectType } from "../types";

// Helper to convert blob to base64 for Gemini
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
    }
    const blob = await response.blob();
    return blobToBase64(blob);
  } catch (error: any) {
    console.error("Image fetch error:", error);
    // Check if it looks like a CORS error (typically TypeError: Failed to fetch)
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error("Cannot access this image URL due to security restrictions (CORS). Please save the image to your device and upload it instead.");
    }
    throw error;
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to extract wait time from error message
const getRetryDelay = (error: any): number | null => {
  // Try to find "Please retry in Xs" in the message string
  if (error.message) {
    const match = error.message.match(/Please retry in ([0-9.]+)s/);
    if (match && match[1]) {
      return Math.ceil(parseFloat(match[1]) * 1000);
    }
  }
  
  // Try to find details array with RetryInfo in the error object
  if (error.details && Array.isArray(error.details)) {
    const retryInfo = error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
    if (retryInfo && retryInfo.retryDelay) {
        // Format is usually "25s"
        const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
        if (!isNaN(seconds)) {
             return Math.ceil(seconds * 1000);
        }
    }
  }
  return null;
};

// Retry wrapper for API calls
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 5, initialDelay = 3000): Promise<T> {
  let delay = initialDelay;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isQuotaError = 
        error.status === 429 || 
        error.code === 429 || 
        (error.message && error.message.includes('429')) ||
        (error.message && error.message.includes('quota')) ||
        (error.message && error.message.includes('RESOURCE_EXHAUSTED'));
      
      if (isQuotaError && i < maxRetries - 1) {
        // Check if server specified a delay
        const serverDelay = getRetryDelay(error);
        const waitTime = serverDelay ? serverDelay + 1000 : delay; // Add 1s buffer if server delay used
        
        console.warn(`Quota limit hit. Retrying in ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
        await wait(waitTime);
        
        // If we used server delay, reset delay to initial for next fallback, 
        // otherwise exponential backoff
        if (!serverDelay) {
            delay *= 2; 
        }
        continue;
      }
      
      // If it's not a quota error, or we've run out of retries, throw
      throw error;
    }
  }
  throw new Error("Operation failed after max retries. The service is currently experiencing high traffic.");
}

// Robust JSON extractor
const extractJSON = (text: string): any => {
  if (!text) return [];
  try {
    // 1. Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // 2. Try extracting from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        // continue
      }
    }
    
    // 3. Try finding the first [ and last ]
    const firstOpen = text.indexOf('[');
    const lastClose = text.lastIndexOf(']');
    if (firstOpen !== -1 && lastClose !== -1) {
        try {
            return JSON.parse(text.substring(firstOpen, lastClose + 1));
        } catch(e3) {
            // continue
        }
    }
    
    console.warn("Could not parse JSON from response text:", text);
    return [];
  }
};

export const searchImages = async (query: string): Promise<Sample[]> => {
  return withRetry(async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
      Task: Find 12 real, accessible image URLs for the search query: "${query}".
      
      Instructions:
      1. Use Google Search to find high-quality images matching the query.
      2. Extract the direct URL for each image found.
      3. Format the output as a strict JSON array of objects.
      
      Constraints:
      - Prioritize URLs ending in .jpg, .png, .jpeg, .webp.
      - Avoid placeholder URLs or generic site links; look for the actual image source.
      - Do NOT output markdown formatting (like \`\`\`json). Just return the raw JSON string.
      - If you find fewer than 12, return as many valid ones as possible.
      
      JSON Format:
      [
        { "id": "unique_id_1", "name": "Short descriptive title", "url": "https://site.com/image.jpg" },
        { "id": "unique_id_2", "name": "Short descriptive title", "url": "https://site.com/other.png" }
      ]
      `,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    
    try {
      const data = extractJSON(text);
      
      if (Array.isArray(data)) {
        const validSamples = data
          .filter((item: any) => item.url && item.url.startsWith('http'))
          .map((item: any, index: number) => ({
            id: item.id || `search-${index}-${Date.now()}`,
            name: item.name || query,
            url: item.url,
            category: 'Search Result',
            gender: 'unisex' as const
          }));
          
        if (validSamples.length === 0) {
            console.warn("Search returned 0 valid URLs.");
        }
        return validSamples as Sample[];
      } else {
        console.warn("Parsed data is not an array:", data);
        return [];
      }
    } catch (e) {
      console.error("Failed to process search results", e);
      return [];
    }
  });
};

export const generateTryOnImage = async (
  personImageUrl: string,
  topImageUrl: string | null,
  bottomImageUrl: string | null,
  subjectType: SubjectType = 'human'
): Promise<string> => {
  return withRetry(async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing. Please check your environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Fetch and prepare images
      let personBase64 = "";
      if (personImageUrl.startsWith('data:')) {
        personBase64 = personImageUrl.split(',')[1];
      } else {
        personBase64 = await fetchImageAsBase64(personImageUrl);
      }

      const parts: any[] = [];
      
      // Construct Prompt based on subject type
      let prompt = "";
      
      if (subjectType === 'pet') {
        prompt = `
          Generate a highly photorealistic image of the animal (pet) from the first image wearing the selected outfit/accessory.
          
          Requirements:
          1. Preserve the animal's breed, fur pattern, facial features, and pose exactly.
          2. The animal should be wearing the provided outfit naturally.
          3. Ensure the clothing fits the animal's anatomy (four-legged fit if applicable), respecting gravity, fur, and lighting.
          4. The background should remain neutral or consistent with the original photo.
          5. Output high resolution, sharp details.
        `;
      } else {
        prompt = `
          Generate a highly photorealistic image of the person from the first image wearing the selected clothing items.
          
          Requirements:
          1. Preserve the person's identity, facial features, body shape, pose, and skin tone exactly.
          2. The person should be wearing the generated outfit.
          3. Ensure the clothing fits naturally, respecting gravity, folds, and lighting.
          4. The background should remain neutral or consistent with the person's original photo.
          5. Output high resolution, sharp details.
          6. CRITICAL: If the provided person image is a close-up, portrait, or half-body shot, you MUST generate the missing parts of the body (legs, feet, etc.) to ensure the full outfit (especially bottoms) is visible. The final result should be a full-body visualization.
        `;
      }

      // Add Subject Image
      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: personBase64
        }
      });

      if (subjectType === 'pet') {
        // For pets, we assume topImageUrl contains the single outfit
        if (!topImageUrl) {
            throw new Error("Please select an outfit for the pet.");
        }
        let outfitBase64 = "";
        if (topImageUrl.startsWith('data:')) {
          outfitBase64 = topImageUrl.split(',')[1];
        } else {
          outfitBase64 = await fetchImageAsBase64(topImageUrl);
        }
        parts.push({ text: "Wear this item:" });
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: outfitBase64
          }
        });

      } else {
        // Human logic (Top + Bottom)
        // Add Top Image if present
        if (topImageUrl) {
          let topBase64 = "";
          if (topImageUrl.startsWith('data:')) {
            topBase64 = topImageUrl.split(',')[1];
          } else {
            topBase64 = await fetchImageAsBase64(topImageUrl);
          }
          parts.push({ text: "Wear this item as the Top garment:" });
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: topBase64
            }
          });
        }

        // Add Bottom Image if present
        if (bottomImageUrl) {
          let bottomBase64 = "";
          if (bottomImageUrl.startsWith('data:')) {
            bottomBase64 = bottomImageUrl.split(',')[1];
          } else {
            bottomBase64 = await fetchImageAsBase64(bottomImageUrl);
          }
          parts.push({ text: "Wear this item as the Bottom garment:" });
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: bottomBase64
            }
          });
        }

        if (!topImageUrl && !bottomImageUrl) {
          throw new Error("At least one clothing item (top or bottom) must be selected.");
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts
        }
      });

      const responseParts = response.candidates?.[0]?.content?.parts;
      
      if (!responseParts) {
          throw new Error("No content generated");
      }

      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("No image data found in response");

    } catch (error) {
      console.error("Error generating try-on image:", error);
      throw error;
    }
  });
};
