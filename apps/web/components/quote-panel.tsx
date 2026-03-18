"use client";

import { useState } from "react";
import type { TradeSide } from "@/lib/types";
import { useQuote } from "@/hooks/use-quote";

interface Props {
  marketId: string;
  ready: boolean;
  className?: string;
}

export default function QuotePanel({ marketId, ready, className = "" }: Props) {
  const [amount, setAmount] = useState<number>(0);
  const [side, setSide] = useState<TradeSide>("yes");

  const { quote, loading, error } = useQuote({ marketId, amount, side, ready });

  const disabled = !ready;

  return (
    <div className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-3">
        Trade
      </h2>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* YES / NO toggle */}
        <div className="p-1 border-b border-border">
          <div className="flex rounded-md overflow-hidden">
            <button
              onClick={() => setSide("yes")}
              disabled={disabled}
              className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-all ${
                side === "yes"
                  ? "bg-bid/20 text-bid"
                  : "text-foreground/30 hover:text-foreground/60 hover:bg-surface/60"
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              YES
            </button>
            <button
              onClick={() => setSide("no")}
              disabled={disabled}
              className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-all ${
                side === "no"
                  ? "bg-ask/20 text-ask"
                  : "text-foreground/30 hover:text-foreground/60 hover:bg-surface/60"
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Amount input */}
        <div className="p-3 border-b border-border">
          <label className="block text-xs text-foreground/40 uppercase tracking-widest mb-2">
            Amount (USD)
          </label>
          <input
            type="text"
            value={amount || ""}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            placeholder="0.00"
            className={`overflow-y-hidden w-full bg-background/60 rounded border border-border px-4 py-2 font-mono text-2xl text-foreground placeholder-foreground/15 focus:outline-none focus:border-foreground/25 transition-colors ${
              disabled ? "opacity-40 cursor-not-allowed" : ""
            }`}
          />
          {disabled && (
            <p className="text-xs text-foreground/25 mt-2 text-center">Connecting…</p>
          )}
        </div>

        {/* Quote results — only shown once user has entered an amount */}
        {amount > 0 && (
          <div className={`transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
            <div className="px-4 py-2 space-y-2 border-b border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50">Avg. Price</span>
                <span className="font-mono text-sm text-foreground">
                  {quote ? `$${quote.avgPrice.toFixed(3)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50">Est. Shares</span>
                <span className="font-mono text-sm">
                  {quote ? (
                    <span className={side === "yes" ? "text-bid" : "text-ask"}>
                      {quote.shares.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/50">Total Cost</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {quote ? `$${quote.totalCost.toFixed(2)}` : "—"}
                </span>
              </div>
            </div>

            {quote && (
              <div className="px-4 py-3 space-y-2 border-b border-border bg-background/30">
                <p className="text-xs text-foreground/30 uppercase tracking-wider mb-2">Venue Breakdown</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-polymarket font-medium">Polymarket</span>
                  <span className="font-mono text-xs text-foreground/60">
                    {quote.breakdown.polymarket.shares.toFixed(1)} sh ·{" "}
                    <span className="text-foreground/80">${quote.breakdown.polymarket.cost.toFixed(2)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-kalshi font-medium">Kalshi</span>
                  <span className="font-mono text-xs text-foreground/60">
                    {quote.breakdown.kalshi.shares.toFixed(1)} sh ·{" "}
                    <span className="text-foreground/80">${quote.breakdown.kalshi.cost.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs text-ask">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="p-4">
          <button
            disabled={disabled || !quote}
            className={`w-full py-3.5 rounded-lg text-sm font-semibold tracking-wide transition-all ${
              !disabled && quote
                ? "bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                : "bg-foreground/10 text-foreground/25 cursor-not-allowed"
            }`}
          >
            Review Order
          </button>
        </div>
      </div>
    </div>
  );
}
