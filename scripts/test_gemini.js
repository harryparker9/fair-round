
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

console.log("Checking API Key...", apiKey ? "Present (Starts with " + apiKey.substring(0, 5) + ")" : "MISSING");

async function testGemini() {
    if (!apiKey) {
        console.error("No API Key found.");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const modelName = "gemini-2.5-flash";
        console.log(`Testing generation with ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'Hello 2026'!");
        console.log("Success! Response:", result.response.text());
    } catch (e) {
        console.error("Generation Failed:", e.message);
    }
}

testGemini();
