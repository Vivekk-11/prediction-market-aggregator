import type { MarketConfig } from "./types";

export const MARKETS: MarketConfig[] = [
  {
    id: "will-trump-visit-china-by-april-30",
    title: "Will Trump visit China by April 30?",
    polymarket: {
      tokenIdYes:
        "44446804496889907209027787393532554522900719536131325061789855807185516080089",
      tokenIdNo:
        "81197514885731569817347387229955339496528996514718498705783416912577413567672",
      conditionId:
        "0x48fbf70c1713e71a405052bc4641e26dbba435fa557672c4040763c901cbf606",
    },
    kalshi: { ticker: "KXTRUMPCHINA-26-MAY01" },
  },
  {
    id: "will-psg-win-the-202526-champions-league",
    title: "Will PSG win the 2025–26 Champions League?",
    polymarket: {
      tokenIdYes:
        "104259436423064082971150541232006260758664018969024622611484550356541952860834",
      tokenIdNo:
        "17522237181479319953129418683394157683167669858670412329571078616243234898741",
      conditionId:
        "0x6e9f90a6f471b52d03499a81586ca478519474eb152f1327c8c767f020d62529",
    },
    kalshi: { ticker: "KXUCL-26-PSG" },
  },

  {
    id: "will-bitcoin-dip-to-65k-in-march-2026",
    title: "Will Bitcoin dip to $65,000 in March?",
    polymarket: {
      tokenIdYes:
        "112493481455469093769281852159558847572704253342416714876781522096078968514094",
      tokenIdNo:
        "64087619211543545431479218048939484178441767712621033463416084593776314629222",
      conditionId:
        "0x36912c9832f0fd104d734b579fb9b3a1b31bbdc946a67356723407e3bdc96dbc",
    },
    kalshi: { ticker: "KXBTCMINMON-BTC-26MAR31-6500000" },
  },
  {
    id: "will-the-colorado-avalanche-win-the-2026-nhl-stanley-cup",
    title: "Will the Colorado Avalanche win the 2026 NHL Stanley Cup?",
    polymarket: {
      tokenIdYes:
        "101738487887518832481587379955535423775326921556438741919099866785354159699479",
      tokenIdNo:
        "87978082071653935678874296685430503892266481242311708420787197372467948088235",
      conditionId:
        "0xf8f63bb47b2a7c2e0c1be3cedf4075079b11c07476d76a9469065b0c4791961a",
    },
    kalshi: { ticker: "KXNHL-26-COL" },
  },
];
