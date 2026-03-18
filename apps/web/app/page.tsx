import Link from "next/link";
import type { MarketSummary } from "@/lib/types";

async function getMarkets(): Promise<MarketSummary[]> {
  const apiUrl = process.env.API_URL || "http://localhost:3001";
  const res = await fetch(`${apiUrl}/markets`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error("Failed to fetch markets");
  return res.json();
}

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
        <p className="text-sm text-foreground/50 mt-1">
          Aggregated from Polymarket &amp; Kalshi
        </p>
      </header>

      {markets.length === 0 ? (
        <p className="text-foreground/40 text-sm">No markets available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => {
            const noPrice = (1 - market.yesPrice).toFixed(2);
            const yesDisplay = market.yesPrice.toFixed(2);
            return (
              <Link
                key={market.id}
                href={`/markets/${market.id}`}
                className="block bg-surface border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors"
              >
                <p className="text-sm font-medium leading-snug line-clamp-2 mb-4">
                  {market.title}
                </p>
                {/* TODO: add description too */}
                <div className="flex items-end gap-x-4">
                  <div>
                    <p className="text-xs text-foreground/40 mb-0.5 uppercase tracking-wider">
                      YES
                    </p>
                    <p className="font-mono text-base font-medium text-bid">
                      ${yesDisplay}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/40 mb-0.5 uppercase tracking-wider">
                      NO
                    </p>
                    <p className="font-mono text-base font-medium text-ask">
                      ${noPrice}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
