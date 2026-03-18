import { useEffect, useReducer, useRef } from "react";
import type { AggregatedBook, VenueStatus } from "@/lib/types";

interface BookState {
  book: AggregatedBook | null;
  venueStatus: { polymarket: VenueStatus; kalshi: VenueStatus } | null;
  ready: boolean;
  connected: boolean;
}

interface RawBookMessage {
  type: "book";
  data: AggregatedBook;
  venueStatus?: {
    polymarket: VenueStatus;
    kalshi: VenueStatus;
  };
}

type BookAction =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "book"; message: RawBookMessage };

function reducer(state: BookState, action: BookAction): BookState {
  switch (action.type) {
    case "connected":
      return { ...state, connected: true };
    case "disconnected":
      return { ...state, connected: false };
    case "book":
      return {
        ...state,
        book: action.message.data,
        venueStatus: action.message.venueStatus ?? state.venueStatus,
        ready: true,
      };
    default:
      return state;
  }
}

const initialState: BookState = {
  book: null,
  venueStatus: null,
  ready: false,
  connected: false,
};

export function useMarketBook(marketId: string): BookState {
  const [state, dispatch] = useReducer(reducer, initialState);
  const closedRef = useRef(false);
  const retryDelayRef = useRef(500);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    closedRef.current = false;

    function connect() {
      if (closedRef.current) return;

      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (closedRef.current) {
          ws.close();
          return;
        }
        retryDelayRef.current = 500;
        dispatch({ type: "connected" });
        ws.send(JSON.stringify({ type: "subscribe", marketId }));
      };

      ws.onmessage = (event) => {
        if (closedRef.current) return;
        try {
          const msg = JSON.parse(event.data as string) as RawBookMessage;
          if (msg.type === "book") {
            dispatch({ type: "book", message: msg });
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (closedRef.current) return;
        dispatch({ type: "disconnected" });
        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(delay * 2, 10000);
        timeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closedRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [marketId]);

  return state;
}
