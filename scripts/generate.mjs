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
const TAGLINE = 'Developer · Sith Lord';
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
  // Hooded emperor, robes lit blue from the right by his own lightning.
  emperorIdle: [
    '....LKKKKKK.....',
    '...LKKKKKKKK....',
    '..LKKKKKKKKKK...',
    '..LKKKKDDDDKKR..',
    '..LKKKDFFFFDKR..',
    '..LKKDFYFFYFKR..',
    '..LKKDFFWFFFKR..',
    '..LKKDFWFFWFKR..',
    '..LKKKDFFFFDKR..',
    '..LKKKKDFFDKKR..',
    '..LKKKKKKKKKKR..',
    '.LKKKKKKKKKKKKR.',
    '.LKKKKKKKKKKKKR.',
    '.LKKKKKKKKKKKKR.',
    '.LKKKKKKKPPKKKR.',
    '.LKKKKKKKKKKKKR.',
    'LKKKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKKKR',
    'LKKKKKKKKKKKKKKR',
    '.KKKKKKKKKKKKKK.',
  ],
  // Same pose with both arms thrust forward; the hands are at column 21, row 13.
  emperorCast: [
    '.LKKKKKKKKKKKKKKKKR....',
    '.LKKKKKKKKKKKKKKKKKKPP.',
    '.LKKKKKKKKKKKKKKKKKKPPP',
    '.LKKKKKKKKKKKKKKKKR.P..',
    '.LKKKKKKKKKKKKR........',
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
  ash: ['..#...#.....', '#....#...#..', '...#....#..#', '.#...#.#....', '....#.....#.', '#..#...#..#.'],
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

// The casting pose only differs in the arm rows, so build it from the idle frame.
SPRITES.emperorCast = SPRITES.emperorIdle.map((row, j) => (SPRITES.emperorCast[j - 11] ?? row).padEnd(23, '.'));

const EMPEROR = { K: '#17181e', L: '#3c4050', R: '#2c3b5e', D: '#07070a', F: '#cbb7a2', W: '#8f7c69', Y: '#ffcf3a', P: '#cbb7a2' };
const XRAY = { G: '#dff0ff', A: '#dff0ff', W: '#26304a', P: '#26304a', D: '#26304a' };
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

// A small Earth-like planet, lit from the upper left.
function planet(cx, cy, r, px) {
  let out = '';
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d2 = i * i + j * j;
      if (d2 > r * r) continue;
      const land = Math.sin(i * 0.8 + 1.3) + Math.cos(j * 0.9 - i * 0.4) > 0.75;
      const cloud = Math.sin(i * 0.35 + j * 1.7) > 0.88;
      const lit = (-i - j) / (r * 1.6) + 0.5 - d2 / (r * r * 3) > 0.15;
      const fill = cloud ? (lit ? '#e8eef5' : '#9aa7b8') : land ? (lit ? '#5aa651' : '#2f5e2c') : lit ? '#3f86cf' : '#1f4a7d';
      out += `<rect x="${cx + i * px - px / 2}" y="${cy + j * px - px / 2}" width="${px}" height="${px}" fill="${fill}"/>`;
    }
  }
  return out;
}

