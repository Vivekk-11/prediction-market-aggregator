import WebSocket from "ws";
import type { VenueBook, VenueLevel } from "./types";

const WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const PING_INTERVAL_MS = 10_000;
const RECONNECT_DELAY_MS = 3_000;

type BookCallback = (tokenId: string, book: VenueBook) => void;

export class PolymarketWS {
  private ws: WebSocket | null = null;
  private tokenIds: Set<string> = new Set();
  private books: Map<string, VenueBook> = new Map();
  private onBookUpdate: BookCallback;
  private pingInterval: NodeJS.Timeout | null = null;
  private shouldReconnect = true;

  constructor(onBookUpdate: BookCallback) {
    this.onBookUpdate = onBookUpdate;
  }

  subscribe(tokenIds: string[]) {
    for (const id of tokenIds) {
      this.tokenIds.add(id);
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    } else {
      this.sendSubscription(tokenIds);
    }
  }

  unsubscribe(tokenIds: string[]) {
    for (const id of tokenIds) {
      this.tokenIds.delete(id);
      this.books.delete(id);
    }
  }

  close() {
    this.shouldReconnect = false;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) this.ws.close();
  }

  private connect() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
    }

    console.log(`[pm-ws] Connecting to ${WS_URL}...`);
    this.ws = new WebSocket(WS_URL);

    this.ws.on("open", () => {
      console.log(
        `[pm-ws] Connected. Subscribing to ${this.tokenIds.size} tokens.`,
      );
      this.sendSubscription([...this.tokenIds]);
      this.startPing();
    });

    this.ws.on("message", (raw: WebSocket.RawData) => {
      try {
        this.handleMessage(raw.toString());
      } catch (err) {
        console.error("[pm-ws] Error handling message:", err);
      }
    });

    this.ws.on("close", () => {
      console.log("[pm-ws] Disconnected.");
      this.stopPing();
      if (this.shouldReconnect) {
        console.log(`[pm-ws] Reconnecting in ${RECONNECT_DELAY_MS}ms...`);
        setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
      }
    });

    this.ws.on("error", (err) => {
      console.error("[pm-ws] WS error:", err.message);
    });
  }

  private sendSubscription(tokenIds: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (tokenIds.length === 0) return;

    this.ws.send(
      JSON.stringify({
        assets_ids: tokenIds,
        type: "market",
      }),
    );
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(raw: string) {
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.asset_id && item.bids && item.asks) {
          this.handleBookSnapshot(item);
        }
      }
      return;
    }

    if (data.event_type === "price_change" && data.price_changes) {
      for (const change of data.price_changes) {
        this.handlePriceChange(change);
      }
      return;
    }
  }

  private handleBookSnapshot(item: {
    asset_id: string;
    bids: { price: string; size: string }[];
    asks: { price: string; size: string }[];
  }) {
    const tokenId = item.asset_id;
    if (!this.tokenIds.has(tokenId)) return;

    const book: VenueBook = {
      bids: parseLevels(item.bids),
      asks: parseLevels(item.asks),
    };

    this.books.set(tokenId, book);
    this.onBookUpdate(tokenId, book);
  }

  private handlePriceChange(change: {
    asset_id: string;
    price: string;
    size: string;
    side: string; // "BUY" or "SELL"
  }) {
    const tokenId = change.asset_id;
    if (!this.tokenIds.has(tokenId)) return;

    let book = this.books.get(tokenId);
    if (!book) {
      return;
    }

    const price = parseFloat(change.price);
    const size = parseFloat(change.size);
    const isBid = change.side === "BUY";
    const levels = isBid ? book.bids : book.asks;

    const idx = levels.findIndex((l) => l.price === price);

    if (size === 0) {
      if (idx !== -1) levels.splice(idx, 1);
    } else if (idx !== -1) {
      levels[idx].size = size;
    } else {
      levels.push({ price, size });
    }

    if (isBid) {
      levels.sort((a, b) => b.price - a.price);
    } else {
      levels.sort((a, b) => a.price - b.price);
    }

    this.onBookUpdate(tokenId, book);
  }
}

function parseLevels(raw: { price: string; size: string }[]): VenueLevel[] {
  return raw.map((l) => ({
    price: parseFloat(l.price),
    size: parseFloat(l.size),
  }));
}
