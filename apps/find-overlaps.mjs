const GAMMA = "https://gamma-api.polymarket.com";
const KALSHI = "https://api.elections.kalshi.com/trade-api/v2";

// Step 1: Get a big batch of Kalshi series to see what categories exist
console.log("=== Kalshi series (first 50) ===\n");
const seriesRes = await fetch(`${KALSHI}/series?limit=50`);
const seriesData = await seriesRes.json();
const tickers = (seriesData.series ?? []).map(s => s.ticker);

// Filter to interesting-looking ones (skip sports parlays, daily weather, etc)
const interesting = tickers.filter(t =>
  /BTC|ETH|FED|RATE|OIL|WTI|CRUDE|TRUMP|CHINA|NATO|UKRAINE|RUSSIA|IRAN|ISRAEL|POPE|NHL|NBA|NFL|UCL|CHAMPIONS|PRESIDENT|ELECTION|GDP|CPI|INFLATION|RECESSION|SP500|NASDAQ|DOW|GOLD|SILVER/i.test(t)
);
console.log(`Found ${tickers.length} series, ${interesting.length} look interesting:`);
for (const t of interesting) console.log(`  ${t}`);

// Step 2: For each interesting series, get open markets
console.log("\n\n=== Open markets in interesting series ===\n");
const kalshiMarkets = [];

for (const series of interesting) {
  const res = await fetch(`${KALSHI}/markets?limit=10&status=open&series_ticker=${series}`);
  const data = await res.json();
  for (const m of data.markets ?? []) {
    kalshiMarkets.push({
      ticker: m.ticker,
      title: m.title ?? "",
      subtitle: m.subtitle ?? m.yes_sub_title ?? "",
      eventTicker: m.event_ticker,
      lastPrice: m.last_price_dollars,
    });
  }
}

console.log(`Got ${kalshiMarkets.length} open Kalshi markets across interesting series\n`);
for (const m of kalshiMarkets.slice(0, 30)) {
  console.log(`  ${m.ticker} — ${m.title} ${m.subtitle}`);
}

if (kalshiMarkets.length > 30) {
  console.log(`  ... and ${kalshiMarkets.length - 30} more`);
}
