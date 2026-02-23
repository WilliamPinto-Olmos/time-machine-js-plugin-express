# time-machine-js-plugin-express

An Express.js middleware plugin for [`time-machine-js`](https://www.npmjs.com/package/time-machine-js). It allows you to easily manipulate the global server time globally via environment variables or on a per-request basis using HTTP headers.

## Installation

```bash
npm install time-machine-js-plugin-express time-machine-js
```

## Usage

### 1. Global Initialization via Environment Variable

You can automatically set the server's time upon initialization by reading from the `TIME_MACHINE_TRAVEL_TO` environment variable.

Make sure your environment variable is set before your app starts:

```bash
# .env
TIME_MACHINE_TRAVEL_TO="2020-01-01T00:00:00Z"
```

Then initialize it in your code:

```typescript
import { initTimeMachineFromEnv } from "time-machine-js-plugin-express";

// Initialize with a preferred mode ('flowing' or 'frozen')
initTimeMachineFromEnv({ mode: "flowing" });
```

### 2. Per-Request Time Travel via Middleware

You can allow clients to travel to a specific time for the duration of a single HTTP request using a custom header. The middleware automatically handles reverting the time back to its previous state after the request finishes.

```typescript
import express from "express";
import { timeMachineMiddleware } from "time-machine-js-plugin-express";

const app = express();

// Use the middleware globally or on specific routes
app.use(
  timeMachineMiddleware({
    // Optional: customize the header name (default is 'x-time-traveled-to')
    headerName: "x-time-traveled-to",
  }),
);

app.get("/current-time", (req, res) => {
  res.json({ time: new Date().toISOString() });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

**Testing the request:**

```bash
curl -H "x-time-traveled-to: 1999-12-31T23:59:59Z" http://localhost:3000/current-time
# Output will reflect the traveled time
```

## Concurrency Note for Node.js

Because `time-machine-js` patches `Date.now()` globally, Node.js applications that process multiple requests concurrently may experience side-effects where one request's modified time bleeds into another request running at the exact same time. This plugin is most optimal for development, testing, and staging environments.

## License

MIT
