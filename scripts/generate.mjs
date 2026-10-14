#!/usr/bin/env node
// Generates the animated Star Wars profile card in assets/hero.svg.
// Usage: GITHUB_TOKEN=... node scripts/generate.mjs
//
// GitHub strips <script> from README images but keeps CSS animations, so every
// moving part below is a CSS @keyframes animation. Fonts are not loaded inside
// README images either, so headings use a hand-drawn pixel font.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'a0pia';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const DISPLAY_NAME = 'Aopia';
const TAGLINE = 'Developer · Sith apprentice';
const W = 880;
const H = 480;

const YELLOW = '#ffe81f';
const BLUE = '#4bd5ee';
const MUTED = '#8b98a9';
const DIM = '#55627a';

// ---------------------------------------------------------------- pixel font (5x7)

const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  '·': ['.', '.', '.', '#', '.', '.', '.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.##.', '#....', '.####'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
};

const ASCII = { Ç: 'C', Ğ: 'G', İ: 'I', I: 'I', Ö: 'O', Ş: 'S', Ü: 'U', Â: 'A', Î: 'I', Û: 'U' };

function glyphsOf(str) {
  return [...String(str).toLocaleUpperCase('en')].map((ch) => FONT[ASCII[ch] ?? ch] ?? FONT['?']);
}

function textWidth(str, px) {
  const glyphs = glyphsOf(str);
  return (glyphs.reduce((sum, g) => sum + g[0].length + 1, 0) - 1) * px;
}

// Merges horizontal runs of the same colour into one <rect> each.
function pixels(rows, x, y, px, palette) {
  let out = '';
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; ) {
      const ch = row[i];
      let k = i;
      while (k < row.length && row[k] === ch) k++;
      if (palette[ch]) {
        out += `<rect x="${x + i * px}" y="${y + j * px}" width="${(k - i) * px}" height="${px}" fill="${palette[ch]}"/>`;
      }
      i = k;
    }
  });
  return out;
}

function text(str, x, y, px, fill) {
  let pen = x;
  let out = '';
  for (const g of glyphsOf(str)) {
    out += pixels(g, pen, y, px, { '#': fill });
    pen += (g[0].length + 1) * px;
  }
  return out;
}

// ---------------------------------------------------------------- sprites

const SPRITES = {
  // Hooded Sith facing right; the saber hand is at columns 11-13 of rows 9-10.
  sith: [
    '....LKKKK.....',
    '...LKKKKKK....',
    '..LKKKKKKKR...',
    '..LKKDDDDKR...',
    '..LKDDDYDDR...',
    '..LKKDDDDKR...',
    '...LKKKKKR....',
    '..LKKKKKKKR...',
    '.LKKKKKKKKKR..',
    '.LKKKKKKKKKSSS',
    '.LKKKKKKKKKSSS',
    '.LKKKGGGKKKR..',
    '.LKKKKKKKKKR..',
    '.LKKKKKKKKKR..',
    '.LKKKKKKKKKKR.',
    'LKKKKKKKKKKKR.',
    'LKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKR',
    '.LKKKKKKKKKKR.',
    '..KKK....KKK..',
    '..KKK....KKK..',
    '.BBBB....BBBB.',
  ],
  // Alien facing left, split at the neck so the saber can cut it in two.
  alienHead: [
    '..A......A..',
    '...A....A...',
    '...GGGGGG...',
    '..GGGGGGGG..',
    '.GGWWGGWWGG.',
    '.GPWGGPWGGG.',
    '.GGGGGGGGGG.',
    '..GGDDDDGG..',
    '...GGGGGG...',
  ],
  alienBody: ['..GGGGGGGG..', '.G.GGGGGG.G.', '...GGGGGG...'],
  legsA: ['...G....G...', '..GG....GG..'],
  legsB: ['....G..G....', '....GG.GG...'],
  hilt: [
    '..KK..............',
    'GGGGSSGGSSGGGGGGKK',
    'GGGGSSGGSSGGGGGGKK',
    'GGGGSSGGSSGGGGGGKK',
    '..KK..............',
  ],
  spark: ['...W...', '.W.W.W.', '..WWW..', 'WWWYWWW', '..WWW..', '.W.W.W.', '...W...'],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  commit: ['.......', '..###..', '.#...#.', '##...##', '.#...#.', '..###..', '.......'],
  repo: ['######.', '#....#.', '#.##.#.', '#....#.', '#.##.#.', '#....#.', '######.'],
  code: ['.......', '..#.#..', '.#...#.', '#.....#', '.#...#.', '..#.#..', '.......'],
};

