#!/usr/bin/env node
/* sync-diagram-shared.mjs
   Emits the canonical members of patterns/_diagram-shared/ to their declared
   consumer directories, and verifies that parity with --check.

     node tools/sync-diagram-shared.mjs           write the mirrors
     node tools/sync-diagram-shared.mjs --check   exit non-zero on any divergence

   ONE EXPLICIT MEMBER LIST, NO AUTO-DISCOVERY. A directory scan would mean this
   tool's governance grows whenever someone drops a file into the shared plane,
   which is exactly the widening the plan forbids. Adding a member is an edit to
   MEMBERS below, reviewed like any other change.

   The canonical is the source. A mirror is a generated artifact and is never
   hand-edited — --check exists so a hand edit fails loudly in CI and in the
   owner PR rather than surviving as a silent fork.
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Each member declares its own target set. The folder name confers nothing:
   `_diagram-shared` is a plane, not a mandate over every diagram pattern. */
const MEMBERS = [
  {
    canonical: 'patterns/_diagram-shared/diagrams-text-layout.js',
    targets: [
      'patterns/diagram-static-H/diagrams-text-layout.js',
      'patterns/diagram-static-V/diagrams-text-layout.js',
      'patterns/diagram-static-SEQ/diagrams-text-layout.js',
    ],
  },
];

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/* Reject unknown flags. Without this, `--chek` falls through to the WRITE
   path and exits 0 — turning the divergence guard into an auto-fix that
   always passes, which is the exact failure --check exists to prevent. */
const ARGS = process.argv.slice(2);
const KNOWN = new Set(['--check']);
const unknown = ARGS.filter((a) => !KNOWN.has(a));
if (unknown.length) {
  console.error(`unknown argument(s): ${unknown.join(' ')}\nusage: sync-diagram-shared.mjs [--check]`);
  process.exit(2);
}
const check = ARGS.includes('--check');

let missing = 0, differing = 0, written = 0;
const report = [];

for (const m of MEMBERS) {
  const src = path.join(ROOT, m.canonical);
  if (!fs.existsSync(src)) {
    console.error(`canonical missing: ${m.canonical}`);
    process.exit(2);
  }
  const bytes = fs.readFileSync(src);
  const canonicalSha = sha(bytes);
  for (const t of m.targets) {
    const dst = path.join(ROOT, t);
    const exists = fs.existsSync(dst);
    const same = exists && Buffer.compare(fs.readFileSync(dst), bytes) === 0;
    if (check) {
      if (!exists) { missing++; report.push({ target: t, state: 'MISSING' }); }
      else if (!same) { differing++; report.push({ target: t, state: 'DIVERGENT' }); }
      else report.push({ target: t, state: 'ok', sha: canonicalSha });
    } else if (!same) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, bytes);
      written++;
      report.push({ target: t, state: 'written', sha: canonicalSha });
    } else {
      report.push({ target: t, state: 'ok', sha: canonicalSha });
    }
  }
}

console.log(JSON.stringify({
  check, members: MEMBERS.length,
  targets: MEMBERS.reduce((a, m) => a + m.targets.length, 0),
  written, missing, differing,
  clean: missing === 0 && differing === 0,
  report,
}, null, 1));

if (check && (missing || differing)) process.exit(1);
