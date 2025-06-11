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

function cleanUpEvents() {
    const now = Date.now();
    
    // Filter by time window
    let recentEvents = events.filter(event => now - new Date(event.timestamp).getTime() < TIME_WINDOW_MS);
    
    // Filter by count window
    if (recentEvents.length > MAX_EVENTS) {
        recentEvents = recentEvents.slice(recentEvents.length - MAX_EVENTS);
    }
    
    // Update events array
    events.length = 0;
    Array.prototype.push.apply(events, recentEvents);
}

app.post('/ingest', (req: Request, res: Response) => {
    const event = req.body as Event;

    // Basic validation
    if (!event.timestamp || !event.sessionId || !event.intent || !event.latencyMs || event.success === undefined || !event.confidence) {
        return res.status(400).send('Invalid event payload');
    }
    
    // Validate timestamp format
    if (isNaN(new Date(event.timestamp).getTime())) {
        return res.status(400).send('Invalid timestamp format');
    }

    events.push(event);
    cleanUpEvents();

    res.status(200).send('Event received');
});

app.get('/metrics', (req: Request, res: Response) => {
    cleanUpEvents();

    const totalEvents = events.length;
    if (totalEvents === 0) {
        return res.type('text/plain').send(
`voice_events_total 0
voice_latency_ms_avg 0
voice_error_rate 0
voice_confidence_avg 0`
        );
    }

    const avgLatencyMs = events.reduce((acc, event) => acc + event.latencyMs, 0) / totalEvents;
    const successCount = events.filter(event => event.success).length;
    const errorRate = 1 - (successCount / totalEvents);
    const avgConfidence = events.reduce((acc, event) => acc + event.confidence, 0) / totalEvents;

    const metrics = 
`voice_events_total ${totalEvents}
voice_latency_ms_avg ${avgLatencyMs.toFixed(2)}
voice_error_rate ${errorRate.toFixed(2)}
voice_confidence_avg ${avgConfidence.toFixed(2)}`;

    res.type('text/plain').send(metrics);
});

app.get('/report', (req: Request, res: Response) => {
    cleanUpEvents();

    const totalEvents = events.length;
    if (totalEvents === 0) {
        return res.json({
            totalEvents: 0,
            avgLatencyMs: 0,
            errorRate: 0,
            avgConfidence: 0
        });
    }

    const avgLatencyMs = events.reduce((acc, event) => acc + event.latencyMs, 0) / totalEvents;
    const successCount = events.filter(event => event.success).length;
    const errorRate = 1 - (successCount / totalEvents);
    const avgConfidence = events.reduce((acc, event) => acc + event.confidence, 0) / totalEvents;

    res.json({
        totalEvents,
        avgLatencyMs: parseFloat(avgLatencyMs.toFixed(2)),
        errorRate: parseFloat(errorRate.toFixed(2)),
        avgConfidence: parseFloat(avgConfidence.toFixed(2))
    });
});

app.listen(port, () => {
    console.log(`Service A listening on port ${port}`);
});
