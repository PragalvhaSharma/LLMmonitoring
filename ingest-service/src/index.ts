import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

interface Event {
    timestamp: string;
    sessionId: string;
    intent: string;
    latencyMs: number;
    success: boolean;
    confidence: number;
}

const events: Event[] = [];

const MAX_EVENTS = 30;
const TIME_WINDOW_MS = 5 * 60 * 1000;

function pruneEvents() {
    const now = Date.now();
    const timeLimit = now - TIME_WINDOW_MS;

    const recentEvents = events.filter(event => new Date(event.timestamp).getTime() >= timeLimit);

    events.length = 0;
    events.push(...recentEvents);
}

function calculateMetrics() {
    const now = Date.now();

    const eventsInTimeWindow = events.filter(event => now - new Date(event.timestamp).getTime() < TIME_WINDOW_MS);
    const eventsInCountWindow = events.slice(Math.max(events.length - MAX_EVENTS, 0));
    
    const relevantEvents = eventsInTimeWindow.length < eventsInCountWindow.length ? eventsInTimeWindow : eventsInCountWindow;

    const totalEvents = relevantEvents.length;

    if (totalEvents === 0) {
        return {
            totalEvents: 0,
            avgLatencyMs: 0,
            errorRate: 0,
            avgConfidence: 0,
        };
    }

    const avgLatencyMs = relevantEvents.reduce((acc, event) => acc + event.latencyMs, 0) / totalEvents;
    const successCount = relevantEvents.filter(event => event.success).length;
    const errorRate = 1 - (successCount / totalEvents);
    const avgConfidence = relevantEvents.reduce((acc, event) => acc + event.confidence, 0) / totalEvents;

    return {
        totalEvents,
        avgLatencyMs,
        errorRate,
        avgConfidence,
    };
}

app.post('/ingest', (req: Request, res: Response) => {
    const event = req.body as Event;

    if (
        typeof event.timestamp !== 'string' ||
        typeof event.sessionId !== 'string' ||
        typeof event.intent !== 'string' ||
        typeof event.latencyMs !== 'number' ||
        typeof event.success !== 'boolean' ||
        typeof event.confidence !== 'number'
    ) {
        res.status(400).send('Invalid event payload: incorrect field types');
        return;
    }
    
    if (isNaN(new Date(event.timestamp).getTime())) {
        res.status(400).send('Invalid timestamp format');
        return;
    }

    events.push(event);
    pruneEvents();

    res.status(200).send('Event received');
});

app.get('/metrics', (req: Request, res: Response) => {
    const metricsData = calculateMetrics();

    if (metricsData.totalEvents === 0) {
        res.type('text/plain').send(
`voice_events_total 0
voice_latency_ms_avg 0
voice_error_rate 0
voice_confidence_avg 0`
        );
        return;
    }

    const metrics = 
`voice_events_total ${metricsData.totalEvents}
voice_latency_ms_avg ${metricsData.avgLatencyMs.toFixed(2)}
voice_error_rate ${metricsData.errorRate.toFixed(2)}
voice_confidence_avg ${metricsData.avgConfidence.toFixed(2)}`;

    res.type('text/plain').send(metrics);
});

app.get('/report', (req: Request, res: Response) => {
    const metricsData = calculateMetrics();

    res.json({
        totalEvents: metricsData.totalEvents,
        avgLatencyMs: parseFloat(metricsData.avgLatencyMs.toFixed(2)),
        errorRate: parseFloat(metricsData.errorRate.toFixed(2)),
        avgConfidence: parseFloat(metricsData.avgConfidence.toFixed(2))
    });
});

app.listen(port, () => {
    console.log(`Service A listening on port ${port}`);
});
