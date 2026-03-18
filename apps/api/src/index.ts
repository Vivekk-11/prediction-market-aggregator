import Fastify from "fastify";
import websocket, { WebSocket } from "@fastify/websocket";
import cors from "@fastify/cors";

// TODO: We’ll fix formatting later

const start = async () => {
  const app = Fastify();

  type VenueLevel = {
    price: number;
    size: number;
  };

  type VenueBook = {
    bids: VenueLevel[];
    asks: VenueLevel[];
  };

  type AggregatedLevel = {
    price: number;
    totalSize: number;
    polymarketSize: number;
    kalshiSize: number;
  };

  type AggregatedBook = {
    bids: AggregatedLevel[];
    asks: AggregatedLevel[];
  };

  type MarketState = {
    polymarket: VenueBook;
    kalshi: VenueBook;
    aggregated: AggregatedBook;
    interval?: NodeJS.Timeout;
    dirty: boolean;
    subscribers: Set<WebSocket>;

    polymarketLastUpdate: number;
    kalshiLastUpdate: number;

    polymarketStale: boolean;
    kalshiStale: boolean;
  };

  const marketStates = new Map<string, MarketState>();

  setInterval(() => {
    for (const state of marketStates.values()) {
      if (!state.dirty) continue;

      const STALE_THRESHOLD = 5000; // 5 seconds
      const now = Date.now();

      state.polymarketStale =
        now - state.polymarketLastUpdate > STALE_THRESHOLD;

      state.kalshiStale = now - state.kalshiLastUpdate > STALE_THRESHOLD;

      const pmBook = state.polymarketStale
        ? { bids: [], asks: [] }
        : state.polymarket;

      const kalshiBook = state.kalshiStale
        ? { bids: [], asks: [] }
        : state.kalshi;

      state.aggregated = aggregate(pmBook, kalshiBook);

      const payload = JSON.stringify({
        type: "book",
        data: state.aggregated,
        venueStatus: {
          polymarket: state.polymarketStale ? "Stale" : "Live", // TODO: use enums
          kalshi: state.kalshiStale ? "Stale" : "Live", // TODO: use enums
        },
      });

      for (const ws of state.subscribers) {
        ws.send(payload);
      }

      state.dirty = false;
    }
  }, 100);

  function createFakeBook(): VenueBook {
    return {
      bids: [
        { price: 0.59, size: 100 },
        { price: 0.58, size: 150 },
        { price: 0.57, size: 120 },
      ],
      asks: [
        { price: 0.6, size: 80 },
        { price: 0.61, size: 140 },
        { price: 0.62, size: 200 },
      ],
    };
  }

  function aggregate(pm: VenueBook, kalshi: VenueBook): AggregatedBook {
    const aggregateSide = (side: "bids" | "asks") => {
      const map = new Map<number, { polymarket: number; kalshi: number }>();

      for (const level of pm[side]) {
        const rounded = Math.round(level.price * 100) / 100;

        if (!map.has(rounded)) {
          map.set(rounded, { polymarket: 0, kalshi: 0 });
        }

        map.get(rounded)!.polymarket += level.size;
      }

      for (const level of kalshi[side]) {
        const rounded = Math.round(level.price * 100) / 100;

        if (!map.has(rounded)) {
          map.set(rounded, { polymarket: 0, kalshi: 0 });
        }

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

  await app.register(cors);
  await app.register(websocket);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/markets", async () => {
    return [
      {
        id: "market-1",
        title: "Will X happen?",
        polymarketId: "pm-id-1",
        kalshiId: "kalshi-id-1",
        yesPrice: 0.5,
      },
    ];
  });

  app.get("/markets/:id", async () => {
    return {
      id: "market-1",
      title: "Will X happen?",
      description: "Detailed description here",
      polymarketId: "pm-id-1",
      kalshiId: "kalshi-id-1",
      tickSize: 0.01,
    };
  });

  app.get("/ws", { websocket: true }, (socket, _req) => {
    socket.send(JSON.stringify({ type: "connected" }));

    socket.on("message", (raw: any) => {
      try {
        const message = JSON.parse(raw.toString());

        if (message.type === "subscribe") {
          const { marketId } = message;

          if (!marketStates.has(marketId)) {
            const polymarket = createFakeBook();
            const kalshi = createFakeBook();
            const aggregated = aggregate(polymarket, kalshi);

            const now = Date.now();
            marketStates.set(marketId, {
              polymarket,
              kalshi,
              aggregated,
              dirty: false,
              subscribers: new Set(),
              polymarketLastUpdate: now,
              kalshiLastUpdate: now,
              polymarketStale: false,
              kalshiStale: false,
            });
          }

          const state = marketStates.get(marketId)!;

          socket.send(
            JSON.stringify({
              type: "book",
              data: state.aggregated,
            }),
          );

          state.subscribers.add(socket);

          state.interval = setInterval(() => {
            state.polymarket.asks[0].size += Math.floor(Math.random() * 10 - 5);
            state.polymarketLastUpdate = Date.now();

            state.kalshi.bids[0].size += Math.floor(Math.random() * 10 - 5);
            state.kalshiLastUpdate = Date.now();

            state.dirty = true;
          }, 1000);

          socket.on("close", () => {
            state.subscribers.delete(socket);
            if (state.subscribers.size === 0) {
              if (state.interval) clearInterval(state.interval);
              marketStates.delete(marketId);
            }
          });
        }
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    });
  });

  app.post("/quote", async (request, reply) => {
    const { marketId, amount, side } = request.body as {
      marketId: string;
      amount: number;
      side: "yes" | "no";
    };

    if (!marketId || !amount || amount <= 0 || !side) {
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

      const pmCost = pmShares * price;
      const kalshiCostAtLevel = kalshiSharesAtLevel * price;

      totalShares += filledShares;
      totalCost += costAtLevel;

      polymarketShares += pmShares;
      polymarketCost += pmCost;

      kalshiShares += kalshiSharesAtLevel;
      kalshiCost += kalshiCostAtLevel;

      remaining -= costAtLevel;
    }

    if (totalShares === 0) {
      return reply.status(400).send({ error: "Not enough liquidity" });
    }

    const avgPrice = totalCost / totalShares;

    return {
      shares: totalShares,
      avgPrice,
      totalCost,
      breakdown: {
        polymarket: {
          shares: polymarketShares,
          cost: polymarketCost,
        },
        kalshi: {
          shares: kalshiShares,
          cost: kalshiCost,
        },
      },
      computedAt: Date.now(),
    };
  });

  await app.listen({ port: 3001, host: "0.0.0.0" });

  console.log("Server running on http://localhost:3001");
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
