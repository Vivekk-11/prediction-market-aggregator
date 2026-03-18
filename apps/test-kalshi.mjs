// Test if Kalshi orderbook is publicly accessible (no auth)
const base = "https://api.elections.kalshi.com/trade-api/v2";

// First, find some active markets
console.log("=== Fetching markets... ===\n");
const marketsRes = await fetch(`${base}/markets?limit=5&status=open`);
console.log("Markets status:", marketsRes.status);

if (marketsRes.ok) {
  const data = await marketsRes.json();
  const markets = data.markets ?? [];
  console.log(`Got ${markets.length} markets`);

  if (markets.length > 0) {
    const ticker = markets[0].ticker;
    const title = markets[0].title;
    console.log(`\nFirst market: ${title} (${ticker})`);

    // Now try the orderbook
    console.log(`\n=== Fetching orderbook for ${ticker}... ===\n`);
    const bookRes = await fetch(`${base}/markets/${ticker}/orderbook`);
    console.log("Orderbook status:", bookRes.status);

    if (bookRes.ok) {
      const book = await bookRes.json();
      console.log("Keys:", Object.keys(book));
      console.log("orderbook_fp keys:", Object.keys(book.orderbook_fp ?? {}));
      console.log("yes_dollars (first 3):", book.orderbook_fp?.yes_dollars?.slice(0, 3));
      console.log("no_dollars (first 3):", book.orderbook_fp?.no_dollars?.slice(0, 3));
    } else {
      const errText = await marketsRes.text();
      console.log("Error body:", errText.slice(0, 500));
      console.log("\n** Auth required — you'll need Kalshi API keys **");
    }
  }
} else {
  console.log("Markets endpoint also needs auth:", marketsRes.status);
}
