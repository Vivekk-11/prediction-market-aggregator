const url = "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=2";
console.log(`Fetching: ${url}\n`);
const res = await fetch(url);
const events = await res.json();

const { markets, ...rest } = events[0] ?? {};
console.log("=== First event (no markets) ===");
console.log(JSON.stringify(rest, null, 2));

const m = markets?.[0];
console.log("\n=== First market (full) ===");
console.log(JSON.stringify(m, null, 2));

if (m) {
  console.log("\n=== Filter fields ===");
  console.log("enableOrderBook:", m.enableOrderBook);
  console.log("active:", m.active);
  console.log("closed:", m.closed);
  console.log("clobTokenIds:", m.clobTokenIds);
  console.log("clob_token_ids:", m.clob_token_ids);
}
