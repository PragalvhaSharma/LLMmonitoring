import axios from 'axios';
import { AzureOpenAI } from 'openai';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080/ingest';
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;

if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY || !AZURE_OPENAI_DEPLOYMENT) {
    throw new Error('Azure OpenAI environment variables are not set');
}

const openAIClient = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_KEY,
    apiVersion: '2024-08-01-preview',
    deployment: AZURE_OPENAI_DEPLOYMENT,
});

interface Event {
    timestamp: string;
    sessionId: string;
    intent: string;
    latencyMs: number;
    success: boolean;
    confidence: number;
}

async function generateEvent(deployment: string): Promise<Event> {
    console.log('Generating event using Azure OpenAI...');

    const userPrompt = `
        Generate a plausible JSON event for a voice agent interaction. The JSON object should have the following structure:
        {
            "intent": "can be anything bookflight, checkweather, orderfood, playmusic e.t.c or more",
            "confidence": "a float between 0.0 and 1.0"
        }
    `;
    const systemPrompt = "You are a JSON generator. You will be given instructions for a JSON object to create, and you will respond with ONLY that JSON object, and nothing else.";

    try {
        const startTime = Date.now();
        const result = await openAIClient.chat.completions.create({
            model: deployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
        });
        const endTime = Date.now();
        const latencyMs = endTime - startTime;

        const choice = result.choices[0];
        if (!choice || !choice.message || !choice.message.content) {
            throw new Error('Invalid response from OpenAI');
        }

        let eventData;
        try {
            eventData = JSON.parse(choice.message.content);
        } catch (parseError) {
            console.error('Failed to parse LLM response:', choice.message.content);
            throw new Error('Invalid JSON response from LLM');
        }
        
        const event: Event = {
            timestamp: new Date().toISOString(),
            sessionId: uuidv4(),
            intent: eventData.intent || 'UnknownIntent',
            latencyMs: latencyMs,
            success: true,
            confidence: eventData.confidence || 0.0,
        };

        console.log('Generated event:', event);
        return event;

    } catch (error) {
        console.error('Error generating event from Azure OpenAI:', error);
        // Fallback to mock event generation on error
        return {
            timestamp: new Date().toISOString(),
            sessionId: uuidv4(),
            intent: 'FallbackIntent',
            latencyMs: Math.floor(Math.random() * 1000),
            success: false, // Indicate that this was a fallback
            confidence: 0.0
        };
    }
}

async function postEvent(event: Event) {
    try {
        console.log(`Posting event to ${TARGET_URL}:`, event);
        await axios.post(TARGET_URL, event);
        console.log('Event posted successfully');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error posting event:', error.response?.data || error.message);
          } else {
            console.error('An unexpected error occurred:', error);
          }
    }
}

async function startSimulation() {
    console.log('Starting event simulation...');
    
    // Check for environment variables before starting
    if (!AZURE_OPENAI_DEPLOYMENT) {
        console.error("Azure OpenAI deployment name is not configured. Exiting simulation.");
        return;
    }
    
    const tick = async () => {
        const event = await generateEvent(AZURE_OPENAI_DEPLOYMENT);
        await postEvent(event);
    };

    // Run once immediately, then set the interval
    tick(); 
    setInterval(tick, 60000); // Every minute
}

startSimulation();
