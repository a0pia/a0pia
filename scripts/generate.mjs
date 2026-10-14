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
const TAGLINE = 'Developer · Jedi in training';
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
  xwing: [
    '.GG.........................',
    '.GGG........................',
    '..GGGGGGGGGGGGGGGGGGGGGK....',
    'OGGWWWWWWWWWRRWWWW..........',
    'OGWWWWWWWWWWWWWWWWWWWWWWW...',
    'OGWWWWWWBBBWWWWWWWWWWWWWWWWW',
    'OGGWWWWWWWWWRRWWWW..........',
    '..GGGGGGGGGGGGGGGGGGGGGK....',
    '.GGG........................',
    '.GG.........................',
  ],
  tie: [
    'GG.........GG',
    'GG.........GG',
    'GG.........GG',
    'GG...DDD...GG',
    'GGLLDBBBDLLGG',
    'GG..DBWBD..GG',
    'GGLLDBBBDLLGG',
    'GG...DDD...GG',
    'GG.........GG',
    'GG.........GG',
    'GG.........GG',
  ],
  boom: [
    '....Y....',
    '.Y..O..Y.',
    '..OOOOO..',
    '..OYWYO..',
    'YOOWWWOOY',
    '..OYWYO..',
    '..OOOOO..',
    '.Y..O..Y.',
    '....Y....',
  ],
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

const SHIP = { G: '#7d8590', W: '#d9dde3', R: '#e5484d', B: '#2b3138', O: '#ff9a3c', K: '#3d444d' };
const TIE = { G: '#4a5361', L: '#7d8590', D: '#5c6573', B: '#2b3138', W: '#9fb4c8' };
const BOOM = { Y: YELLOW, O: '#ff7a1a', W: '#fff6c8' };

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

  // Space battle: two TIE fighters take turns flying in and getting shot down.
  // Both share one 6s cycle; the second runs half a cycle behind (.t2).
  const laneMid = 384;
  const lane = 22;
  const xwX = 60;
  const xwY = laneMid - 15;
  const hitX = 430;
  const bolt = (dy, cls) =>
    `<rect class="${cls}" x="130" y="${xwY + dy}" width="22" height="3" rx="1.5" fill="#ff4d4d" filter="url(#glow)"/>`;
  const tie = (dy, cls) => `
<g transform="translate(0 ${laneMid + dy - 16})"><g class="${cls}"><g class="weave">${pixels(SPRITES.tie, 0, 0, 3, TIE)}</g></g></g>
<g transform="translate(${hitX - 4} ${laneMid + dy - 18})"><g class="boom ${cls === 'tie' ? '' : 't2'}">${pixels(SPRITES.boom, 0, 0, 4, BOOM)}</g></g>`;

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
.xwing{animation:strafe 6s ease-in-out infinite}
.thrust{animation:hum .1s linear infinite alternate}
.tie{animation:fly 6s linear infinite}
.weave{animation:weave 1.2s ease-in-out infinite}
.bolt{animation:bolt 6s linear infinite}
.boom{transform-box:fill-box;transform-origin:center;animation:boom 6s linear infinite}
.t2{animation-delay:-3s}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes scroll{to{transform:translateX(-${W}px)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ignite{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes hum{from{opacity:.7}to{opacity:1}}
@keyframes spark{0%{opacity:1;transform:scale(1)}15%{opacity:0}35%{opacity:.9;transform:scale(.6) rotate(45deg)}50%{opacity:0}70%{opacity:1;transform:scale(1.2)}85%{opacity:0}}
@keyframes strafe{0%,10%{transform:translateY(${lane}px)}25%,60%{transform:translateY(-${lane}px)}75%,100%{transform:translateY(${lane}px)}}
@keyframes fly{0%{transform:translateX(${W + 20}px);opacity:1}50%{transform:translateX(${hitX}px);opacity:1}50.01%,100%{transform:translateX(${hitX}px);opacity:0}}
@keyframes weave{0%,100%{transform:translateY(-3px)}50%{transform:translateY(3px)}}
@keyframes bolt{0%,34.99%{transform:translateX(0);opacity:0}35%{transform:translateX(0);opacity:1}50%{transform:translateX(${hitX - 152}px);opacity:1}50.01%,100%{transform:translateX(${hitX - 152}px);opacity:0}}
@keyframes boom{0%,49.99%{opacity:0;transform:scale(.2)}50%{opacity:1;transform:scale(.5)}62%{opacity:0;transform:scale(1.9)}100%{opacity:0;transform:scale(1.9)}}
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
${text(`@${LOGIN} · joined the rebellion in ${stats.since}`, 48, 168, 2, DIM)}
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

${tie(-lane, 'tie')}
${tie(lane, 'tie t2')}
<g class="xwing">
<rect class="thrust" x="${xwX - 7}" y="${xwY + 9}" width="9" height="12" rx="4" fill="#ff7a1a" filter="url(#glow)"/>
${pixels(SPRITES.xwing, xwX, xwY, 3, SHIP)}
${bolt(6, 'bolt')}${bolt(21, 'bolt')}
${bolt(6, 'bolt t2')}${bolt(21, 'bolt t2')}
</g>

<g class="fade" style="animation-delay:2.8s">${text('may the source be with you', W - 48 - textWidth('may the source be with you', 2), H - 28, 2, DIM)}</g>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="#1f2733"/>
</svg>
`;
}

const stats = await fetchStats();
console.log(stats);
await mkdir(join(ROOT, 'assets'), { recursive: true });
await writeFile(join(ROOT, 'assets', 'hero.svg'), card(stats));
