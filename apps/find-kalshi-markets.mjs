const base = "https://api.elections.kalshi.com/trade-api/v2";

// Search for markets that might overlap with our Polymarket 10
const searches = [
  "bitcoin",
  "fed interest rate",
  "crude oil",
  "trump china",
  "netanyahu",
  "iran",
  "champions league",
  "stanley cup",
];

for (const q of searches) {
  const url = `${base}/markets?limit=5&status=open`;
  const res = await fetch(url);
  const data = await res.json();
  // Kalshi doesn't have a search param — let's try events instead
}

// Actually let's just dump a bunch of active markets and see what's there
console.log("=== Active Kalshi events ===\n");

const eventsRes = await fetch(`${base}/events?limit=20&status=open&with_nested_markets=true`);
const eventsData = await eventsRes.json();

for (const event of eventsData.events ?? []) {
  const markets = event.markets ?? [];
  const openMarkets = markets.filter(m => m.status === "open");
  if (openMarkets.length === 0) continue;

  console.log(`\n[${event.event_ticker}] ${event.title} (${openMarkets.length} open markets)`);
  for (const m of openMarkets.slice(0, 3)) {
    console.log(`  ${m.ticker} — ${m.title ?? m.subtitle ?? ""}`);

    // Fetch orderbook for first one to see if there's liquidity
    if (m === openMarkets[0]) {
      const bookRes = await fetch(`${base}/markets/${m.ticker}/orderbook`);
      const book = await bookRes.json();
      const yesCt = book.orderbook_fp?.yes_dollars?.length ?? 0;
      const noCt = book.orderbook_fp?.no_dollars?.length ?? 0;
      console.log(`    ^ orderbook: ${yesCt} yes levels, ${noCt} no levels`);
    }
  }
}
