const base = "https://api.elections.kalshi.com/trade-api/v2";

// Try markets directly with different params
console.log("=== Try 1: markets?limit=10&status=open ===");
let res = await fetch(`${base}/markets?limit=10&status=open`);
let data = await res.json();
console.log("Status:", res.status, "Keys:", Object.keys(data));
console.log("Count:", data.markets?.length);
for (const m of (data.markets ?? []).slice(0, 5)) {
  console.log(`  ${m.ticker} — ${m.title ?? m.subtitle ?? m.yes_sub_title ?? "?"}`);
  console.log(`    event: ${m.event_ticker}, status: ${m.status}`);
}

console.log("\n=== Try 2: events?limit=10 (no status filter) ===");
res = await fetch(`${base}/events?limit=10`);
data = await res.json();
console.log("Status:", res.status, "Keys:", Object.keys(data));
console.log("Count:", data.events?.length);
for (const e of (data.events ?? []).slice(0, 5)) {
  console.log(`  ${e.event_ticker} — ${e.title} (${e.markets?.length ?? 0} markets)`);
}

console.log("\n=== Try 3: series list ===");
res = await fetch(`${base}/series`);
data = await res.json();
console.log("Status:", res.status, "Keys:", Object.keys(data));
for (const s of (data.series ?? []).slice(0, 10)) {
  console.log(`  ${s.ticker} — ${s.title}`);
}

// Try finding bitcoin/fed/oil markets by ticker prefix
console.log("\n=== Try 4: markets with known prefixes ===");
for (const prefix of ["KXBTC", "FED", "CRUDE", "KXOIL"]) {
  res = await fetch(`${base}/markets?limit=3&status=open&series_ticker=${prefix}`);
  data = await res.json();
  const ct = data.markets?.length ?? 0;
  if (ct > 0) {
    console.log(`\n${prefix}: ${ct} markets`);
    for (const m of data.markets.slice(0, 3)) {
      console.log(`  ${m.ticker} — ${m.title ?? m.subtitle ?? "?"}`);
    }
  } else {
    console.log(`${prefix}: no results`);
  }
}
