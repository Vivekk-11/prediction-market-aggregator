import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer, WebSocket } from "ws";
import { MARKETS } from "./utils/markets";
import { PolymarketWS } from "./utils/polymarket";
import { fetchKalshiBook } from "./utils/kalshi";
import type {
  VenueBook,
  AggregatedBook,
  AggregatedLevel,
  MarketConfig,
} from "./utils/types";

const PORT = 3001;
const KALSHI_POLL_INTERVAL_MS = 5_000;
const STALE_THRESHOLD_MS = 15_000;

type MarketState = {
  config: MarketConfig;
  polymarket: VenueBook;
  kalshi: VenueBook;
  aggregated: AggregatedBook;
  dirty: boolean;
  subscribers: Set<WebSocket>;
  kalshiPollInterval?: NodeJS.Timeout;

  polymarketLastUpdate: number;
  kalshiLastUpdate: number;
  polymarketStale: boolean;
  kalshiStale: boolean;
};

const marketStates = new Map<string, MarketState>();

const tokenToMarketId = new Map<string, string>();
for (const m of MARKETS) {
  if (m.polymarket) {
    tokenToMarketId.set(m.polymarket.tokenIdYes, m.id);
  }
}

const polyWS = new PolymarketWS((tokenId, book) => {
  const marketId = tokenToMarketId.get(tokenId);
  if (!marketId) return;

  const state = marketStates.get(marketId);
  if (!state) return;

  state.polymarket = book;
  state.polymarketLastUpdate = Date.now();
  state.dirty = true;
});

function aggregate(pm: VenueBook, kalshi: VenueBook): AggregatedBook {
  const aggregateSide = (side: "bids" | "asks") => {
    const map = new Map<number, { polymarket: number; kalshi: number }>();

    for (const level of pm[side]) {
      const rounded = Math.round(level.price * 100) / 100;
      if (!map.has(rounded)) map.set(rounded, { polymarket: 0, kalshi: 0 });
      map.get(rounded)!.polymarket += level.size;
    }

    for (const level of kalshi[side]) {
      const rounded = Math.round(level.price * 100) / 100;
      if (!map.has(rounded)) map.set(rounded, { polymarket: 0, kalshi: 0 });
      map.get(rounded)!.kalshi += level.size;
    }

    const levels: AggregatedLevel[] = Array.from(map.entries()).map(
      ([price, sizes]) => ({
        price,
        totalSize: sizes.polymarket + sizes.kalshi,
        polymarketSize: sizes.polymarket,
        kalshiSize: sizes.kalshi,
      }),
    );

    return levels.sort((a, b) =>
      side === "bids" ? b.price - a.price : a.price - b.price,
    );
  };

  return {
    bids: aggregateSide("bids"),
    asks: aggregateSide("asks"),
  };
}

function getVenueStatus(state: MarketState) {
  return {
    polymarket: !state.config.polymarket
      ? "N/A"
      : state.polymarketStale
        ? "Stale"
        : "Live",
    kalshi: !state.config.kalshi ? "N/A" : state.kalshiStale ? "Stale" : "Live",
  };
}

setInterval(() => {
  const now = Date.now();

  for (const [, state] of marketStates) {
    const wasPmStale = state.polymarketStale;
    const wasKalshiStale = state.kalshiStale;

    state.polymarketStale =
      !state.config.polymarket ||
      now - state.polymarketLastUpdate > STALE_THRESHOLD_MS;
    state.kalshiStale =
      !state.config.kalshi || now - state.kalshiLastUpdate > STALE_THRESHOLD_MS;

    if (
      state.polymarketStale !== wasPmStale ||
      state.kalshiStale !== wasKalshiStale
    ) {
      state.dirty = true;
    }
  }
}, 1_000);

setInterval(() => {
  for (const [marketId, state] of marketStates) {
    if (!state.dirty) continue;

    const pmBook = state.polymarketStale
      ? { bids: [], asks: [] }
      : state.polymarket;
    const kalshiBook = state.kalshiStale
      ? { bids: [], asks: [] }
      : state.kalshi;

    state.aggregated = aggregate(pmBook, kalshiBook);

    const payload = JSON.stringify({
      type: "book",
      marketId,
      data: state.aggregated,
      venueStatus: getVenueStatus(state),
    });

    for (const ws of state.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }

    state.dirty = false;
  }
}, 100);

