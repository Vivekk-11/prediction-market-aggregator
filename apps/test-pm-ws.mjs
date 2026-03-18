import WebSocket from "ws";

const tokenId = "44446804496889907209027787393532554522900719536131325061789855807185516080089"; // Trump China

const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");

ws.on("open", () => {
  console.log("Connected!\n");
  ws.send(JSON.stringify({
    assets_ids: [tokenId],
    type: "market",
  }));
});

let count = 0;
ws.on("message", (raw) => {
  const data = JSON.parse(raw.toString());
  console.log(`[${data.event_type}] keys:`, Object.keys(data));

  if (data.event_type === "book") {
    console.log(`  bids: ${data.bids?.length}, asks: ${data.asks?.length}`);
    console.log("  first bid:", data.bids?.[0]);
    console.log("  first ask:", data.asks?.[0]);
  } else if (data.event_type === "price_change") {
    console.log("  changes:", data.changes?.slice(0, 3));
  } else {
    console.log("  full:", JSON.stringify(data).slice(0, 200));
  }

  count++;
  if (count >= 10) {
    console.log("\n10 messages received, closing.");
    ws.close();
    process.exit(0);
  }
});

ws.on("error", (err) => console.error("WS error:", err));
ws.on("close", () => console.log("Disconnected"));

// Ping keepalive
setInterval(() => { if (ws.readyState === 1) ws.ping(); }, 10_000);

// Timeout after 60s
setTimeout(() => { ws.close(); process.exit(0); }, 60_000);
