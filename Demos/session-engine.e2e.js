// End-to-end check for Demos/session-engine.html — the MVP loop, driven through
// the real UI.
//
// HOW TO RUN: serve the repo (`python3 -m http.server 8000`), open
// http://localhost:8000/Demos/session-engine.html, and in the console:
//
//     const s = document.createElement('script');
//     s.src = '/Demos/session-engine.e2e.js';
//     document.head.appendChild(s);
//     s.onload = async () => { __setup(); console.table((await __scenario()).steps); };
//
// The model is STUBBED here so a run is deterministic — but the stub builds
// from the region rects it is handed rather than inventing a layout, so a
// broken layout contract fails the run instead of quietly passing.
//
// This is not part of `npm test`: it exercises the browser surface (canvas,
// iframes, pointer events), which the headless core suite deliberately does
// not model. The engine's own guarantees are tested in metamedium-core.

window.__helpers = function(){
  const c = document.getElementById('canvas');
  function ev(el,type,x,y){ el.dispatchEvent(new PointerEvent(type,{pointerId:1,isPrimary:true,bubbles:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1})); }
  function strokeOn(el,pts){ ev(el,'pointerdown',pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++) ev(el,'pointermove',pts[i].x,pts[i].y); ev(el,'pointerup',pts[pts.length-1].x,pts[pts.length-1].y); }
  function stroke(pts){ strokeOn(c,pts); }
  function line(a,b,n){ n=n||40; const p=[]; for(let i=0;i<n;i++){const t=i/(n-1); p.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});} return p; }
  function rect(x,y,w,h){ const v=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]; const mid={x:(v[0].x+v[1].x)/2,y:(v[0].y+v[1].y)/2}; const path=[mid,v[1],v[2],v[3],v[0],mid]; let p=[]; for(let i=0;i<path.length-1;i++) p=p.concat(line(path[i],path[i+1],26).slice(i?1:0)); return p; }
  function circle(cx,cy,r,n){ n=n||110; const p=[]; for(let i=0;i<=n;i++){const a=i/n*Math.PI*2; p.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});} return p; }
  function caret(x,y,w,h){ w=w||60;h=h||40; return line({x,y:y+h},{x:x+w/2,y},30).concat(line({x:x+w/2,y},{x:x+w,y:y+h},30).slice(1)); }
  function check(x,y,k){ k=k||1; return line({x,y},{x:x+25*k,y:y+35*k},30).concat(line({x:x+25*k,y:y+35*k},{x:x+70*k,y:y-15*k},30).slice(1)); }
  function scratch(x,y,w,h,passes){ passes=passes||3; let p=[]; for(let i=0;i<passes;i++){const yi=y+(passes===1?0:h*i/(passes-1)); const a={x:i%2?x+w:x,y:yi},b={x:i%2?x:x+w,y:yi}; if(i)p.push({x:a.x,y:p[p.length-1].y}); p=p.concat(line(a,b,10).slice(i?1:0));} return p; }
  function summary(){ const st=window.__mm.session.getState(); return {loose:st.contentIds.length-st.artifacts.length, artifacts:st.artifacts.length, live:st.live.length, pending:st.pendingLassoId, summon: st.summon?{enclosed:st.summon.enclosedIds.length,onArtifact:st.summon.onArtifact||null}:null, mark: st.commandMark?st.commandMark.name:null, status: document.getElementById('status').textContent}; }
  function chips(){ return [...document.querySelectorAll('#summon .item')].map(b=>b.querySelector('span').textContent.trim()); }
  window.__t = {stroke,strokeOn,line,rect,circle,caret,check,scratch,summary,chips};

  // Teach the caret as the command mark, through the real pad UI.
  window.__teach = function(){
    document.getElementById('teachBtn').click();
    document.getElementById('teachClear').click(); // a held mark pre-fills the pad
    const pad=document.getElementById('teachPad'); const r=pad.getBoundingClientRect();
    [[60,40],[66,44],[54,38],[62,46],[58,36]].forEach(([w,h],i)=>{
      const x=r.left+40+i*3, y=r.top+35;
      strokeOn(pad, line({x,y:y+h},{x:x+w/2,y},30).concat(line({x:x+w/2,y},{x:x+w,y:y+h},30).slice(1)));
    });
    const before=document.getElementById('teachStatus').textContent;
    document.getElementById('teachUse').click();
    document.getElementById('teachClose').click();
    const m=window.__mm.session.getState().commandMark;
    return {dots:document.querySelectorAll('#teachDots i.on').length, statusBefore:before,
            mark: m?{name:m.name, consistency:+m.consistency.toFixed(2), closed:m.isClosed, samples:m.sampleCount}:null,
            chip:!document.getElementById('markChip').hidden,
            statusAfter:document.getElementById('teachStatus').textContent};
  };
  return 'helpers ready';
};

