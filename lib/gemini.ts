import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Verified available model

export const gemini = {
    generateVibeCheck: async (pubName: string, vicinity: string, rating: number, preferences: string[] = []) => {
        if (!apiKey) return "AI Vibe check unavailable (Missing Key).";

        const prompt = `
      You are a high-end London pub curator. 
      Analyze this pub: "${pubName}" located at "${vicinity}" with rating ${rating}.
      The group is looking for: ${preferences.join(', ') || "a great general atmosphere"}.
      
      Write a 1-sentence "Vibe Check" summary of why this place fits (or doesn't).
      Use a premium, witty, confident tone. Mention specific features if implied by the location/name.
    `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error: any) {
            console.error("Gemini Error:", error);
            // Fallback if AI quota is exceeded or fails
            return `A highly rated local favorite with a ${rating} star rating.`;
        }
    },

    suggestMeetingAreas: async (locations: { lat: number, lng: number }[]) => {
        if (!apiKey) return []; // Fallback handled by service

        const locString = locations.map(l => `${l.lat.toFixed(3)},${l.lng.toFixed(3)}`).join(' | ');

        const prompt = `
        Given these ${locations.length} user locations (lat,lng): [${locString}].
        Identify the geometric center, and then suggest 3 DISTINGUISHABLE, POPULAR London neighborhoods/areas nearby that would serve as good meeting points.
        
        Rules:
        1. One option MUST be the approximate geometric center ("The Fair Middle").
        2. The other two should be distinct nearby hubs (e.g. if center is Old St, suggest Angel and Shoreditch).
        3. Output ONLY valid JSON:
        [
            { "id": "1", "name": "Area Name", "description": "Why it's good (1 short sentence)", "lat": 51.123, "lng": -0.123 },
            ...
        ]
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log("Gemini Raw Output:", text); // Debug log

            // Robust JSON extraction: Find the first '[' and the last ']'
            const jsonMatch = text.match(/\[[\s\S]*\]/);

            if (!jsonMatch) {
                console.error("No JSON array found in Gemini output");
                return [];
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("Gemini Area Error:", error);
            return [];
        }
    }
};
