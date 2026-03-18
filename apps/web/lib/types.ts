export interface MarketSummary {
  id: string;
  title: string;
  polymarketId: string | null;
  kalshiId: string | null;
  yesPrice: number | null;
}

export interface MarketDetail extends MarketSummary {
  aggregated: AggregatedBook | null;
  venueStatus: { polymarket: VenueStatus | "N/A"; kalshi: VenueStatus | "N/A" } | null;
}

export interface AggregatedLevel {
  price: number;
  totalSize: number;
  polymarketSize: number;
  kalshiSize: number;
}

export interface AggregatedBook {
  bids: AggregatedLevel[];
  asks: AggregatedLevel[];
}

export type VenueStatus = "Live" | "Stale";

export interface BookMessage {
  type: "book";
  data: AggregatedBook;
  venueStatus: {
    polymarket: VenueStatus;
    kalshi: VenueStatus;
  };
}

export interface QuoteBreakdown {
  shares: number;
  cost: number;
}

export interface QuoteResult {
  shares: number;
  avgPrice: number;
  totalCost: number;
  breakdown: {
    polymarket: QuoteBreakdown;
    kalshi: QuoteBreakdown;
  };
  computedAt: number;
}

export type TradeSide = "yes" | "no";
