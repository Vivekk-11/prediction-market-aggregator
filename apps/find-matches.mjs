const base = "https://api.elections.kalshi.com/trade-api/v2";

// Our Polymarket topics → likely Kalshi series
const searches = [
  { pm: "Lehigh vs Prairie View", series: [] }, // college basketball - skip
  { pm: "US x Iran ceasefire", series: ["KXIRANMEET", "KXUSAIRANAGREEMENT", "KXVISITIRAN", "KXTRUMPIRAN", "KXWCIRAN", "KXTRUMPKHAMENEIMEET"] },
  { pm: "FC Barcelona UCL", series: ["KXUCLGAME", "KXUCLW", "KXUCL16"] },
  { pm: "Crude Oil $100", series: ["KXOIL", "KXWTI", "KXWTIMAX"] },
  { pm: "Trump visits China", series: ["KXTRUMPCHINA", "KXSHAKETRUMPXI", "KXTRUMPVISITSTATES"] },
  { pm: "PSG Champions League", series: ["KXUCL"] },  // already matched
  { pm: "Netanyahu out", series: ["KXISRAELRESIGN", "KXNEXTISRAELPM", "KXRONENBAR", "KXISRAELKNESSET"] },
  { pm: "Bitcoin $65k March", series: ["KXBTC", "KXBTCMINY", "KXBTCMINMON"] },
  { pm: "Rachida Dati Paris mayor", series: [] }, // niche - skip
  { pm: "Avalanche Stanley Cup", series: ["KXNHL"] },  // already matched
];

for (const s of searches) {
  if (s.series.length === 0) continue;
  console.log(`\n=== ${s.pm} ===`);

  for (const series of s.series) {
    const res = await fetch(`${base}/markets?limit=5&status=open&series_ticker=${series}`);
    const data = await res.json();
    for (const m of data.markets ?? []) {
      // Check orderbook depth quickly
      const bookRes = await fetch(`${base}/markets/${m.ticker}/orderbook`);
      const book = await bookRes.json();
      const yesLevels = book.orderbook_fp?.yes_dollars?.length ?? 0;
      const noLevels = book.orderbook_fp?.no_dollars?.length ?? 0;
      const hasLiquidity = yesLevels + noLevels > 3;

      console.log(`  ${hasLiquidity ? "✓" : "✗"} ${m.ticker} — ${(m.title ?? "").slice(0, 70)} (${yesLevels}y/${noLevels}n)`);
    }
  }
}
