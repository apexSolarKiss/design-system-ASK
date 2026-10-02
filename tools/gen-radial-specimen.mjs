#!/usr/bin/env node
/* gen-radial-specimen.mjs — the deterministic content of the interactive radial pattern's
   specimen and of its owner tests.

     node tools/gen-radial-specimen.mjs           write the specimen source
     node tools/gen-radial-specimen.mjs --check   exit 1 when the written specimen differs

   SYNTHETIC CONTENT. A fictional city's park system, Vellmark: district > kind of place > place.
   Every name is made up. The seeded generator (mulberry32, seed 20260929) and its tables are
   carried forward from the neutral fixture that first exercised the radial grammar; the one
   textual change is a US spelling. The content is example vocabulary on purpose: it is the
   specimen's subject, not the pattern's, and the neutrality check excludes this file by
   declared path.

   SHAPES. Besides the specimen, the same content is cut into hierarchy shapes the owner tests
   run through one layout: base (district > kind > place), shallow (no middle tier), ragged
   (unequal depths, places directly under the root, declared empty containers, undrawn records),
   deeper (five tiers), flat (places directly under the root), and synthetic capacity and chain
   trees at the tested limits.

   The module imports nothing at load, so a test page can import its builders directly; only
   the command-line path reads or writes files. */

const SEED = 20260929;
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* district > [kind name, place noun, place count]; the counts are deliberately uneven */
const DISTRICTS = [
  { code: 'KQ', name: 'Kestrel Quay', kinds: [['Harbor promenades', 'Promenade', 7]] },
  { code: 'OV', name: 'Östervang Heights', kinds: [
    ['Pocket parks', 'Pocket Park', 60], ['Playgrounds', 'Playground', 23], ['Allotments', 'Allotments', 14],
    ['Sports fields', 'Sports Field', 11], ['Ponds + wetlands', 'Pond', 9], ['Wildflower verges', 'Verge', 8],
    ['Dog runs', 'Dog Run', 6], ['Community gardens', 'Community Garden', 5], ['Picnic lawns', 'Picnic Lawn', 4],
    ['Skate spots', 'Skate Spot', 3], ['Orchards', 'Orchard', 2], ['Lidos', 'Lido', 2], ['Viewpoints', 'Viewpoint', 1]] },
  { code: 'LM', name: 'Lower Marrowby', kinds: [
    ['Railway-edge greenways', 'Greenway', 17], ['Cemetery lawns', 'Cemetery Lawn', 12], ['Formal gardens', 'Garden', 5],
    ['Tree nurseries', 'Tree Nursery', 3]] },
  { code: 'SE', name: 'Saint-Émilie Riverside and the Former Tannery Lands (Überlauf Basin)', kinds: [
    ['Floodable meadows', 'Meadow', 21], ['Boathouses + slipways', 'Boathouse', 2], ['Ice rink', 'Ice Rink', 1]] }
];
const PRE = ['Ash', 'Bram', 'Cor', 'Dun', 'Ell', 'Fen', 'Gorse', 'Hollin', 'Ivy', 'Juni', 'Kell', 'Linden', 'Mar', 'Nettle', 'Oak', 'Pell', 'Quill', 'Rook', 'Sedge', 'Thorn', 'Umber', 'Vell', 'Wren', 'Yarrow', 'Zeller'];
const SUF = ['field', 'mead', 'combe', 'wick', 'hollow', 'green', 'garth', 'stead', 'brook', 'croft', 'lea', 'moor'];
const NONASCII = ['Østre', 'Brühl', 'Ibáñez', 'Łąka', 'Straße', 'Søndre', 'Øresund', 'Þórs', 'Nõmme', 'Çamlık', 'Ålund', 'Émile'];
const LONG = ['The Grünewald–Ibáñez Memorial', 'The Upper and Lower Tollgate Lane Residents’ Association', 'The Former Municipal Gasworks Reclamation'];
const SURFACE = ['lawn', 'lawn', 'lawn', 'paved', 'water', 'wooded', 'wooded', 'built'];
const STATUS = ['open', 'open', 'open', 'open', 'open', 'open', 'seasonal', 'seasonal', 'under renovation', 'proposed', 'closed'];
const FAC = ['toilets', 'water fountain', 'benches', 'lighting', 'bike racks', 'café'];

