import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGemini() {
    console.log("Testing Gemini API...");

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ API Key not found in environment variables.");
        return;
    }
    console.log("✅ API Key found (starts with: " + apiKey.substring(0, 5) + "...)");

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // console.log("Sending prompt to gemini-1.5-flash...");
        // const result = await model.generateContent("Say hello to 'Fair Round' app test.");
        // const response = await result.response;
        // console.log("✅ API Response:", response.text());

        console.log("Fetching available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`Failed to list models: ${response.statusText}`);
        }
        const data = await response.json();
        // console.log("Available Models:", JSON.stringify(data, null, 2));

        const validModels = (data.models || []).filter((m: any) =>
            m.supportedGenerationMethods.includes("generateContent") &&
            (m.name.includes("flash") || m.name.includes("pro") || m.name.includes("1.5"))
        );

        console.log("✅ Valid Text Models Found:", validModels.map((m: any) => m.name));

        console.log("Attempting 'gemini-2.5-flash'...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result2 = await model2.generateContent("Say hello.");
        console.log("✅ gemini-2.5-flash worked! Response:", result2.response.text());
    } catch (error: any) {
        console.error("❌ Gemini API Error:");
        console.error(error);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

testGemini();