// Jagged lightning from (x1, y1) to (x2, y2), with one short fork.
function lightning(rand, x1, y1, x2, y2, steps, amp) {
  const at = (t, jitter) => [
    x1 + (x2 - x1) * t + (rand() - 0.5) * jitter * 0.4,
    y1 + (y2 - y1) * t + (rand() - 0.5) * jitter,
  ];
  const pts = [[x1, y1]];
  for (let i = 1; i < steps; i++) pts.push(at(i / steps, amp));
  pts.push([x2, y2]);
  const [fx, fy] = pts[Math.ceil(steps / 2)];
  const fork = [[fx, fy], [fx + amp * 0.6, fy + (rand() - 0.5) * amp * 1.4], [fx + amp * 1.1, fy + (rand() - 0.5) * amp * 2]];
  const line = (p, w) => `<polyline stroke-width="${w}" points="${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}"/>`;
  return line(pts, 2) + line(fork, 1);
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

  // One 16s timeline. Aliens walk in on an 8s loop each (the second half a cycle
  // behind, .a2), so one arrives every 4s and the emperor zaps it on arrival.
  // At 14s he turns his lightning on the planet instead.
  const T = 16;
  const pct = (sec) => +((sec / T) * 100).toFixed(3);
  const zapAt = [0, 4, 8, 12];
  const planetAt = 14;
  // steps(1) keyframes that switch opacity on during each [start, end) window.
  const windows = (spans, on = 1, off = 0) =>
    `0%{opacity:${off}}${spans.map(([a, b]) => `${pct(a)}%{opacity:${on}}${pct(b)}%{opacity:${off}}`).join('')}100%{opacity:${off}}`;
  const alienSpans = zapAt.map((t) => [t, t + 0.6]);
  const castSpans = [...alienSpans, [planetAt, planetAt + 0.75]];

  const groundY = 444;
  const ex = 56;
  const ey = groundY - SPRITES.emperorIdle.length * 4;
  const [hx, hy] = [ex + 86, ey + 54];
  const stopX = 250;
  const alien = (n) => {
    const pal = ALIENS[n];
    const a2 = n ? ' a2' : '';
    const legs = (p) =>
      `<g class="legs">${pixels(SPRITES.legsA, 0, 36, 3, p)}</g><g class="legs alt">${pixels(SPRITES.legsB, 0, 36, 3, p)}</g>`;
    return `<g transform="translate(0 ${groundY - 42})"><g class="walk${a2}">
<g>${pixels(SPRITES.alienHead, 0, 0, 3, pal)}${pixels(SPRITES.alienBody, 0, 27, 3, pal)}${legs(pal)}</g>
<g class="xray${a2}">${pixels(SPRITES.alienHead, 0, 0, 3, XRAY)}${pixels(SPRITES.alienBody, 0, 27, 3, XRAY)}${legs(XRAY)}</g>
</g></g>
<g transform="translate(${stopX} ${groundY - 30})"><g class="ash${a2}">${pixels(SPRITES.ash, 0, 0, 3, { '#': '#6b6f78' })}</g></g>`;
  };
  const zapGroup = (cls, makeBolts) =>
    `<g class="${cls}" fill="none" stroke="#e4f2ff" stroke-linecap="round" stroke-linejoin="round" filter="url(#zap)">${[0, 1, 2]
      .map((v) => `<g class="flick v${v}">${makeBolts()}</g>`)
      .join('')}</g>`;
  const alienBolts = () =>
    [0, 1, 2]
      .map(() => lightning(rand, hx, hy, stopX + 6 + rand() * 24, groundY - 36 + rand() * 28, 6, 18))
      .join('');

  const [pcx, pcy, pr, ppx] = [700, 346, 9, 4];
  const planetBolts = () =>
    [0, 1].map(() => lightning(rand, hx, hy, pcx - pr * ppx + rand() * 10, pcy - 14 + rand() * 28, 14, 34)).join('');
  const debris = Array.from({ length: 18 }, (_, k) => {
    const a = (k / 18) * Math.PI * 2 + rand() * 0.3;
    const d = 70 + rand() * 90;
    const size = 4 + Math.floor(rand() * 5);
    const fill = ['#3f86cf', '#5aa651', '#e8eef5', '#ff9a3c', '#ffd27a'][k % 5];
    return {
      css: `.d${k}{animation:d${k} ${T}s ease-out infinite}@keyframes d${k}{0%,${pct(planetAt + 0.6) - 0.01}%{opacity:0;transform:none}${pct(planetAt + 0.6)}%{opacity:1;transform:none}${pct(planetAt + 1.4)}%{opacity:1}${pct(planetAt + 1.9)}%,100%{opacity:0;transform:translate(${(Math.cos(a) * d).toFixed(1)}px,${(Math.sin(a) * d * 0.7).toFixed(1)}px) rotate(${Math.floor(rand() * 360)}deg)}}`,
      svg: `<rect class="debris d${k}" x="${pcx - size / 2}" y="${pcy - size / 2}" width="${size}" height="${size}" fill="${fill}"/>`,
    };
  });

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
.walk{animation:walk 8s linear infinite,gone 8s steps(1) infinite}
.xray{animation:xray 8s steps(1) infinite}
.ash{animation:ash 8s ease-out infinite}
.a2{animation-delay:-4s}
.flick{animation:flick .21s steps(1) infinite}.v1{animation-delay:-.07s}.v2{animation-delay:-.14s}
.cast{animation:cast ${T}s steps(1) infinite}
.idle{animation:idle ${T}s steps(1) infinite}
.zapA{animation:zapA ${T}s steps(1) infinite}
.zapP{animation:zapP ${T}s steps(1) infinite}
.planet{transform-box:fill-box;transform-origin:center;animation:planet ${T}s ease-in-out infinite}
.pflash{animation:pflash ${T}s linear infinite}
.shock{transform-box:fill-box;transform-origin:center;animation:shock ${T}s ease-out infinite}
.power{animation:power ${T}s steps(1) infinite}
.debris{transform-box:fill-box;transform-origin:center}
${debris.map((d) => d.css).join('\n')}
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
@keyframes gone{0%{opacity:1}57.5%,100%{opacity:0}}
@keyframes xray{0%{opacity:0}50%{opacity:1}51%{opacity:0}52%{opacity:1}53%{opacity:0}54%{opacity:1}55%{opacity:0}56%{opacity:1}57.5%,100%{opacity:0}}
@keyframes ash{0%,57.4%{opacity:0;transform:none}57.5%{opacity:1;transform:none}72%,100%{opacity:0;transform:translate(8px,-26px)}}
@keyframes flick{0%{opacity:1}33.3%,100%{opacity:0}}
@keyframes cast{${windows(castSpans)}}
@keyframes idle{${windows(castSpans, 0, 1)}}
@keyframes zapA{${windows(alienSpans)}}
@keyframes zapP{${windows([[planetAt, planetAt + 0.6]])}}
@keyframes planet{0%{opacity:0;transform:scale(.3)}${pct(1.2)}%{opacity:1;transform:scale(1)}${pct(planetAt + 0.58)}%{opacity:1;transform:scale(1)}${pct(planetAt + 0.6)}%,100%{opacity:0;transform:scale(1.2)}}
@keyframes pflash{0%,${pct(planetAt + 0.2)}%{opacity:0}${pct(planetAt + 0.6)}%{opacity:.95}${pct(planetAt + 1.2)}%,100%{opacity:0}}
@keyframes shock{0%,${pct(planetAt + 0.59)}%{opacity:0;transform:scale(.2)}${pct(planetAt + 0.6)}%{opacity:1;transform:scale(.3)}${pct(planetAt + 1.8)}%,100%{opacity:0;transform:scale(3.4)}}
@keyframes power{${windows([[planetAt, planetAt + 1.6]])}}
</style>
<defs>
<clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12"/></clipPath>
<radialGradient id="nebulaA" cx="0.82" cy="0.78" r="0.55"><stop offset="0" stop-color="#1d3a7a" stop-opacity=".45"/><stop offset="1" stop-color="#1d3a7a" stop-opacity="0"/></radialGradient>
<radialGradient id="nebulaB" cx="0.12" cy="0.1" r="0.45"><stop offset="0" stop-color="#4a1f5e" stop-opacity=".35"/><stop offset="1" stop-color="#4a1f5e" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="zap" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="3" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 .37 0 0 0 0 .66 0 0 0 0 1 0 0 0 2.5 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
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

<g class="planet">${planet(pcx, pcy, pr, ppx)}</g>
<circle class="pflash" cx="${pcx}" cy="${pcy}" r="${pr * ppx + 4}" fill="#f2f8ff" filter="url(#zap)"/>
<ellipse class="shock" cx="${pcx}" cy="${pcy}" rx="${pr * ppx}" ry="${pr * ppx * 0.28}" fill="none" stroke="#bfe3ff" stroke-width="3" filter="url(#zap)"/>
${debris.map((d) => d.svg).join('')}

${ground(rand, groundY, 4)}
<g class="cast"><ellipse cx="${hx}" cy="${groundY}" rx="90" ry="7" fill="#5ea8ff" opacity=".35" filter="url(#saber)"/></g>
${alien(0)}
${alien(1)}
<g class="idle">${pixels(SPRITES.emperorIdle, ex, ey, 4, EMPEROR)}</g>
<g class="cast">${pixels(SPRITES.emperorCast, ex, ey, 4, EMPEROR)}</g>
${zapGroup('zapA', alienBolts)}
${zapGroup('zapP', planetBolts)}
<g class="power">${text('unlimited power!', 48, ey - 26, 2, '#bfe3ff')}</g>

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
