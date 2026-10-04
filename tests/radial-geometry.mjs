/* radial-geometry.mjs — compares a radial layout with a stored reference geometry. Imported by
   tests/radial-contract.test.mjs in Node and by tests/radial-fixture.html in the browser, so both
   runtimes judge geometry by one rule.

   WHY NOT A HASH. The layout places every mark at a radius times Math.cos or Math.sin of an angle.
   ECMAScript leaves those two functions implementation-approximated, so the last bit of an x or y
   can differ between engines and platforms while every angle, radius, count and identity agrees.
   A hash of raw floating-point output therefore fails across runtimes without any movement.

   THE RULE. Structure is compared exactly: the node count and order, each node's identifier,
   parent, depth, kind, mark radius and container count, whether it carries a fan radius, and the
   root's count against the reference's own leaf total (a reference may record the root's count by
   another rule, so its stored root count is not compared; its leaf rows are counted instead). Every
   computed number (x, y, bearing, fan radius, bounds) must be a finite number on both sides, and is
   compared within TOLERANCE.

   THE TOLERANCE, 1e-6 world units, is justified at both ends. Measured: between Node v22.12.0 and
   Chrome 154 on this layout, every coordinate that differs differs by exactly one unit in the last
   place, the largest 1.14e-13. Derived, not measured: one unit in the last place of any coordinate below 4,096
   is at most 4.55e-13. ECMAScript sets no accuracy bound on Math.cos and Math.sin, so one unit is an
   observation, not a guarantee; but positions are computed directly, not accumulated, so the noise
   does not grow with depth. The tolerance is over two million times the largest such unit (about
   8.8 million times the measured 1.14e-13) and about seventy thousand times smaller than one screen pixel at the deepest zoom (1/14 of a world
   unit). Any movement a reader could see, and any change of allocation, fails it by orders of
   magnitude.

   THE REFERENCE must come from a computation independent of the layout under test, with its
   provenance recorded in the reference itself; capture() only normalizes a layout for comparison
   and must never be used to write the expected result from the candidate. */

export const TOLERANCE = 1e-6;
const EXACT = ['id', 'parent', 'depth', 'kind', 'r', 'count'];
const NUMERIC = ['x', 'y', 'ang', 'outerR'];

/* a layout as rows: [id, parent, depth, kind, r, count, x, y, ang, outerR]; the root's count is
   kept apart, since the comparison checks it against the reference's leaf total */
export function capture(L) {
  const root = L.nodes.find((n) => n.kind === 'root');
  return {
    nodes: L.nodes.map((n) => [n.id, n.parent === undefined ? null : n.parent, n.depth, n.kind, n.r,
      n.kind === 'container' ? n.count : null, n.x, n.y, n.ang, n.outerR === undefined ? null : n.outerR]),
    bounds: { x: L.bounds.x, y: L.bounds.y, w: L.bounds.w, h: L.bounds.h },
    rootCount: root ? root.count : null,
  };
}

export function compare(L, ref, tol = TOLERANCE) {
  const got = capture(L), exact = [], numeric = [];
  let maxDiff = 0;
  const finite = (v) => typeof v === 'number' && isFinite(v);
  const num = (where, field, g, w) => {
    if (!finite(g) || !finite(w)) { exact.push({ where, field, got: g, want: w, why: 'not a finite number' }); return; }
    const d = Math.abs(g - w);
    if (d > maxDiff) maxDiff = d;
    if (!(d <= tol)) numeric.push({ where, field, got: g, want: w, diff: d });
  };
  if (got.nodes.length !== ref.nodes.length) exact.push({ where: 'nodes', field: 'count', got: got.nodes.length, want: ref.nodes.length });
  const n = Math.min(got.nodes.length, ref.nodes.length);
  for (let i = 0; i < n; i++) {
    const g = got.nodes[i], w = ref.nodes[i];
    EXACT.forEach((f, k) => { if (g[k] !== w[k]) exact.push({ where: i, field: f, got: g[k], want: w[k] }); });
    if ((g[9] === null) !== (w[9] === null)) exact.push({ where: i, field: 'outerR present', got: g[9] !== null, want: w[9] !== null });
    NUMERIC.forEach((f, k) => { if (f !== 'outerR' || (g[9] !== null && w[9] !== null)) num(i, f, g[6 + k], w[6 + k]); });
  }
  ['x', 'y', 'w', 'h'].forEach((f) => num('bounds', f, got.bounds[f], ref.bounds[f]));
  const leafTotal = ref.nodes.filter((r) => r[3] === 'leaf').length;
  if (got.rootCount !== leafTotal) exact.push({ where: 'root', field: 'count', got: got.rootCount, want: leafTotal });
  return { ok: exact.length === 0 && numeric.length === 0, nodes: got.nodes.length, maxDiff,
           exact: exact.slice(0, 10), exactCount: exact.length, numeric: numeric.slice(0, 10), numericCount: numeric.length };
}