async function pollKalshi(marketId: string) {
  const state = marketStates.get(marketId);
  if (!state) return;

  const ticker = state.config.kalshi?.ticker;
  if (!ticker) return;

  try {
    const book = await fetchKalshiBook(ticker);
    state.kalshi = book;
    state.kalshiLastUpdate = Date.now();
    state.dirty = true;
  } catch (err) {
    console.error(`[poll] Kalshi fetch failed for ${marketId}:`, err);
  }
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

const marketConfigMap = new Map<string, MarketConfig>();
for (const m of MARKETS) {
  marketConfigMap.set(m.id, m);
}

function handleConnection(ws: WebSocket) {
  const subscribedMarkets = new Set<string>();

  send(ws, { type: "connected" });

  ws.on("close", () => {
    for (const marketId of subscribedMarkets) {
      const config = marketConfigMap.get(marketId);
      const state = marketStates.get(marketId);
      if (!state) continue;

      state.subscribers.delete(ws);
      if (state.subscribers.size === 0) {
        console.log(
          `[ws] No subscribers left for "${config?.title}" — cleaning up.`,
        );

        if (config?.polymarket) {
          polyWS.unsubscribe([config.polymarket.tokenIdYes]);
        }

        if (state.kalshiPollInterval) {
          clearInterval(state.kalshiPollInterval);
        }

        marketStates.delete(marketId);
      }
    }
    subscribedMarkets.clear();
  });

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === "subscribe") {
        const { marketId } = message;

        if (subscribedMarkets.has(marketId)) return;

        const config = marketConfigMap.get(marketId);

        if (!config) {
          send(ws, { type: "error", message: `Unknown market: ${marketId}` });
          return;
        }

        if (!marketStates.has(marketId)) {
          const emptyBook: VenueBook = { bids: [], asks: [] };

          const state: MarketState = {
            config,
            polymarket: emptyBook,
            kalshi: emptyBook,
            aggregated: { bids: [], asks: [] },
            dirty: false,
            subscribers: new Set(),
            polymarketLastUpdate: 0,
            kalshiLastUpdate: 0,
            polymarketStale: true,
            kalshiStale: true,
          };

          marketStates.set(marketId, state);

          if (config.polymarket) {
            console.log(
              `[ws] Subscribing to Polymarket WS for "${config.title}"`,
            );
            polyWS.subscribe([config.polymarket.tokenIdYes]);
          }

          if (config.kalshi) {
            console.log(`[ws] Starting Kalshi poll for "${config.title}"`);
            await pollKalshi(marketId);
            state.kalshiPollInterval = setInterval(
              () => pollKalshi(marketId),
              KALSHI_POLL_INTERVAL_MS,
            );
          }
        }

        const state = marketStates.get(marketId)!;
        state.subscribers.add(ws);
        subscribedMarkets.add(marketId);

        send(ws, {
          type: "book",
          marketId,
          data: state.aggregated,
          venueStatus: getVenueStatus(state),
        });
      }
    } catch (err) {
      console.error("Invalid WS message", err);
    }
  });
}

const start = async () => {
  const app = Fastify();
  await app.register(cors);

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/markets", async () => {
    return MARKETS.map((m) => {
      const state = marketStates.get(m.id);
      const yesPrice = state?.aggregated.bids[0]?.price ?? null;
      return {
        id: m.id,
        title: m.title,
        polymarketId: m.polymarket?.conditionId ?? null,
        kalshiId: m.kalshi?.ticker ?? null,
        yesPrice,
      };
    });
  });

  app.get("/markets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const config = marketConfigMap.get(id);
    if (!config) return reply.status(404).send({ error: "Market not found" });

    const state = marketStates.get(id);
    const yesPrice = state?.aggregated.bids[0]?.price ?? null;

    return {
      id: config.id,
      title: config.title,
      polymarketId: config.polymarket?.conditionId ?? null,
      kalshiId: config.kalshi?.ticker ?? null,
      yesPrice,
      aggregated: state?.aggregated ?? null,
      venueStatus: state ? getVenueStatus(state) : null,
    };
  });

  app.post("/quote", async (request, reply) => {
    const { marketId, amount, side } = request.body as {
      marketId: string;
      amount: number;
      side: "yes" | "no";
    };

    if (
      !marketId ||
      typeof amount !== "number" ||
      isNaN(amount) ||
      amount <= 0 ||
      !side
    ) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const state = marketStates.get(marketId);
    if (!state) {
      return reply.status(404).send({ error: "Market not active" });
    }

    const book = state.aggregated;
    const levels = side === "yes" ? book.asks : book.bids;

    let remaining = amount;
    let totalShares = 0;
    let totalCost = 0;
    let polymarketShares = 0;
    let polymarketCost = 0;
    let kalshiShares = 0;
    let kalshiCost = 0;

    for (const level of levels) {
      if (remaining <= 0) break;

      const price = level.price;
      const maxSharesAtLevel = remaining / price;
      const filledShares = Math.min(level.totalSize, maxSharesAtLevel);
      const costAtLevel = filledShares * price;

      const pmRatio =
        level.totalSize > 0 ? level.polymarketSize / level.totalSize : 0;
      const kalshiRatio =
        level.totalSize > 0 ? level.kalshiSize / level.totalSize : 0;

      const pmShares = filledShares * pmRatio;
      const kalshiSharesAtLevel = filledShares * kalshiRatio;

      totalShares += filledShares;
      totalCost += costAtLevel;
      polymarketShares += pmShares;
      polymarketCost += pmShares * price;
      kalshiShares += kalshiSharesAtLevel;
      kalshiCost += kalshiSharesAtLevel * price;

      remaining -= costAtLevel;
    }

    if (totalShares === 0) {
      return reply.status(400).send({ error: "Not enough liquidity" });
    }

    return {
      shares: totalShares,
      avgPrice: totalCost / totalShares,
      totalCost,
      breakdown: {
        polymarket: { shares: polymarketShares, cost: polymarketCost },
        kalshi: { shares: kalshiShares, cost: kalshiCost },
      },
      computedAt: Date.now(),
    };
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });

  const wss = new WebSocketServer({ server: app.server });
  wss.on("connection", handleConnection);

  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket at ws://localhost:${PORT}`);
  const pmCount = MARKETS.filter((m) => m.polymarket).length;
  const kalshiCount = MARKETS.filter((m) => m.kalshi).length;
  const bothCount = MARKETS.filter((m) => m.polymarket && m.kalshi).length;
  console.log(
    `Configured ${MARKETS.length} markets (${pmCount} Polymarket, ${kalshiCount} Kalshi, ${bothCount} cross-venue)`,
  );
  console.log("Polymarket: real-time WebSocket | Kalshi: 5s REST polling");
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
