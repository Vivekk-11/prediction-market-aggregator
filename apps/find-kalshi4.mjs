const base = "https://api.elections.kalshi.com/trade-api/v2";

// 1. Find Colorado Avalanche Stanley Cup
let res = await fetch(`${base}/markets/KXNHL-26-COL`);
let data = await res.json();
console.log("=== NHL Avalanche ===");
console.log("status:", res.status);
if (data.market) console.log(`${data.market.ticker} — ${data.market.title} ${data.market.subtitle ?? ""} (status: ${data.market.status})`);

// 2. Find PSG Champions League
res = await fetch(`${base}/markets/KXUCL-26-PSG`);
data = await res.json();
console.log("\n=== UCL PSG ===");
console.log("status:", res.status);
if (data.market) console.log(`${data.market.ticker} — ${data.market.title} ${data.market.subtitle ?? ""} (status: ${data.market.status})`);

// 3. Find Fed March 2026 meeting markets
console.log("\n=== Fed (looking for March 2026) ===");
res = await fetch(`${base}/markets?limit=10&status=open&series_ticker=KXFED`);
data = await res.json();
for (const m of data.markets ?? []) {
  if (m.ticker.includes("26MAR") || m.ticker.includes("26APR") || m.title?.toLowerCase().includes("mar")) {
    console.log(`${m.ticker} — ${m.title}`);
  }
}
// Also dump all to see the pattern
console.log("\nAll KXFED open:");
for (const m of (data.markets ?? []).slice(0, 10)) {
  console.log(`  ${m.ticker} — ${m.title?.slice(0, 80)}`);
}

// 4. Check orderbook on the matching ones
for (const ticker of ["KXNHL-26-COL", "KXUCL-26-PSG"]) {
  const bookRes = await fetch(`${base}/markets/${ticker}/orderbook`);
  const book = await bookRes.json();
  const yes = book.orderbook_fp?.yes_dollars ?? [];
  const no = book.orderbook_fp?.no_dollars ?? [];
  console.log(`\n${ticker} orderbook: ${yes.length} yes levels, ${no.length} no levels`);
  if (yes.length) console.log("  yes (first 3):", yes.slice(0, 3));
  if (no.length) console.log("  no (first 3):", no.slice(0, 3));
}