/* the park system itself: { city, seed, districts: [{ id, name, kinds: [{ id, name, places }] }], links } */
export function parks() {
  const rnd = mulberry32(SEED);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const between = (lo, hi) => lo + rnd() * (hi - lo);
  const used = new Set(), places = [];
  function placeName(noun) {
    for (let i = 0; ; i++) {
      const r = rnd(); let s;
      if (r < 0.04) s = pick(LONG) + ' ' + noun + ' at ' + pick(PRE) + pick(SUF) + ' Rise';
      else if (r < 0.16) s = pick(NONASCII) + ' ' + pick(PRE) + pick(SUF) + ' ' + noun;
      else s = pick(PRE) + pick(SUF) + ' ' + noun;
      if (i) s += ' No. ' + (i + 1);
      if (!used.has(s)) { used.add(s); return s; }
    }
  }
  const districts = DISTRICTS.map((d) => ({ id: 'D-' + d.code, name: d.name,
    kinds: d.kinds.map(([kname, noun, n], ki) => ({ id: 'K-' + d.code + '-' + String(ki + 1).padStart(2, '0'), name: kname,
      places: Array.from({ length: n }, () => {
        const id = 'VM-' + d.code + '-' + String(places.length + 1).padStart(3, '0');
        const p = { id, name: placeName(noun), surface: pick(SURFACE), status: pick(STATUS), area_ha: +between(0.05, 40).toFixed(2),
          opened: Math.floor(between(1880, 2026)), facilities: FAC.filter(() => rnd() < 0.4) };
        places.push(p); return p;
      }) })) }));
  const links = [], seen = new Set(), where = new Map();
  districts.forEach((d) => d.kinds.forEach((k) => k.places.forEach((p) => where.set(p.id, d.id))));
  function addLink(kind, n, crossDistrict) {
    for (let made = 0, guard = 0; made < n && guard < 5000; guard++) {
      const a = pick(places), b = pick(places);
      if (a === b || (crossDistrict && where.get(a.id) === where.get(b.id)) || seen.has(a.id + '>' + b.id)) continue;
      seen.add(a.id + '>' + b.id); made++;
      links.push({ kind, id: kind === 'greenway' ? 'GW-' + String(made).padStart(2, '0') : null, from: a.id, to: b.id,
        note: kind === 'greenway' ? 'signed cycle + foot route' : kind === 'crew' ? 'crew roster ' + pick(['north', 'south', 'river', 'rail']) : 'separated by the rail cutting' });
    }
  }
  addLink('greenway', 12, true); addLink('crew', 25, false); addLink('barrier', 5, false);
  return { city: 'Vellmark', seed: SEED, synthetic: true, districts, links };
}

/* -------------------------------------------- the contract's declarations -- */
export const STATES = [
  { role: 'earned', label: 'open', meaning: 'open to the public' },
  { role: 'partial', label: 'seasonal', meaning: 'open part of the year' },
  { role: 'held', label: 'under renovation', meaning: 'temporarily closed for works' },
  { role: 'external', label: 'proposed', meaning: 'planned, not yet built' },
  { role: 'deflated', label: 'closed', meaning: 'closed to the public' }
];
const ROLE = { 'open': 'earned', 'seasonal': 'partial', 'under renovation': 'held', 'proposed': 'external', 'closed': 'deflated' };
export const KINDS = [
  { id: 'lawn', label: 'grass-surfaced place', shape: 'circle' },
  { id: 'paved', label: 'hard-surfaced place', shape: 'square' },
  { id: 'water', label: 'pond, lido or basin', shape: 'ring' },
  { id: 'wooded', label: 'tree-covered place', shape: 'tri' },
  { id: 'built', label: 'structure-led place', shape: 'diamond' }
];
export const PLANES = [
  { id: 'greenway', label: 'greenway link', drawn: 'always', directed: true },
  { id: 'crew', label: 'shared maintenance crew', drawn: 'selection', directed: false },
  { id: 'barrier', label: 'barrier, never drawn', drawn: 'never', directed: false }
];
const TYPE = { greenway: 'greenway connects to', crew: 'same maintenance crew', barrier: 'separated from' };

