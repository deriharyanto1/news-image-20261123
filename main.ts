// THE WORLD TODAY — Monday 23 November 2026
// A one-page newspaper drawn entirely in code: vector shapes + a hand-drawn
// stroke font, encoded as PNG with only Node built-ins. No network, no
// randomness, no time: the same input always writes the same bytes.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: [number, number, number] = [247, 242, 231];
const INK: [number, number, number] = [26, 26, 26];
const RED: [number, number, number] = [164, 30, 34];
const BLUE: [number, number, number] = [31, 58, 110];
const GREY: [number, number, number] = [110, 104, 92];
const PANEL_BG: [number, number, number] = [250, 246, 238];

type RGB = [number, number, number];

// ---------------------------------------------------------------- raster
const img = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  img[i * 3] = PAPER[0];
  img[i * 3 + 1] = PAPER[1];
  img[i * 3 + 2] = PAPER[2];
}

function px(x: number, y: number, c: RGB): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const o = (yi * W + xi) * 3;
  img[o] = c[0];
  img[o + 1] = c[1];
  img[o + 2] = c[2];
}

function stamp(x: number, y: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + r) px(x + dx, y + dy, c);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const r = Math.max(0, Math.floor(w / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stamp(x0 + dx * t, y0 + dy * t, r, c);
  }
}

function polyline(pts: Array<[number, number]>, w: number, c: RGB): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, c);
  }
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 3;
      img[o] = c[0];
      img[o + 1] = c[1];
      img[o + 2] = c[2];
    }
  }
}

function rect(x: number, y: number, w: number, h: number, lw: number, c: RGB): void {
  line(x, y, x + w, y, lw, c);
  line(x, y + h, x + w, y + h, lw, c);
  line(x, y, x, y + h, lw, c);
  line(x + w, y, x + w, y + h, lw, c);
}

function circle(cx: number, cy: number, r: number, w: number, c: RGB): void {
  const steps = Math.max(24, Math.round(r * 4));
  let prev: [number, number] | null = null;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const p: [number, number] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    if (prev) line(prev[0], prev[1], p[0], p[1], w, c);
    prev = p;
  }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, w: number, c: RGB): void {
  const steps = Math.max(24, Math.round((rx + ry) * 2));
  let prev: [number, number] | null = null;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const p: [number, number] = [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    if (prev) line(prev[0], prev[1], p[0], p[1], w, c);
    prev = p;
  }
}

