import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Stable, fast model

export const gemini = {
    generateVibeCheck: async (pubName: string, vicinity: string, rating: number, preferences: string[] = []) => {
        if (!apiKey) {
            console.error("Gemini API Key missing. Checked: GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_GENERATIVE_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY");
            return "AI Vibe check unavailable (System Config Error - Missing API Key).";
        }

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
            // Fallback: Expose error for debugging with Timestamp to verify deployment
            return `AI Error (${new Date().toISOString().slice(11, 19)}): ${error.message || "Unknown Error"}`;
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
    },
    // 2. STRATEGY NARRATIVE (Transparency)
    generateStrategyNarrative: async (context: string): Promise<string> => {
        if (!apiKey) return "Strategic optimization based on user locations.";

        const prompt = `
        You are the Fairness Engine for a London meetup app.
        OBJECTIVE: Briefly summarize your "Thinking Process" for finding a meeting point.
        
        CONTEXT:
        ${context}
        
        OUTPUT:
        Write 2-3 short, specific sentences explaining your global strategy.
        
        CRITICAL RULES:
        1. Use ONLY the names and locations provided in the CONTEXT. Do NOT invent people.
        2. If there is only 1 person, acknowledge that (e.g., "Since there is only Member A...").
        3. Do NOT mention specific station candidates yet. Focus on the STRATEGY (Direction, Lines, compromise).
        
        Bad Example: "I looked for a central hub that serves everyone equally." (Too vague)
        Good Example: "Because [Member A] is in North London and [Member B] is in South London, I pulled the search center towards the Victoria Line to minimize changes."
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            console.error("Gemini Strategy Error:", error);
            return "Strategy generation failed. Proceeding with standard optimization.";
        }
    },

    // 3. SCOUT: Generate Strategic Candidates
    scoutStations: async (context: string, meetingTime: string): Promise<string[]> => {
        if (!apiKey) return [];

        const prompt = `
        You are the Fairness Engine for a London meetup app.
        OBJECTIVE: Select the top 12 strategic London Train Station candidates for a group meeting.

        CONTEXT:
        ${context}
        Meeting Time: ${meetingTime}

        STRATEGY:
        1. Identify the "Fair Middle" (Geometric center).
        2. Identify "Strategic Hubs" (Bank, Waterloo, King's Cross, Victoria, etc.) that serve the group's lines.
        3. Prioritize Minimal Changes: If 2 people are on the Northern Line, picking a Northern Line station is better than the geometric center.
        4. Prioritize "Detour Minimization": If people are ending at X, and X is on the way for others, suggest X.
        
        OUTPUT:
        Return ONLY a JSON array of strings (Station Names). Do not include "Station" in the name unless part of it (e.g. "Waterloo", not "Waterloo Station").
        Example: ["Bank", "Waterloo", "Angel", "London Bridge"]
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error("Invalid JSON response from AI");
            return JSON.parse(jsonMatch[0]);
        } catch (error: any) {
            console.error("Gemini Scout Error:", error);
            // Throw specific error for UI to catch
            if (error.message?.includes("timeout")) throw new Error("AI Timeout (15s limit reached)");
            if (error.message?.includes("API key")) throw new Error("Invalid API Key");
            if (error.status === 429) throw new Error("AI Quota Exceeded");
            if (error.status === 503) throw new Error("AI Service Unavailable");
            throw new Error(`AI Error: ${error.message?.substring(0, 50) || "Unknown"}`);
        }
    },

    // 4. JUDGE: Pick the Winner & Explain ALL Options
    judgeStations: async (candidates: any[], context: string): Promise<{ winner_name: string, rationales: Record<string, string> } | null> => {
        if (!apiKey) return null;

        // Simplify candidates for token limit
        const simpleCandidates = candidates.map(c => ({
            name: c.name,
            total_time: c.total_time,
            max_trip: Math.max(...Object.values(c.travel_times).map((t: any) => t.to + t.home)),
            journeys: Object.entries(c.travel_times).map(([name, t]: [string, any]) => `${name}: ${Math.round(t.to)}m`).join(', ')
        }));

        const prompt = `
        You are the Final Judge for a London meetup.
        OBJECTIVE: Evaluate these candidates and provide a specific rationale for EACH one.

        CONTEXT:
        ${context}

        CANDIDATES:
        ${JSON.stringify(simpleCandidates, null, 2)}

        RULES:
        1. Winner: Best balance of time and fairness (avoid >90m trips).
        2. Rationale: For EVERY candidate, write 1 short, witty, specific sentence explaining its pros/cons.
           - RELY ONLY ON THE CONTEXT. Do not invent people named Brenda, Tom, etc.
           - Mention specific people from the Context if relevant (e.g. "Good for [Member Name], but bad for [Member Name]").
           - NOT generic (e.g. "Good option"). Be specific!
           - CRITICAL: DO NOT quote "total travel time" or "aggregate minutes" (e.g. "345 mins total"). This confuses users. Focus on fairness, average time, or specific individual benefits.

        OUTPUT JSON:
        {
            "winner_name": "Station Name",
            "rationales": {
                "Station Name": "Rationale text...",
                "Station B": "Rationale text..."
            }
        }
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("Gemini Judge Error:", error);
            return null;
        }
    }
};
