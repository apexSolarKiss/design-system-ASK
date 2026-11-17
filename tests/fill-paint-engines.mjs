#!/usr/bin/env node
/* fill-paint-engines.mjs — the interactive spine and radial on the surface treatments' fill paint.

     node tests/fill-paint-engines.mjs              run every check; exit 1 on any failure
     node tests/fill-paint-engines.mjs --out DIR    and keep results.json in DIR

   It serves this repository read-only on 127.0.0.1 and opens the spine's and the radial's gallery previews,
   and the radial's synthetic composition, in headless Chrome (Node 22+, Chrome at $CHROME or the default
   locations; no npm dependency), in the light and the dark scheme. Hover is a real pointer and keyboard
   focus real keys; selection, zoom and Fit go through the page's own API, or a dispatched click on a node
   or a zoom button.

   Paint: a state node or mark is filled at 100% of its role's value, its text in that role's ink (the ink
   map read independently, as values); the spine's root is the neutral filled shape; a radial mark that
   asserts no state keeps the 15% wash, and the inspector's dot for it shows the wash; the spine's legend
   and inspector dots show their node's look in their own paint (in dark the neutral fill and the theme
   foreground share a value, so S8 discriminates only in light); every state mark's chip is a hole, where
   the drawing anchors (the spine's backbone and edges; the radial ring's chip geometry at its center).
   Emphasis: hover, relation and selection never step a mark's fill or outline, nor dim or filter an
   emphasized mark; one neutral frame outside a mark shows them: 1px on hover, a preview with nothing
   locked included; 1px at half strength on a related radial node, full when hovered; 2px once a node is
   locked by a real click, kept when hovered; a dimmed node under the pointer shows in full and dims again
   when it leaves. The frame stands 4.75px beyond its mark's painted edge at every zoom, a triangle's
   included, measured from the two shapes' geometry; the radial's keyboard focus ring, centered on its
   node, clears the round-joined frame by 3px from both lines' computed widths. Names and heads: every
   leaf's own name and identifier line, as drawn, clears its frame on rays right, left, up and down; each
   directed relation's real target (the model's relation for each drawn path) decides its head: into a
   filled target the tip, found from the marker's own geometry, stops outside its fill and outline, no
   head is reported obscured, and the head stays off other filled marks (strictly on the reference; on
   the synthetic composition except the one accepted base corner, VM-SE-213 > VM-LM-177 at 0.111 under
   VM-LM-185); into a washed target the relation keeps its full curve. The arrow fixture
   (tests/radial-arrows-fixture.html): a relation between close neighbors is cut in its first half and its
   tip clears every filled mark; every unreported head stops beyond its target's true painted reach, the
   circle through the tip meeting no painted point of it (a 76-unit and a leaf-size triangle, mitered
   corners included, and a pill); report().obscuredHeads names exactly the relations whose tip lies on a
   filled mark (the source's center within the target's reach; the cut inside a filled source; the tip on
   a filled neighbor); the exported diagram, measured as its own document, agrees. Plates: the radial's page plate
   draws no frame and every mask it references resolves.

   The negative control turns the fill paint's stylesheet off and requires the paint check to fail. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!(args.length === 0 || (args.length === 2 && args[0] === '--out'))) { console.error('usage: fill-paint-engines.mjs [--out DIR]'); process.exit(2); }
const KEEP = args.length === 2;
const OUT = KEEP ? path.resolve(args[1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'fill-paint-engines-'));
fs.mkdirSync(OUT, { recursive: true });

/* ----------------------------------------------------------- browser -- */
function chromePath() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!c) { console.error('Chrome not found; set $CHROME'); process.exit(2); }
  return c;
}
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fill-paint-engines-chrome-'));
  const child = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise((r) => child.once('exit', r));
  for (let i = 0; i < 150; i++) {
    try { const port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (port && (await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return { child, profile, exited, port }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome did not start');
}
async function stop(b) {
  try { b.child.kill(); } catch { /* gone */ }
  await Promise.race([b.exited, new Promise((r) => setTimeout(r, 4000))]);
  try { fs.rmSync(b.profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
function serve(root) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
                  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(root, u);
    if (req.method !== 'GET' || !f.startsWith(root + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}
async function page(b, url, scheme) {
  const tgt = await (await fetch(`http://127.0.0.1:${b.port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(), errors = []; let loaded; const onLoad = new Promise((r) => { loaded = r; });
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const q = pending.get(m.id); pending.delete(m.id); m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result); }
    if (m.method === 'Page.loadEventFired') loaded();
    if (m.method === 'Runtime.exceptionThrown') errors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
  });
  const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Page.navigate', { url });
  await Promise.race([onLoad, new Promise((r) => setTimeout(r, 15000))]);
  const evaluate = async (expression) => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await evaluate('document.fonts.ready');
  await evaluate('new Promise((r) => setTimeout(r, 600))');
  const hover = async (pt) => { await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, pointerType: 'mouse' });
    await evaluate('new Promise((r) => setTimeout(r, 300))'); };
  const key = async (k, code) => { for (const type of ['keyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
    await evaluate('new Promise((r) => setTimeout(r, 250))'); };
  const close = async () => { try { ws.close(); } catch { /* closed */ } await fetch(`http://127.0.0.1:${b.port}/json/close/${tgt.id}`).catch(() => {}); };
  return { call, evaluate, hover, key, close, errors };
}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
}

/* the ink map, as values: text on each fill (surface-treatments.css FILL PAINT) */
const INK = { light: { earned: 'rgb(106, 99, 127)', structural: 'rgb(106, 99, 127)', partial: 'rgb(106, 99, 127)', held: 'rgb(106, 99, 127)',
                       deflated: 'rgb(212, 198, 225)', external: 'rgb(212, 198, 225)', proposed: 'rgb(212, 198, 225)', neutral: 'rgb(106, 99, 127)' },
              dark:  { earned: 'rgb(106, 99, 127)', structural: 'rgb(106, 99, 127)', partial: 'rgb(106, 99, 127)', held: 'rgb(106, 99, 127)',
                       deflated: 'rgb(212, 198, 225)', external: 'rgb(212, 198, 225)', proposed: 'rgb(32, 29, 38)', neutral: 'rgb(106, 99, 127)' } };
const NEUTRAL = { light: { fill: 'rgb(191, 179, 212)', edge: 'rgba(255, 255, 255, 0.9)' }, dark: { fill: 'rgb(212, 198, 225)', edge: 'rgb(212, 198, 225)' } };

/* in-page probes */
const RESOLVE = `function res(v){var s=document.createElement('span');document.body.appendChild(s);s.style.color=v;var c=getComputedStyle(s).color;s.remove();return c;}`;
const SPINE_PAINT = `(function(){${RESOLVE}var out=[];[].forEach.call(document.querySelectorAll('#nodes .node'),function(g,i){
  var st=(g.style.getPropertyValue('--st').match(/--state-([a-z]+)/)||[])[1],b=g.querySelector('.box'),cb=getComputedStyle(b),
  t=getComputedStyle(g.querySelector('text:not(.grp)')),tg=getComputedStyle(g.querySelector('.grp'));
  var m=b.getAttribute('mask'),mk=m&&document.getElementById(m.slice(5,-1)),hole=mk&&mk.querySelector('circle[style*="#000"]');
  out.push({i:i,st:st,fill:cb.fill,op:cb.fillOpacity,edge:cb.stroke,sw:cb.strokeWidth,so:cb.strokeOpacity,text:t.fill,tag:tg.fill,role:st==='neutral'?null:res('var(--state-'+st+')'),
            ink:st==='neutral'?null:res('var(--state-'+st+'-ink)'),hole:!!hole});});return out;})()`;
function spineFailures(rows, scheme) {
  const bad = [];
  for (const r of rows) {
    if (r.st === 'neutral') {
      if (r.fill !== NEUTRAL[scheme].fill || r.edge !== NEUTRAL[scheme].edge) bad.push([r.i, 'neutral paint', r.fill, r.edge]);
    } else {
      if (r.fill !== r.role || r.edge !== r.role) bad.push([r.i, 'fill', r.fill, r.role]);
      if (r.text !== r.ink) bad.push([r.i, 'ink binding', r.text, r.ink]);
    }
    if (r.op !== '1') bad.push([r.i, 'fill-opacity', r.op]);
    if (r.text !== INK[scheme][r.st] || r.tag !== INK[scheme][r.st]) bad.push([r.i, 'ink map', r.st, r.text, r.tag]);
    if (!r.hole) bad.push([r.i, 'chip hole']);
  }
  return bad;
}
/* a frame's offset beyond its mark's painted edge, in screen pixels: the frame's geometry against the mark's
   own (a polygon side by side, both of the frame's vertices on each side), less half the mark's computed
   outline, at the mark's screen scale; spread is the largest difference between sides */
const OFFSET = `function offset(m,f){var k=m.getScreenCTM().a,sw=parseFloat(getComputedStyle(m).strokeWidth)||0,d=[];
  if(m.localName==='circle')d.push(+f.getAttribute('r')-(+m.getAttribute('r')));
  else if(m.localName==='rect')d.push((+f.getAttribute('width')-(+m.getAttribute('width')))/2,(+f.getAttribute('height')-(+m.getAttribute('height')))/2);
  else{var pt=function(e){return e.getAttribute('points').trim().split(/[\\s,]+/).map(Number);},v=pt(m),q=pt(f),n=v.length/2;
    for(var i=0;i<n;i++){var ax=v[2*i],ay=v[2*i+1],ex=v[(2*i+2)%(2*n)]-ax,ey=v[(2*i+3)%(2*n)]-ay,L=Math.hypot(ex,ey);
      [i,(i+1)%n].forEach(function(j){d.push(Math.abs(ex*(q[2*j+1]-ay)-ey*(q[2*j]-ax))/L);});}}
  var lo=Math.min.apply(null,d),hi=Math.max.apply(null,d);
  return {shape:m.localName+(m.localName==='polygon'?':'+(m.getAttribute('points').trim().split(/[\\s,]+/).length/2):''),k:+k.toFixed(3),beyond:+((lo-sw/2)*k).toFixed(2),spread:+((hi-lo)*k).toFixed(3)};}`;
const atFrameGap = (o) => o && Math.abs(o.beyond - 4.75) < 0.3 && o.spread < 0.05;
const SPINE_FRAMES = `[].map.call(document.querySelectorAll('#nodes .node'),function(g,i){var c=getComputedStyle(g.querySelector('.frame'));return c.display==='none'?null:[i,c.strokeWidth];}).filter(Boolean)`;
const NODE = (i) => `document.querySelectorAll('#nodes .node')[${i}]`;
const SPINE_CENTER = (i) => `(function(){var r=document.querySelectorAll('#nodes .node')[${i}].querySelector('.box').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`;
const SPINE_GAP = `(function(){${OFFSET}var g=document.querySelectorAll('#nodes .node')[6];return offset(g.querySelector('.box'),g.querySelector('.frame'));})()`;
/* press a HUD zoom button until the drawing's scale stops changing: the zoom's end */
const SPINE_ZOOM_END = (t) => `(async function(){var b=document.querySelector('.hud button[title="${t}"]'),box=document.querySelector('#nodes .node .box'),last=box.getScreenCTM().a,n=0;
  while(n<80){b.click();n++;await new Promise(function(r){setTimeout(r,40);});var a=box.getScreenCTM().a;if(Math.abs(a-last)<1e-9)break;last=a;}return n;})()`;
/* the inspector's dot takes its node's paint: the neutral filled shape, edge included, or the role's color */
const SPINE_DOT = `(async function(){${RESOLVE}var out={};var nodes=document.querySelectorAll('#nodes .node');
  for(var i=0;i<nodes.length;i++){var st=(nodes[i].style.getPropertyValue('--st').match(/--state-([a-z]+)/)||[])[1],w=st==='neutral'?'neutral':'state';if(out[w])continue;
    nodes[i].dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(function(r){setTimeout(r,60);});var d=document.querySelector('#inspector .dot'),c=d&&getComputedStyle(d);
    out[w]={i:i,st:st,bg:c&&c.backgroundColor,edge:c&&c.borderTopColor,role:st==='neutral'?null:res('var(--state-'+st+')')};}return out;})()`;
/* the emphasized nodes themselves: never dimmed, never filtered */
const SPINE_EMPH = `(function(){var n=0,bad=[];[].forEach.call(document.querySelectorAll('#nodes .node.sel, #nodes .node:hover'),function(g){n++;var cg=getComputedStyle(g),cb=getComputedStyle(g.querySelector('.box'));
  if(cg.opacity!=='1'||cg.filter!=='none'||cb.opacity!=='1'||cb.filter!=='none')bad.push([g.getAttribute('data-id'),cg.opacity,cg.filter,cb.opacity,cb.filter]);});return {emphasized:n,bad:bad};})()`;
/* node a and node b are related: a drawn edge joins their holes */
const SPINE_RELATED = (a, b) => `(function(){function hole(i){var bx=document.querySelectorAll('#nodes .node')[i].querySelector('.box'),h=document.getElementById(bx.getAttribute('mask').slice(5,-1)).querySelector('circle[style*="#000"]');return [+h.getAttribute('cx'),+h.getAttribute('cy')];}
  var A=hole(${a}),B=hole(${b}),near=function(p,q){return Math.hypot(p[0]-q[0],p[1]-q[1])<0.01;};return [].some.call(document.querySelectorAll('.edge.on'),function(e){var p=[+e.getAttribute('x1'),+e.getAttribute('y1')],q=[+e.getAttribute('x2'),+e.getAttribute('y2')];return (near(p,A)&&near(q,B))||(near(p,B)&&near(q,A));});})()`;
/* a node's group opacity and frame, and its classes */
const SPINE_NODE = (sel) => `(function(){var g=${sel};if(!g)return null;var f=getComputedStyle(g.querySelector('.frame'));return {i:[].indexOf.call(document.querySelectorAll('#nodes .node'),g),cls:g.getAttribute('class'),opacity:getComputedStyle(g).opacity,frame:f.display==='none'?null:f.strokeWidth};})()`;
/* the spine's exports, intercepted as tests/spine-behavior.mjs does: the SVG each export rasterizes (the data URL
   it hands an image), with the download itself suppressed */
const EXPORT_HOOK = `(function(){if(window.__exports)return;window.__exports=[];window.alert=function(m){(window.__alerts=window.__alerts||[]).push(String(m));};
  var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,get:function(){return d.get.call(this);},
  set:function(v){if(typeof v==='string'&&v.indexOf('data:image/svg+xml')===0)window.__exports.push(decodeURIComponent(v.slice(v.indexOf(',')+1)));d.set.call(this,v);}});
  HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download'))return;};})()`;
const EXPORT_SVG = (id) => `(async function(){var n=window.__exports.length;document.getElementById('${id}').click();
  for(var i=0;i<400&&window.__exports.length===n;i++)await new Promise(function(r){setTimeout(r,25);});
  for(i=0;i<400&&document.getElementById('${id}').disabled;i++)await new Promise(function(r){setTimeout(r,25);});return window.__exports[n]||null;})()`;
/* every hole sits where the drawing anchors: on its box's center line, the backbone through each spine node's
   hole, and both ends of a selected node's edges on holes */
const SPINE_HOLES = `(function(){var bb=document.querySelector('.backbone'),bx=+bb.getAttribute('x1'),y1=+bb.getAttribute('y1'),y2=+bb.getAttribute('y2'),holes=[],crossed=0,bad=[];
  [].forEach.call(document.querySelectorAll('#nodes .node'),function(g,i){var b=g.querySelector('.box'),m=document.getElementById(b.getAttribute('mask').slice(5,-1)),h=m.querySelector('circle[style*="#000"]'),
    x=+b.getAttribute('x'),y=+b.getAttribute('y'),w=+b.getAttribute('width'),hh=+b.getAttribute('height'),c={x:+h.getAttribute('cx'),y:+h.getAttribute('cy')};holes.push(c);
    if(Math.abs(c.y-(y+hh/2))>0.01||c.x<x||c.x>x+w)bad.push([i,'hole off its box']);
    if(bx>=x&&bx<=x+w&&y+hh/2>=Math.min(y1,y2)-0.01&&y+hh/2<=Math.max(y1,y2)+0.01){crossed++;if(Math.abs(c.x-bx)>0.01)bad.push([i,'backbone misses the hole',c.x,bx]);}});
  var ends=[].concat.apply([],[].map.call(document.querySelectorAll('.edge.on'),function(e){return [[+e.getAttribute('x1'),+e.getAttribute('y1')],[+e.getAttribute('x2'),+e.getAttribute('y2')]];}));
  var loose=ends.filter(function(p){return !holes.some(function(h){return Math.hypot(h.x-p[0],h.y-p[1])<0.01;});}).length;
  return {crossed:crossed,edgeEnds:ends.length,loose:loose,bad:bad};})()`;

const GID = `function gid(id){var M=window.RADIAL_MAP,i=M.layout.nodes.findIndex(function(n){return n.id===id;});return document.getElementById(M.id+'-n'+i);}`;
const RADIAL_PAINT = `(function(){${RESOLVE}var M=window.RADIAL_MAP,out={filled:0,wash:0,bad:[],sig:{}};M.layout.nodes.forEach(function(n,i){
  var g=document.getElementById(M.id+'-n'+i);if(!g)return;var m=g.querySelector('.radial-mark'),c=getComputedStyle(m),st=n.kind==='root'?'neutral':(n.state||'neutral');
  out.sig[n.id]=[c.fill,c.fillOpacity,c.stroke,c.strokeWidth,c.strokeOpacity].join('|');
  if(st!=='neutral'){out.filled++;var want=res('var(--state-'+st+')');if(!m.classList.contains('surface-fill')||c.fill!==want||c.fillOpacity!=='1')out.bad.push([n.id,'fill',c.fill,want,c.fillOpacity]);
    var chip=g.querySelector('.radial-chip');if(chip){var mk=m.getAttribute('mask'),el=mk&&document.getElementById(mk.slice(5,-1));if(!el||!el.querySelector('circle[style*="#000"]')||getComputedStyle(chip).fill!=='none')out.bad.push([n.id,'chip hole']);}}
  else{out.wash++;if(c.fillOpacity!=='0.15'||c.fill!==res('var(--state-neutral)'))out.bad.push([n.id,'wash',c.fill,c.fillOpacity]);}});return out;})()`;
const RADIAL_FRAMES = `[].map.call(document.querySelectorAll('g.radial-node'),function(g){var c=getComputedStyle(g.querySelector('.radial-frame'));
  return c.display==='none'?null:[g.getAttribute('data-radial-id'),g.classList.contains('is-selected')?'selected':g.classList.contains('is-near')?'near':'other',c.strokeWidth,c.strokeOpacity];}).filter(Boolean)`;
const RADIAL_EMPH = `(function(){var n=0,bad=[];[].forEach.call(document.querySelectorAll('g.radial-node.is-selected, g.radial-node.is-near, g.radial-node:hover'),function(g){n++;var cg=getComputedStyle(g),cm=getComputedStyle(g.querySelector('.radial-mark'));
  if(cg.opacity!=='1'||cg.filter!=='none'||cm.opacity!=='1'||cm.filter!=='none')bad.push([g.getAttribute('data-radial-id'),cg.opacity,cg.filter,cm.opacity,cm.filter]);});return {emphasized:n,bad:bad};})()`;
/* the first dimmed mark whose center is on screen and under nothing else: a mark a pointer can reach */
const REACHABLE_DIM = `(function(){var g=[].find.call(document.querySelectorAll('g.radial-node.is-dim'),function(g){var r=g.querySelector('.radial-mark').getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  if(r.width<6||x<40||y<80||x>innerWidth-420||y>innerHeight-60)return false;var e=document.elementFromPoint(x,y);return e&&e.closest('g.radial-node')===g;});if(!g)return null;var r=g.querySelector('.radial-mark').getBoundingClientRect();return {id:g.getAttribute('data-radial-id'),x:r.left+r.width/2,y:r.top+r.height/2};})()`;
const RADIAL_NODE = (id) => `(function(){${GID}var g=gid('${id}'),f=getComputedStyle(g.querySelector('.radial-frame'));return {id:'${id}',cls:g.getAttribute('class'),opacity:getComputedStyle(g).opacity,frame:f.display==='none'?null:f.strokeWidth};})()`;
const RADIAL_GAP = (id) => `(function(){${GID}${OFFSET}var g=gid('${id}');return offset(g.querySelector('.radial-mark'),g.querySelector('.radial-frame'));})()`;
/* the frame's reach: its furthest point from the node's center, in world units */
const REACH = `function reachOf(f,n){var r=0;if(f.localName==='circle')r=+f.getAttribute('r');else if(f.localName==='rect'){var w=+f.getAttribute('width'),h=+f.getAttribute('height');r=Math.sqrt(w*w/4+h*h/4);}
  else f.getAttribute('points').trim().split(/\\s+/).forEach(function(pt){var q=pt.split(',').map(Number);r=Math.max(r,Math.hypot(q[0]-n.x,q[1]-n.y));});return r;}`;
/* the focus ring's inner edge less the focused frame's outer edge, from both lines' computed widths */
const FOCUS_CLEAR = `(function(){${GID}${REACH}var M=window.RADIAL_MAP,ring=document.querySelector('.radial-focus-ring');if(!ring)return null;var fid=M.state().selection.focus,g=gid(fid),f=g.querySelector('.radial-frame'),
  n=M.layout.nodes.find(function(x){return x.id===fid;}),k=M.view().k,rs=parseFloat(getComputedStyle(ring).strokeWidth),fc=getComputedStyle(f),fs=fc.display==='none'?0:parseFloat(fc.strokeWidth);
  var rc=new DOMPoint(+ring.getAttribute('cx'),+ring.getAttribute('cy')).matrixTransform(ring.getScreenCTM()),nc=new DOMPoint(n.x,n.y).matrixTransform(f.getScreenCTM());
  return {k:+k.toFixed(3),focus:fid,shape:f.localName,join:fc.strokeLinejoin,ringOff:+Math.hypot(rc.x-nc.x,rc.y-nc.y).toFixed(3),ringLine:rs,frameLine:fs,clearPx:+((+ring.getAttribute('r')-rs/2)-(reachOf(f,n)*k+fs/2)).toFixed(2)};})()`;
/* every leaf's own name and identifier line, as drawn (the text's box through its rotation), clear of the
   leaf's frame at its 2px line: the nearest point of each to the node's center lies past the frame's reach.
   Both sides are in client pixels: the center through the mark's own screen matrix, never M.project(), whose
   coordinates are the drawing's and sit below the page's bar */
const OWN_NAMES = `(function(){${REACH}var M=window.RADIAL_MAP,count={},out={names:0,ids:0,filled:0,least:null,bad:[]};
  M.layout.nodes.forEach(function(n){if(n.kind==='leaf')count[n.label]=(count[n.label]||0)+1;});
  var byName={},byId={};[].forEach.call(document.querySelectorAll('text.radial-lbl--leaf'),function(t){if(t.textContent)byName[t.textContent]=t;});
  [].forEach.call(document.querySelectorAll('text.radial-lbl--id'),function(t){if(t.textContent)byId[t.textContent]=t;});
  function quad(t){if(getComputedStyle(t).display==='none')return null;var b=t.getBBox(),m=t.getScreenCTM();if(!b.width)return null;
    return [[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(function(p){return [m.a*p[0]+m.c*p[1]+m.e,m.b*p[0]+m.d*p[1]+m.f];});}
  function dist(c,P){var pos=0,neg=0,best=Infinity;for(var i=0;i<4;i++){var a=P[i],b=P[(i+1)%4],ex=b[0]-a[0],ey=b[1]-a[1],t=Math.max(0,Math.min(1,((c[0]-a[0])*ex+(c[1]-a[1])*ey)/(ex*ex+ey*ey)));
    best=Math.min(best,Math.hypot(a[0]+ex*t-c[0],a[1]+ey*t-c[1]));var cr=ex*(c[1]-a[1])-ey*(c[0]-a[0]);if(cr>0)pos++;if(cr<0)neg++;}return pos&&neg?best:0;}
  M.layout.nodes.forEach(function(n,i){if(n.kind!=='leaf')return;var g=document.getElementById(M.id+'-n'+i);if(!g)return;var mb=g.querySelector('.radial-mark').getBoundingClientRect();
    if(mb.right<0||mb.left>innerWidth||mb.bottom<0||mb.top>innerHeight)return;var ctm=g.querySelector('.radial-mark').getScreenCTM(),p=new DOMPoint(n.x,n.y).matrixTransform(ctm),c=[p.x,p.y],
      clear=reachOf(g.querySelector('.radial-frame'),n)*ctm.a+1;
    [[count[n.label]===1?byName[n.label]:null,'names'],[byId[n.id],'ids']].forEach(function(e){var q=e[0]&&quad(e[0]);if(!q)return;out[e[1]]++;
      if(g.querySelector('.radial-mark.surface-fill'))out.filled++;var margin=dist(c,q)-clear;if(out.least===null||margin<out.least)out.least=+margin.toFixed(2);if(margin<0)out.bad.push([n.id,e[1],+margin.toFixed(2)]);});});return out;})()`;
/* the leftmost, the topmost and the bottommost leaves: on a left ray the text runs back toward the center, and
   on a vertical ray a fixed screen offset would slide the text along the ray, onto the mark on an upward one */
const RAY_LEAVES = `(function(){var L=window.RADIAL_MAP.layout.nodes.filter(function(n){return n.kind==='leaf';}),by=function(f){return L.slice().sort(function(a,b){return f(a)-f(b);})[0];};
  var left=by(function(n){return Math.cos(n.ang);}),up=by(function(n){return Math.sin(n.ang);}),down=by(function(n){return -Math.sin(n.ang);});
  return {left:left.id,up:up.id,down:down.id,leftCos:+Math.cos(left.ang).toFixed(3),upSin:+Math.sin(up.ang).toFixed(3),downSin:+Math.sin(down.ang).toFixed(3)};})()`;
/* the first state-bearing mark drawn as a triangle: the largest reach for its radius */
const FIRST_TRIANGLE = `(function(){var M=window.RADIAL_MAP,hit=null;M.layout.nodes.some(function(n,i){var g=document.getElementById(M.id+'-n'+i),m=g&&g.querySelector('.radial-mark.surface-fill');
  if(m&&m.localName==='polygon'&&m.getAttribute('points').trim().split(/[\\s,]+/).length===6){hit=n.id;return true;}return false;});return hit;})()`;
/* from the Fit, zoom by a factor about a node (the API's zoom() takes a factor; the engine clamps it) */
const ZOOM_ON = (id, f) => `(async function(){var M=window.RADIAL_MAP;M.fit('explicit');await new Promise(function(r){setTimeout(r,500);});var q=M.project('${id}');M.zoom(${f},q.x,q.y);await new Promise(function(r){setTimeout(r,700);});return M.view().k;})()`;
/* every drawn relation path in order is the model's relation of a drawn plane between placed nodes, so each
   directed path's real target is known. A filled target: the arrowhead's tip (from the marker's own geometry:
   its path's furthest x past refX, at markerWidth over the viewBox, in stroke widths) lies in neither its fill
   nor its outline, and no point of the head lies in another filled mark. A washed target: the path keeps its
   full curve, ending at the target's center, so the head shows through the wash as it always did */
const HEADS = `(function(){var M=window.RADIAL_MAP,ix={};M.layout.nodes.forEach(function(n,i){ix[n.id]=i;});
  var rel=M.model.relations.filter(function(e){var pl=M.model.planes.get(e.plane);return pl&&pl.drawn!=='never'&&ix[e.from]!==undefined&&ix[e.to]!==undefined;}),paths=document.querySelectorAll('path.radial-edge');
  var out={paths:paths.length,relations:rel.length,solid:0,wash:0,tipInside:[],tipOnOther:[],headOnOther:[],maxCovered:0,washShortened:[],obscured:(M.report().obscuredHeads||[]).length};if(paths.length!==rel.length)return out;
  var solid=[];M.layout.nodes.forEach(function(n,i){var m=document.getElementById(M.id+'-n'+i).querySelector('.radial-mark.surface-fill');if(m)solid.push({id:n.id,m:m});});
  [].forEach.call(paths,function(p,k){if(!p.getAttribute('marker-end'))return;var e=rel[k],T=M.layout.nodes[ix[e.to]],tm=document.getElementById(M.id+'-n'+ix[e.to]).querySelector('.radial-mark');
    var d=p.getAttribute('d').trim().split(/[\\sMQ]+/).filter(Boolean).map(Number),ex=d[d.length-2],ey=d[d.length-1],px=d[d.length-4],py=d[d.length-3];
    if(!tm.classList.contains('surface-fill')){out.wash++;if(Math.hypot(ex-T.x,ey-T.y)>1e-6)out.washShortened.push(e.to);return;}out.solid++;
    if(Math.hypot(ex-px,ey-py)<1e-9){px=d[0];py=d[1];}
    var mk=document.getElementById(p.getAttribute('marker-end').slice(5,-1)),vb=mk.viewBox.baseVal,sw=parseFloat(getComputedStyle(p).strokeWidth),
        nums=mk.querySelector('path').getAttribute('d').match(/-?[\\d.]+/g).map(Number),xs=nums.filter(function(_,i){return i%2===0;}),ys=nums.filter(function(_,i){return i%2===1;}),
        s=Math.min(+mk.getAttribute('markerWidth')/vb.width,+mk.getAttribute('markerHeight')/vb.height)*sw,refX=+mk.getAttribute('refX'),
        L=Math.hypot(ex-px,ey-py),ux=(ex-px)/L,uy=(ey-py)/L,hw=(Math.max.apply(null,ys)-Math.min.apply(null,ys))/2*s,
        tip=[ex+ux*(Math.max.apply(null,xs)-refX)*s,ey+uy*(Math.max.apply(null,xs)-refX)*s],base=[ex-ux*(refX-Math.min.apply(null,xs))*s,ey-uy*(refX-Math.min.apply(null,xs))*s],len=Math.hypot(tip[0]-base[0],tip[1]-base[1]);
    var tp=new DOMPoint(tip[0],tip[1]);if(tm.isPointInFill(tp)||tm.isPointInStroke(tp))out.tipInside.push(e.to);
    solid.forEach(function(o){if(o.id!==e.to&&o.id!==e.from&&(o.m.isPointInFill(tp)||o.m.isPointInStroke(tp)))out.tipOnOther.push(e.from+'>'+e.to+' on '+o.id);});
    var total=0,hit={};for(var a=0;a<=1.0001;a+=0.1)for(var b=-1;b<=1.0001;b+=0.25){var w=hw*(1-a),q=new DOMPoint(base[0]+ux*a*len-uy*b*w,base[1]+uy*a*len+ux*b*w);total++;
      solid.forEach(function(o){if(o.id===e.to||o.id===e.from)return;if(o.m.isPointInFill(q)||o.m.isPointInStroke(q))hit[o.id]=(hit[o.id]||0)+1;});}
    Object.keys(hit).forEach(function(id){var f=hit[id]/total;out.headOnOther.push([e.from+'>'+e.to+' on '+id,+f.toFixed(3)]);out.maxCovered=Math.max(out.maxCovered,f);});});
  return out;})()`;
/* the arrow fixture: each relation into a filled mark, its tip from the marker's own geometry, whether the
   tip lies on any filled mark (target, source or other), and whether the circle through the tip around the
   target's center meets the target's painted shape anywhere (1,440 bearings, fill or stroke with its mitered joins):
   a head stopped short of the true reach clears the mark on every bearing it could arrive from */
const ARROWS = `(function(){var M=window.RADIAL_MAP,E=window.RADIAL_ARROWS.edges,ix={},by={};M.layout.nodes.forEach(function(n,i){ix[n.id]=i;by[n.id]=n;});
  function mark(id){return document.getElementById(M.id+'-n'+ix[id]).querySelector('.radial-mark');}
  var filled=[];M.layout.nodes.forEach(function(n){var m=mark(n.id);if(m&&m.classList.contains('surface-fill'))filled.push({id:n.id,m:m});});
  var paths=document.querySelectorAll('path.radial-edge'),reported=(M.report().obscuredHeads||[]).map(function(o){return E[o.key].id;}).sort(),rows=[];
  M.model.relations.forEach(function(e,k){var p=paths[k],T=by[e.to],A=by[e.from],tm=mark(e.to);if(!tm.classList.contains('surface-fill'))return;
    var d=p.getAttribute('d').trim().split(/[\\sMQ]+/).filter(Boolean).map(Number),ex=d[d.length-2],ey=d[d.length-1],px=d[d.length-4],py=d[d.length-3];
    var mk=document.getElementById(p.getAttribute('marker-end').slice(5,-1)),vb=mk.viewBox.baseVal,sw=parseFloat(getComputedStyle(p).strokeWidth),
        xs=mk.querySelector('path').getAttribute('d').match(/-?[\\d.]+/g).map(Number).filter(function(_,i){return i%2===0;}),
        s=Math.min(+mk.getAttribute('markerWidth')/vb.width,+mk.getAttribute('markerHeight')/vb.height)*sw,L=Math.hypot(ex-px,ey-py),
        tip=[ex+(ex-px)/L*(Math.max.apply(null,xs)-(+mk.getAttribute('refX')))*s,ey+(ey-py)/L*(Math.max.apply(null,xs)-(+mk.getAttribute('refX')))*s];
    var tp=new DOMPoint(tip[0],tip[1]),on=filled.filter(function(o){return o.m.isPointInFill(tp)||o.m.isPointInStroke(tp);}).map(function(o){return o.id;});
    var rad=Math.hypot(tip[0]-T.x,tip[1]-T.y),met=0;for(var a=0;a<1440;a++){var q=new DOMPoint(T.x+Math.cos(a*Math.PI/720)*rad,T.y+Math.sin(a*Math.PI/720)*rad);if(tm.isPointInFill(q)||tm.isPointInStroke(q))met++;}
    rows.push({id:E[e.key].id,from:e.from,to:e.to,shape:tm.localName,nl:+Math.hypot(T.x-A.x,T.y-A.y).toFixed(2),r:T.r,endFromTarget:+Math.hypot(ex-T.x,ey-T.y).toFixed(2),
      tipFromTarget:+rad.toFixed(2),tipOn:on,circleMeetsTarget:met,reported:reported.indexOf(E[e.key].id)>=0});});
  return {rows:rows,reported:reported};})()`;
/* the exported diagram, opened as its own SVG document with its own styles: its relation paths against the
   live ones, and each head into a filled mark measured there, as ARROWS measures the live drawing */
const ARROW_EXPORT = `(async function(){var M=window.RADIAL_MAP,E=window.RADIAL_ARROWS.edges,r=await M.service('export').run('diagram'),
  live=[].map.call(document.querySelectorAll('path.radial-edge'),function(p){return p.getAttribute('d');}),
  reported=(M.report().obscuredHeads||[]).map(function(o){return E[o.key].id;});
  var url=URL.createObjectURL(new Blob([r.svg],{type:'image/svg+xml'})),f=document.createElement('iframe');
  f.style.cssText='position:absolute;left:-10000px;top:0;width:800px;height:800px;border:0';document.body.appendChild(f);
  await new Promise(function(res){f.onload=res;f.src=url;});
  var doc=f.contentDocument,win=f.contentWindow,paths=doc.querySelectorAll('path.radial-edge'),rows=[];
  var filled=[].map.call(doc.querySelectorAll('.radial-mark.surface-fill'),function(m){return {id:m.closest('[data-radial-id]').getAttribute('data-radial-id'),m:m};});
  M.model.relations.forEach(function(e,k){var p=paths[k];if(!p||!p.getAttribute('marker-end'))return;
    var tm=doc.querySelector('[data-radial-id="'+CSS.escape(e.to)+'"] .radial-mark');if(!tm||!tm.classList.contains('surface-fill'))return;
    var d=p.getAttribute('d').trim().split(/[\\sMQ]+/).filter(Boolean).map(Number),ex=d[d.length-2],ey=d[d.length-1],px=d[d.length-4],py=d[d.length-3];
    var mk=doc.getElementById(p.getAttribute('marker-end').slice(5,-1)),vb=mk.viewBox.baseVal,sw=parseFloat(win.getComputedStyle(p).strokeWidth),
        xs=mk.querySelector('path').getAttribute('d').match(/-?[\\d.]+/g).map(Number).filter(function(_,i){return i%2===0;}),
        s=Math.min(+mk.getAttribute('markerWidth')/vb.width,+mk.getAttribute('markerHeight')/vb.height)*sw,L=Math.hypot(ex-px,ey-py),o=(Math.max.apply(null,xs)-(+mk.getAttribute('refX')))*s,
        tp=new DOMPoint(ex+(ex-px)/L*o,ey+(ey-py)/L*o);
    rows.push({id:E[e.key].id,sw:sw,tipOn:filled.filter(function(q){return q.m.isPointInFill(tp)||q.m.isPointInStroke(tp);}).map(function(q){return q.id;}),reported:reported.indexOf(E[e.key].id)>=0});});
  var exp=[].map.call(paths,function(p){return p.getAttribute('d');});f.remove();URL.revokeObjectURL(url);
  return {ok:r.ok,live:live.length,exported:exp.length,same:JSON.stringify(live)===JSON.stringify(exp),rows:rows};})()`;
/* the inspector's state dot: the wash for a node asserting no state, the role solid for a state node */
const INSP_DOT = `(async function(){var M=window.RADIAL_MAP,out={};function pick(want){var c=M.layout.nodes.filter(function(n){return n.kind==='leaf'&&(want?n.state==='neutral':n.state&&n.state!=='neutral');});return c;}
  for(var w=0;w<2;w++){var c=pick(w===0),tried=0,hit=null;for(var i=0;i<c.length&&tried<80&&!hit;i++){tried++;M.select(c[i].id);await new Promise(function(r){setTimeout(r,40);});
    var d=document.querySelector('.radial-insp-dot');if(d){var cs=getComputedStyle(d);hit={id:c[i].id,wash:d.classList.contains('radial-sw--wash'),bg:cs.backgroundColor,before:getComputedStyle(d,'::before').opacity,
      role:(function(){var s=document.createElement('span');document.body.appendChild(s);s.style.color='var(--state-'+c[i].state+')';var v=getComputedStyle(s).color;s.remove();return v;})()};}}
    out[w===0?'neutral':'state']=hit||{tried:tried,found:false};}M.select(null);return out;})()`;
const inspDotOk = (o) => o.neutral.found !== false && o.neutral.wash && o.neutral.bg === 'rgba(0, 0, 0, 0)' && o.neutral.before === '0.15'
  && o.state.found !== false && !o.state.wash && o.state.bg === o.state.role;
/* every holed mark's hole is its chip, exactly, at the node's center */
const RADIAL_HOLES = `(function(){var M=window.RADIAL_MAP,n=0,bad=[];M.layout.nodes.forEach(function(nd,i){var g=document.getElementById(M.id+'-n'+i);if(!g)return;var c=g.querySelector('.radial-chip--hole');if(!c)return;n++;
  var m=g.querySelector('.radial-mark'),mk=document.getElementById(m.getAttribute('mask').slice(5,-1)),h=mk&&mk.querySelector('circle[style*="#000"]');if(!h){bad.push([nd.id,'no hole']);return;}
  ['cx','cy','r'].forEach(function(a){if(Math.abs(+h.getAttribute(a)-(+c.getAttribute(a)))>1e-9)bad.push([nd.id,a]);});
  if(Math.abs(+c.getAttribute('cx')-nd.x)>1e-6||Math.abs(+c.getAttribute('cy')-nd.y)>1e-6)bad.push([nd.id,'off center']);
  if(m.localName!=='circle'||+h.getAttribute('r')>=+m.getAttribute('r')*0.5)bad.push([nd.id,'not inside the ring']);});return {holes:n,bad:bad};})()`;
const PLATE = `(async function(){var r=await window.RADIAL_MAP.service('export').run('page'),s=r.svg,ids=(s.match(/mask="url\\(#([^)]+)\\)"/g)||[]).map(function(m){return m.slice(11,-2);});
  return {refs:ids.length,resolved:ids.filter(function(id){return s.indexOf('id="'+id+'"')>=0;}).length,frames:(s.match(/radial-frame/g)||[]).length,fillRef:/var\\(--surface-fill-color\\)/.test(s)};})()`;

/* ----------------------------------------------------------------- run -- */
const { srv, base } = await serve(ROOT);
const b = await launch();
const SP = `${base}/patterns/_preview/diagram-interactive-spine.html`, RP = `${base}/patterns/_preview/diagram-interactive-radial.html`;
const RN = `${base}/patterns/_preview/diagram-interactive-radial.neutral.html`, AF = `${base}/tests/radial-arrows-fixture.html`;
const errors = [];
try {
  for (const scheme of ['light', 'dark']) {
    const S = scheme[0].toUpperCase();
    /* ---- spine ---- */
    let p = await page(b, SP, scheme);
    const rows = await p.evaluate(SPINE_PAINT), bad = spineFailures(rows, scheme);
    check(`${S}S1`, `spine, ${scheme}: every node at 100% of its role (the root the neutral shape), its text in the role's ink and the ink map, its chip a hole`, rows.length > 0 && bad.length === 0, { nodes: rows.length, bad: bad.slice(0, 5) });
    check(`${S}S2`, `spine, ${scheme}: no frame at rest`, (await p.evaluate(SPINE_FRAMES)).length === 0);
    await p.evaluate(`document.querySelectorAll('#nodes .node')[6].dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await p.hover(await p.evaluate(SPINE_CENTER(1)));
    const f1 = await p.evaluate(SPINE_FRAMES);
    const related = await p.evaluate(SPINE_RELATED(1, 6));
    check(`${S}S3`, `spine, ${scheme}: node 6 selected, related node 1 hovered: 2px on 6, 1px on 1, no other frame`, related && JSON.stringify(f1) === JSON.stringify([[1, '1px'], [6, '2px']]), { related, frames: f1 });
    const erows = await p.evaluate(SPINE_PAINT), sbad = spineFailures(erows, scheme), semph = await p.evaluate(SPINE_EMPH);
    const sig = (r) => [r.fill, r.op, r.edge, r.sw, r.so, r.text, r.tag].join('|'), smoved = erows.filter((r, i) => sig(r) !== sig(rows[i])).map((r) => r.i);
    check(`${S}S6`, `spine, ${scheme}: selection and hover leave every fill, ink, hole and outline (color, width, strength) as at rest, the emphasized nodes undimmed and unfiltered`,
      sbad.length === 0 && smoved.length === 0 && semph.emphasized === 2 && semph.bad.length === 0, { bad: sbad.slice(0, 3), moved: smoved, emphasized: semph });
    const holes = await p.evaluate(SPINE_HOLES);
    check(`${S}S7`, `spine, ${scheme}: every hole on its box's center line, the backbone through each spine node's hole, every end of the selected node's edges on a hole`,
      holes.crossed >= 2 && holes.edgeEnds > 0 && holes.loose === 0 && holes.bad.length === 0, holes);
    await p.hover(await p.evaluate(SPINE_CENTER(6)));
    const f2 = await p.evaluate(SPINE_FRAMES);
    check(`${S}S4`, `spine, ${scheme}: the selected node hovered keeps its one 2px frame`, JSON.stringify(f2) === JSON.stringify([[6, '2px']]), f2);
    const gaps = [];
    for (const t of ['Zoom out', 'Zoom in']) { const clicks = await p.evaluate(SPINE_ZOOM_END(t)); gaps.push({ clicks, ...(await p.evaluate(SPINE_GAP)) }); }
    check(`${S}S5`, `spine, ${scheme}: the frame stands 4.75px beyond the box's painted edge at the zoom's least and greatest ends`,
      gaps.every(atFrameGap) && gaps[0].k < 1 && gaps[1].k > 2, gaps);
    const sdot = await p.evaluate(SPINE_DOT);
    check(`${S}S8`, `spine, ${scheme}: the inspector's dot takes its node's paint, the root's the neutral filled shape with its edge`,
      sdot.neutral && sdot.state && sdot.neutral.bg === NEUTRAL[scheme].fill && sdot.neutral.edge === NEUTRAL[scheme].edge
      && sdot.state.bg === sdot.state.role && sdot.state.edge === sdot.state.role, sdot);
    errors.push(...p.errors); await p.close();
    /* a hover with nothing locked previews the node at 1px; a real click locks it at 2px; with it locked, a
       dimmed node under the pointer shows in full, and dims again when the pointer leaves */
    p = await page(b, SP, scheme);
    await p.hover(await p.evaluate(SPINE_CENTER(6)));
    const pv = await p.evaluate(SPINE_FRAMES), pvn = await p.evaluate(SPINE_NODE(NODE(6)));
    const c6 = await p.evaluate(SPINE_CENTER(6));
    for (const type of ['mousePressed', 'mouseReleased']) await p.call('Input.dispatchMouseEvent', { type, x: c6.x, y: c6.y, button: 'left', clickCount: 1, pointerType: 'mouse' });
    await p.evaluate('new Promise((r) => setTimeout(r, 300))');
    const lk = await p.evaluate(SPINE_FRAMES);
    check(`${S}S9`, `spine, ${scheme}: a hover with nothing locked previews the node with a 1px frame; a real click locks it at 2px`,
      JSON.stringify(pv) === JSON.stringify([[6, '1px']]) && /\bis-preview\b/.test(pvn.cls) && JSON.stringify(lk) === JSON.stringify([[6, '2px']]), { preview: pv, node: pvn, locked: lk });
    const dimIdx = await p.evaluate(`[].indexOf.call(document.querySelectorAll('#nodes .node'),document.querySelector('#nodes .node.dim'))`);
    const dimRest = await p.evaluate(SPINE_NODE(NODE(dimIdx)));
    await p.hover(await p.evaluate(SPINE_CENTER(dimIdx)));
    const dimHover = await p.evaluate(SPINE_NODE(NODE(dimIdx)));
    await p.hover({ x: 20, y: 880 });
    const dimAfter = await p.evaluate(SPINE_NODE(NODE(dimIdx)));
    check(`${S}S10`, `spine, ${scheme}: with node 6 locked, a dimmed node under the pointer shows in full with its 1px frame, and dims again when the pointer leaves`,
      dimIdx >= 0 && dimRest.opacity === '0.18' && dimHover.opacity === '1' && dimHover.frame === '1px' && dimAfter.opacity === '0.18' && dimAfter.frame === null, { rest: dimRest, hover: dimHover, after: dimAfter });
    /* the exports read a settled resting view: with node 6 still locked and the pointer on the topmost node
       (its frame showing, beyond the content's edge), then with the pointer away, both exports are the same
       bytes, and no node is baked part-faded (a dimmed node's fade) */
    await p.evaluate(EXPORT_HOOK);
    const topIdx = await p.evaluate(`(function(){var gs=[].slice.call(document.querySelectorAll('#nodes .node')),t=gs.reduce(function(a,g){return g.getBoundingClientRect().top<a.getBoundingClientRect().top?g:a;});return gs.indexOf(t);})()`);
    await p.hover(await p.evaluate(SPINE_CENTER(topIdx)));
    const onTop = await p.evaluate(SPINE_FRAMES);
    const xa = { page: await p.evaluate(EXPORT_SVG('exportPng')), diagram: await p.evaluate(EXPORT_SVG('exportPngDiagram')) };
    await p.hover({ x: 5, y: 450 });
    const xb = { page: await p.evaluate(EXPORT_SVG('exportPng')), diagram: await p.evaluate(EXPORT_SVG('exportPngDiagram')) };
    const faded = (svg) => (String(svg).match(/(^|[;"\s])opacity:\s*0?\.\d*[1-9]/g) || []).length;
    check(`${S}S11`, `spine, ${scheme}: with a node locked, an export taken with the pointer on the topmost node (its frame showing) equals one taken with the pointer away, page and diagram, and bakes no node part-faded`,
      onTop.some((f) => f[0] === topIdx) && xa.page && xa.diagram && xa.page === xb.page && xa.diagram === xb.diagram && faded(xa.page) === 0 && faded(xa.diagram) === 0 && !/class="frame"|radial-frame/.test(xa.page + xa.diagram),
      { topIdx, framedWhenExported: onTop, samePage: xa.page === xb.page, sameDiagram: xa.diagram === xb.diagram, fadedPage: faded(xa.page), fadedDiagram: faded(xa.diagram), bytes: [String(xa.page).length, String(xa.diagram).length] });
    errors.push(...p.errors); await p.close();
    /* the negative control: without the fill paint's stylesheet, the paint check fails */
    p = await page(b, SP, scheme);
    await p.evaluate(`[].forEach.call(document.styleSheets,function(s){if(s.href&&/surface-treatments\\.css$/.test(s.href))s.disabled=true;})`);
    const nbad = spineFailures(await p.evaluate(SPINE_PAINT), scheme);
    check(`${S}N1`, `control, ${scheme}: with surface-treatments.css off, S1's paint check fails`, nbad.length > 0, { failures: nbad.length, first: nbad[0] });
    await p.close();

    /* ---- radial, the reference composition ---- */
    p = await page(b, RP, scheme);
    const paint = await p.evaluate(RADIAL_PAINT);
    check(`${S}R1`, `radial, ${scheme}: every state mark at 100% of its role, a state mark's chip a hole; every mark asserting no state at the 15% wash`, paint.filled > 0 && paint.wash > 0 && paint.bad.length === 0, { filled: paint.filled, wash: paint.wash, bad: paint.bad.slice(0, 5) });
    check(`${S}R2`, `radial, ${scheme}: no frame at rest`, (await p.evaluate(RADIAL_FRAMES)).length === 0);
    await p.evaluate(`(async function(){var M=window.RADIAL_MAP;M.select('CFW-C-001');var q=M.project('CFW-C-001');M.zoom(7,q.x,q.y);await new Promise(function(r){setTimeout(r,700);});})()`);
    await p.hover(await p.evaluate(`(function(){${GID}var r=gid('CFW-C-004').querySelector('.radial-mark').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`));
    const rf = await p.evaluate(RADIAL_FRAMES);
    const sel = rf.filter((f) => f[1] === 'selected'), hovNear = rf.filter((f) => f[0] === 'CFW-C-004'), otherNear = rf.filter((f) => f[1] === 'near' && f[0] !== 'CFW-C-004');
    check(`${S}R3`, `radial, ${scheme}: selected 2px at full strength; a hovered related node 1px at full; the other related 1px at half; nothing else framed`,
      sel.length === 1 && sel[0][2] === '2px' && sel[0][3] === '1' && hovNear.length === 1 && hovNear[0][2] === '1px' && hovNear[0][3] === '1'
      && otherNear.length > 0 && otherNear.every((f) => f[2] === '1px' && f[3] === '0.5') && rf.every((f) => f[1] !== 'other'), { selected: sel, hovered: hovNear, otherRelated: otherNear.length });
    const steady = await p.evaluate(RADIAL_PAINT), remph = await p.evaluate(RADIAL_EMPH);
    const moved = Object.keys(paint.sig).filter((id) => steady.sig[id] !== paint.sig[id]);
    check(`${S}R4`, `radial, ${scheme}: selection, relation and hover leave every mark's fill, wash and outline (color, width, strength) as at rest, the emphasized marks undimmed and unfiltered`,
      steady.bad.length === 0 && moved.length === 0 && remph.emphasized > 2 && remph.bad.length === 0, { bad: steady.bad.slice(0, 5), moved: moved.slice(0, 5), emphasized: remph });
    const gIn = await p.evaluate(RADIAL_GAP('CFW-C-001'));
    const heads = await p.evaluate(HEADS);
    check(`${S}R6`, `radial, ${scheme}: into a filled target, every arrowhead's tip stops outside its fill and outline, no part of the head lies on another filled mark and none is reported obscured; into a washed target, the relation keeps its full curve`,
      heads.paths === heads.relations && heads.solid > 0 && heads.wash > 0 && heads.tipInside.length === 0 && heads.tipOnOther.length === 0 && heads.headOnOther.length === 0 && heads.washShortened.length === 0 && heads.obscured === 0, heads);
    await p.evaluate(`document.querySelector('.radial-stage').focus()`);
    await p.key('ArrowRight', 39); await p.key('ArrowLeft', 37);
    const fz = await p.evaluate(FOCUS_CLEAR);
    await p.evaluate(`window.RADIAL_MAP.fit('explicit')`); await p.evaluate('new Promise((r) => setTimeout(r, 500))');
    const gFit = await p.evaluate(RADIAL_GAP('CFW-C-001'));
    await p.evaluate(`document.querySelector('.radial-stage').focus()`);
    await p.key('ArrowRight', 39); await p.key('ArrowLeft', 37);
    const ff = await p.evaluate(FOCUS_CLEAR);
    /* CFW-C-001's leaves and the leftmost, topmost and bottommost leaves, zoomed in to the identifier tier (k 2.30
       and over), and the first state-bearing triangle's cluster deep in (k 9 and over), where a triangle's frame
       reaches furthest past its mark: its miters, and its painted-edge offset grown with the zoom */
    const rays = await p.evaluate(RAY_LEAVES), tri = await p.evaluate(FIRST_TRIANGLE), names = {}, tierK = {};
    for (const [w, nid, f] of [['right', 'CFW-C-001', 12], ['left', rays.left, 12], ['up', rays.up, 12], ['down', rays.down, 12], ['triangle', tri, 30]]) {
      tierK[w] = await p.evaluate(ZOOM_ON(nid, f)); names[w] = await p.evaluate(OWN_NAMES); }
    check(`${S}R5`, `radial, ${scheme}: zoomed in to the identifier tier on CFW-C-001, the leftmost, topmost and bottommost leaves, and a triangle's cluster deep in, every leaf's own name and identifier line clear its frame`,
      Object.values(names).every((n) => n.names > 0 && n.ids > 0 && n.bad.length === 0) && names.right.filled > 0 && names.triangle.filled > 0 && Object.values(tierK).every((k) => k >= 2.3)
      && tierK.triangle >= 9 && rays.leftCos < -0.9 && rays.upSin < -0.9 && rays.downSin > 0.9, { rays, triangle: tri, tierK, names });
    /* a triangle, the largest reach, at the greatest zoom */
    await p.evaluate(`window.RADIAL_MAP.select('${tri}')`); await p.evaluate(`window.RADIAL_MAP.focus('${tri}')`);
    const kMax = await p.evaluate(ZOOM_ON(tri, 100));
    const gTri = await p.evaluate(RADIAL_GAP(tri)), gMax = await p.evaluate(RADIAL_GAP('CFW-C-001'));
    await p.evaluate(`document.querySelector('.radial-stage').focus()`);
    await p.key('ArrowRight', 39); await p.key('ArrowLeft', 37);
    const ft = await p.evaluate(FOCUS_CLEAR);
    check(`${S}R7`, `radial, ${scheme}: the frame stands 4.75px beyond its mark's painted edge zoomed in, at the Fit, and on a square and a triangle at the greatest zoom`,
      [gIn, gFit, gMax, gTri].every(atFrameGap) && gTri.shape === 'polygon:3' && kMax >= 14, { gIn, gFit, gMax, triangle: tri, gTri });
    check(`${S}R8`, `radial, ${scheme}: the keyboard focus ring, centered on its node, clears the selected round-joined frame by 3px, zoomed in, at the Fit, and on the triangle at the greatest zoom`,
      [fz, ff, ft].every((f) => f && f.clearPx >= 2.9 && f.frameLine === 2 && f.ringLine === 2 && f.join === 'round' && f.ringOff < 0.5) && fz.focus === 'CFW-C-001' && ft.focus === tri && ft.shape === 'polygon', [fz, ff, ft]);
    const dot = await p.evaluate(INSP_DOT);
    check(`${S}R12`, `radial, ${scheme}: the inspector's dot is the wash for a node asserting no state and the role solid for a state node`, inspDotOk(dot), dot);
    const plate = await p.evaluate(PLATE);
    check(`${S}R9`, `radial, ${scheme}: the page plate draws no frame and keeps the fill paint by reference`, plate.frames === 0 && plate.fillRef, plate);
    errors.push(...p.errors); await p.close();

    /* ---- radial: a hover with nothing locked previews at 1px; a real click locks at 2px; a dimmed mark under
       the pointer shows in full ---- */
    p = await page(b, RP, scheme);
    await p.evaluate(ZOOM_ON('CFW-C-001', 7));
    const cpt = await p.evaluate(`(function(){${GID}var r=gid('CFW-C-004').querySelector('.radial-mark').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    await p.hover(cpt);
    const rpv = await p.evaluate(RADIAL_FRAMES), rpvn = await p.evaluate(RADIAL_NODE('CFW-C-004'));
    for (const type of ['mousePressed', 'mouseReleased']) await p.call('Input.dispatchMouseEvent', { type, x: cpt.x, y: cpt.y, button: 'left', clickCount: 1, pointerType: 'mouse' });
    await p.evaluate('new Promise((r) => setTimeout(r, 300))');
    const rlk = await p.evaluate(RADIAL_FRAMES), rlocked = await p.evaluate(`window.RADIAL_MAP.state().selection.locked`);
    check(`${S}R13`, `radial, ${scheme}: a hover with nothing locked previews the mark with a 1px frame (its related marks at half strength); a real click locks it at 2px`,
      rpv.filter((f) => f[1] === 'selected').length === 1 && rpv.find((f) => f[0] === 'CFW-C-004' && f[1] === 'selected' && f[2] === '1px') && /\bis-preview\b/.test(rpvn.cls)
      && rpv.some((f) => f[1] === 'near') && rpv.every((f) => f[1] !== 'near' || (f[2] === '1px' && f[3] === '0.5'))
      && rlocked === 'CFW-C-004' && rlk.find((f) => f[0] === 'CFW-C-004' && f[2] === '2px') && !/\bis-preview\b/.test((await p.evaluate(RADIAL_NODE('CFW-C-004'))).cls),
      { preview: rpv.filter((f) => f[1] === 'selected'), related: rpv.filter((f) => f[1] === 'near').length, node: rpvn, locked: rlocked, lockedFrames: rlk.filter((f) => f[1] === 'selected') });
    const dm = await p.evaluate(REACHABLE_DIM);
    const rdRest = dm && await p.evaluate(RADIAL_NODE(dm.id));
    if (dm) await p.hover(dm);
    const rdHover = dm && await p.evaluate(RADIAL_NODE(dm.id));
    await p.hover({ x: 20, y: 880 });
    const rdAfter = dm && await p.evaluate(RADIAL_NODE(dm.id));
    check(`${S}R14`, `radial, ${scheme}: with a mark locked, a dimmed mark under the pointer shows in full with its 1px frame, and dims again when the pointer leaves`,
      !!dm && rdRest.opacity === '0.14' && rdHover.opacity === '1' && rdHover.frame === '1px' && rdAfter.opacity === '0.14' && rdAfter.frame === null, { mark: dm, rest: rdRest, hover: rdHover, after: rdAfter });
    errors.push(...p.errors); await p.close();

    /* ---- radial, the synthetic composition: state-bearing ring marks ---- */
    p = await page(b, RN, scheme);
    const np = await p.evaluate(RADIAL_PAINT), nh = await p.evaluate(RADIAL_HOLES);
    const nplate = await p.evaluate(PLATE);
    check(`${S}R10`, `synthetic radial, ${scheme}: its state-bearing rings are holed, and every mask the page plate references resolves`,
      nh.holes > 0 && np.bad.length === 0 && nplate.refs === nh.holes && nplate.resolved === nplate.refs && nplate.frames === 0, { holes: nh.holes, plate: nplate, bad: np.bad.slice(0, 3) });
    check(`${S}R11`, `synthetic radial, ${scheme}: every ring's hole has its chip's geometry, at the node's center, well inside the ring`, nh.holes > 0 && nh.bad.length === 0, nh);
    const nheads = await p.evaluate(HEADS);
    /* here a filled target's neighbor stands in one head's path. The accepted exception is that one observed
       case, no wider: VM-SE-213 > VM-LM-177 has 0.111 of its head, its base corner, under VM-LM-185, its tip
       clear. Any other head on another filled mark, or a larger share of this one, fails. */
    const EXCEPTION = 'VM-SE-213>VM-LM-177 on VM-LM-185';
    check(`${S}R15`, `synthetic radial, ${scheme}: into a filled target, every arrowhead's tip is clear of its target and of every other filled mark, no head is reported obscured, and no head lies on another filled mark except the one accepted base corner (${EXCEPTION}, at most 0.111)`,
      nheads.paths === nheads.relations && nheads.solid > 0 && nheads.tipInside.length === 0 && nheads.tipOnOther.length === 0 && nheads.obscured === 0
        && nheads.headOnOther.every(([k, f]) => k === EXCEPTION && f <= 0.111) && nheads.washShortened.length === 0, nheads);
    errors.push(...p.errors); await p.close();

    /* ---- radial, the arrow fixture: short relations, a filled triangle, overlapping filled marks ---- */
    p = await page(b, AF, scheme);
    const ar = await p.evaluate(ARROWS), row = (id) => ar.rows.find((x) => x.id === id) || {};
    const sh = row('short'), clear = (x) => x.tipOn && x.tipOn.length === 0 && x.circleMeetsTarget === 0 && !x.reported;
    /* the precondition makes the check fail rather than pass vacuously if the layout ever moves these
       neighbors apart: the circle target's stop (its radius + 2.5) is at least half their distance */
    check(`${S}R16`, `arrow fixture, ${scheme}: a directed relation between close neighbors into a filled mark is cut in its first half, and its tip clears every filled mark on every bearing`,
      sh.shape === 'circle' && (sh.r + 2.5) / sh.nl >= 0.5 && (sh.r + 2.5) / sh.nl < 1 && sh.endFromTarget > sh.nl / 2 && clear(sh), sh);
    /* every unreported head, whatever its target: the 76-unit triangle (its reach), the leaf-size triangle
       (its mitered corners), the pill (its rounded corners' reach) and the circles */
    const unrep = ar.rows.filter((x) => !x.reported), has = (f) => unrep.some(f);
    check(`${S}R17`, `arrow fixture, ${scheme}: every unreported head stops beyond its target's true painted reach, mitered corners included: the circle through the tip touches no painted point of the target, on a 76-unit triangle, a leaf-size triangle and a pill among them, and the tip is on no filled mark`,
      has((x) => x.shape === 'polygon' && x.r === 76) && has((x) => x.shape === 'polygon' && x.r < 10) && has((x) => x.shape === 'rect') && unrep.length === 5 && unrep.every(clear), unrep);
    /* reported exactly when no visible place exists: the tip lies on a filled mark, and only then */
    check(`${S}R18`, `arrow fixture, ${scheme}: report().obscuredHeads names exactly the relations whose head has no visible place (the source's center within the target's reach; the cut inside a filled source; the tip on a filled neighbor), and each it names has its tip on a filled mark`,
      ar.reported.join() === 'inside,neighbor,within' && ar.rows.length === 8 && ar.rows.every((x) => x.reported === x.tipOn.length > 0), ar);
    const ae = await p.evaluate(ARROW_EXPORT);
    check(`${S}R19`, `arrow fixture, ${scheme}: the exported diagram, opened as its own document with its own styles, draws the live relation paths, and in it each head's tip is on a filled mark exactly where the live drawing reports one`,
      ae.ok && ae.live === 8 && ae.same && ae.rows.length === 8 && ae.rows.every((x) => x.reported === x.tipOn.length > 0), ae);
    errors.push(...p.errors); await p.close();
  }
  check('P1', 'the pages raised no exception', errors.length === 0, errors.slice(0, 3));
} catch (e) {
  check('RUN', 'the harness completed', false, String(e && e.stack || e));
} finally {
  srv.close();
  await stop(b);
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ chrome: chromePath(), results }, null, 1) + '\n');
console.log(`\n${results.length - failed.length}/${results.length} checks passed${KEEP ? '; results in ' + OUT : ''}`);
if (!KEEP) fs.rmSync(OUT, { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
