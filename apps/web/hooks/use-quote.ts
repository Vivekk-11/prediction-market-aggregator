import { useEffect, useRef, useState } from "react";
import type { QuoteResult, TradeSide } from "@/lib/types";

interface UseQuoteParams {
  marketId: string;
  amount: number;
  side: TradeSide;
  ready: boolean;
}

interface QuoteState {
  quote: QuoteResult | null;
  loading: boolean;
  error: string | null;
}

export function useQuote({
  marketId,
  amount,
  side,
  ready,
}: UseQuoteParams): QuoteState {
  const [state, setState] = useState<QuoteState>({
    quote: null,
    loading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!ready || amount <= 0) return;

    const debounceTimer = setTimeout(() => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      fetch(`${apiUrl}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, amount, side }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<QuoteResult>;
        })
        .then((quote) => {
          setState({ quote, loading: false, error: null });
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Quote failed",
          }));
        });
    }, 400);

    return () => {
      clearTimeout(debounceTimer);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [marketId, amount, side, ready]);

  return state;
}