// ---------------------------------------------------------------- stroke font
// Glyphs on a 5 wide x 7 tall grid (x 0..4, y 0..6). Each glyph is a list of
// strokes; each stroke is a polyline of grid points. Advance is 6 units.
// The '9' is a top bowl plus a right stem — never two loops, so it cannot
// be mistaken for an '8'.
type Stroke = Array<[number, number]>;
const FONT: Record<string, Stroke[]> = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 4], [3, 4]]],
  B: [[[0, 0], [0, 6], [3, 6], [4, 5], [3, 4], [0, 4]], [[0, 0], [3, 0], [4, 1], [3, 2], [0, 2]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0, 0], [4, 0]], [[0, 6], [4, 6]]],
  J: [[[1, 0], [4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [3, 2], [0, 2]]],
  Q: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[3, 4], [4, 6]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [3, 2], [0, 2]], [[2, 2], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  "0": [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]],
  "1": [[[1, 1], [2, 0], [2, 6]], [[0, 6], [4, 6]]],
  "2": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 3], [0, 6], [4, 6]]],
  "3": [[[0, 1], [1, 0], [3, 0], [4, 1], [3, 2], [1, 2]], [[3, 2], [4, 3], [4, 5], [3, 6], [1, 6], [0, 5]]],
  "4": [[[0, 0], [0, 3], [4, 3]], [[3, 0], [3, 6]]],
  "5": [[[4, 0], [0, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  "6": [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  "7": [[[0, 0], [4, 0], [2, 6]]],
  "8": [[[1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0]], [[1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3]]],
  "9": [[[1, 0], [3, 0], [4, 1], [4, 3], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0]], [[4, 1], [4, 6]]],
  ".": [[[2, 5], [3, 5], [3, 6], [2, 6], [2, 5]]],
  ",": [[[2, 5], [2, 6], [1, 7]]],
  ":": [[[2, 1], [2, 2]], [[2, 4], [2, 5]]],
  ";": [[[2, 1], [2, 2]], [[2, 4], [2, 5], [1, 6]]],
  "'": [[[2, 0], [1, 2]]],
  '"': [[[1, 0], [0, 2]], [[3, 0], [2, 2]]],
  "!": [[[2, 0], [2, 4]], [[2, 5], [2, 6]]],
  "?": [[[1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [2, 3]], [[2, 5], [2, 6]]],
  "-": [[[0, 3], [4, 3]]],
  "(": [[[3, 0], [2, 1], [2, 5], [3, 6]]],
  ")": [[[1, 0], [2, 1], [2, 5], [1, 6]]],
  "/": [[[1, 6], [3, 0]]],
  "%": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], [[3, 5], [4, 5], [4, 6], [3, 6], [3, 5]], [[1, 5], [3, 1]]],
  $: [[[2, 0], [2, 6]], [[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  "+": [[[2, 1], [2, 5]], [[0, 3], [4, 3]]],
  "=": [[[0, 2], [4, 2]], [[0, 4], [4, 4]]],
  " ": [],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: RGB): void {
  const lw = Math.max(1, Math.round(scale * 0.85));
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[ch.toUpperCase()] ?? [];
    for (const stroke of glyph) {
      const pts = stroke.map(([gx, gy]): [number, number] => [cx + gx * scale, y + gy * scale]);
      if (pts.length === 1) {
        stamp(pts[0][0], pts[0][1], Math.max(0, Math.floor(lw / 2)), c);
      } else {
        polyline(pts, lw, c);
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cx: number, y: number, text: string, scale: number, c: RGB): void {
  drawText(cx - textWidth(text, scale) / 2, y, text, scale, c);
}

function wrap(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (textWidth(next, scale) <= maxWidth || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawPara(x: number, y: number, text: string, scale: number, maxWidth: number, c: RGB, lineGap = 2): number {
  const lines = wrap(text, maxWidth, scale);
  const lh = 7 * scale + lineGap;
  lines.forEach((ln, i) => drawText(x, y + i * lh, ln, scale, c));
  return lines.length;
}

// ---------------------------------------------------------------- content
// 48 items from 10 regions: 1 top story + 9 panels + 37 briefs + 1 quote.
const TOP_KICKER = "CLIMATE - COP31 - ANTALYA, TURKEY";
const TOP_HEADLINE = "COP31 COLLAPSES";
const TOP_DECK =
  "Climate talks in Antalya ended on Sunday with no deal. The EU refused any agreement without fossil-fuel phase-out language. Australia's PM called it a sign of 'difficult geopolitical times.'";

interface Panel {
  tag: string;
  headline: string;
  body: string;
  icon: number;
}

const PANELS: Panel[] = [
  {
    tag: "MIDDLE EAST",
    headline: "TANKERS HIT IN THE STRAIT",
    body: "Two tankers were struck in the Strait of Hormuz, UKMTO said. Iran reported a vessel hit a mine. Three hit Fri-Sat; two more caught fire. Brent $92.29.",
    icon: 0,
  },
  {
    tag: "AFRICA",
    headline: "DRONES HIT RUSSIAN SHIP",
    body: "Suspected Ukrainian sea drones hit the Russian corvette Merkury at Benghazi base on Sunday. Severely damaged, it later capsized. Ten injured.",
    icon: 1,
  },
  {
    tag: "EASTERN EUROPE",
    headline: "FLAT BLOCK HIT NEAR KYIV",
    body: "A Russian drone hit a five-storey block in Dymer, north of Kyiv, early on Sunday. Two killed, 11 missing, including two children.",
    icon: 2,
  },
  {
    tag: "NORTH AMERICA",
    headline: "DEMOCRATS TAKE CONGRESS",
    body: "Democrats won Congress, their largest House majority since 1992, flipping a N. Carolina seat. GOP keeps control to 3 Jan; funding deadline 11 Dec.",
    icon: 3,
  },
  {
    tag: "SOUTH ASIA",
    headline: "AI SELL-OFF SHAKES MARKETS",
    body: "Nasdaq plunged 10% last week as the AI sell-off spread. Asian stocks fell. India bucked it: the Nifty is up nearly 12% in November; the rupee at 92.67.",
    icon: 4,
  },
  {
    tag: "SOUTHEAST ASIA",
    headline: "FACTORY FIRE IN BANTEN",
    body: "Rescuers recovered 24 body bags from a candy factory fire in Cikande, Banten. Dozens are still missing; the search resumes Monday.",
    icon: 5,
  },
  {
    tag: "MIDDLE EAST",
    headline: "HOUTHIS HIT SAUDI SITES",
    body: "Houthis claimed strikes on a Saudi refinery and radar, injuring six. Saudi forces intercepted a missile. An Iran strike wounded two in Bahrain.",
    icon: 6,
  },
  {
    tag: "WESTERN EUROPE",
    headline: "LIVERPOOL ROUT UNITED",
    body: "Liverpool hammered ten-man Man Utd in Pochettino's debut. Alcaraz won a first ATP Finals title; Thitikul took a third LPGA title.",
    icon: 7,
  },
  {
    tag: "NORTH AMERICA",
    headline: "US CURBS CANADA DEFENCE TIES",
    body: "Defence Secretary Hegseth imposed new restrictions on the US-Canada defence relationship in a classified memo, the Washington Post reported.",
    icon: 8,
  },
];

const BRIEFS: string[] = [
  // column 1
  "SHURI CASTLE RESTORED IN OKINAWA",
  "BEPICOLOMBO ENTERS MERCURY ORBIT",
  "LAHORE AQI 538 - WORLD'S WORST AIR",
  "SUDAN DRONES HIT UN SITE IN KHARTOUM",
  "SETTLERS TORCH 12 CARS IN WEST BANK",
  "24 CIVILIANS KILLED IN SOUTH SUDAN",
  "WHO PLEADS FOR PEACE IN EBOLA CONGO",
  "BOLSONARO 'STABLE' IN INTENSIVE CARE",
  "NETANYAHU-EISENKOT TALKS FAIL",
  "KIM: WE SEEK SECURITY, NOT SUPREMACY",
  "UN TO KEEP TALKING ON LETHAL AI",
  "S. KOREA MINISTER QUITS OVER AI CHEAT",
  "INDIA V NZ: NZ 157/4 AT LUNCH, DAY 5",
  // column 2
  "SINDAROV GETS WHITE IN GAME 1",
  "FRANCE V S. AFRICA IN NATIONS FINAL",
  "DELTA DELAYS AT ATLANTA AIRPORT",
  "9 SHOT AT CALIF. CONCERT, 1 CRITICAL",
  "FATHER, DAUGHTER HELD BY ICE, SEATTLE",
  "SANRIO BETS ON GAMES FOR HELLO KITTY",
  "JEWELLER PAOLO BULGARI DIES, 89",
  "KIROS, 29, FIRST GEN Z IN CONGRESS",
  "YOUTH CONGRESS PROTESTS META IN INDIA",
  "SLOVAKIA REJECTS 45-BN EU UKRAINE LOAN",
  "UK, FRANCE, CHINA BLOCK UN TOP JOB BID",
  "SELANGOR FLOOD EVACUEES PASS 1,800",
  "35 FULANIS KILLED IN NIGERIA ATTACKS",
  // column 3
  "POLAND: 3 RUSSIAN MISSILES HIT FRIDAY",
  "TRUMP POSTS PHOTOS WITH PUTIN AND XI",
  "TITANIC RING SELLS FOR 150,000 GBP",
  "TRUMP MEME COIN GALA: 185 WALLETS IN",
  "INDIA SHARES TO OPEN HIGHER",
  "EISENKOT: SETTLER VIOLENCE 'TERROR'",
  "SYRIA ARRESTS OFFICER OVER 2014 AMBUSH",
  "UK TO BUILD UKRAINIAN DRONES",
  "US ARMY TO DETONATE CHEMICALS IN IOWA",
  "CHINA STEEL WEAK, IRON ORE STRONG",
  "MSCI ASIA EX-JAPAN DOWN 1%",
];

const QUOTE = '"THE FAILURE IS A SIGN OF DIFFICULT GEOPOLITICAL TIMES."';
const QUOTE_BY = "- ANTHONY ALBANESE, PRIME MINISTER OF AUSTRALIA";

const REGION_LINE =
  "N. AMERICA - S. AMERICA - W. EUROPE - E. EUROPE - MIDDLE EAST - AFRICA - S. ASIA - E. ASIA - SE ASIA - OCEANIA";

// ---------------------------------------------------------------- icons
function drawIcon(kind: number, x: number, y: number, c: RGB): void {
  const w = 2;
  if (kind === 0) {
    // tanker
    polyline([[x + 2, y + 24], [x + 34, y + 24], [x + 28, y + 32], [x + 8, y + 32], [x + 2, y + 24]], w, c);
    line(x + 8, y + 24, x + 8, y + 16, w, c);
    line(x + 8, y + 16, x + 16, y + 16, w, c);
    line(x + 22, y + 24, x + 22, y + 18, w, c);
  } else if (kind === 1) {
    // ship
    polyline([[x + 2, y + 24], [x + 34, y + 24], [x + 28, y + 32], [x + 8, y + 32], [x + 2, y + 24]], w, c);
    line(x + 18, y + 24, x + 18, y + 6, w, c);
    polyline([[x + 18, y + 6], [x + 30, y + 10], [x + 18, y + 14]], w, c);
  } else if (kind === 2) {
    // damaged building
    rect(x + 8, y + 6, 20, 26, w, c);
    line(x + 14, y + 12, x + 14, y + 16, w, c);
    line(x + 22, y + 12, x + 22, y + 16, w, c);
    line(x + 14, y + 22, x + 14, y + 26, w, c);
    polyline([[x + 18, y + 6], [x + 14, y + 14], [x + 20, y + 20], [x + 16, y + 26]], 1, c);
  } else if (kind === 3) {
    // capitol dome
    polyline([[x + 6, y + 14], [x + 10, y + 8], [x + 18, y + 6], [x + 26, y + 8], [x + 30, y + 14]], w, c);
    line(x + 6, y + 14, x + 30, y + 14, w, c);
    line(x + 10, y + 32, x + 10, y + 16, w, c);
    line(x + 18, y + 32, x + 18, y + 16, w, c);
    line(x + 26, y + 32, x + 26, y + 16, w, c);
    line(x + 6, y + 32, x + 30, y + 32, w, c);
  } else if (kind === 4) {
    // falling chart
    line(x + 4, y + 6, x + 4, y + 30, w, c);
    line(x + 4, y + 30, x + 32, y + 30, w, c);
    polyline([[x + 6, y + 10], [x + 14, y + 16], [x + 20, y + 14], [x + 30, y + 26]], w, c);
    polyline([[x + 24, y + 24], [x + 30, y + 26], [x + 28, y + 20]], w, c);
  } else if (kind === 5) {
    // factory
    polyline([[x + 4, y + 32], [x + 4, y + 18], [x + 12, y + 12], [x + 20, y + 18], [x + 28, y + 12], [x + 32, y + 16], [x + 32, y + 32], [x + 4, y + 32]], w, c);
    line(x + 26, y + 12, x + 26, y + 4, w, c);
    circle(x + 26, y + 2, 2, 1, c);
  } else if (kind === 6) {
    // missile
    polyline([[x + 6, y + 30], [x + 22, y + 12], [x + 30, y + 6], [x + 30, y + 14], [x + 24, y + 18], [x + 12, y + 32], [x + 6, y + 30]], w, c);
    polyline([[x + 8, y + 28], [x + 4, y + 32], [x + 6, y + 26]], 1, c);
  } else if (kind === 7) {
    // ball
    circle(x + 18, y + 18, 13, w, c);
    polyline([[x + 18, y + 5], [x + 18, y + 31]], 1, c);
    polyline([[x + 7, y + 12], [x + 29, y + 24]], 1, c);
    polyline([[x + 29, y + 12], [x + 7, y + 24]], 1, c);
  } else {
    // two flags
    line(x + 10, y + 6, x + 10, y + 32, w, c);
    line(x + 26, y + 6, x + 26, y + 32, w, c);
    polyline([[x + 10, y + 6], [x + 22, y + 10], [x + 10, y + 14]], w, c);
    polyline([[x + 26, y + 6], [x + 14, y + 10], [x + 26, y + 14]], w, c);
  }
}

// ---------------------------------------------------------------- layout
// outer double border
rect(8, 8, W - 16, H - 16, 2, INK);
rect(14, 14, W - 28, H - 28, 1, INK);

// ---- masthead
drawText(26, 34, "NO. 23", 1.6, GREY);
drawText(W - 26 - textWidth("PRICE $1.20", 1.6), 34, "PRICE $1.20", 1.6, GREY);
drawTextCentered(W / 2, 26, "THE WORLD TODAY", 8, INK);
drawTextCentered(W / 2, 92, "MONDAY 23 NOVEMBER 2026", 3.2, RED);
line(24, 122, W - 24, 122, 4, INK);

// ---- top story
drawTextCentered(W / 2 - 90, 140, TOP_KICKER, 2.4, RED);
drawTextCentered(W / 2 - 90, 162, TOP_HEADLINE, 6.5, INK);
drawPara(26, 214, TOP_DECK, 2.2, 730, INK);
// globe illustration, right of the deck
rect(790, 140, 210, 148, 2, INK);
circle(895, 206, 48, 3, BLUE);
ellipse(895, 206, 20, 48, 2, BLUE);
ellipse(895, 206, 48, 18, 2, BLUE);
polyline([[895, 168], [888, 186], [902, 200], [890, 218], [900, 236], [892, 252]], 2, RED);
drawTextCentered(895, 266, "ANTALYA", 1.8, GREY);
line(24, 300, W - 24, 300, 2, INK);

// ---- nine panels, 3 x 3
const panelW = 312;
const panelH = 144;
const gapX = 16;
const gapY = 6;
const panelX0 = 24;
const panelY0 = 308;
PANELS.forEach((p, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = panelX0 + col * (panelW + gapX);
  const y = panelY0 + row * (panelH + gapY);
  fillRect(x, y, panelW, panelH, PANEL_BG);
  rect(x, y, panelW, panelH, 1, INK);
  drawText(x + 10, y + 8, p.tag, 1.8, RED);
  drawIcon(p.icon, x + panelW - 46, y + 6, BLUE);
  const hl = wrap(p.headline, panelW - 68, 2.6);
  hl.forEach((ln, li) => drawText(x + 10, y + 28 + li * 20, ln, 2.6, INK));
  drawPara(x + 10, y + 28 + hl.length * 20 + 4, p.body, 1.5, panelW - 20, INK, 3);
});

// ---- quote strip
line(24, 758, W - 24, 758, 2, INK);
drawTextCentered(W / 2, 763, QUOTE, 1.9, BLUE);
drawTextCentered(W / 2, 778, QUOTE_BY, 1.5, GREY);
line(24, 792, W - 24, 792, 1, INK);

// ---- briefs
drawText(24, 800, "THE DAY IN BRIEF", 2.2, INK);
drawTextCentered(W / 2, 816, REGION_LINE, 1.5, GREY);
const briefScale = 1.35;
const briefLH = 11;
const colW = 312;
const cols: string[][] = [[], [], []];
BRIEFS.forEach((b, i) => cols[i % 3].push(b));
cols.forEach((col, ci) => {
  const x = 24 + ci * (colW + 16);
  col.forEach((b, ri) => {
    const y = 830 + ri * briefLH;
    fillRect(x, y + 3, 4, 4, RED);
    drawText(x + 10, y, b, briefScale, INK);
  });
});

// ---- footer
line(24, 980, W - 24, 980, 2, INK);
drawTextCentered(W / 2, 986, "48 STORIES FROM 10 REGIONS", 2.2, RED);

// ---------------------------------------------------------------- PNG encode
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  raw.set(img.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/entry.png`, png);
