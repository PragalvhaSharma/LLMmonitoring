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

async function generateEvent() {
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
            model: '',
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

        const event = JSON.parse(choice.message.content);
        event.timestamp = new Date().toISOString();
        event.latencyMs = latencyMs;
        event.sessionId = uuidv4();
        event.success = true;
        console.log('Generated event:', event);
        return event;

    } catch (error) {
        console.error('Error generating event from Azure OpenAI:', error);
        // Fallback to mock event generation on error
        return {
            timestamp: new Date().toISOString(),
            sessionId: uuidv4(),
            intent: 'BookFlight',
            latencyMs: Math.floor(Math.random() * 1000),
            success: false,
            confidence: Math.random()
        };
    }
}

async function postEvent(event: any) {
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
    const initialEvent = await generateEvent();
    await postEvent(initialEvent);

    setInterval(async () => {
        const event = await generateEvent();
        await postEvent(event);
    }, 60000); // Every minute
}

startSimulation();
