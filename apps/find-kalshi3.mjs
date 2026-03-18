const base = "https://api.elections.kalshi.com/trade-api/v2";

// Search broader series and market tickers
const prefixes = [
  "KXBTC", "KXFED", "KXINTR", "KXRATE", "FOMC",
  "KXCRUDE", "KXOIL", "KXWTI",
  "KXTRUMP",
  "KXISRAEL", "KXNETAN",
  "KXIRAN",
  "KXNHL", "KXSTANLEY",
  "KXUCL", "KXCHAMPIONS",
  "KXPARIS",
  "KXBARCA",
];

for (const prefix of prefixes) {
  const res = await fetch(`${base}/markets?limit=3&status=open&series_ticker=${prefix}`);
  const data = await res.json();
  const ct = data.markets?.length ?? 0;
  if (ct > 0) {
    console.log(`\n${prefix}: ${ct} markets`);
    for (const m of data.markets) {
      console.log(`  ${m.ticker} — ${m.title ?? m.subtitle ?? "?"}`);
    }
  }
}

// Also try text search via event_ticker filter
console.log("\n\n=== Searching by event_ticker ===");
for (const q of ["FED", "FOMC", "CRUDE", "OIL", "BTC", "TRUMP", "NHL", "UCL"]) {
  const res = await fetch(`${base}/markets?limit=3&status=open&event_ticker=${q}`);
  const data = await res.json();
  if (data.markets?.length > 0) {
    console.log(`\nevent=${q}: ${data.markets.length} markets`);
    for (const m of data.markets) {
      console.log(`  ${m.ticker} — ${m.title ?? m.subtitle ?? "?"}`);
    }
  }
}

// Now grab a BTC orderbook to check liquidity
console.log("\n\n=== BTC orderbook check ===");
const bookRes = await fetch(`${base}/markets/KXBTC-26MAR1802-T83399.99/orderbook`);
const book = await bookRes.json();
console.log("yes_dollars:", book.orderbook_fp?.yes_dollars?.slice(0, 5));
console.log("no_dollars:", book.orderbook_fp?.no_dollars?.slice(0, 5));

// Also dump the full market object for a BTC market to see all fields
console.log("\n=== BTC market object ===");
const mktRes = await fetch(`${base}/markets/KXBTC-26MAR1802-T83399.99`);
const mkt = await mktRes.json();
console.log(JSON.stringify(mkt.market ?? mkt, null, 2));
