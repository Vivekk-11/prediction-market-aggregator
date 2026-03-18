import { VenueBook, VenueLevel } from "./types";

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

type KalshiOrderbookResponse = {
  orderbook_fp: {
    yes_dollars: [string, string][]; // [price, size][]
    no_dollars: [string, string][]; // [price, size][]
  };
};

export async function fetchKalshiBook(ticker: string): Promise<VenueBook> {
  const url = `${KALSHI_BASE}/markets/${ticker}/orderbook`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Kalshi book fetch failed for ${ticker}: ${res.status} ${res.statusText}`,
    );
  }

  const data: KalshiOrderbookResponse = await res.json();

  const yesBids = data.orderbook_fp?.yes_dollars ?? [];
  const noBids = data.orderbook_fp?.no_dollars ?? [];

  const bids: VenueLevel[] = yesBids.map(([price, size]) => ({
    price: parseFloat(price),
    size: parseFloat(size),
  }));

  const asks: VenueLevel[] = noBids.map(([price, size]) => ({
    price: roundCent(1 - parseFloat(price)),
    size: parseFloat(size),
  }));

  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  return { bids, asks };
}

function roundCent(n: number): number {
  return Math.round(n * 100) / 100;
}