const SITH = { K: '#262a33', L: '#5d6577', R: '#6b1f26', D: '#08090c', Y: '#ffc933', S: '#2e323b', G: '#7d8590', B: '#121419' };
const ALIENS = [
  { G: '#5bd75b', A: '#3fa83f', W: '#ffffff', P: '#111111', D: '#1e5a1e' },
  { G: '#b07cff', A: '#7d4fd1', W: '#ffffff', P: '#111111', D: '#4a2a80' },
];

function deathStar(cx, cy, r, px) {
  const shades = ['#2d3239', '#454c55', '#5f6771', '#7f8893', '#a3abb5'];
  let out = '';
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d2 = i * i + j * j;
      if (d2 > r * r) continue;
      // Lit from the upper left.
      const light = (-i - j) / (r * 1.6) + 0.45 - d2 / (r * r * 4);
      let shade = shades[Math.max(0, Math.min(4, Math.round(light * 4)))];
      if (j === 1) shade = '#22262c';
      const di = i + r * 0.38;
      const dj = j + r * 0.4;
      const dish = di * di + dj * dj;
      if (dish <= (r * 0.27) ** 2) shade = dish <= 1 ? '#22262c' : '#3d434b';
      out += `<rect x="${cx + i * px}" y="${cy + j * px}" width="${px}" height="${px}" fill="${shade}"/>`;
    }
  }
  return out;
}

// Volcanic ground with glowing lava cracks.
function ground(rand, y, px) {
  const rows = [];
  for (let j = 0; j < Math.ceil((H - y) / px); j++) {
    let row = '';
    for (let i = 0; i < Math.ceil(W / px); i++) {
      const r = rand();
      row += j === 0 ? (r < 0.1 ? '.' : r < 0.5 ? 'T' : 'R') : r < 0.03 ? 'L' : r < 0.07 ? 'O' : r < 0.35 ? 'D' : 'R';
    }
    rows.push(row);
  }
  return `${pixels(rows, 0, y, px, { T: '#4a2f2c', R: '#2c1c1d', D: '#1e1415', O: '#8f3516' })}
<g class="hum">${pixels(rows, 0, y, px, { L: '#ff7a1a' })}</g>`;
}

// ---------------------------------------------------------------- starfield

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starLayer(rand, count, size, minOpacity, twinkle) {
  let out = '';
  for (let n = 0; n < count; n++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const o = (minOpacity + rand() * (1 - minOpacity)).toFixed(2);
    const anim = twinkle
      ? ` class="tw" style="animation-duration:${(1.5 + rand() * 3).toFixed(1)}s;animation-delay:-${(rand() * 3).toFixed(1)}s"`
      : '';
    // Drawn twice, one card-width apart, so the scroll loops seamlessly.
    for (const dx of [0, W]) {
      out += `<rect x="${x + dx}" y="${y}" width="${size}" height="${size}" fill="#fff" opacity="${o}"${anim}/>`;
    }
  }
  return out;
}

// ---------------------------------------------------------------- data

async function gql(query) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

async function fetchStats() {
  if (!TOKEN) throw new Error('GITHUB_TOKEN is required');

  const repos = [];
  let after = null;
  let user;
  do {
    const data = await gql(`{ user(login: "${LOGIN}") {
      createdAt
      repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100${after ? `, after: "${after}"` : ''}) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes { stargazerCount primaryLanguage { name } }
      }
    } }`);
    user = data.user;
    repos.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);

  // contributionsCollection spans at most one year, so ask for each year separately.
  const since = new Date(user.createdAt).getUTCFullYear();
  const now = new Date().getUTCFullYear();
  const years = [];
  for (let y = since; y <= now; y++) {
    years.push(`y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z"${y < now ? `, to: "${y}-12-31T23:59:59Z"` : ''}) {
      totalCommitContributions restrictedContributionsCount }`);
  }
  const contrib = (await gql(`{ user(login: "${LOGIN}") { ${years.join('\n')} } }`)).user;
  const commits = Object.values(contrib).reduce(
    (sum, c) => sum + c.totalCommitContributions + c.restrictedContributionsCount,
    0,
  );

  return {
    since,
    commits,
    repos: user.repositories.totalCount,
    stars: repos.reduce((sum, r) => sum + r.stargazerCount, 0),
    languages: new Set(repos.map((r) => r.primaryLanguage?.name).filter(Boolean)).size,
  };
}

// ---------------------------------------------------------------- card

