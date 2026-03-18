// Test fetching a real orderbook from Polymarket CLOB API
const tokenId = "44446804496889907209027787393532554522900719536131325061789855807185516080089"; // Trump visits China

const url = `https://clob.polymarket.com/book?token_id=${tokenId}`;
console.log(`Fetching: ${url}\n`);

const res = await fetch(url);
if (!res.ok) {
  console.error(`Error: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const book = await res.json();
console.log("Keys:", Object.keys(book));
console.log("\nFirst 3 bids:", book.bids?.slice(0, 3));
console.log("First 3 asks:", book.asks?.slice(0, 3));
console.log(`\nTotal: ${book.bids?.length} bids, ${book.asks?.length} asks`);
