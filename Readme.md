# Prediction Market Aggregator

A real-time web application that combines order book data from Polymarket and Kalshi into a single unified view, with live quote calculation and best-execution routing.

## Setup

**Prerequisites**: Node.js 20+, pnpm 10+

```bash
pnpm install
pnpm dev
```

- Frontend: http://localhost:3000
- API server: http://localhost:3001

No API keys are required. Polymarket uses public WebSocket subscriptions and Kalshi uses public REST endpoints.

## Design Decisions

### Backend as aggregation layer

I chose to put all aggregation logic in a Node.js/Fastify backend rather than doing it in the browser. The main reason: WebSocket connections to Polymarket's CLOB and Kalshi's APIs should be maintained server-side and shared across clients. A browser-only approach would open a new upstream connection per visitor, which doesn't scale and breaks reconnect logic easily.

The server exposes:
- A WebSocket endpoint for streaming aggregated order book updates to the frontend (~100ms broadcast cadence when data changes)
- A REST endpoint for quote calculation (`POST /quote`)
- REST endpoints for market listing and detail

### Mixed data transport (WebSocket + polling)

Polymarket provides a WebSocket API for real-time order book updates, which I use directly, subscribing to token IDs per market and applying incremental price change events on top of snapshots.

Kalshi doesn't have a public WebSocket for order books (their WebSocket is documented but not publicly accessible without auth), so I poll their REST API every 5 seconds. This is an acceptable tradeoff: 5s polling introduces slight lag but is reliable and requires no credentials.

### Order book aggregation

Prices from both venues are rounded to the nearest cent before merging. This prevents fragmentation from floating point differences and ensures that near-identical price levels collapse into a single row rather than showing as separate levels.

Each level in the aggregated book tracks venue-attributed sizes (`polymarketSize`, `kalshiSize`) alongside a `totalSize`. This powers the per-venue depth visualization in the UI and the proportional venue split in quote calculation.

### Quote / best execution

The `POST /quote` endpoint walks the aggregated order book greedily from best price inward. At each level, it allocates shares proportionally based on how much of that level's liquidity comes from each venue. The result tells the user: total shares, average price, and exactly how much of the fill would route through Polymarket vs. Kalshi.

This is a pricing simulation only — no orders are placed.

### Staleness detection

If a venue hasn't sent an update in 15 seconds, it's marked stale and its levels are excluded from the aggregated book. The UI shows a status indicator (live pulse vs. amber warning) per venue. This ensures the displayed order book never silently becomes inaccurate — it either shows current data or makes the gap visible.

### Subscription lifecycle

Market state (upstream WebSocket subscriptions, Kalshi poll intervals) is created lazily when the first browser client subscribes and torn down when the last client disconnects. This keeps resource usage proportional to actual usage.

### Frontend

Next.js App Router with React 19. The `use-market-book` hook manages the WebSocket connection to the backend with exponential backoff reconnection (500ms → 10s). Quote requests are debounced at 400ms and cancelled on unmount to avoid stale responses.

## Assumptions and Tradeoffs

- **Markets are hardcoded.** The four configured markets (Trump China visit, PSG Champions League, BTC dip, Colorado Avalanche) were chosen because they have matching questions on both Polymarket and Kalshi at the time of writing. A production system would need a way to discover and align markets across venues dynamically.

- **Kalshi YES/NO price conversion.** Kalshi returns `yes_dollars` and `no_dollars` arrays. I treat `yes_dollars` as bids and convert `no_dollars` prices with `1 - no_price` to derive asks. This may not be exactly equivalent to Polymarket's representation in all cases.

- **No authentication.** Both integrations use public endpoints. Rate limits could become a constraint at higher polling frequency or with many markets.

- **In-memory state only.** The server holds all order book state in memory. A restart clears all state, which is recovered quickly (within one polling cycle and one Polymarket snapshot). For a production service you'd want persistent storage or a more graceful startup.

- **Single outcome displayed.** The app shows the order book for the YES outcome only. The assignment asks for one outcome; extending to NO would be straightforward since both sides are already tracked.

## What I'd improve with more time

- **Kalshi WebSocket.** Replace polling with a real WebSocket subscription once credentials are available. This would bring Kalshi's latency in line with Polymarket's.

- **Dynamic market discovery.** Instead of hardcoded markets, implement a matching layer that finds semantically equivalent markets across venues (likely via embeddings or a curated mapping table).

- **Better price alignment.** Kalshi and Polymarket sometimes represent the same event at different price levels due to market microstructure differences (fees, tick sizes). A calibration layer would improve aggregation accuracy.

- **Order book depth chart.** A cumulative depth visualization would make it easier to see where liquidity is concentrated at a glance.

- **Persistence.** Store snapshots to a database so the app can bootstrap immediately on restart without waiting for fresh upstream data.

- **Observability.** Add structured logging, metrics (quote latency, WebSocket reconnect counts, staleness events), and alerting for when venues go dark.

- **Multi-market support.** The current architecture supports multiple markets already, but the UI only shows a list — a dashboard view comparing spreads and liquidity across markets would be useful.
