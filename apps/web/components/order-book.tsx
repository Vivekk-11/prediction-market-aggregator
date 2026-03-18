"use client";

import type { AggregatedBook, AggregatedLevel, VenueStatus } from "@/lib/types";

interface Props {
  book: AggregatedBook | null;
  venueStatus: { polymarket: VenueStatus; kalshi: VenueStatus } | null;
  className?: string;
}

function venueLabel(level: AggregatedLevel): string {
  if (level.polymarketSize > 0 && level.kalshiSize > 0) return "Both";
  if (level.polymarketSize > level.kalshiSize) return "Poly";
  if (level.kalshiSize > level.polymarketSize) return "Kalshi";
  return "—";
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function SkeletonRow({ i }: { i: number }) {
  return (
    <tr key={i} className="border-b border-border/40">
      <td className="py-2 px-3 w-16">
        <div className="h-3.5 w-10 rounded bg-border/50 animate-pulse" />
      </td>
      <td className="py-2 px-2 text-right w-16">
        <div className="h-3.5 w-12 rounded bg-border/50 animate-pulse ml-auto" />
      </td>
      <td className="py-2 px-3 w-20 text-right">
        <div className="h-4 w-14 rounded bg-bid/10 animate-pulse ml-auto" />
      </td>
      <td className="w-px bg-border/60" />
      <td className="py-2 px-3 w-20">
        <div className="h-4 w-14 rounded bg-ask/10 animate-pulse" />
      </td>
      <td className="py-2 px-2 w-16">
        <div className="h-3.5 w-12 rounded bg-border/50 animate-pulse" />
      </td>
      <td className="py-2 px-3 w-16">
        <div className="h-3.5 w-10 rounded bg-border/50 animate-pulse" />
      </td>
    </tr>
  );
}

export default function OrderBook({
  book,
  className = "",
}: Props) {
  const bids = book?.bids.slice(0, 10) ?? [];
  const asks = book?.asks.slice(0, 10) ?? [];
  const rows = Math.max(bids.length, asks.length, book === null ? 10 : 0);

  const maxBidSize = bids.reduce((m, l) => Math.max(m, l.totalSize), 0);
  const maxAskSize = asks.reduce((m, l) => Math.max(m, l.totalSize), 0);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
          Order Book
        </h2>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/80">
              <th className="py-2 px-3 text-left text-foreground/30 font-normal uppercase tracking-wider w-16">
                Venue
              </th>
              <th className="py-2 px-2 text-right text-foreground/30 font-normal uppercase tracking-wider w-16">
                {/* size col */}
              </th>
              <th className="py-2 px-3 text-right text-bid/70 font-semibold uppercase tracking-wider w-24">
                Bid
              </th>
              <th className="w-px bg-border/60" />
              <th className="py-2 px-3 text-left text-ask/70 font-semibold uppercase tracking-wider w-24">
                Ask
              </th>
              <th className="py-2 px-2 text-left text-foreground/30 font-normal uppercase tracking-wider w-16">
                {/* size col */}
              </th>
              <th className="py-2 px-3 text-right text-foreground/30 font-normal uppercase tracking-wider w-16">
                Venue
              </th>
            </tr>
          </thead>
          <tbody>
            {book === null
              ? Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={i} i={i} />
                ))
              : Array.from({ length: rows }).map((_, i) => {
                  const bid = bids[i];
                  const ask = asks[i];
                  const bidBarPct =
                    bid && maxBidSize > 0
                      ? (bid.totalSize / maxBidSize) * 100
                      : 0;
                  const askBarPct =
                    ask && maxAskSize > 0
                      ? (ask.totalSize / maxAskSize) * 100
                      : 0;

                  return (
                    <tr
                      key={i}
                      className="border-b border-border/40 hover:bg-surface/60 transition-colors group"
                    >
                      {/* Bid venue */}
                      <td className="py-2 px-3 text-left text-foreground/30 w-16 whitespace-nowrap">
                        {bid ? venueLabel(bid) : ""}
                      </td>

                      {/* Bid size + depth bar (right-aligned) */}
                      <td className="py-2 px-2 text-right w-24 whitespace-nowrap">
                        <div className="relative flex items-center justify-end">
                          {bid && (
                            <>
                              <div
                                className="absolute right-0 top-0 h-full bg-bid/10 rounded-sm"
                                style={{ width: `${bidBarPct}%` }}
                              />
                              <span className="relative text-foreground/50">
                                {fmt(bid.totalSize)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Bid price */}
                      <td className="py-2 px-3 text-right font-semibold text-sm w-20 whitespace-nowrap">
                        {bid ? (
                          <span className="text-bid">
                            {bid.price.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-foreground/20">—</span>
                        )}
                      </td>

                      {/* Center divider */}
                      <td className="w-px bg-border/60 p-0" />

                      {/* Ask price */}
                      <td className="py-2 px-3 text-left font-semibold text-sm w-20 whitespace-nowrap">
                        {ask ? (
                          <span className="text-ask">
                            {ask.price.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-foreground/20">—</span>
                        )}
                      </td>

                      {/* Ask size + depth bar (left-aligned) */}
                      <td className="py-2 px-2 w-24 whitespace-nowrap">
                        <div className="relative flex items-center">
                          {ask && (
                            <>
                              <div
                                className="absolute left-0 top-0 h-full bg-ask/10 rounded-sm"
                                style={{ width: `${askBarPct}%` }}
                              />
                              <span className="relative text-foreground/50">
                                {fmt(ask.totalSize)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Ask venue */}
                      <td className="py-2 px-3 text-right text-foreground/30 w-16 whitespace-nowrap">
                        {ask ? venueLabel(ask) : ""}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
