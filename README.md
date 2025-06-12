# AI Agent Monitoring Platform

This project is a simplified monitoring and observability platform for AI agents, built with two main services: an **Ingest & Metrics Service** and an **Event Simulator Service**.

## Project Overview

*   **`ingest-service`**: A Node.js/TypeScript service that ingests simulated event data, maintains a rolling window of recent events, and exposes Prometheus-style metrics and a JSON report.
*   **`simulator-service`**: A Node.js/TypeScript service that uses an LLM to generate plausible user interaction events and sends them to the `ingest-service`.

## Public URLs

*   **Ingest & Metrics Service**: `https://ingest-service-1066080214358.us-central1.run.app`
*   **Event Simulator Service**: `https://simulator-service-1066080214358.us-central1.run.app`

## Data Flow

1.  The `simulator-service` is a long-running process that, every 60 seconds, calls the Azure OpenAI API to generate a synthetic user event, including details like `intent` and `confidence`.
2.  This event is then sent via an HTTP POST request to the `/ingest` endpoint of the `ingest-service`.
3.  The `ingest-service` receives the event, validates it, and stores it in an in-memory rolling window (last 5 minutes or 30 events).
4.  The `ingest-service` exposes two endpoints, `/metrics` and `/report`, which provide real-time analytics based on the events in the rolling window.

This creates a continuous flow of simulated data, allowing for real-time monitoring of the "AI agent's" activity.

## How to Test the Endpoints

You can use `curl` or your web browser to interact with the deployed services.

### Simulator Service

You can visit the public URL to confirm it's running:

```bash
curl https://simulator-service-1066080214358.us-central1.run.app
```

### Ingest Service

*   **`/ingest` (POST)**: While this is primarily used by the simulator, you can manually post an event:
    ```bash
    curl -X POST https://ingest-service-1066080214358.us-central1.run.app/ingest \
    -H "Content-Type: application/json" \
    -d '{
      "timestamp": "2025-06-12T10:00:00.000Z",
      "sessionId": "manual-test",
      "intent": "TestIntent",
      "latencyMs": 50,
      "success": true,
      "confidence": 0.99
    }'
    ```

*   **`/metrics` (GET)**: View Prometheus-style metrics.
    ```bash
    curl https://ingest-service-1066080214358.us-central1.run.app/metrics
    ```

*   **`/report` (GET)**: View a JSON summary report.
    ```bash
    curl https://ingest-service-1066080214358.us-central1.run.app/report
    ```

## Code Snippets

### `simulator-service`: Generating and Posting Events

This snippet from `simulator-service/src/index.ts` shows the core simulation loop.

```typescript
// ... existing code ...
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

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (_req, res) => {
    res.status(200).send('Simulator service is running. The simulation is active in the background.');
});

app.listen(port, () => {
    console.log(`Simulator service listening on port ${port}`);
    startSimulation();
});
```

### `ingest-service`: Ingesting and Storing Events

The following is a conceptual example of how events are handled in `ingest-service`, based on the project requirements.

```typescript
// In-memory store for events
const events = [];

// Endpoint to ingest events
app.post('/ingest', (req, res) => {
    const event = req.body;
    // Add validation logic here...

    // Add event to our in-memory store
    events.push(event);

    // Trim events to maintain a rolling window
    // (e.g., based on timestamp or count)
    // ...

    res.status(200).send({ message: 'Event ingested' });
});
```

## Cloud Architecture

Both services are deployed as containerized applications on **Google Cloud Run**.

*   **Containerization**: Each service has a `Dockerfile` that packages it into a portable container image.
*   **Artifact Registry**: The Docker images are stored in Google Artifact Registry.
*   **Cloud Build**: Google Cloud Build is used to automatically build the Docker images from the source code and push them to Artifact Registry.
*   **Cloud Run**: This serverless platform was chosen to run the containers. It automatically scales based on traffic (even though for this project, it's a constant load) and simplifies deployment. Each service gets a public HTTPS URL.
*   **Environment Variables**: Securely passed to the Cloud Run services to configure them (e.g., API keys, target URLs).

This architecture was chosen because it's fast to deploy, requires no server management, and is cost-effective for this type of workload.

## Time Spent

*(Please fill in the approximate time you spent on this project here.)* 