function place(p, parent) {
  const n = { id: p.id, label: p.name, kind: p.surface, state: ROLE[p.status],
              data: { status: p.status, area_ha: p.area_ha, opened: p.opened, facilities: p.facilities } };
  if (parent !== undefined) n.parent = parent;
  return n;
}
function contract(D, nodes, extra = {}) {
  const ids = new Set(nodes.map((n) => n.id));
  const edges = D.links.filter((l) => ids.has(l.from) && ids.has(l.to)).map((l) => {
    const e = { from: l.from, to: l.to, plane: l.kind, type: TYPE[l.kind], note: l.note };
    if (l.id) e.id = l.id;
    return e;
  });
  return Object.assign({ root: { id: 'ROOT', label: D.city + ' parks' }, nodes, planes: PLANES, states: STATES, kinds: KINDS, edges }, extra);
}

/* base: district > kind of place > place */
export function base(D = parks()) {
  const nodes = [];
  D.districts.forEach((d) => {
    nodes.push({ id: d.id, label: d.name, container: true });
    d.kinds.forEach((k) => {
      nodes.push({ id: k.id, label: k.name, parent: d.id, container: true });
      k.places.forEach((p) => nodes.push(place(p, k.id)));
    });
  });
  return contract(D, nodes);
}

/* shallow: district > place, no middle tier */
export function shallow(D = parks()) {
  const nodes = [];
  D.districts.forEach((d) => {
    nodes.push({ id: d.id, label: d.name, container: true });
    d.kinds.forEach((k) => k.places.forEach((p) => nodes.push(place(p, d.id))));
  });
  return contract(D, nodes);
}

/* ragged: one district holds places directly; one adds an area tier above its kinds; three places
   stand directly under the root; a declared empty kind and a declared empty district; undrawn
   records (two park offices) linked to a place, to each other, and once to nothing */
export function ragged(D = parks(), emptyContainers = 'show') {
  const nodes = [];
  const [d0, d1, d2, d3] = D.districts;
  nodes.push({ id: d0.id, label: d0.name, container: true });
  d0.kinds.forEach((k) => k.places.forEach((p) => nodes.push(place(p, d0.id))));
  nodes.push({ id: d1.id, label: d1.name, container: true });
  d1.kinds.forEach((k) => {
    nodes.push({ id: k.id, label: k.name, parent: d1.id, container: true });
    k.places.forEach((p) => nodes.push(place(p, k.id)));
  });
  nodes.push({ id: d1.id + '-EMPTY', label: 'Planned kind, none yet', parent: d1.id, container: true });
  nodes.push({ id: d2.id, label: d2.name, container: true });
  const half = Math.ceil(d2.kinds.length / 2);
  [['N', 'North area', d2.kinds.slice(0, half)], ['S', 'South area', d2.kinds.slice(half)]].forEach(([s, label, ks]) => {
    const aid = d2.id + '-' + s;
    nodes.push({ id: aid, label, parent: d2.id, container: true });
    ks.forEach((k) => {
      nodes.push({ id: k.id, label: k.name, parent: aid, container: true });
      k.places.forEach((p) => nodes.push(place(p, k.id)));
    });
  });
  d3.kinds[0].places.slice(0, 3).forEach((p) => nodes.push(place(p)));
  nodes.push({ id: d3.id, label: d3.name, container: true });
  d3.kinds.forEach((k, i) => {
    nodes.push({ id: k.id, label: k.name, parent: d3.id, container: true });
    (i === 0 ? k.places.slice(3) : k.places).forEach((p) => nodes.push(place(p, k.id)));
  });
  nodes.push({ id: 'D-EMPTY', label: 'Future district', container: true });
  const records = [{ id: 'OFFICE-1', label: 'North parks office' }, { id: 'OFFICE-2', label: 'South parks office' }];
  const c = contract(D, nodes, { records, options: { emptyContainers } });
  const first = nodes.find((n) => n.kind);
  c.edges.push({ id: 'ADM-1', from: 'OFFICE-1', to: first.id, plane: 'crew', type: 'administers', note: 'office of record' });
  c.edges.push({ id: 'ADM-2', from: 'OFFICE-1', to: 'OFFICE-2', plane: 'crew', type: 'reports to', note: 'office hierarchy' });
  c.edges.push({ id: 'ADM-3', from: 'OFFICE-2', to: 'NO-SUCH-PLACE', plane: 'crew', type: 'administers', note: 'unresolved on purpose' });
  return c;
}

