export type VenueLevel = {
  price: number;
  size: number;
};

export type VenueBook = {
  bids: VenueLevel[];
  asks: VenueLevel[];
};

export type AggregatedLevel = {
  price: number;
  totalSize: number;
  polymarketSize: number;
  kalshiSize: number;
};

export type AggregatedBook = {
  bids: AggregatedLevel[];
  asks: AggregatedLevel[];
};

export type MarketState = {
  polymarket: VenueBook;
  kalshi: VenueBook;
  aggregated: AggregatedBook;
  interval?: NodeJS.Timeout;
  dirty: boolean;
  subscribers: Set<WebSocket>;

  polymarketLastUpdate: number;
  kalshiLastUpdate: number;

  polymarketStale: boolean;
  kalshiStale: boolean;
};

export type MarketConfig = {
  id: string;
  title: string;
  polymarket?: {
    tokenIdYes: string;
    tokenIdNo: string;
    conditionId?: string;
  };
  kalshi?: {
    ticker: string;
  };
};