function card(stats) {
  const rand = rng(1977);
  const fmt = (n) => n.toLocaleString('en-US');

  // Ground fight: aliens take turns walking up to the Sith and getting cut in half.
  // Each alien loops every 8s with the second half a cycle behind (.a2); the
  // saber swings every 4s, so it lands on whichever alien just arrived.
  const groundY = 444;
  const sithX = 84;
  const sithY = groundY - SPRITES.sith.length * 4;
  const [hx, hy] = [sithX + 50, sithY + 40];
  const stopX = 178;
  const alien = (n) => {
    const pal = ALIENS[n];
    const a2 = n ? ' a2' : '';
    return `<g transform="translate(0 ${groundY - 42})"><g class="walk${a2}">
<g class="head${a2}">${pixels(SPRITES.alienHead, 0, 0, 3, pal)}</g>
<g class="body${a2}">${pixels(SPRITES.alienBody, 0, 27, 3, pal)}<g class="legs">${pixels(SPRITES.legsA, 0, 36, 3, pal)}</g><g class="legs alt">${pixels(SPRITES.legsB, 0, 36, 3, pal)}</g></g>
</g></g>
<g class="slash${a2}"><rect x="${stopX - 10}" y="${groundY - 17}" width="60" height="3" rx="1.5" fill="#fff" filter="url(#glow)" transform="rotate(25 ${stopX + 20} ${groundY - 15.5})"/></g>`;
  };

  const stat = (i, icon, label, value) => {
    const x = 48 + i * 200;
    return `<g class="rise" style="animation-delay:${(2.1 + i * 0.15).toFixed(2)}s">
${pixels(SPRITES[icon], x, 236, 2, { '#': YELLOW })}
${text(label, x + 22, 236, 2, MUTED)}
${text(fmt(value), x, 262, 5, '#f0f3f6')}
</g>`;
  };

  const sabers = 208;
  const bladeLen = W / 2 - 84;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<style>
.tw{animation:twinkle 3s ease-in-out infinite}
.fade{animation:fade 1.8s ease-out .2s both}
.rise{animation:rise .8s ease-out both}
.far{animation:scroll 180s linear infinite}
.mid{animation:scroll 90s linear infinite}
.near{animation:scroll 40s linear infinite}
.float{animation:float 8s ease-in-out infinite}
.blade{transform-box:fill-box;animation:ignite .45s ease-out 1.5s both}
.blade.l{transform-origin:left}.blade.r{transform-origin:right}
.hum{animation:hum .15s linear 2s infinite alternate}
.spark{transform-box:fill-box;transform-origin:center;animation:spark .9s steps(1) 1.95s infinite both}
.legs{animation:blink .3s steps(1) infinite}.legs.alt{animation-delay:-.15s}
.walk{animation:walk 8s linear infinite}
.head{transform-box:fill-box;transform-origin:center;animation:head 8s ease-out infinite}
.body{animation:body 8s ease-in infinite}
.slash{animation:slash 8s linear infinite}
.a2{animation-delay:-4s}
.swing{transform-box:view-box;transform-origin:${hx}px ${hy}px;animation:swing 4s ease-out infinite}
.lunge{animation:lunge 4s ease-out infinite}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes scroll{to{transform:translateX(-${W}px)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ignite{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes hum{from{opacity:.7}to{opacity:1}}
@keyframes spark{0%{opacity:1;transform:scale(1)}15%{opacity:0}35%{opacity:.9;transform:scale(.6) rotate(45deg)}50%{opacity:0}70%{opacity:1;transform:scale(1.2)}85%{opacity:0}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes walk{0%{transform:translateX(${W + 20}px)}50%,100%{transform:translateX(${stopX}px)}}
@keyframes head{0%,51.5%{transform:none;opacity:1}64%,100%{transform:translate(24px,-30px) rotate(50deg);opacity:0}}
@keyframes body{0%,51.5%{transform:none;opacity:1}64%,100%{transform:translateY(4px);opacity:0}}
@keyframes slash{0%,51%{opacity:0}51.5%{opacity:1}56%,100%{opacity:0}}
@keyframes swing{0%{transform:rotate(-120deg)}3%,12%{transform:rotate(25deg)}30%,90%{transform:rotate(-60deg)}100%{transform:rotate(-120deg)}}
@keyframes lunge{0%{transform:none}3%,12%{transform:translateX(10px)}30%,100%{transform:none}}
</style>
<defs>
<clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12"/></clipPath>
<radialGradient id="nebulaA" cx="0.82" cy="0.78" r="0.55"><stop offset="0" stop-color="#1d3a7a" stop-opacity=".45"/><stop offset="1" stop-color="#1d3a7a" stop-opacity="0"/></radialGradient>
<radialGradient id="nebulaB" cx="0.12" cy="0.1" r="0.45"><stop offset="0" stop-color="#4a1f5e" stop-opacity=".35"/><stop offset="1" stop-color="#4a1f5e" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="saber" x="-10%" y="-300%" width="120%" height="700%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
<g clip-path="url(#card)">
<rect width="${W}" height="${H}" fill="#04060b"/>
<rect width="${W}" height="${H}" fill="url(#nebulaA)"/>
<rect width="${W}" height="${H}" fill="url(#nebulaB)"/>
<g class="far">${starLayer(rand, 90, 1, 0.25, false)}</g>
<g class="mid">${starLayer(rand, 40, 2, 0.3, false)}</g>
<g class="near">${starLayer(rand, 14, 2, 0.6, true)}</g>

<g class="float">${deathStar(770, 92, 15, 3)}</g>

<text class="fade" x="48" y="46" fill="${BLUE}" font-family="'Franklin Gothic Medium','Franklin Gothic','Helvetica Neue',Helvetica,Arial,sans-serif" font-size="18" letter-spacing=".3">A long time ago in a galaxy far, far away....</text>

<g class="rise" style="animation-delay:.9s">
${text(DISPLAY_NAME, 51, 69, 9, '#8a6d00')}
${text(DISPLAY_NAME, 48, 66, 9, YELLOW)}
</g>
<g class="rise" style="animation-delay:1.2s">
${text(TAGLINE, 48, 146, 2, MUTED)}
${text(`@${LOGIN} · turned to the dark side in ${stats.since}`, 48, 168, 2, DIM)}
</g>

<g transform="translate(48 ${sabers - 5})">${pixels(SPRITES.hilt, 0, 0, 2, { G: '#9aa3ad', S: '#5c6573', K: '#2b3138' })}</g>
<g transform="translate(${W - 48} ${sabers - 5}) scale(-1 1)">${pixels(SPRITES.hilt, 0, 0, 2, { G: '#3d444d', S: '#9aa3ad', K: '#1f242a' })}</g>
<g class="blade l"><rect class="hum" x="84" y="${sabers - 5}" width="${bladeLen}" height="10" rx="5" fill="#2f8bff" filter="url(#saber)"/><rect x="84" y="${sabers - 2}" width="${bladeLen}" height="4" rx="2" fill="#e6f3ff"/></g>
<g class="blade r"><rect class="hum" x="${W / 2}" y="${sabers - 5}" width="${bladeLen}" height="10" rx="5" fill="#ff2a2a" filter="url(#saber)"/><rect x="${W / 2}" y="${sabers - 2}" width="${bladeLen}" height="4" rx="2" fill="#ffe9e9"/></g>
<g class="spark">${pixels(SPRITES.spark, W / 2 - 10.5, sabers - 10.5, 3, { W: '#ffffff', Y: YELLOW })}</g>

${stat(0, 'commit', 'commits', stats.commits)}
${stat(1, 'repo', 'repos', stats.repos)}
${stat(2, 'star', 'stars', stats.stars)}
${stat(3, 'code', 'languages', stats.languages)}

${ground(rand, groundY, 4)}
<ellipse class="hum" cx="${hx + 10}" cy="${groundY}" rx="70" ry="6" fill="#ff2a2a" opacity=".25" filter="url(#saber)"/>
${alien(0)}
${alien(1)}
<g class="lunge">
${pixels(SPRITES.sith, sithX, sithY, 4, SITH)}
<g class="swing">
<rect class="hum" x="${hx + 12}" y="${hy - 5}" width="84" height="10" rx="5" fill="#ff2a2a" filter="url(#saber)"/>
<rect x="${hx + 12}" y="${hy - 2}" width="84" height="4" rx="2" fill="#ffe9e9"/>
<rect x="${hx - 4}" y="${hy - 3}" width="16" height="6" fill="#9aa3ad"/>
<rect x="${hx + 2}" y="${hy - 3}" width="2" height="6" fill="#2b3138"/>
</g>
</g>

<g class="fade" style="animation-delay:2.8s">${text('come to the dark side', W - 48 - textWidth('come to the dark side', 2), H - 22, 2, '#8a3a22')}</g>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="#1f2733"/>
</svg>
`;
}

const stats = await fetchStats();
console.log(stats);
await mkdir(join(ROOT, 'assets'), { recursive: true });
await writeFile(join(ROOT, 'assets', 'hero.svg'), card(stats));