/* deeper: district > kind > cluster > group > place, five tiers below the root */
export function deeper(D = parks()) {
  const nodes = [];
  D.districts.forEach((d) => {
    nodes.push({ id: d.id, label: d.name, container: true });
    d.kinds.forEach((k) => {
      nodes.push({ id: k.id, label: k.name, parent: d.id, container: true });
      for (let c = 0; c * 8 < k.places.length; c++) {
        const cid = k.id + '-C' + (c + 1);
        nodes.push({ id: cid, label: k.name + ', cluster ' + (c + 1), parent: k.id, container: true });
        const chunk = k.places.slice(c * 8, c * 8 + 8);
        for (let g = 0; g * 3 < chunk.length; g++) {
          const gid = cid + '-G' + (g + 1);
          nodes.push({ id: gid, label: 'group ' + (g + 1), parent: cid, container: true });
          chunk.slice(g * 3, g * 3 + 3).forEach((p) => nodes.push(place(p, gid)));
        }
      }
    });
  });
  return contract(D, nodes);
}

/* flat: places directly under the root */
export function flat(D = parks(), n = 40) {
  const ps = D.districts.flatMap((d) => d.kinds.flatMap((k) => k.places)).slice(0, n);
  return contract(D, ps.map((p) => place(p)));
}

/* capacity: a seeded synthetic tree of exactly `total` placed nodes, at most `maxDepth` tiers */
export function capacity(total = 2500, maxDepth = 6, seed = 20261002) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const nodes = [], containers = [{ id: 'ROOT', depth: 0 }];
  let n = 0;
  while (n < total) {
    const p = containers[Math.floor(rnd() * containers.length)];
    if (p.depth >= maxDepth) continue;
    const id = 'N' + (++n);
    const isC = p.depth + 1 < maxDepth && rnd() < 0.22;
    const node = { id, label: 'node ' + n };
    if (p.id !== 'ROOT') node.parent = p.id;
    if (isC) node.container = true;
    nodes.push(node);
    if (isC) containers.push({ id, depth: p.depth + 1 });
  }
  return { root: { id: 'ROOT', label: 'synthetic' }, nodes };
}

/* chain: one lineage `depth` tiers deep */
export function chain(depth) {
  const nodes = [];
  for (let i = 1; i <= depth; i++) {
    const node = { id: 'L' + i, label: 'level ' + i };
    if (i > 1) node.parent = 'L' + (i - 1);
    if (i < depth) node.container = true;
    nodes.push(node);
  }
  return { root: { id: 'ROOT', label: 'chain' }, nodes };
}

