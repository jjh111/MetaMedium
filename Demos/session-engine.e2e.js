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
  // A word, as one cursive stroke: low, wide, open, turning many times — what the shape rung reads as `text`.
  function word(x,y,w,h,humps){ humps=humps||7; const p=[]; const n=humps*14; for(let i=0;i<=n;i++){ const t=i/n; const a=t*humps*Math.PI; p.push({x:x+w*t, y:y+h/2-(h/2)*Math.abs(Math.sin(a))*(0.7+0.3*Math.cos(a*0.37))}); } return p; }
  function scratch(x,y,w,h,passes){ passes=passes||3; let p=[]; for(let i=0;i<passes;i++){const yi=y+(passes===1?0:h*i/(passes-1)); const a={x:i%2?x+w:x,y:yi},b={x:i%2?x:x+w,y:yi}; if(i)p.push({x:a.x,y:p[p.length-1].y}); p=p.concat(line(a,b,10).slice(i?1:0));} return p; }
  function summary(){ const st=window.__mm.session.getState(); return {loose:st.contentIds.length-st.artifacts.length, artifacts:st.artifacts.length, live:st.live.length, pending:st.pendingLassoId, summon: st.summon?{enclosed:st.summon.enclosedIds.length,onArtifact:st.summon.onArtifact||null}:null, mark: st.commandMark?st.commandMark.name:null, status: document.getElementById('status').textContent}; }
  function chips(){ return [...document.querySelectorAll('#summon .item')].map(b=>b.querySelector('span').textContent.trim()); }
  // Take a loop up the way a hand does: the active command mark drawn across its right edge.
  function takeLoop(cx, cy, r){ const taught = !!window.__mm.session.getState().commandMark; stroke(taught ? caret(cx + r - 30, cy - 20) : check(cx + r - 35, cy - 8)); }
  window.__t = {stroke,strokeOn,line,rect,circle,caret,check,scratch,word,summary,chips,takeLoop};

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
  window.__snapModeBefore = window.__mm.snapMode();
  window.__mm.setSnapMode('offer');
  // Learned palette use is device state; a run starts from none and puts it back.
  try { window.__usesBefore = localStorage.getItem('mm-palette-uses'); } catch (e) {}
  window.__mm.resetUses();
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
    if(/asked to ADD MARKS/.test(sys)){
      // Place a footer under the span the human pointed at — derived from the
      // prompt, so a broken brief fails the run.
      const m = usr.match(/span x (-?\d+)–(-?\d+), y (-?\d+)–(-?\d+)/);
      window.__lastDraw = { span: m && m.slice(1).map(Number) };
      if(!m) return reply([]);
      const [x0,x1,y0,y1] = m.slice(1).map(Number);
      return reply([{shape:'rectangle', x:x0, y:y1+30, w:x1-x0, h:60, why:'a footer under both'}]);
    }
    if(/reading handwriting/.test(sys)){
      const parts = body.messages.find(m=>m.role==='user').content;
      const img = Array.isArray(parts) && parts.find(p=>p.type==='image_url');
      window.__lastRead = { hasImage: !!img && /^data:image\/png;base64,/.test(img.image_url.url) };
      return reply([{text:'Pricing',confidence:0.92},{text:'Prizing',confidence:0.31}]);
    }
    if(/answering a question/.test(sys)){
      return new Response(JSON.stringify({choices:[{message:{content:'The three rectangles share edges only through the region frame you drew; nothing else relates them.'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({choices:[{message:{content:'[{"label":"page-layout","confidence":0.78,"reasoning":"three rectangles in a header/two-column arrangement"}]'}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  window.__mm.agents.splice(0); // a remembered model may have rejoined at boot
  const a=window.__mm.MM.createAgentParticipant(window.__mm.session, Object.assign({},window.__mm.MM.PRESETS.ollama,{model:'stub-qwen', vision:true}), Date.now());
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
  // The mark must be sized for what it marks: drawn relative to the lasso's
  // radius on screen, so the run does not depend on the pane's width.
  const edge = mm.worldToScreen(490+330, 340);
  const k5 = (330 * mm.view.zoom) / 132;
  t.stroke(t.caret(edge.x - 60*k5, edge.y - 40*k5, 120*k5, 78*k5));
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
  const kg = (320 * z) / 132;
  gA(t.caret(ge.x - 60*kg, ge.y - 40*kg, 120*kg, 78*kg));
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

  // ---- 13. Handwriting (v7 Stage E): write a word next to a shape; it becomes that shape's name ----
  {
    mm.setView(1, 260 - 1300, 200 - 1500); await wait(30); // world (1300,1500) at screen (260,200), zoom 1
    const z = mm.view.zoom;
    const base = mm.worldToScreen(1300, 1500); // clear of the flowchart and the page
    t.stroke(t.rect(base.x, base.y, 300*z, 180*z));                       // a box
    t.stroke(t.word(base.x + 40*z, base.y + 60*z, 200*z, 40*z, 7));        // a word inside it
    await wait(300);                                                        // the read is asynchronous
    const stW = mm.session.getState();
    const wordId = stW.contentIds[stW.contentIds.length - 1];
    const wordNode = stW.nodes.get(wordId);
    const shape = MM.interpretationsOf(wordNode, stW.nodes).filter(r=>r.tier===0)[0];
    step('13. one cursive stroke reads as writing', !!shape && shape.label === 'text', shape && (shape.label + ' ' + shape.weight.toFixed(2)));
    step('13a. it was handed to the model that can see, as an image', !!window.__lastRead && window.__lastRead.hasImage, window.__lastRead);
    const said = MM.transcriptsOf(wordNode);
    step('13b. every transcript is held on the mark, attributed and ranked', said.length === 2 && said[0].text === 'Pricing' && said[0].source === mm.agents[0].id,
      said.map(x => x.text + ' ' + x.confidence));
    // Lasso both, cross with the mark: the word becomes the offer to name with.
    const c2 = mm.worldToScreen(1450, 1590);
    t.stroke(t.circle(c2.x, c2.y, 230*z));
    const e2 = mm.worldToScreen(1450+230, 1590);
    const k2 = (230 * z) / 132;
    t.stroke(t.caret(e2.x - 60*k2, e2.y - 40*k2, 120*k2, 78*k2));
    const chipsW = t.chips();
    step('13c. the palette leads with the word, as a name, needing no model', chipsW[0] === 'Name it “Pricing”', chipsW);
    const nameChip = [...document.querySelectorAll('#summon .item')].find(b => /Name it/.test(b.textContent));
    if (nameChip) nameChip.click();
    const stN = mm.session.getState();
    const named = stN.artifacts.map(id => MM.wordOf(stN.nodes.get(id)));
    step('13d. the word next to the shape is now the shape\'s name — the ship criterion', named.includes('Pricing'), named);
  }

  // ---- 14. The model holds a pen: it adds marks in the shape rung's vocabulary, in its own name ----
  {
    mm.fitAll(); await wait(60);
    const z = mm.view.zoom;
    const p1 = mm.worldToScreen(1300, 2100), p2 = mm.worldToScreen(1560, 2100);
    t.stroke(t.rect(p1.x, p1.y, 200*z, 120*z));
    t.stroke(t.rect(p2.x, p2.y, 200*z, 120*z));
    const cD = mm.worldToScreen(1530, 2160);
    t.stroke(t.circle(cD.x, cD.y, 300*z));
    const eD = mm.worldToScreen(1530+300, 2160);
    const kD = (300 * z) / 132;
    t.stroke(t.caret(eD.x - 60*kD, eD.y - 40*kD, 120*kD, 78*kD));
    const drawChip = [...document.querySelectorAll('#summon .item')].find(b => /Ask it to draw/.test(b.textContent));
    step('14. the palette offers to let the model draw', !!drawChip, t.chips());
    const before = mm.session.getState().contentIds.length;
    if (drawChip) {
      drawChip.click();
      const inp = document.querySelector('#summon input.ask');
      inp.value = 'add a footer under these';
      inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      await wait(300);
    }
    const stD = mm.session.getState();
    const newIds = stD.contentIds.slice(before - 0).filter(id => !stD.artifacts.includes(id));
    const drawn = newIds.map(id => stD.nodes.get(id)).filter(n => n && (n.reps.find(r => r.modality === 'stroke') || {}).source === mm.agents[0].id);
    step('14a. the model was told what the human pointed at, as a measured span', !!window.__lastDraw && !!window.__lastDraw.span, window.__lastDraw);
    step('14b. a mark appeared, authored by the model, through the same channel as a hand', drawn.length === 1, {newIds, by: drawn.map(n => (n.reps.find(r => r.modality === 'stroke') || {}).source)});
    if (drawn.length) {
      const n = drawn[0];
      const read = MM.interpretationsOf(n, stD.nodes)[0];
      const b = MM.boundsOf(n);
      step('14c. it is read by the shape rung like any mark, and sits where it was asked to', read && read.label === 'rectangle' && b.minY > 2100 + 120, { read: read && read.label + ' ' + read.weight.toFixed(2), top: b && Math.round(b.minY) });
      const why = stD.explanations.map(id => MM.explanationOf(stD.nodes.get(id))).filter(e => e && /footer/.test(e.text));
      step('14d. its reason sits beside it as an answer, attributed', why.length === 1, why.map(e => e.text));
    }
  }

  // ---- 15. From the user's side: circle things and draw them clean, without knowing the mark ----
  {
    // Pin the view: world (2300, 2100) at screen (260, 200), zoom 1. A run must
    // not depend on how wide the pane is.
    mm.setView(1, 260 - 2300, 200 - 2100); await wait(30);
    const z = mm.view.zoom;
    const rot = (pts, deg, cx, cy) => { const a = deg * Math.PI / 180; return pts.map(p => ({ x: cx + (p.x - cx) * Math.cos(a) - (p.y - cy) * Math.sin(a), y: cy + (p.x - cx) * Math.sin(a) + (p.y - cy) * Math.cos(a) })); };
    const p1 = mm.worldToScreen(2300, 2100), p2 = mm.worldToScreen(2560, 2100);
    t.stroke(t.rect(p1.x, p1.y, 200*z, 120*z));
    t.stroke(rot(t.rect(p2.x, p2.y, 200*z, 120*z), 12, p2.x + 100*z, p2.y + 60*z)); // a box drawn a little tilted, as hands do
    const st15 = mm.session.getState();
    const tilted = st15.nodes.get(st15.contentIds[st15.contentIds.length - 1]);
    const tr = MM.snapReading(tilted, st15.nodes);
    step('15. a box drawn twelve degrees off square is still read and offered as a rectangle', tr.shape === 'rectangle' && tr.ok, tr);
    const cL = mm.worldToScreen(2530, 2160);
    t.stroke(t.circle(cL.x, cL.y, 300*z));
    const stH = mm.session.getState();
    const snapBtn = document.getElementById('snapBtn');
    step('15a. a loop around them is plain ink that waits; nothing lights up on its own, and the rail\'s Snap scopes to what it holds', stH.pendingLassoId !== null && !document.getElementById('held') && !snapBtn.hidden && /2/.test(snapBtn.textContent) && /cross the loop/.test(document.getElementById('status').textContent), { snap: snapBtn.textContent, status: document.getElementById('status').textContent });
    snapBtn.click();
    await wait(80);
    const stS = mm.session.getState();
    const cleaned = stS.contentIds.filter(id => MM.cleanOf(stS.nodes.get(id))).length;
    step('15b. Snap redraws the circled marks clean and keeps the loop waiting', cleaned >= 2 && stS.pendingLassoId !== null, { cleaned, held: stS.pendingLassoId });
    t.takeLoop(cL.x, cL.y, 300*z);
    await wait(80);
    const stO = mm.session.getState();
    step('15c. the mark across the loop takes it up: the loop is a gesture now, the marks are selected, the offers open', !!stO.summon && stO.summon.enclosedIds.length === 2 && stO.summon.scopeSource === 'lasso' && stO.selection.length === 2 && !stO.contentIds.includes(stO.summon.gestureIds[0]), stO.summon && stO.summon.scopeReasoning);
    if (stO.summon) mm.session.dismiss(stO.summon.id, Date.now());
    // Auto: a box that enclosed something when drawn is a loop-in-waiting, and is still made clean once the next stroke settles it.
    mm.setSnapMode('auto');
    const d = mm.worldToScreen(2900, 2160);
    t.stroke(t.line({x: d.x, y: d.y}, {x: d.x + 4, y: d.y + 3}, 4));
    const bx = mm.worldToScreen(2820, 2100);
    t.stroke(t.rect(bx.x, bx.y, 200*z, 120*z));
    const stA = mm.session.getState();
    const boxId = stA.contentIds[stA.contentIds.length - 1];
    const heldAtDraw = stA.pendingLassoId === boxId;
    t.stroke(t.line({x: bx.x + 260*z, y: bx.y}, {x: bx.x + 460*z, y: bx.y + 20*z}, 40));
    const stB = mm.session.getState();
    step('15d. auto: a box that was a loop-in-waiting is drawn clean once the next stroke settles it', heldAtDraw && !!MM.cleanOf(stB.nodes.get(boxId)), { heldAtDraw, clean: !!MM.cleanOf(stB.nodes.get(boxId)) });
    mm.setSnapMode('offer');
  }

  // ---- 16. Words from letters: print a word in block capitals beside a box; it becomes the box's name ----
  {
    mm.setView(1, 260 - 3300, 200 - 2100); await wait(30);
    const z = mm.view.zoom;
    const W = (x, y) => mm.worldToScreen(x, y);
    const seg = (a, b) => t.line(W(a.x, a.y), W(b.x, b.y), 14);
    const bx = { x: 3300, y: 2100 };
    t.stroke(t.rect(W(bx.x, bx.y).x, W(bx.x, bx.y).y, 220 * z, 140 * z));
    // N A V, each as the strokes a hand makes, sized ON SCREEN (a letter is
    // small in the hand's space whatever the zoom): 30px tall beside the box.
    const o = W(bx.x + 240, bx.y + 50);
    const sp = (x, y) => ({ x: o.x + x, y: o.y + y });
    const ss = (a, b) => t.line(sp(a.x, a.y), sp(b.x, b.y), 14);
    const h = 30;
    const strokes = [
      ss({ x: 0, y: h }, { x: 0, y: 0 }).concat(ss({ x: 0, y: 0 }, { x: 18, y: h }).slice(1), ss({ x: 18, y: h }, { x: 18, y: 0 }).slice(1)),
      ss({ x: 26, y: h }, { x: 36, y: 0 }).concat(ss({ x: 36, y: 0 }, { x: 46, y: h }).slice(1)),
      ss({ x: 30, y: h * 0.6 }, { x: 42, y: h * 0.6 }),
      ss({ x: 54, y: 0 }, { x: 64, y: h }).concat(ss({ x: 64, y: h }, { x: 74, y: 0 }).slice(1)),
    ];
    for (const pts of strokes) t.stroke(pts);
    await wait(300); // the read is asynchronous
    const stW = mm.session.getState();
    const wordId = stW.contentIds.find(id => MM.isWord(stW.nodes.get(id)));
    const word = wordId && stW.nodes.get(wordId);
    step('16. four printed strokes beside a box gather into one word', !!word && MM.lettersOf(word).length === 4 && MM.topInterpretation(word) === 'text', { content: stW.contentIds.length, letters: word && MM.lettersOf(word).length });
    step('16a. the word is read as a whole by the model that can see', !!word && MM.transcriptOf(word) === 'Pricing', word && MM.transcriptsOf(word).map(x => x.text));
    const cW = W(bx.x + 150, bx.y + 70);
    t.stroke(t.circle(cW.x, cW.y, 260 * z));
    t.takeLoop(cW.x, cW.y, 260 * z);
    await wait(80);
    const chipsW = t.chips();
    // Step 13 already named a box-plus-word "Pricing"; this group has the same
    // signature, so the match may lead — either way the word is the offer.
    step('16b. the palette leads with the word as the box\'s name', chipsW.slice(0, 2).includes('Name it “Pricing”') || chipsW[0] === 'It’s a Pricing', chipsW);
    const nameChip = [...document.querySelectorAll('#summon .item')].find(b => /Name it/.test(b.textContent));
    if (nameChip) nameChip.click();
    const stN = mm.session.getState();
    step('16c. the printed word is now the box\'s name — the ship criterion for printed letters', stN.artifacts.map(id => MM.wordOf(stN.nodes.get(id))).filter(n => n === 'Pricing').length >= 1);
  }

  // ---- 17. The model builds the library: it names a group, the human blesses, the next one is recognised ----
  {
    mm.setView(1, 260 - 4200, 200 - 2100); await wait(30);
    const z = mm.view.zoom;
    const W = (x, y) => mm.worldToScreen(x, y);
    const trio = (x, y) => { const a = W(x, y), b = W(x + 160, y); t.stroke(t.circle(a.x, a.y, 40 * z)); t.stroke(t.circle(b.x, b.y, 40 * z)); t.stroke(t.line(W(x + 44, y), W(x + 116, y), 30)); };
    trio(4200, 2100);
    const cT = W(4280, 2100);
    t.stroke(t.circle(cT.x, cT.y, 170 * z));
    t.takeLoop(cT.x, cT.y, 170 * z);
    await wait(400); // the stubbed model answers the reading
    const chips = t.chips();
    const proposed = chips.find(c => /Name it “page-layout”/.test(c));
    step('17. what the model read the group as is offered as a name, attributed', !!proposed, chips);
    const btn = [...document.querySelectorAll('#summon .item')].find(b => /Name it “page-layout”/.test(b.textContent));
    if (btn) btn.click();
    const named = mm.session.getState().artifacts.map(id => MM.wordOf(mm.session.getState().nodes.get(id)));
    step('17a. blessing it holds the entry — the model proposed, the human decided', named.includes('page-layout'), named);
    trio(4200, 2400);
    const cands = mm.session.getState().clusterCandidates;
    step('17b. the next group like it is recognised by its signature: the model\'s word, in the library', cands.some(c => c.matches.some(m => m.name === 'page-layout')), cands.map(c => c.matches.map(m => m.name)));
    // The correction: circle the look-alike, refuse the match, and it stays refused.
    const cU = W(4280, 2400);
    t.stroke(t.circle(cU.x, cU.y, 170 * z));
    t.takeLoop(cU.x, cU.y, 170 * z); await wait(60);
    const chipsC = t.chips();
    step('17c. the palette offers the match and, beside it, the refusal', chipsC.includes('It’s a page-layout') && chipsC.includes('Not a page-layout'), chipsC);
    const notBtn = [...document.querySelectorAll('#summon .item')].find(b => /Not a page-layout/.test(b.textContent));
    if (notBtn) notBtn.click(); await wait(60);
    const chipsD = t.chips();
    const stC = mm.session.getState();
    step('17d. refusing it is a correct event; the offer leaves the open palette and the candidate goes', mm.session.getEvents().slice(-1)[0].type === 'correct' && !chipsD.includes('It’s a page-layout') && !stC.clusterCandidates.some(c => c.matches.some(m => m.name === 'page-layout')), { last: mm.session.getEvents().slice(-1)[0].type, chips: chipsD });
    if (stC.summon) mm.session.dismiss(stC.summon.id, Date.now());
    trio(4200, 2700);
    const candsE = mm.session.getState().clusterCandidates;
    step('17e. the next group like it is not offered as one either — the correction holds', !candsE.some(c => c.matches.some(m => m.name === 'page-layout')), candsE.map(c => c.matches.map(m => m.name)));
  }

  // ---- 18. Selection: the loop that finished. Drag it, tap off, undo the tap-off ----
  {
    mm.setView(1, 260 - 5200, 200 - 2100); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    const ids0 = mm.session.getState().contentIds.length;
    const p1 = W(5200, 2100), p2 = W(5440, 2100), p3 = W(5200, 2270);
    t.stroke(t.rect(p1.x, p1.y, 200, 120)); t.stroke(t.rect(p2.x, p2.y, 200, 120)); t.stroke(t.rect(p3.x, p3.y, 200, 120));
    const boxes = mm.session.getState().contentIds.slice(-3);
    const c = W(5420, 2240);
    t.stroke(t.circle(c.x, c.y, 330));
    t.takeLoop(c.x, c.y, 330); await wait(60);
    const stS = mm.session.getState();
    step('18. taking the loop up selects what it held, and the loop is no longer ink', stS.selection.length === 3 && boxes.every(id => stS.selection.includes(id)) && !stS.contentIds.includes(stS.summon.gestureIds[0]), { selection: stS.selection.length });
    mm.session.dismiss(stS.summon.id, Date.now()); // close the palette; the selection stays
    step('18a. dismissing the palette keeps the selection', mm.session.getState().selection.length === 3);
    // Drag from inside the selection by (80, 40) screen px at zoom 1.
    const before = MM.boundsOf(mm.session.getState().nodes.get(boxes[0]));
    const inside = W(5300, 2160);
    t.stroke([{x: inside.x, y: inside.y}, {x: inside.x + 20, y: inside.y + 10}, {x: inside.x + 50, y: inside.y + 25}, {x: inside.x + 80, y: inside.y + 40}]);
    const after = MM.boundsOf(mm.session.getState().nodes.get(boxes[0]));
    const moved = Math.abs(after.minX - before.minX - 80) < 1 && Math.abs(after.minY - before.minY - 40) < 1;
    step('18b. a hand on the selection drags it: one move event, the ink untouched', moved && mm.session.getEvents().slice(-1)[0].type === 'move' && mm.session.getState().contentIds.length === ids0 + 3, { dx: after.minX - before.minX, dy: after.minY - before.minY, last: mm.session.getEvents().slice(-1)[0].type });
    // A tap off is the dismissal, never a dot.
    const off = W(5900, 2600);
    t.stroke([{x: off.x, y: off.y}, {x: off.x, y: off.y}]);
    const stT = mm.session.getState();
    step('18c. a tap off dismisses the selection and leaves no dot', stT.selection.length === 0 && stT.contentIds.length === ids0 + 3);
    mm.session.undo();
    const stU = mm.session.getState();
    step('18d. undo brings the selection back, in place', stU.selection.length === 3 && Math.abs(MM.boundsOf(stU.nodes.get(boxes[0])).minX - after.minX) < 1e-6);
    mm.session.deselect(Date.now());
  }

  // ---- 19. A js artifact: rendered addressable, run in the worker after a play, broken when it throws ----
  {
    mm.setView(1, 260 - 6200, 200 - 2100); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    const p = W(6200, 2100);
    t.stroke(t.rect(p.x, p.y, 220, 130));
    const c = W(6310, 2165);
    t.stroke(t.circle(c.x, c.y, 190));
    t.takeLoop(c.x, c.y, 190); await wait(60);
    const sumJ = mm.session.getState().summon;
    const jsId = mm.session.bless({ summonId: sumJ.id, name: 'mover', at: Date.now() });
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: jsId, kind: 'js',
      code: 'function steer(world) {\n  return { fx: 60, fy: 0 };\n}\nreturn steer(world);', at: Date.now() });
    await wait(150);
    const fj = mm.frames.get(jsId);
    let region = null;
    try { region = fj && fj.iframe.contentDocument && fj.iframe.contentDocument.querySelector('[data-region="fn:steer"]'); } catch (err) { region = null; }
    step('19. a js artifact renders as source, its functions addressable by ink', !!region, { hasFrame: !!fj });
    await wait(250);
    const b0 = mm.runtime().bodies.get(jsId);
    step('19a. nothing runs unblessed: no step before a hand plays it', !b0 && !mm.session.getState().clocks[jsId], { body: b0 || null });
    mm.session.clock({ nodeId: jsId, op: 'play', at: Date.now() });
    await wait(500);
    const b1 = mm.runtime().bodies.get(jsId);
    const fr1 = MM.frameOf(mm.session.getState().nodes.get(jsId));
    const left1 = parseFloat(fj.wrap.style.left);
    step('19b. played, the behaviour steps in the worker and moves its frame', !!b1 && b1.x > 2 && left1 > fr1.x + 2, { x: b1 && b1.x, left: left1, frameX: fr1.x });
    mm.session.clock({ nodeId: jsId, op: 'reset', at: Date.now() }); await wait(50);
    // Still playing, so a step may already have nudged it by a fraction of a pixel.
    step('19c. reset puts the frame back where it was drawn, and keeps playing', Math.abs(parseFloat(fj.wrap.style.left) - fr1.x) < 1 && mm.session.getState().clocks[jsId].playing, { left: fj.wrap.style.left, frameX: fr1.x });
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: jsId, kind: 'js', code: 'throw new Error("boom");', at: Date.now() });
    await wait(400);
    const stJ = mm.session.getState();
    step('19d. a throwing behaviour pauses its clock with the reason and marks the frame broken', !stJ.clocks[jsId].playing && /boom/.test(stJ.clocks[jsId].reason || '') && fj.wrap.classList.contains('broken'), stJ.clocks[jsId]);
    const n0 = stJ.contentIds.length;
    const q = W(6700, 2100);
    t.stroke(t.rect(q.x, q.y, 120, 80));
    step('19e. the board survives: drawing still works after a behaviour broke', mm.session.getState().contentIds.length === n0 + 1);
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: jsId, kind: 'js', code: 'while (true) {}', at: Date.now() });
    mm.session.clock({ nodeId: jsId, op: 'play', at: Date.now() });
    await wait(mm.runtime().budgetMs + 400);
    const stK = mm.session.getState();
    step('19f. a behaviour past its budget is stopped, and the reason names the budget', !stK.clocks[jsId].playing && /budget/.test(stK.clocks[jsId].reason || ''), stK.clocks[jsId]);
    t.stroke(t.rect(q.x, q.y + 120, 120, 80));
    step('19g. …and the board survives that too', mm.session.getState().contentIds.length === n0 + 2);
  }

  // ---- 20. The tank: a definition's clock moves its instances, deterministically ----
  {
    mm.setView(1, 260 - 7200, 200 - 2100); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    // A definition: a circle with a triangle touching it — generic; the engine never learns the word.
    const pair = (x, y) => { const a = W(x, y); t.stroke(t.circle(a.x, a.y, 30)); const b = W(x + 30, y); t.stroke(t.line(b, W(x + 80, y - 30), 20).concat(t.line(W(x + 80, y - 30), W(x + 80, y + 30), 20).slice(1), t.line(W(x + 80, y + 30), b, 20).slice(1))); };
    pair(7200, 2100);
    const cA = W(7240, 2100);
    t.stroke(t.circle(cA.x, cA.y, 110));
    t.takeLoop(cA.x, cA.y, 110); await wait(60);
    const defId = mm.session.bless({ summonId: mm.session.getState().summon.id, name: 'A', at: Date.now() });
    // Play, then pause at once: the tank exists, and no frame has stepped it —
    // from here the test steps the clock by hand, so every position is exact.
    mm.session.clock({ nodeId: defId, op: 'play', at: Date.now() });
    mm.session.clock({ nodeId: defId, op: 'pause', at: Date.now() });
    pair(7500, 2100); pair(7200, 2400);
    const st0 = mm.session.getState();
    const heldA = st0.clusterCandidates.filter(c => c.matches[0] && c.matches[0].artifactId === defId).length;
    step('20. two more like it are held as instances, unblessed', heldA === 2, { held: heldA });
    const tk = mm.tank();
    const p0 = tk.positions(defId);
    step('20a. the tank has three bodies, the definition\'s own ink first, at their drawn spots, t = 0', p0.length === 3 && p0[0].id === defId && tk.time(defId) === 0, p0);
    tk.step(defId, 120);
    const p1 = tk.positions(defId);
    const moved = p1.every((p, i) => Math.hypot(p.x - p0[i].x, p.y - p0[i].y) > 1);
    step('20b. two seconds of steps move every body', moved && Math.abs(tk.time(defId) - 2) < 1e-6, { t: tk.time(defId), p1 });
    mm.session.clock({ nodeId: defId, op: 'play', at: Date.now() }); await wait(150);
    mm.session.clock({ nodeId: defId, op: 'pause', at: Date.now() });
    const pA = tk.positions(defId); await wait(250);
    const pB = tk.positions(defId);
    step('20c. playing moves them by the frame loop; pause holds them where they are', JSON.stringify(pA) !== JSON.stringify(p1) && JSON.stringify(pA) === JSON.stringify(pB));
    mm.session.clock({ nodeId: defId, op: 'reset', at: Date.now() });
    const pr = tk.positions(defId);
    step('20d. reset puts them back where they were drawn', JSON.stringify(pr) === JSON.stringify(p0) && tk.time(defId) === 0, pr);
    tk.step(defId, 120);
    const q1 = tk.positions(defId);
    mm.session.clock({ nodeId: defId, op: 'reset', at: Date.now() });
    tk.step(defId, 120);
    const q2 = tk.positions(defId);
    step('20e. determinism: the same steps from the same seed put every body in the same place', JSON.stringify(q1) === JSON.stringify(q2) && JSON.stringify(q1) === JSON.stringify(p1), { q1, q2 });
    mm.session.clock({ nodeId: defId, op: 'seed', seed: 7, at: Date.now() });
    tk.step(defId, 120);
    step('20f. a new seed is a different run', JSON.stringify(tk.positions(defId)) !== JSON.stringify(q1));
    // A fourth body drawn, one second run, then undone: the tank is re-derived for the shorter program.
    mm.session.clock({ nodeId: defId, op: 'seed', seed: 1, at: Date.now() });
    mm.session.clock({ nodeId: defId, op: 'reset', at: Date.now() });
    pair(7500, 2400);
    step('20g. a body drawn while the clock stands joins the tank at once', tk.positions(defId).length === 4);
    tk.step(defId, 60);
    mm.session.undo(); mm.session.undo();
    const after = tk.positions(defId);
    mm.session.clock({ nodeId: defId, op: 'reset', at: Date.now() });
    tk.step(defId, 60);
    const fresh = tk.positions(defId);
    step('20h. undoing a body re-derives the tank: three bodies, exactly where a fresh run of the shorter program puts them', after.length === 3 && Math.abs(tk.time(defId) - 1) < 1e-6 && JSON.stringify(after) === JSON.stringify(fresh), { after, fresh });
  }

  // ---- 21. Words into verbs, and acting it out ----
  {
    mm.setView(1, 260 - 7700, 200 - 2000); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    const pair = (x, y) => { const a = W(x, y); t.stroke(t.circle(a.x, a.y, 30)); const b = W(x + 30, y); t.stroke(t.line(b, W(x + 80, y - 30), 20).concat(t.line(W(x + 80, y - 30), W(x + 80, y + 30), 20).slice(1), t.line(W(x + 80, y + 30), b, 20).slice(1))); };
    pair(7800, 2100);
    const cB = W(7840, 2100);
    t.stroke(t.circle(cB.x, cB.y, 110));
    t.takeLoop(cB.x, cB.y, 110); await wait(60);
    const defB = mm.session.bless({ summonId: mm.session.getState().summon.id, name: 'B', at: Date.now() });
    // Circle the definition and type what it does.
    t.stroke(t.circle(cB.x, cB.y, 120));
    t.takeLoop(cB.x, cB.y, 120); await wait(60);
    const filter = document.querySelector('#summon input.filter');
    filter.value = 'flees anything bigger, wanders slowly';
    filter.dispatchEvent(new Event('input'));
    await wait(30);
    const chipsB = t.chips();
    const typed = chipsB.find(c => /^B: flee anything bigger · wander \(0\.50\)/.test(c));
    step('21. words typed at a definition are read as verbs, on the spot, and offered as what it does', !!typed, chipsB);
    const btnB = [...document.querySelectorAll('#summon .item')].find(b => /^B: flee anything bigger/.test(b.textContent));
    if (btnB) btnB.click(); await wait(30);
    const bB = MM.blessedBehaviourOf(mm.session.getState().nodes.get(defB));
    step('21a. taking it up gives the definition that behaviour, blessed by the act, with the words as each term\'s reason', !!bB && bB.terms.map(x => x.verb).join(',') === 'flee,wander' && /from “flees anything bigger”/.test(bB.terms[0].reasoning), bB);
    if (mm.session.getState().summon) mm.session.dismiss(mm.session.getState().summon.id, Date.now());
    // Acting it out: B's clock runs; a path accelerating away from the As nearby is a demonstration.
    mm.session.clock({ nodeId: defB, op: 'play', at: Date.now() });
    mm.session.clock({ nodeId: defB, op: 'pause', at: Date.now() });
    mm.session.clock({ nodeId: defB, op: 'play', at: Date.now() });
    const tk = mm.tank();
    const bodyB = tk.positions(defB)[0];
    // Away from the nearest A: the path a hand would drag to show "flee".
    const As = tk.bodies().filter(b => b.name === 'A');
    const nearA = As.reduce((best, b) => (!best || Math.hypot(b.x - bodyB.x, b.y - bodyB.y) < Math.hypot(best.x - bodyB.x, best.y - bodyB.y) ? b : best), null);
    // The demonstration is what fleeing looks like: the body stepped under a pure flee, as a hand would drag it.
    const bodies = tk.bodies();
    const others = bodies.filter(b => b.id !== bodyB.id).map(b => ({ ...b, vx: 0, vy: 0, w: 110, h: 60, heading: 0, age: 0 }));
    let me = { id: bodyB.id, name: 'B', x: bodyB.x, y: bodyB.y, vx: 0, vy: 0, w: 110, h: 60, heading: 0, age: 0, origin: { x: bodyB.x, y: bodyB.y } };
    const samples = [{ x: me.x, y: me.y, t: 0 }];
    for (let i = 1; i <= 40; i++) { me = MM.step({ terms: [{ verb: 'flee', target: 'A', weight: 1 }], speed: 300 }, MM.worldOf(me, others, [], i / 60, 1 / 60, () => 0.5)).body; samples.push({ x: me.x, y: me.y, t: i / 60 }); }
    void nearA;
    const fitted = tk.actOut(defB, bodyB.id, samples.map(p => ({ ...p })));
    mm.session.clock({ nodeId: defB, op: 'pause', at: Date.now() });
    const heldB = MM.behavioursOf(mm.session.getState().nodes.get(defB)).filter(r => !r.data.blessed);
    step('21b. the path is fitted onto the basis and held on the definition: flee the As, with the residual named', !!fitted && fitted.terms.some(x => x.verb === 'flee' || x.verb === 'avoid') && heldB.length === 1 && heldB[0].data.source === 'demo' && typeof heldB[0].data.residual === 'number', { fitted: fitted && fitted.terms, reasoning: fitted && fitted.reasoning, held: heldB.length });
    t.stroke(t.circle(cB.x, cB.y, 120));
    t.takeLoop(cB.x, cB.y, 120); await wait(60);
    const chipsC = t.chips();
    const offer = [...document.querySelectorAll('#summon .item')].find(b => /^B: (flee|avoid)/.test(b.textContent) && /acted out/.test(b.title));
    step('21c. the palette offers the acted-out behaviour, attributed, for the human to give in their name', !!offer, chipsC);
    if (offer) offer.click(); await wait(30);
    const bB2 = MM.blessedBehaviourOf(mm.session.getState().nodes.get(defB));
    step('21d. …and taking it up blesses it: the tank now runs what was acted out', !!bB2 && bB2.source === 'demo', bB2 && bB2.source);
    if (mm.session.getState().summon) mm.session.dismiss(mm.session.getState().summon.id, Date.now());
  }

  // ---- 22. A drawn slider, a frame that wires it into a script, and a frame offered again ----
  {
    mm.setView(1, 260 - 8200, 200 - 2000); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    // The slider: a line with a dot a third of the way along it.
    const a = W(8200, 2100), b = W(8500, 2100), k = W(8300, 2101);
    t.stroke(t.line(a, b, 60));
    t.stroke(t.circle(k.x, k.y, 3, 16));
    const cS = W(8350, 2100);
    t.stroke(t.circle(cS.x, cS.y, 200));
    t.takeLoop(cS.x, cS.y, 200); await wait(60);
    const chipsS = t.chips();
    step('22. a line with a dot on it reads as a slider, and the palette offers to make it one', chipsS.includes('Make it a slider'), chipsS);
    const mk = [...document.querySelectorAll('#summon .item')].find(x => /Make it a slider/.test(x.textContent));
    if (mk) mk.click(); await wait(60);
    const stC = mm.session.getState();
    const ctlId = stC.artifacts[stC.artifacts.length - 1];
    const ctl = MM.controlOf(stC.nodes.get(ctlId), stC.nodes);
    step('22a. the control\'s value is where the knob sits: a third of the way', !!ctl && Math.abs(ctl.t - 0.333) < 0.03, ctl);
    // A script with a tunable, beside it.
    const p = W(8200, 2300);
    t.stroke(t.rect(p.x, p.y, 220, 130));
    const cJ = W(8310, 2365);
    t.stroke(t.circle(cJ.x, cJ.y, 190));
    t.takeLoop(cJ.x, cJ.y, 190); await wait(60);
    const jsId = mm.session.bless({ summonId: mm.session.getState().summon.id, name: 'mover', at: Date.now() });
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: jsId, kind: 'js', code: 'const SPEED = 60;\nfunction steer(world) {\n  return { fx: SPEED, fy: 0 };\n}\nreturn steer(world);', at: Date.now() });
    await wait(60);
    // Circle both artifacts: the palette offers to frame them, with the wiring named.
    const cF = W(8350, 2230);
    t.stroke(t.circle(cF.x, cF.y, 330));
    t.takeLoop(cF.x, cF.y, 330); await wait(60);
    const frameChip = [...document.querySelectorAll('#summon .item')].find(x => /^Frame these/.test(x.textContent));
    step('22b. circling the slider and the script offers a frame, naming the wire it would make', !!frameChip && /value → param:SPEED/.test(frameChip.title), frameChip && frameChip.title);
    const filterF = document.querySelector('#summon input.filter');
    if (filterF) filterF.value = 'rig';
    if (frameChip) frameChip.click(); await wait(80);
    const stF = mm.session.getState();
    const frameId = stF.artifacts.find(id => MM.isFrame(stF.nodes.get(id)));
    const fr = frameId && MM.frameOfNode(stF.nodes.get(frameId));
    step('22c. the frame is an artifact that refers to both and carries the wire', !!fr && fr.members.length === 2 && fr.connections.length === 1 && fr.connections[0].to.port === 'param:SPEED' && MM.wordOf(stF.nodes.get(frameId)) === 'rig', fr);
    const wired0 = mm.wiredCodeOf(jsId);
    step('22d. the script renders and runs with the slider\'s value in place of its constant', !!wired0 && /^const SPEED = 0\.33/.test(wired0), wired0 && wired0.split('\n')[0]);
    // Slide the knob to the end: the value follows, the wired code follows, one move event.
    const knobId = stC.nodes.get(ctlId).edges.filter(e => e.rel === 'has-part').map(e => e.to).find(id => MM.topInterpretation(stC.nodes.get(id)) !== 'line');
    const kc = W(8300, 2101), ke = W(8500, 2101);
    t.stroke([{x: kc.x, y: kc.y}, {x: kc.x + 60, y: kc.y}, {x: kc.x + 130, y: kc.y + 2}, {x: ke.x, y: ke.y}]);
    await wait(60);
    const stK = mm.session.getState();
    const ctl2 = MM.controlOf(stK.nodes.get(ctlId), stK.nodes);
    const wired1 = mm.wiredCodeOf(jsId);
    step('22e. a hand on the knob slides it; the value and the wired code follow, from one move event', !!ctl2 && ctl2.t > 0.95 && mm.session.getEvents().slice(-1)[0].type === 'move' && mm.session.getEvents().slice(-1)[0].ids[0] === knobId && /^const SPEED = (1|0\.9[5-9])/.test(wired1), { t: ctl2 && ctl2.t, last: mm.session.getEvents().slice(-1)[0].type, wired: wired1 && wired1.split('\n')[0] });
    const fj = mm.frames.get(jsId);
    let shown = null;
    try { shown = fj && fj.iframe.contentDocument && fj.iframe.contentDocument.body.textContent; } catch (err) { shown = null; }
    step('22f. …and the rendered source shows the wired value', !!shown && /SPEED = (1|0\.9)/.test(shown), shown && shown.slice(0, 60));
    const files = mm.exportFrame(frameId);
    step('22g. the frame exports as a folder: the wired script, the control, frame.json', !!files && Object.keys(files).sort().join(',') === 'frame.json,mover.js,slider.json' && /^const SPEED = (1|0\.9)/.test(files['mover.js']), files && Object.keys(files));
    // A frame built once is offered again: another slider and script, circled — "Frame these like rig".
    const a2 = W(8200, 2700), b2 = W(8500, 2700), k2 = W(8250, 2701);
    t.stroke(t.line(a2, b2, 60)); t.stroke(t.circle(k2.x, k2.y, 3, 16));
    const cS2 = W(8350, 2700);
    t.stroke(t.circle(cS2.x, cS2.y, 200)); t.takeLoop(cS2.x, cS2.y, 200); await wait(60);
    const mk2 = [...document.querySelectorAll('#summon .item')].find(x => /Make it a slider/.test(x.textContent));
    if (mk2) mk2.click(); await wait(60);
    const p2 = W(8200, 2900);
    t.stroke(t.rect(p2.x, p2.y, 220, 130));
    const cJ2 = W(8310, 2965);
    t.stroke(t.circle(cJ2.x, cJ2.y, 190)); t.takeLoop(cJ2.x, cJ2.y, 190); await wait(60);
    const js2 = mm.session.bless({ summonId: mm.session.getState().summon.id, name: 'mover 2', at: Date.now() });
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: js2, kind: 'js', code: 'const SPEED = 10;\nreturn { fx: SPEED, fy: 0 };', at: Date.now() });
    await wait(60);
    const cF2 = W(8350, 2830);
    t.stroke(t.circle(cF2.x, cF2.y, 330)); t.takeLoop(cF2.x, cF2.y, 330); await wait(60);
    const like = [...document.querySelectorAll('#summon .item')].find(x => /Frame these like “rig”/.test(x.textContent));
    step('22h. the frame built once is offered again to the same kinds of thing, by resemblance', !!like, t.chips());
    if (like) like.click(); await wait(80);
    const stL = mm.session.getState();
    const frames = stL.artifacts.filter(id => MM.isFrame(stL.nodes.get(id)));
    const f2 = frames.length === 2 && MM.frameOfNode(stL.nodes.get(frames[1]));
    step('22i. applying it wires the new pair the same way', !!f2 && f2.connections.length === 1 && f2.connections[0].to.port === 'param:SPEED' && /as in rig/.test(f2.connections[0].reasoning), f2);
  }

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
  if (window.__snapModeBefore) mm.setSnapMode(window.__snapModeBefore);
  try { if (window.__usesBefore) localStorage.setItem('mm-palette-uses', window.__usesBefore); } catch (e) {}
  step('12. the rail follows the grammar — undoing the teach restores the check',
    mm.session.getState().commandMark === null &&
    document.getElementById('markName').textContent === 'check',
    { mark: mm.session.getState().commandMark, chip: document.getElementById('markName').textContent });

  return R;
};
