/**
 * Run this once locally to discover active markets and their token IDs:
 *   npx tsx src/discover-markets.ts
 *
 * It hits the Gamma API (no auth needed), finds active binary markets
 * with orderbooks enabled, and prints the info you need for markets.ts
 */

const GAMMA_URL = "https://gamma-api.polymarket.com";

type GammaMarket = {
  id: string;
  question: string;
  slug: string;
  clobTokenIds: string[]; // [yesTokenId, noTokenId]
  conditionId: string;
  outcomes: string; // JSON string like '["Yes","No"]'
  outcomePrices: string; // JSON string like '["0.65","0.35"]'
  enableOrderBook: boolean;
  active: boolean;
  closed: boolean;
  volume: string;
  volume24hr: number;
};

type GammaEvent = {
  id: string;
  title: string;
  slug: string;
  markets: GammaMarket[];
};

async function main() {
  // Fetch top active events sorted by volume
  const url = `${GAMMA_URL}/events?active=true&closed=false&limit=20&order=volume24hr&ascending=false`;

  console.log(`Fetching: ${url}\n`);

  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Gamma API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const events: GammaEvent[] = await res.json();

  // Filter to events that have binary markets with orderbooks
  const candidates: {
    eventTitle: string;
    question: string;
    slug: string;
    tokenIdYes: string;
    tokenIdNo: string;
    conditionId: string;
    prices: string;
    volume24hr: number;
  }[] = [];

  for (const event of events) {
    for (const market of event.markets) {
      if (
        market.enableOrderBook &&
        market.active &&
        !market.closed &&
        market.clobTokenIds?.length === 2
      ) {
        candidates.push({
          eventTitle: event.title,
          question: market.question,
          slug: market.slug,
          tokenIdYes: market.clobTokenIds[0],
          tokenIdNo: market.clobTokenIds[1],
          conditionId: market.conditionId,
          prices: market.outcomePrices,
          volume24hr: market.volume24hr,
        });
      }
    }
  }

  // Sort by 24h volume and take top 10
  candidates.sort((a, b) => b.volume24hr - a.volume24hr);
  const top = candidates.slice(0, 10);

  console.log(
    `Found ${candidates.length} tradable markets. Top 10 by 24h volume:\n`,
  );

  // Print as ready-to-paste TypeScript
  console.log("// ── Paste this into src/markets.ts ──\n");
  console.log("import type { MarketConfig } from './types';\n");
  console.log("export const MARKETS: MarketConfig[] = [");

  for (const m of top) {
    console.log(`  {`);
    console.log(`    id: "${m.slug}",`);
    console.log(`    title: ${JSON.stringify(m.question)},`);
    console.log(`    polymarket: {`);
    console.log(`      tokenIdYes: "${m.tokenIdYes}",`);
    console.log(`      tokenIdNo: "${m.tokenIdNo}",`);
    console.log(`      conditionId: "${m.conditionId}",`);
    console.log(`    },`);
    console.log(`    // kalshi: { ticker: "TODO" },`);
    console.log(`  },`);
  }

  console.log("];\n");

  // Also print a summary table
  console.log("// ── Summary ──");
  for (const m of top) {
    const prices = JSON.parse(m.prices || "[]");
    console.log(`// ${m.question}`);
    console.log(
      `//   Yes: ${prices[0]}, No: ${prices[1]}, 24h Vol: $${m.volume24hr.toFixed(0)}`,
    );
  }
}

main().catch(console.error);
