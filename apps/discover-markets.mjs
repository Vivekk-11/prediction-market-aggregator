const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&order=volume24hr&ascending=false";
console.log(`Fetching: ${url}\n`);
const res = await fetch(url);
const events = await res.json();

const candidates = [];
const seenEvents = new Set();

for (const event of events) {
  if (!event.enableOrderBook) continue;

  for (const market of event.markets ?? []) {
    let tokenIds = [];
    try { tokenIds = JSON.parse(market.clobTokenIds || "[]"); } catch {}

    let prices = [];
    try { prices = JSON.parse(market.outcomePrices || "[]"); } catch {}

    const yesPrice = parseFloat(prices[0] || "0");

    if (
      tokenIds.length === 2 &&
      market.active &&
      market.acceptingOrders !== false &&
      !market.closed &&
      yesPrice > 0.05 && yesPrice < 0.95  // skip one-sided markets
    ) {
      candidates.push({
        eventId: event.id,
        eventTitle: event.title,
        question: market.question,
        slug: market.slug,
        tokenIdYes: tokenIds[0],
        tokenIdNo: tokenIds[1],
        conditionId: market.conditionId,
        yesPrice,
        volume24hr: market.volume24hr ?? event.volume24hr ?? 0,
      });
    }
  }
}

// Sort by volume, take one per event for diversity
candidates.sort((a, b) => b.volume24hr - a.volume24hr);
const top = [];
for (const m of candidates) {
  if (top.length >= 10) break;
  if (seenEvents.has(m.eventId)) continue;
  seenEvents.add(m.eventId);
  top.push(m);
}

console.log(`Found ${candidates.length} two-sided markets. Top 10 (1 per event):\n`);

console.log(`import type { MarketConfig } from './types';\n`);
console.log(`export const MARKETS: MarketConfig[] = [`);
for (const m of top) {
  console.log(`  {`);
  console.log(`    id: "${m.slug}",`);
  console.log(`    title: ${JSON.stringify(m.question)},`);
  console.log(`    polymarket: {`);
  console.log(`      tokenIdYes: "${m.tokenIdYes}",`);
  console.log(`      tokenIdNo: "${m.tokenIdNo}",`);
  console.log(`      conditionId: "${m.conditionId}",`);
  console.log(`    },`);
  console.log(`  },`);
}
console.log(`];\n`);

for (const m of top) {
  console.log(`// ${m.question}  —  Yes: ${m.yesPrice}, 24h: $${m.volume24hr.toFixed(0)}`);
}