/* the specimen: base, plus the cases a reader and the tests should meet — a fifth district whose
   identifier needs URL encoding, right-to-left and CJK names, HTML-special characters, a repeated
   label, a null field, a declared empty kind, and two undrawn records linked to places and to each
   other */
export function specimen(D = parks()) {
  const c = base(D);
  const HG = 'D-HG/1 #north';
  c.nodes.push({ id: HG, label: 'Hollin Gate', container: true });
  c.nodes.push({ id: 'K-HG-01', label: 'Reading gardens', parent: HG, container: true });
  [['VM-HG-243', 'حديقة القراءة', 'lawn', 'earned', 2.4],
   ['VM-HG-244', '読書の庭', 'wooded', 'partial', 1.1],
   ['VM-HG-245', 'Bell & Cobb’s <Corner> Garden', 'paved', 'earned', 0.6],
   ['VM-HG-246', 'Sedgewick Promenade', 'built', 'held', 3.9]].forEach(([id, label, kind, state, area]) => {
    c.nodes.push({ id, label, parent: 'K-HG-01', kind, state,
                   data: { status: STATES.find((s) => s.role === state).label, area_ha: area, opened: null, facilities: [] } });
  });
  c.nodes.push({ id: 'K-HG-02', label: 'Planned kind, none yet', parent: HG, container: true });
  c.records = [{ id: 'OFFICE-N', label: 'North parks office' }, { id: 'OFFICE-S', label: 'South parks office' }];
  c.edges.push({ id: 'ADM-1', from: 'OFFICE-N', to: 'VM-HG-243', plane: 'crew', type: 'administers', note: 'office of record' });
  c.edges.push({ id: 'ADM-2', from: 'OFFICE-S', to: 'VM-KQ-001', plane: 'crew', type: 'administers', note: 'office of record' });
  c.edges.push({ id: 'ADM-3', from: 'OFFICE-N', to: 'OFFICE-S', plane: 'crew', type: 'reports to', note: 'office hierarchy' });
  c.edges.push({ id: 'GW-HG', from: 'VM-HG-244', to: 'VM-LM-164', plane: 'greenway', type: 'greenway connects to', note: 'signed cycle + foot route' });
  return c;
}

/* the specimen's adapter: its words, its legend, its count lines; the default allocation */
export const ADAPTER = {
  layout: { itemMax: 74 },
  labels: { count: { 1: '{count} places', '*': '{count}' } },
  text: { idle: '' },
  legend: {
    headings: { state: 'color = status', line: 'line = link kind', shape: 'shape = surface' },
    bound: 'Distance from the center is depth and wedge width is size; position and adjacency encode nothing. Links are drawn only by their kind.'
  },
  arrival: { hash: true }
};

export function source() {
  const head = '/* diagram-interactive-radial.source.js — GENERATED by tools/gen-radial-specimen.mjs. Do not edit.\n' +
    '   The specimen: a fictional city park system (synthetic, seed ' + SEED + ') and its adapter.\n' +
    '   DOWNSTREAM: replace this file with your own data and adapter; the contract is in README.md. */\n';
  return head + 'window.RADIAL_SPECIMEN = ' + JSON.stringify({ data: specimen(), adapter: ADAPTER }) + ';\n';
}

/* ------------------------------------------------------------ command line -- */
const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] &&
  import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
if (isMain) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const OUT = path.join(ROOT, 'patterns/diagram-interactive-radial/diagram-interactive-radial.source.js');
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--check')) { console.error('usage: gen-radial-specimen.mjs [--check]'); process.exit(2); }
  const want = source();
  if (args.includes('--check')) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    const ok = have === want;
    console.log(JSON.stringify({ check: true, clean: ok, file: path.relative(ROOT, OUT) }));
    process.exit(ok ? 0 : 1);
  }
  fs.writeFileSync(OUT, want);
  console.log(JSON.stringify({ written: path.relative(ROOT, OUT), bytes: Buffer.byteLength(want) }));
}
