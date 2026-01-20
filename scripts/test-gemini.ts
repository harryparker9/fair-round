import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Manual .env.local parsing
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.error("Could not read .env.local", e);
}

async function listModels() {
    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }

    console.log("Using API Key:", apiKey.substring(0, 10) + "...");

    try {
        console.log("Fetching available models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.log(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log("Response:", text);
        } else {
            const data = await response.json();
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach((m: any) => {
                    if (m.supportedGenerationMethods?.includes("generateContent")) {
                        console.log(` - ${m.name.replace('models/', '')}`);
                    }
                });
            } else {
                console.log("No models found.");
            }
        }
    } catch (e: any) {
        console.error("Fetch Error:", e.message);
    }
}

listModels();