/** Helpers plus a stubbed model, for a deterministic run. */
window.__setup = function(){
  window.__helpers();
  // A mark held on this device from an earlier run would make step 0 — "the
  // built-in check summons with nothing taught" — untrue before we begin.
  if (window.__mm.savedMark()) window.__mm.forgetMark();
  const strokeOn = window.__t.strokeOn, line = window.__t.line;

  window.__calls=[];
  // The stub answers the FILL contract: per-region content, no layout. It
  // derives the region ids from the prompt it was handed rather than hardcoding
  // them, so a broken layout description fails the run instead of passing.
  window.fetch = async function(url, init){
    const body=JSON.parse(init.body);
    const sys=body.messages.find(m=>m.role==='system').content;
    const usr=body.messages.find(m=>m.role==='user').content;
    window.__calls.push({system:sys.slice(0,60), user:usr});
    const reply = (o) => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(o)}}]}),
      {status:200, headers:{'content-type':'application/json'}});

    if(/changing part of a page/.test(sys)){
      const hit=(usr.match(/THE MARK LANDS ON: ([^.]+)\./)||[])[1]||'';
      const ids=hit.split(',').map(x=>x.trim()).filter(Boolean);
      window.__lastRevise={hit:ids};
      const regions={};
      ids.forEach(id=>{ regions[id]={tag:'section', style:'background:#7d2b8c;color:#fff', html:'<h2>revised '+id+'</h2>'}; });
      return reply({regions});
    }
    if(/THE LAYOUT IS ALREADY DECIDED/.test(sys)){
      const list=(usr.match(/REGIONS TO FILL: (.+)/)||[])[1]||'';
      const ids=list.split(',').map(x=>x.trim()).filter(Boolean);
      const pal=['#1b3a4b','#c9a84c','#8a3324','#2f5d50'];
      const regions={};
      ids.forEach((id,i)=>{ regions[id]={tag:i===0?'header':'section', style:'background:'+pal[i%pal.length]+';color:#fff;display:flex;align-items:center;justify-content:center', html:'<h2>Section '+id+'</h2>'}; });
      return reply({theme:{background:'#fbfaf7', color:'#16161a'}, regions});
    }
    if(/answering a question/.test(sys)){
      return new Response(JSON.stringify({choices:[{message:{content:'The three rectangles share edges only through the region frame you drew; nothing else relates them.'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({choices:[{message:{content:'[{"label":"page-layout","confidence":0.78,"reasoning":"three rectangles in a header/two-column arrangement"}]'}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  window.__mm.agents.splice(0); // a remembered model may have rejoined at boot
  const a=window.__mm.MM.createAgentParticipant(window.__mm.session, Object.assign({},window.__mm.MM.PRESETS.ollama,{model:'stub-qwen'}), Date.now());
  window.__mm.agents.push(a);

  return 'ready · ' + a.name;
};

// ===========================================================================
// The MVP loop, end to end (MVP.md §2), driven through the real UI: synthetic
// pointer events into the canvas, real button clicks, real Enter keys. The
// model is stubbed above so the run is deterministic — but the stub BUILDS FROM
// the region rects it is handed, so a broken layout contract fails the run.
// ===========================================================================
window.__scenario = async function(){
  const t = window.__t, mm = window.__mm, MM = mm.MM;
  const R = { steps: [], pass: true };
  const step = (name, ok, detail) => { R.steps.push({name, ok: !!ok, detail}); if(!ok) R.pass=false; return ok; };
  const wait = (ms) => new Promise(r=>setTimeout(r, ms||250));

  // ---- 0. The built-in mark works before anything is taught ----
  // A default gesture that only works after you configure it is not a default.
  {
    t.stroke(t.rect(200, 180, 200, 140));
    t.stroke(t.circle(300, 250, 190));
    t.stroke(t.check(470, 210, 1));
    const summoned = window.__mm.session.getState().summon !== null;
    // Exactly as many undos as strokes. One more would drop the model's `join`
    // event and quietly un-register it for the rest of the run.
    for (let i = 0; i < 3; i++) window.__mm.session.undo();
    step('0. the built-in check summons with nothing taught', summoned,
      { mark: window.__mm.session.getState().commandMark });
    step('0b. the model is still a registered participant after undo',
      window.__mm.session.getState().participants.includes(window.__mm.agents[0].id));
  }

  // ---- 1. Teach the command mark ----
  const taught = window.__teach();
  step('1. five samples become a command mark',
    taught.mark && taught.mark.samples === 5 && taught.mark.closed === false,
    taught.mark);
  step('1b. the rail shows the mark that is actually active',
    document.getElementById('markName').textContent === 'your mark',
    { chip: document.getElementById('markName').textContent });
  const held = mm.savedMark();
  step('1c. the taught mark is held on this device, with the five it learned from',
    !!held && !!held.mark && Array.isArray(held.samples) && held.samples.length === 5,
    { held: !!held, samples: held && held.samples && held.samples.length });

  // ---- 2. Doodle three boxes, zoom out ----
  t.stroke(t.rect(200,180,260,150));
  t.stroke(t.rect(520,180,260,150));
  t.stroke(t.rect(200,380,580,120));
  for(let i=0;i<4;i++) document.getElementById('zoomOut').click();
  step('2. three boxes drawn, zoomed out to see them all',
    t.summary().loose === 3 && mm.view.zoom < 0.5,
    {loose: t.summary().loose, zoom:+mm.view.zoom.toFixed(2)});
  {
    // The snap offer: confident shapes are offered clean, never writing, and
    // never the held lasso. Nothing is redrawn until the offer is taken up.
    const offers = mm.snapOffers();
    step('2b. the three boxes read clean and are offered as rectangles', offers.size === 3 && [...offers.values()].every(o => o.shape === 'rectangle'),
      {offers: [...offers.values()].map(o => o.shape + ' ' + o.weight.toFixed(2)), rail: document.getElementById('snapBtn').textContent, hidden: document.getElementById('snapBtn').hidden});
  }

  // ---- 3. Lasso the whole set at low zoom ----
  const c = mm.worldToScreen(490, 340);
  t.stroke(t.circle(c.x, c.y, 330*mm.view.zoom));
  step('3. lasso held at 0.4x — world coords keep the grammar intact',
    t.summary().pending !== null, {pending: t.summary().pending});

  // ---- 4. The built-in check no longer summons ----
  const ck = mm.worldToScreen(900, 320);
  t.stroke(t.check(ck.x, ck.y, 1));
  const checkIgnored = t.summary().summon === null;
  mm.session.undo();
  step('4. the built-in check is ignored once a mark is taught', checkIgnored);

  // ---- 5. The taught mark, drawn ACROSS the lasso ----
  const edge = mm.worldToScreen(490+330, 340);
  t.stroke(t.caret(edge.x - 60, edge.y - 40, 120, 78));
  const sum = t.summary().summon;
  step('5. crossing with the taught mark summons', sum && sum.enclosed === 3,
    {enclosed: sum && sum.enclosed, chips: t.chips()});
  step('5b. the offer includes a freeform prompt', t.chips().some(x=>x.startsWith('Describe it')), t.chips());
  {
    const st0 = mm.session.getState();
    step('5c. a held lasso is never offered for snapping — it is a gesture in waiting', ![...mm.snapOffers().keys()].some(id => st0.summon && st0.summon.gestureIds.includes(id)));
    // Drawing them clean is a Tier 0 offer in the palette, and the summon survives it.
    const chip = [...document.querySelectorAll('#summon .item')].find(b => /Draw them clean/.test(b.textContent));
    step('5d. the palette offers to draw them clean, needing no model', !!chip && /·now/.test(chip.textContent), t.chips());
    if (chip) chip.click();
    await wait(150);
    const st = mm.session.getState();
    const cleaned = st.summon ? st.summon.enclosedIds.filter(id => MM.cleanOf(st.nodes.get(id))).length : -1;
    step('5e. they are drawn clean, the ink is kept, and the summon stays open', cleaned === 3 && !!st.summon &&
      st.summon.enclosedIds.every(id => MM.strokePointsOf(st.nodes.get(id)).length > 4),
      {cleaned, summonOpen: !!st.summon, offersNow: mm.snapOffers().size});
    step('5f. the offer is not made twice', !t.chips().some(x => /clean/.test(x)), t.chips());
  }

  // ---- 6. Prompt it into living code ----
  const make = [...document.querySelectorAll('#summon .item')].find(b=>b.textContent.trim().startsWith('Describe it'));
  make.click();
  const input = document.querySelector('#summon input.make');
  input.value = 'website with the copy in the squares';
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await wait(350);

  const st1 = mm.session.getState();
  const artId = st1.artifacts[0];
  step('6. the artifact is live', st1.live.length === 1 && st1.live[0] === artId,
    {live: st1.live, status: document.getElementById('mpStatus').textContent});
  {
    const build = window.__calls.find(c => /REGIONS TO FILL/.test(c.user));
    step('6b. the model was briefed on what each region plays and how they sit, in region ids',
      !!build && /WHAT EACH REGION PLAYS:/.test(build.user) && /HOW THEY SIT:/.test(build.user) && /r1: node/.test(build.user) && !/\bn\d+\b/.test(build.user),
      build ? build.user.split('\n').filter(l => /PLAYS|SIT|r1/.test(l)).slice(0, 6) : 'no build call');
  }

  // ---- 7. The rendered page matches the drawing ----
  // Not "did the model position things correctly" — it is not asked to. The
  // check is that what renders lines up with the ink, which is measured off the
  // live DOM rather than off the markup.
  const wrap = document.querySelector('.artifactFrame');
  const doc = wrap && wrap.querySelector('iframe').contentDocument;
  const regions = artId ? mm.session.regions(artId) : [];
  if (!doc) {
    step('7. the rendered page lines up with the ink', false,
      { reason: 'no artifact frame rendered', live: st1.live, artifacts: st1.artifacts });
    return R;
  }
  await wait(150); // let the iframe lay out
  // An element's rect INSIDE the iframe is already in the artifact's own
  // coordinate space — the iframe element is what the canvas transform scales,
  // not its contents. So this compares like with like, with no zoom to divide
  // out and no frame offset to subtract.
  const drift = regions.map((r) => {
    const el = doc.querySelector('[data-region="' + r.id + '"]');
    if (!el) return { id: r.id, missing: true, dx: Infinity, dy: Infinity, dw: Infinity, dh: Infinity };
    const b = el.getBoundingClientRect();
    return {
      id: r.id,
      dx: Math.abs(b.left - r.rect.x),
      dy: Math.abs(b.top - r.rect.y),
      dw: Math.abs(b.width - r.rect.w),
      dh: Math.abs(b.height - r.rect.h),
    };
  });
  const worst = Math.max(...drift.map((d) => Math.max(d.dx, d.dy, d.dw || 0, d.dh || 0)));
  step('7. every drawn box lines up with its rendered element (within 2px)',
    regions.length === 3 && worst < 2,
    { worstDriftPx: Math.round(worst * 100) / 100, drift: drift.map(d => d.id + ':' + Math.round(Math.max(d.dx,d.dy)*10)/10) });

  const codeNow = String(mm.session.getState().nodes.get(artId).reps.filter(r=>r.modality==='code').pop().data.code);
  step('7b. the page is laid out with flex, not pinned to pixels',
    /display:flex/.test(codeNow) && !/position:absolute/.test(codeNow));

  // ---- 8. Ink ON the running page addresses what is under it ----
  mm.fitAll();
  await wait(60);
  const inner = mm.worldToScreen(330, 255);       // inside the top-left region
  t.stroke(t.circle(inner.x, inner.y, 55*mm.view.zoom));
  const overLive = t.summary().pending !== null;
  step('8. a loop on the live page is a lasso, though it encloses no mark', overLive);

  // Sized in WORLD units like the lasso (55 world radius): a mark wider than
  // 60% of what it marks is refused, and that must not depend on the zoom
  // fitAll happened to pick for this viewport.
  const e2 = mm.worldToScreen(385, 250);
  const zz = mm.view.zoom;
  t.stroke(t.caret(e2.x - 28 * zz, e2.y - 20 * zz, 58 * zz, 38 * zz));
  const sum2 = mm.session.getState().summon;
  const addressed = sum2 && sum2.onArtifact;
  step('9. the summon resolves the ink to a REGION of the running artifact',
    !!addressed && addressed.artifactId === artId && addressed.regionIds.length >= 1,
    addressed);
  step('9b. the offer on a live page is a change, not a build',
    t.chips().some(x=>x.startsWith('Change it')), t.chips());

  // ---- 10. Revise only what the ink covers ----
  // Ask the summon which region the ink actually landed on rather than assuming
  // an id: region ids follow reading order, so hardcoding one bakes in a layout.
  // Everything that fed the addressing, so a wrong pick is explainable.
  const lassoB = mm.MM.boundsOf(mm.session.getState().nodes.get(sum2.gestureIds[0]));
  const domHits = mm.regionsUnderInk(artId, lassoB);
  const addressedAll = [...new Set(sum2.onArtifact.regionIds.concat(domHits))];
  const hitId = sum2.onArtifact.regionIds[0];
  const otherId = regions.map((r) => r.id).find((x) => !addressedAll.includes(x));
  step('9c. the ink addresses exactly one region, by geometry and by DOM alike',
    addressedAll.length === 1,
    { geometric: sum2.onArtifact.regionIds, dom: domHits, lasso: [lassoB.minX, lassoB.minY, lassoB.maxX, lassoB.maxY].map(Math.round),
      regions: regions.map((r) => r.id + ':' + [r.world.x, r.world.y, r.world.w, r.world.h].map(Math.round).join(',')), zoom: +mm.view.zoom.toFixed(2) });
  const textOf = (d, id) => { const el = id && d && d.querySelector('[data-region="' + id + '"]'); return el ? el.textContent : null; };
  const beforeAddressed = textOf(doc, hitId);
  const beforeOther = textOf(doc, otherId);
  const chg = [...document.querySelectorAll('#summon .item')].find(b=>b.textContent.trim().startsWith('Change it'));
  chg.click();
  const inp2 = document.querySelector('#summon input.make');
  inp2.value = 'make this one purple';
  inp2.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await wait(500);

  const doc2 = document.querySelector('.artifactFrame iframe').contentDocument;
  const q = (id) => { const e = doc2.querySelector('[data-region="' + id + '"]'); return e && e.textContent; };
  step('10. the addressed region changed', beforeAddressed !== q(hitId),
    {region: hitId, before: beforeAddressed, after: q(hitId)});
  step('10b. the region the ink did NOT cover is untouched', beforeOther === q(otherId),
    {region: otherId, before: beforeOther, after: q(otherId)});

  const codes = mm.session.getState().nodes.get(artId).reps.filter(r=>r.modality==='code');
  step('10c. both versions are held — generation is a proposal', codes.length === 2, {versions: codes.length});

  // ---- 10d. A flowchart compiles as a diagram, not a page ----
  // Boxes joined by an arrow have the genre `graph`: nodes keep their drawn
  // positions and the arrow becomes an SVG edge that follows the ink.
  mm.fitAll(); await wait(60);
  const fx = 1400, fy = 900; // world coords well clear of the page above
  const gA = t.stroke, W = (x, y) => mm.worldToScreen(x, y);
  const pA = W(fx, fy), pB = W(fx + 360, fy);
  const z = mm.view.zoom;
  gA(t.rect(pA.x, pA.y, 150 * z, 90 * z));
  gA(t.rect(pB.x, pB.y, 150 * z, 90 * z));
  // An arrow: shaft, then one wing back at the tip.
  const tail = W(fx + 158, fy + 45), tip = W(fx + 352, fy + 45), wing = W(fx + 326, fy + 28);
  gA(t.line(tail, tip, 40).concat(t.line(tip, wing, 20).slice(1)));
  const gc = W(fx + 255, fy + 45);
  gA(t.circle(gc.x, gc.y, 320 * z));
  // The mark that is ACTIVE by now is the caret taught in step 1 — a check
  // would be (correctly) refused. Drawn across the lasso's right edge.
  const ge = W(fx + 255 + 320, fy + 45);
  gA(t.caret(ge.x - 60, ge.y - 40, 120, 78));
  const sum3 = mm.session.getState().summon;
  const reading3 = sum3 ? mm.session.read(sum3.enclosedIds) : null;
  step('10d. two boxes and an arrow read as node, node, edge — genre graph',
    !!reading3 && reading3.genre.genre === 'graph' &&
    reading3.roles.filter((r) => r.role === 'edge' && r.direction).length === 1,
    reading3 && { genre: reading3.genre.genre, roles: reading3.roles.map((r) => r.role) });

  const describeBtn = [...document.querySelectorAll('#summon button')].find((b) => /Describe it/.test(b.textContent));
  if (!describeBtn) {
    step('10e. it compiled as a diagram', false, {
      reason: 'no palette to build from', summon: !!sum3, miss: mm.session.getState().markMiss,
      buttons: [...document.querySelectorAll('#summon button')].map((b) => b.textContent.trim()),
    });
    return R;
  }
  describeBtn.click();
  const inp3 = document.querySelector('#summon input.make');
  inp3.value = 'a two-step process';
  inp3.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await wait(500);
  const flowId = mm.session.getState().artifacts.find((a) => mm.session.getState().live.includes(a) && a !== artId);
  const flowCode = flowId && String(mm.session.getState().nodes.get(flowId).reps.filter((r) => r.modality === 'code').pop().data.code);
  step('10e. it compiled as a diagram: positioned nodes and an SVG edge following the ink',
    // No flex-direction: that is the LAYOUT scaffold's signature. (The model's
    // own inner styles may well use flex — that is content, not structure.)
    !!flowCode && /<svg class="mm-edges"/.test(flowCode) && /marker-end/.test(flowCode) &&
    /position:absolute/.test(flowCode) && !/flex-direction/.test(flowCode),
    { live: mm.session.getState().live.length, hasSvg: !!flowCode && /<svg/.test(flowCode) });

  // ---- 11. Scratch-out erase ----
  mm.fitAll(); await wait(60);
  const stBefore = mm.session.getState().contentIds.length;
  const artsBefore = mm.session.getState().artifacts.length; // the page and the flowchart
  const a = mm.worldToScreen(150, 250), b = mm.worldToScreen(500, 300);
  t.stroke(t.scratch(a.x, a.y, b.x-a.x, b.y-a.y, 3));
  const stAfter = mm.session.getState();
  const said = document.getElementById('status').textContent;
  step('11. scratching across the page rubs out the marks it crossed',
    stAfter.artifacts.length === artsBefore - 1,
    {before: stBefore, after: stAfter.contentIds.length, artifacts: stAfter.artifacts.length, status: said});
  step('11a. and says so — a silent erase is indistinguishable from a bug',
    /erased \d+ mark/.test(said), {status: said});

  mm.session.undo();
  step('11b. and undo brings them back', mm.session.getState().artifacts.length === artsBefore,
    {artifacts: mm.session.getState().artifacts.length});

  // ---- 12b. The canvas on its own: no lasso, no model ----
  // The mark reads BACK over what was just drawn, the palette offers what the
  // marks could become, and the Tier 0 conversions need nothing attached.
  while (mm.session.getEvents().length) mm.session.undo();
  mm.fitAll(); await wait(60);
  {
    t.stroke(t.rect(200, 220, 180, 140));
    t.stroke(t.rect(430, 250, 210, 110));
    t.stroke(t.rect(700, 200, 150, 170));
    t.stroke(t.check(470, 270, 1));                  // no circle first
    const sum = mm.session.getState().summon;
    step('12b. the mark reads back over what was just drawn',
      !!sum && sum.enclosedIds.length === 3 && sum.scopeSource === 'recent',
      sum && { n: sum.enclosedIds.length, source: sum.scopeSource, why: sum.scopeReasoning });

    const concepts = mm.session.read(sum.enclosedIds).concepts;
    step('12c. Tier 0 reads three wonky peers as a row',
      concepts.some(c => c.concept === 'row'),
      concepts.map(c => c.concept + ' ' + c.confidence.toFixed(2)));

    const items = [...document.querySelectorAll('#summon .item')].map(b => b.textContent);
    step('12d. the palette leads with what needs no model',
      /·now/.test(items[0] || ''), { first: (items[0] || '').trim() });

    const ids = sum.enclosedIds.slice();
    const cy = () => ids.map(id => {
      const b = mm.MM.boundsOf(mm.session.getState().nodes.get(id));
      return (b.minY + b.maxY) / 2;
    });
    const before = cy();
    const filter = document.querySelector('#summon input.filter');
    filter.value = 'line up';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const after = cy();
    const spread = xs => Math.max(...xs) - Math.min(...xs);
    step('12e. tidy lines them up, with no model attached',
      spread(before) > 10 && spread(after) < 1,
      { spreadBefore: Math.round(spread(before)), spreadAfter: Math.round(spread(after)) });

    mm.session.undo();
    step('12f. and undo springs them back — the ink was never overwritten',
      Math.abs(spread(cy()) - spread(before)) < 1,
      { spreadNow: Math.round(spread(cy())) });
  }

  // ---- 11c. Forgetting the mark goes back to the check, on the device too ----
  mm.forgetMark();
  step('11c. Forget clears the held mark and the check is back',
    mm.session.getState().commandMark === null && mm.savedMark() === null &&
    document.getElementById('markName').textContent === 'check',
    { mark: mm.session.getState().commandMark, saved: mm.savedMark(), chip: document.getElementById('markName').textContent });

  // ---- 12. Undoing the teach puts the built-in mark back in the rail ----
  window.__teach();
  while (mm.session.getEvents().length) mm.session.undo();
  step('12. the rail follows the grammar — undoing the teach restores the check',
    mm.session.getState().commandMark === null &&
    document.getElementById('markName').textContent === 'check',
    { mark: mm.session.getState().commandMark, chip: document.getElementById('markName').textContent });

  return R;
};
