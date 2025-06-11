import axios from 'axios';
import { AzureOpenAI } from 'openai';
import * as dotenv from 'dotenv';
import moment from 'moment';

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
    apiVersion: '2024-02-01',
    deployment: AZURE_OPENAI_DEPLOYMENT,
});

async function generateEvent() {
    console.log('Generating event using Azure OpenAI...');

    const prompt = `
        Generate a plausible JSON event for a voice agent interaction. The JSON object should have the following structure:
        {
            "sessionId": "a random string",
            "intent": "one of 'BookFlight', 'CheckWeather', 'OrderFood', 'PlayMusic'",
            "latencyMs": "a number between 50 and 2000",
            "success": "a boolean value",
            "confidence": "a float between 0.0 and 1.0"
        }
        Provide only the JSON object in your response.
    `;

    try {
        const result = await openAIClient.chat.completions.create({
            model: '',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });

        const choice = result.choices[0];
        if (!choice || !choice.message || !choice.message.content) {
            throw new Error('Invalid response from OpenAI');
        }

        const event = JSON.parse(choice.message.content);
        event.timestamp = moment().toISOString();
        console.log('Generated event:', event);
        return event;

    } catch (error) {
        console.error('Error generating event from Azure OpenAI:', error);
        // Fallback to mock event generation on error
        return {
            timestamp: moment().toISOString(),
            sessionId: `session-mock-${Math.random().toString(36).substring(7)}`,
            intent: 'BookFlight',
            latencyMs: Math.floor(Math.random() * 1000),
            success: Math.random() > 0.1,
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
