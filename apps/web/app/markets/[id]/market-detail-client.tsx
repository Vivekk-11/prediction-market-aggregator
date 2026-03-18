"use client";

import type { MarketDetail } from "@/lib/types";
import { useMarketBook } from "@/hooks/use-market-book";
import OrderBook from "@/components/order-book";
import QuotePanel from "@/components/quote-panel";

interface Props {
  market: MarketDetail;
}

export default function MarketDetailClient({ market }: Props) {
  const { book, venueStatus, ready, connected } = useMarketBook(market.id);

  const bestBid = book?.bids[0]?.price ?? null;
  const bestAsk = book?.asks[0]?.price ?? null;
  const mid =
    bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;
  const spread =
    bestBid !== null && bestAsk !== null && mid !== null
      ? (((bestAsk - bestBid) / mid) * 100).toFixed(1)
      : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Title + venue status */}
        <div className="mb-1">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight">
            {market.title}
          </h1>
        </div>
        <div className="flex items-center gap-4 mb-6 text-xs">
          {venueStatus ? (
            <>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    venueStatus.polymarket === "Live"
                      ? "bg-green-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span className="text-polymarket font-semibold">POLY</span>
                <span className="text-foreground/40">
                  {venueStatus.polymarket}
                </span>
              </span>
              <span className="text-foreground/20">·</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    venueStatus.kalshi === "Live"
                      ? "bg-green-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span className="text-kalshi font-semibold">KALSHI</span>
                <span className="text-foreground/40">{venueStatus.kalshi}</span>
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-foreground/30">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-amber-500 animate-pulse" : "bg-foreground/20"
                }`}
              />
              {connected ? "Subscribing…" : "Connecting…"}
            </span>
          )}
        </div>

        {/* Price summary bar */}
        <div className="border-t border-b border-border py-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/35 mb-1.5">
              Best Bid
            </p>
            <p className="font-mono text-3xl font-semibold text-bid tabular-nums">
              {bestBid !== null ? (
                bestBid.toFixed(3)
              ) : (
                <span className="text-foreground/20">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/35 mb-1.5">
              Best Ask
            </p>
            <p className="font-mono text-3xl font-semibold text-ask tabular-nums">
              {bestAsk !== null ? (
                bestAsk.toFixed(3)
              ) : (
                <span className="text-foreground/20">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/35 mb-1.5">
              Mid
            </p>
            <p className="font-mono text-3xl font-semibold text-foreground tabular-nums">
              {mid !== null ? (
                mid.toFixed(3)
              ) : (
                <span className="text-foreground/20">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/35 mb-1.5">
              Spread
            </p>
            <p className="font-mono text-3xl font-semibold text-foreground tabular-nums">
              {spread !== null ? (
                `${spread}%`
              ) : (
                <span className="text-foreground/20">—</span>
              )}
            </p>
          </div>
        </div>

        {/* Order book + Trade panel */}
        <div className="flex flex-col lg:flex-row gap-8">
          <OrderBook
            book={book}
            venueStatus={venueStatus}
            className="flex-1 min-w-0"
          />
          <QuotePanel
            marketId={market.id}
            ready={ready}
            className="lg:w-72 shrink-0"
          />
        </div>
      </div>
    </main>
  );
}
