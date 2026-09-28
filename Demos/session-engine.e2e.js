// End-to-end check for Demos/session-engine.html — the MVP loop, driven through
// the real UI.
//
// HOW TO RUN: serve the repo (`python3 -m http.server 8000`), open
// http://localhost:8000/Demos/session-engine.html, and in the console:
//
//     const s = document.createElement('script');
//     s.src = '/Demos/session-engine.e2e.js';
//     document.head.appendChild(s);
//     s.onload = () => { __setup(); __scenario().then((r) => { window.__R = r; console.table(r.steps); }); };
//
// A run takes about 75 s (105 steps); `window.__Rlive.steps` shows progress.
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
  // The field: type, read, Enter — the one way anything is asked for (SURFACE-v9-PLAN §6).
  function typeIn(text){ const f=document.querySelector('#summon input.filter'); if(!f) return null; f.value=text; f.dispatchEvent(new Event('input',{bubbles:true})); return f; }
  function typeEnter(text){ const f=typeIn(text); if(!f) return null; f.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return f; }
  function readingLine(){ const r=document.querySelector('#summon .reading'); return r ? r.textContent : ''; }
  function coreSlots(){ return [...document.querySelectorAll('#summon .row.core .pill')].map(b=>b.dataset.verb); }
  // Take a loop up the way a hand does: the active command mark drawn across its right edge.
  function takeLoop(cx, cy, r){ const taught = !!window.__mm.session.getState().commandMark; stroke(taught ? caret(cx + r - 30, cy - 20) : check(cx + r - 35, cy - 8)); }
  // The one option that reads held writing nobody has read (W2): the writing reading itself on a
  // scope that is all writing, else Read the writing among the rest.
  function readPill(){ return document.querySelector('#summon .pill.item[data-key="concept:writing"], #summon .pill.item[data-key="writing"]') || [...document.querySelectorAll('#summon .item')].find(b => /^Read the writing/.test(b.textContent.trim())) || null; }
  window.__t = {stroke,strokeOn,line,rect,circle,caret,check,scratch,word,summary,chips,takeLoop,typeIn,typeEnter,readingLine,coreSlots,readPill};

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
  // The stub replaces fetch and wipes this origin's saved board: never on a page someone is using.
  const q = new URLSearchParams(location.search);
  if (!q.has('fresh') || !q.has('nosw')) throw new Error('the e2e runs only on session-engine.html?fresh=1&nosw=1, in its own tab, on its own origin');
  window.__helpers();
  // A mark held on this device from an earlier run would make step 0 — "the
  // built-in check summons with nothing taught" — untrue before we begin.
  if (window.__mm.savedMark()) window.__mm.forgetMark();
  // The board autosaves to browser storage now; a run starts from an empty one.
  window.__mm.forgetLocalLog();
  window.__mm.session.load([]);
  window.__snapModeBefore = window.__mm.snapMode();
  window.__mm.setSnapMode('offer');
  window.__autoReadBefore = window.__mm.autoRead();
  window.__mm.setAutoRead(false);
  // Learned palette use is device state; a run starts from none and puts it back.
  try { window.__usesBefore = localStorage.getItem('mm-palette-uses'); window.__usesHereBefore = localStorage.getItem('mm-palette-uses-here'); } catch (e) {}
  window.__mm.resetUses();
  const strokeOn = window.__t.strokeOn, line = window.__t.line;

  window.__calls=[];
  // The stub answers the FILL contract: per-region content, no layout. It
  // derives the region ids from the prompt it was handed rather than hardcoding
  // them, so a broken layout description fails the run instead of passing.
  // A request with no body is no model call — the help pane's file (U1g): the page's own origin answers it.
  if (!window.__realFetch) window.__realFetch = window.fetch;
  window.fetch = async function(url, init){
    if (!init || !init.body) return window.__realFetch(url, init);
    const body=JSON.parse(init.body);
    const sys=body.messages.find(m=>m.role==='system').content;
    const usr=body.messages.find(m=>m.role==='user').content;
    window.__calls.push({system:sys.slice(0,60), user:usr});
    // A model that is still thinking when the hand acts again (e2e 40): the
    // call is recorded when it is made, and answered only after the delay.
    if (window.__stubDelayMs) await new Promise((r) => setTimeout(r, window.__stubDelayMs));
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
    if(/write a PROGRAM/.test(sys)){
      // A 2D ring that reports itself as one part — enough to prove the harness without three.js.
      window.__lastProgram = { user: usr };
      if (/THE LIBRARY holds:\n  - /.test(usr) && /torus/i.test(usr.split('THE LIBRARY holds:')[1]) && /torus/i.test(usr.split('The human typed:')[1] || '')) return reply({ reuse: 'torus in 3d' });
      return reply({ name: 'torus', parts: ['torus'], code: "mm.onFrame(function(t){ var c = mm.ctx; c.clearRect(0, 0, mm.width, mm.height); c.strokeStyle = '#c9a84c'; c.lineWidth = 10; c.beginPath(); c.arc(mm.width / 2, mm.height / 2, Math.min(mm.width, mm.height) / 3, 0, Math.PI * 2); c.stroke(); mm.report('torus', mm.width / 6, mm.height / 6, mm.width * 2 / 3, mm.height * 2 / 3); });" });
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
      return reply(window.__readReply || [{text:'Pricing',confidence:0.92},{text:'Prizing',confidence:0.31}]);
    }
    if(/answering a question/.test(sys)){
      return new Response(JSON.stringify({choices:[{message:{content:'The three rectangles share edges only through the region frame you drew; nothing else relates them.'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(window.__whatReply) return reply(window.__whatReply); // a test's own readings for What is this? (U1c)
    return new Response(JSON.stringify({choices:[{message:{content:'[{"label":"page-layout","confidence":0.78,"reasoning":"three rectangles in a header/two-column arrangement"}]'}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  window.__mm.agents.splice(0); // a remembered model may have rejoined at boot
  const a=window.__mm.MM.createAgentParticipant(window.__mm.session, Object.assign({},window.__mm.MM.PRESETS.ollama,{model:'e2e-stub', vision:true}), Date.now());
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
  const R = { steps: [], pass: true }; window.__Rlive = R;
  const codeRepOfNode = (n) => { for (let i = n.reps.length - 1; i >= 0; i--) if (n.reps[i].modality === 'code') return n.reps[i]; return null; };
  const step = (name, ok, detail) => { R.steps.push({name, ok: !!ok, detail}); if(!ok) R.pass=false; return ok; };
  // R4c: what a hand's paint draws and says is what the whole-board read would
  // draw and say — every mark's ink, the reading under the mark, the chips,
  // the labels, the cards, the status line and the panel (`paintCheck`,
  // 08-render.js: the board painted both ways and compared).
  // And every mark's role, read over its neighbourhood, is the whole-board
  // read's, and so is the board's genre (`rolesCheck`), where the surface has it.
  const sameAsWhole = (label) => {
    const c = typeof mm.paintCheck === 'function' ? mm.paintCheck() : { ok: false, diffs: ['no paintCheck on this surface'], ops: 0, of: 0 };
    const r = typeof mm.rolesCheck === 'function' ? mm.rolesCheck() : { ok: true, marks: null };
    return step('R4c. ' + label + ' — what is drawn and said equals the whole-board read', c.ok && r.ok, c.ok && r.ok ? { drawn: c.ops, of: c.of, marks: c.marks, roles: r.marks } : { paint: c.diffs.slice(0, 4), roles: r.differ, genre: r.genreSame });
  };
  // A wait that survives a hidden tab: timers there fire once a minute, but a
  // message hop is a task and is not throttled, so the clock is read across hops.
  const wait = (ms) => new Promise((resolve) => {
    const until = performance.now() + (ms || 250);
    const ch = new MessageChannel();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const t = setTimeout(finish, ms || 250);
    ch.port1.onmessage = () => { if (done) return; if (performance.now() >= until) { clearTimeout(t); finish(); } else ch.port2.postMessage(0); };
    ch.port2.postMessage(0);
  });

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
  sameAsWhole('three boxes, zoomed out, their offers standing');

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
  step('5b. the field opens with its four core slots, and a brief typed there reads as a build', t.coreSlots().join(',') === 'name,copy,paste,erase' && mm.readField('website with the copy in the squares').kind === 'brief' && /structure at once \(tier 1\), then .* writes the words/.test(mm.readField('website with the copy in the squares').line), { core: t.coreSlots(), line: mm.readField('website with the copy in the squares').line });
  {
    const st0 = mm.session.getState();
    step('5c. a held lasso is never offered for snapping — it is a gesture in waiting', ![...mm.snapOffers().keys()].some(id => st0.summon && st0.summon.gestureIds.includes(id)));
    // Drawing them clean is a Tier 0 offer in the palette, and the summon survives it.
    const chip = [...document.querySelectorAll('#summon .item')].find(b => /Draw them clean/.test(b.textContent));
    step('5d. the palette offers to draw them clean, needing no model', !!chip && !chip.querySelector('.dot'), t.chips());
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
  t.typeIn('website with the copy in the squares');
  const line6 = t.readingLine();
  t.typeEnter('website with the copy in the squares');
  await wait(350);
  step('6a. the reading line said what Enter would do before it was pressed: the structure first, the words after', /structure at once/.test(line6) && /writes the words/.test(line6), { line: line6 });

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
  sameAsWhole('a live page over the boxes that drew it');

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
  step('9b. a brief typed on a live page reads as a change, not a build',
    /changes what the loop covers/.test(mm.readField('make this one purple').line), { line: mm.readField('make this one purple').line });

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
  t.typeEnter('make this one purple');
  await wait(500);

  const doc2 = document.querySelector('.artifactFrame iframe').contentDocument;
  const q = (id) => { const e = doc2.querySelector('[data-region="' + id + '"]'); return e && e.textContent; };
  step('10. the addressed region changed', beforeAddressed !== q(hitId),
    {region: hitId, before: beforeAddressed, after: q(hitId)});
  step('10b. the region the ink did NOT cover is untouched', beforeOther === q(otherId),
    {region: otherId, before: beforeOther, after: q(otherId)});

  const codes = mm.session.getState().nodes.get(artId).reps.filter(r=>r.modality==='code');
  step('10c. every version is held — the structure tier 1 stood first, the build, then the revision; generation is a proposal', codes.length === 3 && codes[0].source === MM.ENGINE_PARTICIPANT, {versions: codes.length, first: codes[0].source});

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

  if (!document.querySelector('#summon input.filter')) {
    step('10e. it compiled as a diagram', false, {
      reason: 'no field to build from', summon: !!sum3, miss: mm.session.getState().markMiss,
      buttons: [...document.querySelectorAll('#summon button')].map((b) => b.textContent.trim()),
    });
    return R;
  }
  t.typeEnter('a two-step process');
  await wait(500);
  const flowId = mm.session.getState().artifacts.find((a) => mm.session.getState().live.includes(a) && a !== artId);
  const flowCode = flowId && String(mm.session.getState().nodes.get(flowId).reps.filter((r) => r.modality === 'code').pop().data.code);
  step('10e. it compiled as a diagram: positioned nodes and an SVG edge following the ink',
    // No flex-direction: that is the LAYOUT scaffold's signature. (The model's
    // own inner styles may well use flex — that is content, not structure.)
    !!flowCode && /<svg class="mm-edges"/.test(flowCode) && /marker-end/.test(flowCode) &&
    /position:absolute/.test(flowCode) && !/flex-direction/.test(flowCode),
    { live: mm.session.getState().live.length, hasSvg: !!flowCode && /<svg/.test(flowCode) });
  sameAsWhole('a flowchart built beside the page, at fit-all');

  // ---- 13. Handwriting (v7 Stage E): write a word next to a shape; it becomes that shape's name ----
  {
    mm.setView(1, 260 - 1300, 200 - 1500); await wait(30); // world (1300,1500) at screen (260,200), zoom 1
    const z = mm.view.zoom;
    const base = mm.worldToScreen(1300, 1500); // clear of the flowchart and the page
    const calls13 = window.__calls.length;
    t.stroke(t.rect(base.x, base.y, 300*z, 180*z));                       // a box
    t.stroke(t.word(base.x + 40*z, base.y + 60*z, 200*z, 40*z, 7));        // a word inside it
    await wait(300);
    const stW = mm.session.getState();
    const wordId = stW.contentIds[stW.contentIds.length - 1];
    const wordNode = stW.nodes.get(wordId);
    const shape = MM.interpretationsOf(wordNode, stW.nodes).filter(r=>r.tier===0)[0];
    step('13. one cursive stroke reads as writing', !!shape && shape.label === 'text', shape && (shape.label + ' ' + shape.weight.toFixed(2)));
    // The gate (§6.3): drawing asks no model. The writing is read when the human says read.
    step('13g. drawing writing asks no model — nothing is called until you say read', window.__calls.length === calls13 && !MM.transcriptOf(wordNode), { calls: window.__calls.length - calls13 });
    const c2 = mm.worldToScreen(1450, 1590);
    t.stroke(t.circle(c2.x, c2.y, 230*z));
    const e2 = mm.worldToScreen(1450+230, 1590);
    const k2 = (230 * z) / 132;
    t.stroke(t.caret(e2.x - 60*k2, e2.y - 40*k2, 120*k2, 78*k2));
    const readPill = [...document.querySelectorAll('#summon .item')].find(b => /^Read the writing/.test(b.textContent));
    step('13h. the field offers to read the writing, marked as asking a model', !!readPill && !!readPill.querySelector('.dot') && /Read the writing/.test(mm.readField('read').line), t.chips());
    t.typeEnter('read');
    await wait(300);                                                        // the read is asynchronous
    step('13a. it was handed to the model that can see, as an image', !!window.__lastRead && window.__lastRead.hasImage && window.__calls.length === calls13 + 1, window.__lastRead);
    const said = MM.transcriptsOf(mm.session.getState().nodes.get(wordId));
    step('13b. every transcript is held on the mark, attributed and ranked', said.length === 2 && said[0].text === 'Pricing' && said[0].source === mm.agents[0].id,
      said.map(x => x.text + ' ' + x.confidence));
    // The word is now what this IS: it leads the certainty row, with its number, and taking it names the box.
    t.typeIn('');
    const chipsW = t.chips();
    step('13c. the field leads with the word as a reading, with its number, needing no model', /^“Pricing” 0\.92/.test(chipsW[0] || '') && /“Pricing”/.test(mm.readField('').line), chipsW);
    const nameChip = [...document.querySelectorAll('#summon .item')].find(b => /“Pricing”/.test(b.textContent));
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
    const drawRead = mm.readField('draw: add a footer under these');
    step('14. `draw:` typed at the field reads as the model drawing', drawRead.kind === 'draw' && /draws/.test(drawRead.line), drawRead.line);
    const before = mm.session.getState().contentIds.length;
    if (drawRead.kind === 'draw') {
      t.typeEnter('draw: add a footer under these');
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
    mm.openCC();
    step('15a. a loop around them is plain ink that waits; nothing lights up on its own, and the snap tile scopes to what it holds', stH.pendingLassoId !== null && !document.getElementById('held') && !snapBtn.hidden && /circled/.test(snapBtn.textContent) && /2/.test(snapBtn.textContent) && /cross the loop/.test(document.getElementById('status').textContent), { snap: snapBtn.textContent, status: document.getElementById('status').textContent });
    snapBtn.click();
    mm.closeCC();
    await wait(80);
    const stS = mm.session.getState();
    const cleaned = stS.contentIds.filter(id => MM.cleanOf(stS.nodes.get(id))).length;
    step('15b. Snap redraws the circled marks clean and keeps the loop waiting', cleaned >= 2 && stS.pendingLassoId !== null, { cleaned, held: stS.pendingLassoId });
    // A double-tap inside the waiting loop takes it up too — no mark needed.
    const tapAt = { x: cL.x - 40, y: cL.y + 120 * z };
    t.stroke([tapAt, tapAt]);
    const oneTap = mm.session.getState();
    t.stroke([tapAt, tapAt]);
    const stDT = mm.session.getState();
    step('15b2. one tap inside a waiting loop is nothing; a second, at once, takes the loop up without a mark', !oneTap.summon && oneTap.pendingLassoId !== null && !!stDT.summon && stDT.summon.enclosedIds.length === 2 && stDT.summon.scopeSource === 'lasso', { oneTap: !!oneTap.summon, twoTaps: !!stDT.summon, source: stDT.summon && stDT.summon.scopeSource });
    if (stDT.summon) { mm.session.undo(); }
    mm.session.deselect(Date.now());
    const stBack = mm.session.getState();
    step('15b3. undoing the double-tap leaves the loop waiting again', stBack.pendingLassoId !== null && !stBack.summon, { pending: stBack.pendingLassoId });
    t.takeLoop(cL.x, cL.y, 300*z);
    await wait(80);
    const stO = mm.session.getState();
    step('15c. the mark across the loop takes it up: the loop is a gesture now, the marks are selected, the offers open', !!stO.summon && stO.summon.enclosedIds.length === 2 && stO.summon.scopeSource === 'lasso' && stO.selection.length === 2 && !stO.contentIds.includes(stO.summon.gestureIds[0]), stO.summon && stO.summon.scopeReasoning);
    if (stO.summon) mm.session.dismiss(stO.summon.id, Date.now());
    // Let go of the selection too: with one standing, the small dot below would be the tap that
    // dismisses it and never a dot (W3), and this record needs the dot inside the box.
    if (mm.session.getState().selection.length) mm.session.deselect(Date.now());
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
    mm.setAutoRead(true); // reading as you write is the tile, on for this step
    const strokes = [
      ss({ x: 0, y: h }, { x: 0, y: 0 }).concat(ss({ x: 0, y: 0 }, { x: 18, y: h }).slice(1), ss({ x: 18, y: h }, { x: 18, y: 0 }).slice(1)),
      ss({ x: 26, y: h }, { x: 36, y: 0 }).concat(ss({ x: 36, y: 0 }, { x: 46, y: h }).slice(1)),
      ss({ x: 30, y: h * 0.6 }, { x: 42, y: h * 0.6 }),
      ss({ x: 54, y: 0 }, { x: 64, y: h }).concat(ss({ x: 64, y: h }, { x: 74, y: 0 }).slice(1)),
    ];
    for (const pts of strokes) t.stroke(pts);
    await wait(300); // the read is asynchronous
    mm.setAutoRead(false);
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
    step('16b. the field leads with the word as the box\'s name', chipsW.slice(0, 2).some(c => /^“Pricing” 0\.92/.test(c)) || /^Pricing 0\./.test(chipsW[0] || ''), chipsW);
    const nameChip = [...document.querySelectorAll('#summon .item')].find(b => /“Pricing” 0\.92/.test(b.textContent)) || [...document.querySelectorAll('#summon .item')].find(b => /^Pricing 0\./.test(b.textContent));
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
    const calls17 = window.__calls.length;
    await wait(120);
    step('17g. taking a loop up asks no model on its own', window.__calls.length === calls17, { calls: window.__calls.length - calls17 });
    t.typeEnter('what'); // What is this? — the deliberate ask
    await wait(400); // the stubbed model answers the reading
    t.typeIn('');
    const chips = t.chips();
    // In words, not a slug, by the model's name with no "llm:" (V1-PLAN J5); taking it names the group by the label.
    const proposed = chips.find(c => /^page layout 0\.78 · e2e-stub$/.test(c));
    step('17. what the model read the group as joins the certainty row, with its number, attributed — in words', !!proposed && window.__calls.length === calls17 + 1, chips);
    const btn = [...document.querySelectorAll('#summon .item')].find(b => /^page layout 0\.78/.test(b.textContent));
    if (btn) btn.click();
    const named = mm.session.getState().artifacts.map(id => MM.wordOf(mm.session.getState().nodes.get(id)));
    step('17a. blessing it holds the entry — the model proposed, the human decided', named.includes('page-layout'), named);
    trio(4200, 2400);
    const cands = mm.session.getState().clusterCandidates;
    step('17b. the next group like it is recognised by its signature: the model\'s word, in the library', cands.some(c => c.matches.some(m => m.name === 'page-layout')), cands.map(c => c.matches.map(m => m.name)));
    {
      // A tap on the chip beside the matching group opens the field on it, the match leading; undo puts it back.
      const cand = cands.find(c => c.matches.some(m => m.name === 'page-layout'));
      const cb = cand && cand.nodeIds.map(id => MM.boundsOf(mm.session.getState().nodes.get(id))).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
      // The chip sits at the dashed box's top-left corner, just above it: aim at the chip's middle.
      const pad = 14 / mm.view.zoom;
      const chipAt = cb && mm.worldToScreen(cb.minX - pad + 30 / mm.view.zoom, cb.minY - pad - 8 / mm.view.zoom - 8 / mm.view.zoom);
      if (chipAt) t.stroke([chipAt, chipAt]);
      const stChip = mm.session.getState();
      const chipsT = t.chips();
      step('17b2. a tap on the match chip opens the field on the group, the match leading, and the marks selected', !!stChip.summon && stChip.summon.scopeSource === 'pointed' && stChip.summon.enclosedIds.length === 3 && /^page-layout [01]\.\d\d$/.test(chipsT[0] || '') && stChip.selection.length === 3, { source: stChip.summon && stChip.summon.scopeSource, chips: chipsT, at: chipAt });
      if (stChip.summon) mm.session.undo();
      step('17b3. undoing the tap leaves the group as it was, still matched', !mm.session.getState().summon && mm.session.getState().clusterCandidates.some(c => c.matches.some(m => m.name === 'page-layout')));
      sameAsWhole('a match chip beside the look-alike, after an undo');
    }
    // The correction: circle the look-alike, refuse the match, and it stays refused.
    const cU = W(4280, 2400);
    t.stroke(t.circle(cU.x, cU.y, 170 * z));
    t.takeLoop(cU.x, cU.y, 170 * z); await wait(60);
    const chipsC = t.chips();
    step('17c. the field shows the match with its number and, beside it, the refusal', chipsC.some(c => /^page-layout [01]\.\d\d$/.test(c)) && chipsC.includes('Not a page-layout'), chipsC);
    const notBtn = [...document.querySelectorAll('#summon .item')].find(b => /Not a page-layout/.test(b.textContent));
    if (notBtn) notBtn.click(); await wait(60);
    const chipsD = t.chips();
    const stC = mm.session.getState();
    step('17d. refusing it is a correct event; the offer leaves the open field and the candidate goes', mm.session.getEvents().slice(-1)[0].type === 'correct' && !chipsD.some(c => /^page-layout 0\./.test(c)) && !stC.clusterCandidates.some(c => c.matches.some(m => m.name === 'page-layout')), { last: mm.session.getEvents().slice(-1)[0].type, chips: chipsD });
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
    sameAsWhole('a selection moved, let go and brought back by undo');
    mm.session.deselect(Date.now());
    // The verbs a selection was missing: duplicate and erase, through the palette.
    const c2 = W(5420, 2240);
    t.stroke(t.circle(c2.x, c2.y, 330)); t.takeLoop(c2.x, c2.y, 330); await wait(60);
    // The core slots never move; a verb typed by name is read before Enter.
    const line = (w) => mm.readField(w).line;
    step('18e. the core row is Name, Copy, Paste, Erase; erase, duplicate and copy read by name', t.coreSlots().join(',') === 'name,copy,paste,erase' && line('erase') === '↵ Erase' && line('dupl') === '↵ Duplicate these' && line('copy') === '↵ Copy' && line('delete') === '↵ Erase', { core: t.coreSlots(), erase: line('erase'), dup: line('dupl'), copy: line('copy') });
    const n18 = mm.session.getState().contentIds.length;
    t.typeEnter('dupl'); await wait(60);
    const stDup = mm.session.getState();
    step('18f. duplicate makes the ink again beside the original, and the copies are the selection', stDup.contentIds.length === n18 + 3 && stDup.selection.length === 3 && stDup.selection.every(id => !boxes.includes(id)), { content: stDup.contentIds.length, selection: stDup.selection.length });
    const copies = stDup.selection.slice();
    mm.session.deselect(Date.now());
    const cb = copies.map(id => MM.boundsOf(stDup.nodes.get(id))).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
    const cc = W((cb.minX + cb.maxX) / 2, (cb.minY + cb.maxY) / 2);
    t.stroke(t.circle(cc.x, cc.y, 330)); t.takeLoop(cc.x, cc.y, 330); await wait(60);
    t.typeEnter('erase'); await wait(60);
    const stEr = mm.session.getState();
    step('18g. erase takes the copies off the board; undo brings one back', stEr.contentIds.length === n18 && copies.every(id => !stEr.contentIds.includes(id)) && (mm.session.undo(), mm.session.getState().contentIds.length === n18 + 1), { content: stEr.contentIds.length });
    mm.session.undo(); mm.session.undo(); // the other two erases
    mm.session.deselect(Date.now());
    const stH = mm.session.getState();
    // Selection stands, the loop and the mark are gone from view: the gesture strokes are not drawn while a selection stands.
    step('18h. the copies are back', copies.every(id => stH.contentIds.includes(id)));
    copies.forEach(id => mm.session.erase(id, Date.now()));
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
    {
      // S4: the source is set in screen pixels, whatever the zoom — smaller in the document as the board zooms in, larger as it zooms out.
      const docFont = () => { try { return parseFloat(fj.iframe.contentDocument.documentElement.style.fontSize); } catch (err) { return NaN; } };
      mm.setView(0.25, 260 - 6200 * 0.25, 200 - 2100 * 0.25); await wait(40);
      const far = docFont();
      mm.setView(2, 260 - 6200 * 2, 200 - 2100 * 2); await wait(40);
      const near = docFont();
      const revealed = (() => { try { return fj.iframe.contentDocument.documentElement.classList.contains('mm-reveal'); } catch (err) { return false; } })();
      mm.setView(1, 260 - 6200, 200 - 2100); await wait(40);
      // Far out, the type grows toward 11 screen pixels but never past a dozen characters per line (the frame is 220 wide: 220 / 12).
      step('19z. the source is legible at every zoom: its type is set for the screen — larger in the document zoomed out, capped so a line keeps a dozen characters; half at double; structure revealed past 1:1', Math.abs(far - Math.min(11 / 0.25, 220 / 12)) < 0.1 && Math.abs(near - 5.5) < 0.2 && revealed, { far, near, revealed });
    }
    await wait(250);
    const b0 = mm.runtime().bodies.get(jsId);
    step('19a. nothing runs unblessed: no step before a hand plays it', !b0 && !mm.session.getState().clocks[jsId], { body: b0 || null });
    mm.session.clock({ nodeId: jsId, op: 'play', at: Date.now() });
    // Stepped by hand, so the check does not depend on how often this tab is
    // allowed a frame; the frame loop runs beside it when it can.
    for (let i = 0; i < 30; i++) await mm.runtime().stepOnce(jsId);
    const b1 = mm.runtime().bodies.get(jsId);
    const fr1 = MM.frameOf(mm.session.getState().nodes.get(jsId));
    const left1 = parseFloat(fj.wrap.style.left);
    step('19b. played, the behaviour steps in the worker and moves its frame', !!b1 && b1.x > 2 && left1 > fr1.x + 2, { x: b1 && b1.x, left: left1, frameX: fr1.x });
    mm.session.clock({ nodeId: jsId, op: 'reset', at: Date.now() }); await wait(50);
    // Still playing, so a step may already have nudged it by a fraction of a pixel.
    step('19c. reset puts the frame back where it was drawn, and keeps playing', Math.abs(parseFloat(fj.wrap.style.left) - fr1.x) < 1 && mm.session.getState().clocks[jsId].playing, { left: fj.wrap.style.left, frameX: fr1.x });
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: jsId, kind: 'js', code: 'throw new Error("boom");', at: Date.now() });
    await mm.runtime().stepOnce(jsId);
    await wait(60);
    const stJ = mm.session.getState();
    step('19d. a throwing behaviour pauses its clock with the reason and marks the frame broken', !stJ.clocks[jsId].playing && /boom/.test(stJ.clocks[jsId].reason || '') && fj.wrap.classList.contains('broken'), stJ.clocks[jsId]);
    const n0 = stJ.contentIds.length;
    const q = W(6700, 2100);
    t.stroke(t.rect(q.x, q.y, 120, 80));
    step('19e. the board survives: drawing still works after a behaviour broke', mm.session.getState().contentIds.length === n0 + 1);
    mm.session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: jsId, kind: 'js', code: 'while (true) {}', at: Date.now() });
    mm.session.clock({ nodeId: jsId, op: 'play', at: Date.now() });
    // The budget is a timer; a throttled tab fires it late, so wait for it rather than assume its pace.
    const stepping = mm.runtime().stepOnce(jsId);
    for (let i = 0; i < 40 && mm.session.getState().clocks[jsId].playing; i++) await wait(100);
    await stepping;
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
    // A hidden tab gets no frames and one timer a minute; the loop's motion is not asserted there, the hold is.
    step('20c. playing moves them by the frame loop; pause holds them where they are', (document.hidden || JSON.stringify(pA) !== JSON.stringify(p1)) && JSON.stringify(pA) === JSON.stringify(pB), { hidden: document.hidden });
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

  // ---- 24. A picture becomes ink, and the ink becomes a page inside itself ----
  {
    mm.setView(1, 260 - 9200, 200 - 2000); await wait(30);
    // A "photo" of three boxes: painted here, uneven ground and a wobbling line.
    const W0 = 300, H0 = 200;
    const off = document.createElement('canvas'); off.width = W0; off.height = H0;
    const g = off.getContext('2d');
    const grad = g.createLinearGradient(0, 0, W0, 0); grad.addColorStop(0, '#e9e6de'); grad.addColorStop(1, '#cfcabd');
    g.fillStyle = grad; g.fillRect(0, 0, W0, H0);
    g.strokeStyle = '#2a2620'; g.lineWidth = 3; g.lineJoin = 'round';
    const wob = (x, y) => [x + Math.sin(y * 0.3) * 0.8, y + Math.cos(x * 0.2) * 0.8];
    const box = (x, y, w, h) => { g.beginPath(); g.moveTo(...wob(x, y)); g.lineTo(...wob(x + w, y)); g.lineTo(...wob(x + w, y + h)); g.lineTo(...wob(x, y + h)); g.closePath(); g.stroke(); };
    box(20, 20, 260, 40); box(20, 80, 120, 100); box(160, 80, 120, 100);
    const bitmap = g.getImageData(0, 0, W0, H0);
    const before = mm.session.getState().contentIds.length;
    const res = mm.importBitmap(bitmap, 'sketch.png', { x: 9200, y: 2000 }, { size: 600, url: off.toDataURL('image/png') });
    const stP = mm.session.getState();
    const traced = stP.contentIds.slice(before).filter(id => MM.strokePointsOf(stP.nodes.get(id)));
    const reads = traced.map(id => MM.topInterpretation(stP.nodes.get(id)));
    step('24. a picture of three boxes is traced into three rectangles of ink, and the picture is kept beside them', res.strokes === 3 && reads.filter(r => r === 'rectangle').length === 3 && !!res.imageId && stP.artifacts.includes(res.imageId), { reads, reasoning: res.reasoning });
    // Declared content: the traced boxes never read as a loop or a mark.
    step('24a. traced ink is declared content — nothing waits as a loop', stP.pendingLassoId === null && !stP.summon);
    // Circle the traced ink and prompt it into a page: the page renders inside its own ink.
    const cP = mm.worldToScreen(9500, 2200);
    t.stroke(t.circle(cP.x, cP.y, 340));
    t.takeLoop(cP.x, cP.y, 340); await wait(60);
    const inputP = t.typeEnter('a page with a banner and two columns');
    const makeP = inputP;
    await wait(400);
    const stQ = mm.session.getState();
    const pageId = stQ.live.find(id => { const r = codeRepOfNode(stQ.nodes.get(id)); return r && r.data.kind === 'html' && stQ.nodes.get(id).edges.some(e => e.rel === 'has-part' && traced.includes(e.to)); });
    const regions = pageId ? MM.regionsOf(stQ.nodes.get(pageId), stQ.nodes) : [];
    step('24b. the traced ink prompts into a living page inside its own ink: three regions, one per box', !!pageId && regions.length === 3, { pageId, regions: regions.length, live: stQ.live.length, mp: document.getElementById('mpStatus').textContent, summon: !!stQ.summon, enclosed: stQ.summon && stQ.summon.enclosedIds.length, hadMake: !!makeP, hadInput: !!inputP, lastSys: (window.__calls.slice(-1)[0] || {}).system, traced: traced.length, participants: stQ.participants, agentId: mm.agents.map(a => a.id), artifacts: stQ.artifacts.slice(-2) });
    // SVG in, and the board out.
    const svgId = mm.importText('figure.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect x="5" y="5" width="40" height="50"/><circle cx="75" cy="30" r="20"/></svg>', { x: 9200, y: 2700 });
    const svgNode = svgId && mm.session.getState().nodes.get(svgId);
    step('24c. an SVG file is an artifact of its kind, its elements addressable', !!svgNode && codeRepOfNode(svgNode).data.kind === 'svg' && MM.addressablesOf('svg', codeRepOfNode(svgNode).data.code).length === 2);
    const svgOut = mm.exportBoardSVG();
    const logOut = JSON.parse(mm.exportLog());
    step('24d. the board exports as SVG paths, one per stroke, and the session as its log', /<path data-node="/.test(svgOut) && (svgOut.match(/<path /g) || []).length >= 3 && Array.isArray(logOut) && logOut.length === mm.session.getEvents().length, { paths: (svgOut.match(/<path /g) || []).length });
  }

  // ---- 25. Text as an element: typed on the canvas, wired into a page's heading, revised in place ----
  {
    mm.setView(1, 260 - 10200, 200 - 2000); await wait(30);
    const pageT = mm.importText('card.html', '<h1 data-region="title">Untitled</h1><p data-region="body">Some words.</p>', { x: 10200, y: 2000 }, 360);
    const textId = mm.typeText({ x: 10200, y: 2320 }, 'Hello, world');
    const stT = mm.session.getState();
    const tn = stT.nodes.get(textId);
    step('25. typed words are a text artifact: a file of words, live, its paragraphs addressable', !!tn && stT.live.includes(textId) && codeRepOfNode(tn).data.kind === 'text' && MM.addressablesOf('text', codeRepOfNode(tn).data.code).length === 1, { kind: tn && codeRepOfNode(tn).data.kind });
    // Frame the text with the page: the words feed the title slot, best name match.
    const cT = mm.worldToScreen(10380, 2200);
    t.stroke(t.circle(cT.x, cT.y, 330)); t.takeLoop(cT.x, cT.y, 330); await wait(60);
    const fc = [...document.querySelectorAll('#summon .item')].find(x => /^Frame these/.test(x.textContent));
    const ff = document.querySelector('#summon input.filter'); if (ff) ff.value = 'card';
    if (fc) fc.click(); await wait(80);
    const wiredT = mm.wiredCodeOf(pageT);
    step('25a. framed with a page, the words land in a slot: the heading reads what was typed', !!wiredT && /<h1 data-region="title">Hello, world<\/h1>/.test(wiredT), wiredT);
    // Revise in place: the editor opens on the text, Enter commits a new version, the page follows.
    step('25b. the editor opens on the text where it stands', mm.beginTextEdit(textId) && !document.getElementById('textEditor').hidden && document.getElementById('textEditor').value === 'Hello, world');
    document.getElementById('textEditor').value = 'Hello again';
    document.getElementById('textEditor').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(60);
    const versions = mm.session.getState().nodes.get(textId).reps.filter(r => r.modality === 'code').length;
    const wiredT2 = mm.wiredCodeOf(pageT);
    step('25c. Enter keeps the revision as a new version — the earlier one held — and the page\'s heading follows', versions === 2 && /Hello again<\/h1>/.test(wiredT2) && document.getElementById('textEditor').hidden && mm.session.getEvents().slice(-1)[0].type === 'code', { versions, head: wiredT2 && wiredT2.slice(0, 60) });
    // A written word becomes text on request: the word the model read earlier.
    const stW2 = mm.session.getState();
    const pricing = stW2.contentIds.find(id => MM.transcriptOf(stW2.nodes.get(id)) === 'Pricing');
    if (pricing) {
      const pb = MM.boundsOf(stW2.nodes.get(pricing));
      mm.setView(1, 260 - pb.minX + 100, 200 - pb.minY + 100); await wait(30);
      const pc = mm.worldToScreen((pb.minX + pb.maxX) / 2, (pb.minY + pb.maxY) / 2);
      const pr = Math.max(pb.maxX - pb.minX, pb.maxY - pb.minY) * 0.9 + 40;
      t.stroke(t.circle(pc.x, pc.y, pr)); t.takeLoop(pc.x, pc.y, pr); await wait(60);
      const mk = [...document.querySelectorAll('#summon .item')].find(x => /Make it text “Pricing”/.test(x.textContent));
      step('25d. circling the written word offers to make it text, with what the model read', !!mk, t.chips());
      if (mk) mk.click(); await wait(60);
      const stX = mm.session.getState();
      const made = stX.artifacts.map(id => stX.nodes.get(id)).find(n => { const r = codeRepOfNode(n); return r && r.data.kind === 'text' && r.data.code === 'Pricing'; });
      step('25e. …and taking it makes a text artifact of the word where the writing is; the ink stays', !!made && stX.contentIds.includes(pricing), { made: !!made });
    } else {
      step('25d. (no read word on the board to convert — skipped honestly)', true);
    }
  }

  // ---- 26. Free text at a loop is a brief: four boxes, "website about dolphins", Enter ----
  {
    mm.setView(1, 260 - 11200, 200 - 2000); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    [[11200, 2000], [11440, 2000], [11200, 2160], [11440, 2160]].forEach(([x, y]) => { const p = W(x, y); t.stroke(t.rect(p.x, p.y, 200, 120)); });
    const cB = W(11420, 2140);
    t.stroke(t.circle(cB.x, cB.y, 330)); t.takeLoop(cB.x, cB.y, 330); await wait(60);
    const before26 = mm.session.getState().live.length;
    const field = document.querySelector('#summon input.filter');
    field.value = 'website about dolphins';
    field.dispatchEvent(new Event('input'));
    const shownNow = [...document.querySelectorAll('#summon .item')].map(b => b.querySelector('span').textContent.trim());
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const thinking = /building “website/.test(document.getElementById('status').textContent);
    await wait(400);
    const st26 = mm.session.getState();
    const built = st26.live.length === before26 + 1;
    const newest = built && st26.nodes.get(st26.live[st26.live.length - 1]);
    step('26. free text that names no verb goes to the model as the brief, with the thinking shown while it works', built && thinking && MM.wordOf(newest) === 'website about dolphins' && !/building “website/.test(document.getElementById('status').textContent), { built, thinking, shownWhileTyping: shownNow, status: document.getElementById('status').textContent.slice(0, 120) });
  }

  // ---- 27. The moment: two circles, "torus in 3d", a program in the frame; then the library answers first ----
  {
    mm.setView(1, 260 - 12200, 200 - 2000); await wait(30);
    const W = (x, y) => mm.worldToScreen(x, y);
    const c1 = W(12400, 2200);
    t.stroke(t.circle(c1.x, c1.y, 150)); t.stroke(t.circle(c1.x, c1.y, 60));
    t.stroke(t.circle(c1.x, c1.y, 230)); t.takeLoop(c1.x, c1.y, 230); await wait(60);
    const calls0 = window.__calls.length;
    const f27 = document.querySelector('#summon input.filter');
    f27.value = 'torus in 3d'; f27.dispatchEvent(new Event('input'));
    step('27. typing a brief the library cannot answer completes to nothing from the library', ![...document.querySelectorAll('#summon .item')].some(b => /in the library/.test(b.title)));
    f27.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(400);
    const st27 = mm.session.getState();
    const runId = st27.live[st27.live.length - 1];
    const runRep = runId && codeRepOfNode(st27.nodes.get(runId));
    const fr27 = runId && mm.frames.get(runId);
    step('27a. the brief becomes a program: run code on the circled drawing, playing because the human asked, in a scripts-only frame', !!runRep && runRep.data.kind === 'run' && st27.clocks[runId] && st27.clocks[runId].playing && fr27 && fr27.iframe.getAttribute('sandbox') === 'allow-scripts' && fr27.wrap.classList.contains('run') && window.__calls.length === calls0 + 1, { kind: runRep && runRep.data.kind, sandbox: fr27 && fr27.iframe.getAttribute('sandbox'), calls: window.__calls.length - calls0 });
    step('27b. the model was told what the library holds', /THE LIBRARY holds:\n  \(nothing yet\)/.test((window.__lastProgram || {}).user || ''), (window.__lastProgram || {}).user && window.__lastProgram.user.split('\n').slice(-4));
    // The frame reports its parts: wait for the first report.
    let parts = [];
    for (let i = 0; i < 30 && !parts.length; i++) { await wait(100); parts = mm.reportedRegions(runId); }
    step('27c. the running program reports its parts back to the canvas', parts.some(p => p.id === 'torus'), parts);
    // Ink over the part: a loop on the running frame addresses it by name. The
    // loop is begun OUTSIDE the playing frame (a hand that lands inside a
    // playing program is the program's, v10 D2) and swings in across it; the
    // mark that takes it up lands inside the waiting loop, which is the hand's.
    const on = W(12400, 2200);
    t.stroke(t.circle(on.x, on.y, 260)); t.takeLoop(on.x, on.y, 260); await wait(60);
    const sumOn = mm.session.getState().summon;
    const addressed = sumOn && sumOn.onArtifact ? mm.regionsUnderInk(sumOn.onArtifact.artifactId, MM.boundsOf(mm.session.getState().nodes.get(sumOn.gestureIds[0]))) : [];
    step('27d. ink over the running frame lands on the part the program named', !!sumOn && !!sumOn.onArtifact && sumOn.onArtifact.artifactId === runId && addressed.includes('torus'), { onArtifact: sumOn && sumOn.onArtifact, addressed });
    {
      // A program that throws LATER — in a timer — is reported like one that throws now: the clock pauses with the reason, the frame is broken.
      // Its own artifact (a file of the run kind), so the torus and the library are untouched; erased afterwards.
      if (sumOn) mm.session.dismiss(sumOn.id, Date.now());
      // Imported, then played at once — two documents in one tick, which is the case that used to lose the second.
      const lateId = mm.importText('late.run.js', 'setTimeout(function(){ throw new Error("later"); }, 10);', { x: 11960, y: 2020 }, 120); // in view: a cross-origin frame off-screen has its timers throttled by the browser
      mm.session.clock({ nodeId: lateId, op: 'play', at: Date.now() });
      // The harness starts when three.js loads or after its four-second fallback. Waited on a plain timer: the
      // message-hop wait saturates the event loop and starves a frame that is still loading.
      for (let i = 0; i < 24 && (mm.session.getState().clocks[lateId] || {}).playing; i++) await new Promise((r) => setTimeout(r, 500));
      const stL = mm.session.getState();
      const fL = mm.frames.get(lateId);
      const lateRep = codeRepOfNode(stL.nodes.get(lateId));
      step('27d2. an error thrown later inside a program pauses its clock with the reason and marks the frame broken — a program played the moment it was imported', !!stL.clocks[lateId] && !stL.clocks[lateId].playing && /later/.test(stL.clocks[lateId].reason || '') && !!fL && fL.wrap.classList.contains('broken'), { clock: stL.clocks[lateId], kind: lateRep && lateRep.data.kind, parked: !!(fL && fL.parked), frames: mm.frames.size, hidden: document.hidden });
      mm.session.erase(lateId, Date.now());
    }
    if (sumOn) mm.session.dismiss(sumOn.id, Date.now());
    // The library answers first: another nested pair, "torus" typed — the entry completes, Enter reuses it, no model is asked.
    const c2 = W(12900, 2200);
    t.stroke(t.circle(c2.x, c2.y, 150)); t.stroke(t.circle(c2.x, c2.y, 60));
    t.stroke(t.circle(c2.x, c2.y, 230)); t.takeLoop(c2.x, c2.y, 230); await wait(60);
    const calls1 = window.__calls.length;
    const f27b = document.querySelector('#summon input.filter');
    f27b.value = 'torus'; f27b.dispatchEvent(new Event('input'));
    const libPill = [...document.querySelectorAll('#summon .item')].find(b => /in the library/.test(b.title) && /^torus in 3d/.test(b.textContent));
    step('27e. typing the entry\'s name completes to it from the library', !!libPill, [...document.querySelectorAll('#summon .item')].map(b => b.querySelector('span').textContent.trim()).slice(0, 6));
    f27b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(120);
    const st27e = mm.session.getState();
    const reusedId = st27e.live[st27e.live.length - 1];
    const reusedRep = reusedId && codeRepOfNode(st27e.nodes.get(reusedId));
    step('27f. Enter reuses the entry: the same program on the new drawing, running, and no model was asked', reusedId !== runId && !!reusedRep && reusedRep.data.kind === 'run' && reusedRep.data.from === runId && reusedRep.data.code === runRep.data.code && st27e.clocks[reusedId].playing && window.__calls.length === calls1, { from: reusedRep && reusedRep.data.from, calls: window.__calls.length - calls1 });
    // And a brief that names the entry in other words goes to the model, which points at the library.
    const c3 = W(12400, 2700);
    t.stroke(t.circle(c3.x, c3.y, 150)); t.stroke(t.circle(c3.x, c3.y, 60));
    t.stroke(t.circle(c3.x, c3.y, 230)); t.takeLoop(c3.x, c3.y, 230); await wait(60);
    const f27c = document.querySelector('#summon input.filter');
    f27c.value = 'new: a torus that spins'; f27c.dispatchEvent(new Event('input'));
    f27c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(400);
    const st27g = mm.session.getState();
    const thirdId = st27g.live[st27g.live.length - 1];
    const thirdRep = thirdId && codeRepOfNode(st27g.nodes.get(thirdId));
    step('27g. asked fresh, the model is briefed with the library and may still point at it — the entry is reused, attributed to the reuse', !!thirdRep && thirdRep.data.from === runId && /THE LIBRARY holds:\n  - torus in 3d/.test(window.__lastProgram.user), { from: thirdRep && thirdRep.data.from, mp: document.getElementById('mpStatus').textContent });
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
  {
    // A scratch one pass short erases nothing and says how close it was.
    // At hand size: fitted out, two small strokes side by side are letters.
    mm.setView(1, 260 - 150, 300 - 700); await wait(30);
    const p0 = mm.worldToScreen(150, 700), p1 = mm.worldToScreen(300, 700);
    t.stroke(t.line(p0, p1, 30));
    const n0 = mm.session.getState().contentIds.length;
    const z = mm.view.zoom;
    const A = mm.worldToScreen(170, 670), B = mm.worldToScreen(190, 732), Cc = mm.worldToScreen(212, 670), D = mm.worldToScreen(250, 682);
    t.stroke(t.line(A, B, 20).concat(t.line(B, Cc, 20).slice(1), t.line(Cc, D, 14).slice(1)));
    const stN = mm.session.getState();
    step('11c. a scratch that crossed a mark twice erases nothing, and the status says one more pass would', stN.contentIds.length === n0 + 1 && /crossed it twice/.test(document.getElementById('status').textContent), { status: document.getElementById('status').textContent, z });
    mm.session.undo(); mm.session.undo();
    mm.fitAll(); await wait(60);
  }

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

    const first = document.querySelector('#summon .item');
    step('12d. the palette leads with what needs no model',
      !!first && !first.querySelector('.dot'), { first: first ? first.textContent.trim() : null });

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

  // ---- 12g. Magnets: a connector released near a mark's site binds to it ----
  while (mm.session.getEvents().length) mm.session.undo();
  mm.setView(1, 0, 0); await wait(30);
  {
    t.stroke(t.rect(300, 300, 200, 140)); await wait(60); // corners (300,300)…(500,440)
    // A line taller than the letter caps, ending 8px from the box's bottom-right
    // corner: inside the hand's radius. (Letter-sized strokes never snap — the
    // 16/33 guard — so the test connector must be bigger than a letter.)
    t.stroke(t.line({x: 700, y: 600}, {x: 508, y: 448}, 30)); await wait(60);
    const st1 = mm.session.getState();
    const box = st1.contentIds[st1.contentIds.length - 2];
    const ln1 = st1.contentIds[st1.contentIds.length - 1];
    const n1 = st1.nodes.get(ln1);
    const pts1 = MM.strokePointsOf(n1);
    const end1 = pts1[pts1.length - 1];
    const bound = n1.edges.filter(e => e.rel === 'bound-to' && e.to === box);
    step('12g. a line released near a corner lands on it, and the bind is an edge in the log',
      bound.length === 1 && Math.abs(end1.x - 500) < 3 && Math.abs(end1.y - 440) < 3,
      { end: { x: Math.round(end1.x), y: Math.round(end1.y) }, edges: bound.length });
    // A line drawn past every site binds to nothing — an offer, never a trap.
    t.stroke(t.line({x: 900, y: 700}, {x: 1100, y: 760}, 30)); await wait(60);
    const st2 = mm.session.getState();
    const ln2 = st2.contentIds[st2.contentIds.length - 1];
    step('12h. a line drawn past every site is plain ink',
      !st2.nodes.get(ln2).edges.some(e => e.rel === 'bound-to'));
    // Undo is event-granular: the second line goes first, then the bind.
    mm.session.undo();
    step('12i. undo takes the second line back first', !mm.session.getState().contentIds.includes(ln2));
    mm.session.undo();
    const st3 = mm.session.getState();
    step('12j. and the next undo lets the bind go; the first line stays',
      !st3.nodes.get(ln1).edges.some(e => e.rel === 'bound-to') && st3.contentIds.includes(ln1));
    // The guard: a command mark begun 11px off the corner is still the mark —
    // its shape is its meaning, and magnets never pull it (found by e2e 12b).
    t.stroke(t.check(492, 430, 1));
    const st4 = mm.session.getState();
    step('12k. the check beside the box is read as the mark, not pulled onto a site',
      !!st4.summon && st4.summon.enclosedIds.length >= 1,
      { summon: !!st4.summon, miss: st4.markMiss });
    if (st4.summon) mm.session.dismiss(st4.summon.id, Date.now());
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
  mm.setAutoRead(!!window.__autoReadBefore);
  try { if (window.__usesBefore) localStorage.setItem('mm-palette-uses', window.__usesBefore); if (window.__usesHereBefore) localStorage.setItem('mm-palette-uses-here', window.__usesHereBefore); } catch (e) {}
  step('12. the rail follows the grammar — undoing the teach restores the check',
    mm.session.getState().commandMark === null &&
    document.getElementById('markName').textContent === 'check',
    { mark: mm.session.getState().commandMark, chip: document.getElementById('markName').textContent });

  // ---- 28. A live room: another hand's log arrives live, its ink in its own colour ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const hub = new MM.LocalHub();
    const other = new MM.LiveStore(hub.connect(), 'alice', 'table');
    // Alice drew a box before this hand joined; joining says hello and gets her log.
    const s2 = MM.createSession(); s2.addStroke(t.rect(100, 100, 120, 80).map(p => ({ x: p.x, y: p.y })), 1000);
    await other.appendLog('alice', s2.getEvents());
    await mm.openLive('table', { transport: hub.connect() });
    for (let i = 0; i < 20 && mm.session.getState().contentIds.length < 1; i++) await new Promise(r => setTimeout(r, 100));
    const st28 = mm.session.getState();
    const theirs = st28.contentIds.map(id => st28.nodes.get(id)).filter(n => MM.authorOf(n) === 'participant:hand:alice');
    step('28. joining a room brings the other hand\'s log, its marks attributed to a participant of her name', theirs.length === 1 && st28.participants.includes('participant:hand:alice') && MM.wordOf(st28.nodes.get('participant:hand:alice')) === 'alice', { theirs: theirs.length, participants: st28.participants });
    step('28a. her ink draws in her own colour, not yours and not a model\'s', theirs.length === 1 && mm.handColour('alice') !== mm.handColour('bob') && /^hsl\(/.test(mm.handColour('alice')), { colour: mm.handColour('alice') });
    // She draws again while this hand is in the room: it lands live.
    const s3 = MM.createSession(); s3.load(s2.getEvents()); s3.addStroke(t.circle(400, 160, 40).map(p => ({ x: p.x, y: p.y })), 2000);
    await other.appendLog('alice', s3.getEvents().slice(s2.getEvents().length));
    for (let i = 0; i < 20 && mm.session.getState().contentIds.length < 2; i++) await new Promise(r => setTimeout(r, 100));
    const st28b = mm.session.getState();
    step('28b. a mark she makes now lands on this board within a moment', st28b.contentIds.length === 2 && /with alice/.test(document.getElementById('status').dataset.standing || ''), { content: st28b.contentIds.length, standing: document.getElementById('status').dataset.standing });
    // This hand draws: alice's store hears it under this hand's name, and the merge keeps both.
    t.stroke(t.rect(600, 100, 120, 80));
    await mm.saveNow(); await wait(200);
    const herLogs = await other.readLogs();
    const me28 = mm.folder().me;
    step('28c. what this hand draws reaches her under its own name — the person\'s, with this tab\'s suffix — and this board keeps both hands\' marks', !!herLogs[me28] && herLogs[me28].length >= 1 && mm.session.getState().contentIds.length === 3 && me28 !== 'alice' && /~/.test(me28), { mine: herLogs[me28] && herLogs[me28].length, me: me28, hers: Object.keys(herLogs) });
    // She draws again AFTER this hand sent: the line lands between a send and a merge, and this hand's mark must stand once, not twice.
    const s4 = MM.createSession(); s4.load(s3.getEvents()); s4.addStroke(t.circle(400, 300, 30).map(p => ({ x: p.x, y: p.y })), 3000);
    await other.appendLog('alice', s4.getEvents().slice(s3.getEvents().length));
    for (let i = 0; i < 20 && mm.session.getState().contentIds.length < 4; i++) await new Promise(r => setTimeout(r, 100));
    await wait(100);
    const st28c2 = mm.session.getState();
    const mine28 = st28c2.contentIds.map(id => st28c2.nodes.get(id)).filter(n => MM.authorOf(n) === MM.LOCAL_PARTICIPANT);
    step('28c2. a line that lands after this hand sent does not double this hand\'s marks', st28c2.contentIds.length === 4 && mine28.length === 1, { content: st28c2.contentIds.length, mine: mine28.length });
    mm.session.undo();
    step('28d. undo takes back this hand\'s mark and leaves hers', mm.session.getState().contentIds.length === 3);
    sameAsWhole('a room: another hand\'s marks in her colour, after this hand\'s undo');
    // Ids that hold (DIRECTOR-PLAN-W2 L1): the undo is SENT, so she no longer
    // holds the mark under a number this hand will never use again.
    await mm.saveNow(); await wait(150);
    const mine28e = () => mm.session.getEvents().filter(e => !e.by);
    const hers28e = (await other.readLogs())[me28] || [];
    step('28e. the undo reaches her — her copy of this hand\'s log is this hand\'s log again, the mark gone', JSON.stringify(hers28e) === JSON.stringify(mine28e()) && !hers28e.some(e => e.type === 'stroke'), { hers: hers28e.map(e => e.type), mine: mine28e().map(e => e.type) });
    // A tab's page load is one sitting: joining again keeps its name, and what
    // she holds of it is replaced by the whole log, not doubled.
    await mm.openLive('table', { transport: hub.connect() });
    await wait(150);
    const again28f = (await other.readLogs())[me28] || [];
    step('28f. joining again in the same page load is the same sitting — the same name — and her copy of this hand is replaced, not doubled', mm.folder().me === me28 && JSON.stringify(again28f) === JSON.stringify(mine28e()), { me: mm.folder().me, me28, hers: again28f.length, mine: mine28e().length });
    step('28g. no suffix is kept where a reload would find it — a reload is a new sitting under a new name', (() => { try { return sessionStorage.getItem('mm-tab') === null; } catch (e) { return true; } })());
    // A second hand under this tab's own name — a duplicated tab, a restart
    // that reused a suffix: both hands are told, this one in its status line.
    const twin = new MM.LiveStore(hub.connect(), me28, 'table');
    twin.hello();
    const standing28 = () => document.getElementById('status').dataset.standing || '';
    for (let i = 0; i < 30 && !/two hands are both called/.test(standing28()); i++) await wait(50);
    step('28h. a second hand under this tab\'s own name is said in this tab\'s status line — and the second hand is told too', /two hands are both called "[^"]+~[^"]+" — this one/.test(standing28()) && twin.collisions().length === 1, { standing: standing28(), twin: twin.collisions() });
    twin.close();
    // A room the relay has outlived: the relay's own word, said in the status line.
    let deliver28 = null;
    await mm.openLive('elsewhere', { transport: { send() {}, onMessage(cb) { deliver28 = cb; return () => { deliver28 = null; }; } } });
    deliver28({ relay: 'truncated', room: 'elsewhere', dropped: 12, kept: 5000 });
    for (let i = 0; i < 30 && !/older than the relay remembers/.test(standing28()); i++) await wait(50);
    step('28i. a room older than the relay remembers says so in the status line', /the room is older than the relay remembers — 12 earlier lines are gone/.test(standing28()), { standing: standing28() });
    // One event, applied once (V1-PLAN L1b). The same stamped event heard in
    // two logs — a tab that joined again under another person's name hands its
    // log on under the new name while the room still holds the old one — is
    // one mark. Merged as two, it was applied twice: one node, its id listed
    // twice on the board.
    const dora = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'dora~d1' }));
    const doraBox = dora.addStroke(t.rect(900, 100, 120, 80).map(p => ({ x: p.x, y: p.y })), 5000);
    const doraLog = dora.getEvents().slice();
    const before28j = mm.session.getState().contentIds.length;
    deliver28({ participant: 'dora~d1', events: doraLog, at: 5000, sid: 'sitting-d' });
    deliver28({ participant: 'dory~d1', events: doraLog.map(e => Object.assign({}, e)), at: 5100, sid: 'sitting-d', full: true });
    for (let i = 0; i < 30 && !mm.session.getState().contentIds.includes(doraBox); i++) await wait(50);
    await wait(100);
    const st28j = mm.session.getState();
    step('28j. one stamped event heard in two logs is one mark, applied once — never its id listed twice',
      st28j.contentIds.filter(id => id === doraBox).length === 1 && st28j.contentIds.length === before28j + 1 && mm.session.getEvents().filter(e => e.origin === 'dora~d1').length === 1,
      { box: doraBox, listed: st28j.contentIds.filter(id => id === doraBox).length, content: st28j.contentIds.length, was: before28j });
    // Two DIFFERENT events under one number are two writers under one name:
    // the first is kept, and the room says so where it says everything else.
    const forged28 = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'dora~d1' }));
    forged28.addStroke(t.circle(1100, 300, 40).map(p => ({ x: p.x, y: p.y })), 6000);
    deliver28({ participant: 'eve~e1', events: forged28.getEvents().slice(), at: 6000, sid: 'sitting-e' });
    for (let i = 0; i < 30 && !/two different events are both "dora~d1" number 1/.test(standing28()); i++) await wait(50);
    const st28k = mm.session.getState();
    step('28k. two different events under one number: the first is kept, and the status line says two hands wrote under one name',
      /two different events are both "dora~d1" number 1 — the one in dora~d1's log is kept and the one in eve~e1's is left out/.test(standing28())
        && st28k.contentIds.filter(id => id === doraBox).length === 1 && st28k.contentIds.length === before28j + 1,
      { standing: standing28(), content: st28k.contentIds.length, was: before28j });
    // A room merges a line, not the board (V1-PLAN R4d). Dora draws again,
    // later than anything on this board: her line is APPLIED — the board's log
    // is the same log, one event longer, and nothing asked of it before stays
    // unanswerable — rather than the whole room merged and replayed from zero.
    const told28 = { n: 0 };
    const off28 = mm.session.subscribe(() => { told28.n++; });
    const log28l = mm.session.getEvents(), len28l = log28l.length, gen28l = mm.session.getState().generation;
    const dora2 = dora.addStroke(t.rect(900, 320, 120, 80).map(p => ({ x: p.x, y: p.y })), Date.now() + 60000);
    deliver28({ participant: 'dora~d1', events: dora.getEvents().slice(-1), at: 8000, sid: 'sitting-d' });
    for (let i = 0; i < 30 && !mm.session.getState().contentIds.includes(dora2); i++) await wait(50);
    step('28l. a line that lands after everything on the board is applied, not the board replayed: the same log one event longer, the board not replaced',
      mm.session.getState().contentIds.includes(dora2) && mm.session.getEvents() === log28l && mm.session.getEvents().length === len28l + 1 && mm.session.getState().generation === gen28l,
      { landed: mm.session.getState().contentIds.includes(dora2), sameLog: mm.session.getEvents() === log28l, events: mm.session.getEvents().length, was: len28l, generation: mm.session.getState().generation, gen: gen28l });
    // Lines that change no log do no work: a newcomer's hello, the relay's
    // word, a whole log this board already holds. The board is not merged,
    // not replayed, and its subscribers — the paint among them — are not told.
    const told28m = told28.n;
    deliver28({ participant: 'zed~z1', events: [], at: 9000, hello: true, sid: 'sitting-z' });
    deliver28({ relay: 'truncated', room: 'elsewhere', dropped: 13, kept: 5000 });
    deliver28({ participant: 'dora~d1', events: dora.getEvents().slice(), at: 9500, full: true, sid: 'sitting-d' });
    await wait(150);
    step('28m. a hello, the relay\'s word and a whole log already held do no work — the board untouched, the paint not asked',
      told28.n === told28m && mm.session.getEvents() === log28l && mm.session.getEvents().length === len28l + 1 && /13 earlier lines are gone/.test(standing28()),
      { told: told28.n - told28m, sameLog: mm.session.getEvents() === log28l, standing: standing28() });
    off28();
    if (mm.folder().store && mm.folder().store.close) mm.folder().store.close();
    mm.session.load([]);
  }

  // ---- 23. The folder as the canvas: files are artifacts, ink is a log in the folder, a second machine sees it ----
  {
    const store = new MM.MemoryStore({
      'index.html': '<div data-region="r1">hello</div>',
      'notes/a.md': '# A note',
      'scripts/x.js': 'const N = 1;\nreturn N;',
      'Makefile': 'all:',
    });
    await mm.openStore(store, 'store', 'fake');
    const st = mm.session.getState();
    const paths = st.artifacts.map(id => { const r = st.nodes.get(id).reps.find(x => x.modality === 'code'); return r && r.data.path; }).filter(Boolean).sort();
    step('23. opening a folder: every file of a known kind is an artifact of its kind, at its path; the Makefile is not', paths.join(',') === 'index.html,notes/a.md,scripts/x.js' && st.live.length === 3 && /folder fake · 3 files/.test(document.getElementById('status').dataset.standing), { paths, status: document.getElementById('status').dataset.standing });
    const before = mm.session.getEvents().length;
    const bx = mm.worldToScreen(100, -300);
    t.stroke(t.rect(bx.x, bx.y, 120, 80));
    await mm.saveNow();
    const logPath = MM.logPathFor(mm.folder().me);
    const saved = store.paths().includes(logPath) ? MM.decodeLog(await store.read(logPath)).events : [];
    step('23a. ink drawn on it is this participant\'s log in the folder, imports and all', saved.length === before + 1 && saved.filter(ev => ev.type === 'import').length === 3 && saved[saved.length - 1].type === 'stroke', { saved: saved.length, before, logPath });
    // The second machine: the same folder, opened again.
    await mm.openStore(store, 'store', 'fake');
    const st2 = mm.session.getState();
    step('23b. opened again — the second machine after a pull — the board is back and nothing is discovered twice', st2.artifacts.length === 3 && mm.session.getEvents().length === before + 1 && st2.contentIds.length === 4, { artifacts: st2.artifacts.length, events: mm.session.getEvents().length, content: st2.contentIds.length });
    // The live budget: sixteen pages, twelve live, the rest parked.
    const many = {};
    for (let i = 0; i < 16; i++) many['p' + i + '.html'] = '<p data-region="r1">' + i + '</p>';
    await mm.openStore(new MM.MemoryStore(many), 'store', 'many');
    await wait(60);
    const iframes = document.querySelectorAll('#stage .artifactFrame iframe').length;
    const parked = document.querySelectorAll('#stage .artifactFrame.parked').length;
    step('23c. past the live budget, artifacts are parked cards, and the status says so', iframes === 12 && parked === 4 && /12 of 16 live/.test(document.getElementById('status').dataset.standing), { iframes, parked, standing: document.getElementById('status').dataset.standing });
    // Views: the grid lists every artifact; a card focuses it; Esc is the canvas again.
    mm.setViewMode('grid');
    const cards = document.querySelectorAll('#grid .card').length;
    document.querySelector('#grid .card').click();
    const focused = mm.viewMode() === 'focus';
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    step('23d. grid: every artifact as a card; a card focuses it; Escape is the canvas', cards === 16 && focused && mm.viewMode() === 'canvas', { cards, focused, mode: mm.viewMode() });
    mm.session.load([]);
  }

  // ---- 29. A playing program takes the pointer; ink that starts outside goes over it (v10 T1, D2) ----
  {
    mm.setView(1, 0, 0);
    const code = 'mm.report("idle", 0, 0, 1, 1); mm.onPointer(function(p){ if (p.type === "down") mm.report("hit", p.x - 4, p.y - 4, 8, 8); });';
    const touchId = mm.importText('touch.run.js', code, { x: 300, y: 300 }, 200); // 200 × 132 in world units
    mm.session.clock({ nodeId: touchId, op: 'play', at: Date.now() }); // play is the hand's event: an imported program waits for it
    let until = performance.now() + 6000;
    while (performance.now() < until && !mm.reportedRegions(touchId).some(r => r.id === 'idle')) await wait(100);
    const s29 = mm.session.getState();
    const before = s29.contentIds.length;
    const inside = mm.worldToScreen(400, 360);
    t.stroke([{ x: inside.x, y: inside.y }]); // a tap: down and up at one point, inside the frame
    until = performance.now() + 3000;
    while (performance.now() < until && !mm.reportedRegions(touchId).some(r => r.id === 'hit')) await wait(100);
    const hit = mm.reportedRegions(touchId).find(r => r.id === 'hit');
    step('29. a tap inside a playing program reaches it — the program reported a part where the tap landed, in its own pixels — and drew nothing', !!hit && Math.abs(hit.x - 96) < 2 && Math.abs(hit.y - 56) < 2 && mm.session.getState().contentIds.length === before && s29.clocks[touchId] && s29.clocks[touchId].playing, { hit, content: mm.session.getState().contentIds.length - before, playing: !!(s29.clocks[touchId] && s29.clocks[touchId].playing), parts: mm.reportedRegions(touchId) });
    const a = mm.worldToScreen(250, 280), b = mm.worldToScreen(550, 420);
    t.stroke(t.line(a, b, 40)); // begun outside the frame, dragged across it
    step('29a. a stroke begun outside the frame is ink across it', mm.session.getState().contentIds.length === before + 1, { content: mm.session.getState().contentIds.length - before });
    document.getElementById('canvas').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, isPrimary: true, bubbles: true, clientX: inside.x, clientY: inside.y, buttons: 0 }));
    const overFrame = document.getElementById('canvas').style.cursor;
    const outside = mm.worldToScreen(100, 100);
    document.getElementById('canvas').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, isPrimary: true, bubbles: true, clientX: outside.x, clientY: outside.y, buttons: 0 }));
    step('29b. over a playing frame the cursor says the frame is live to the hand; off it, the pen again', overFrame === 'default' && document.getElementById('canvas').style.cursor === 'crosshair', { overFrame, off: document.getElementById('canvas').style.cursor });
    mm.session.load([]);
  }

  // ---- 30. Writing by nearness: three words on one line are one thing to read (v10 T3, D3) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    // An earlier step wiped the log, and the stub's join with it: a model is a participant only through its join event, so it joins again.
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    // Three cursive words on a band, a word's gap apart: three marks the shape rung reads as text.
    t.stroke(t.word(200, 300, 90, 28, 6)); t.stroke(t.word(320, 302, 110, 26, 7)); t.stroke(t.word(460, 300, 80, 28, 5));
    t.stroke(t.circle(370, 330, 220)); t.takeLoop(370, 330, 220); await wait(60);
    const chips30 = t.chips();
    step('30. three words on one line read as writing, with a number', chips30.some(c => /^writing 0\.\d\d/.test(c)), chips30);
    window.__readReply = [{ text: 'hello wide world', confidence: 0.9 }];
    const calls30 = window.__calls.length;
    const readPill = t.readPill(); // the writing reading itself, which reads (W2)
    step('30a. one offer to read the line, not three', !!readPill && /line of 3/.test(readPill.title), readPill && readPill.title);
    if (readPill) readPill.click();
    const wordsNow = () => { const st = mm.session.getState(); return st.contentIds.filter(id => MM.transcriptOf(st.nodes.get(id))).map(id => MM.transcriptOf(st.nodes.get(id))); };
    for (let i = 0; i < 30 && wordsNow().length < 3; i++) await wait(100); // the stub thinks for a moment before it answers
    await wait(100);
    const words = wordsNow();
    step('30b. the line is read in one call, and each word lands on its own mark', window.__calls.length === calls30 + 1 && words.join(' ') === 'hello wide world', { calls: window.__calls.length - calls30, words });
    const chips30b = t.chips();
    step('30c. the field leads with the line as one name, and offers it as text once', chips30b.some(c => /^“hello wide world” 0\.90/.test(c)) && chips30b.filter(c => /Make it text/.test(c)).length === 1 && !chips30b.some(c => /^“hello” /.test(c)), chips30b);
    window.__readReply = null;
    mm.session.load([]);
  }

  // ---- 31. Press and hold a mark: held with what it hangs together with, no loop drawn (v10 T4, D5) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.rect(200, 200, 120, 80)); t.stroke(t.line({ x: 320, y: 240 }, { x: 420, y: 240 }, 30)); t.stroke(t.circle(460, 240, 40));
    t.stroke(t.rect(700, 200, 100, 60)); // apart: not held with them
    const c31 = document.getElementById('canvas');
    const ev31 = (type, x, y) => c31.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    step('31z. with marks and nothing held, the standing line says how to hold one', /press and hold a mark/.test(document.getElementById('status').dataset.standing), document.getElementById('status').dataset.standing);
    const on = mm.worldToScreen(260, 200); // on the box's top edge
    ev31('pointerdown', on.x, on.y); await wait(1300); ev31('pointerup', on.x, on.y);
    const st31 = mm.session.getState();
    step('31. press and hold a mark: it is held with what it hangs together with, and the field opens', !!st31.summon && st31.summon.enclosedIds.length === 3 && st31.summon.scopeSource === 'pointed' && !!document.querySelector('#summon input.filter') && st31.contentIds.length === 4, { held: st31.summon && st31.summon.enclosedIds, source: st31.summon && st31.summon.scopeSource, content: st31.contentIds.length });
    step('31a. the standing line says the next move while the field is open', /type in the field/.test(document.getElementById('status').dataset.standing), document.getElementById('status').dataset.standing);
    const far = mm.worldToScreen(600, 400); ev31('pointerdown', far.x, far.y); ev31('pointerup', far.x, far.y); // a tap on the ground lets go
    const letGo = !mm.session.getState().summon;
    ev31('pointerdown', on.x, on.y); ev31('pointerup', on.x, on.y); // a quick tap on a mark is not a hold, and not a dot
    step('31b. a tap on the ground lets go; a quick tap on a mark is neither a hold nor a dot', letGo && !mm.session.getState().summon && mm.session.getState().contentIds.length === 4, { letGo, summon: !!mm.session.getState().summon, content: mm.session.getState().contentIds.length });
    mm.session.load([]);
  }

  // ---- 32. The molecule chain: circles joined by lines stand in 3D at once, each sphere named for its mark (v10 T6, D7) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.circle(300, 300, 40)); t.stroke(t.circle(500, 300, 40)); t.stroke(t.circle(400, 460, 40));
    t.stroke(t.line({ x: 340, y: 300 }, { x: 460, y: 300 }, 30)); t.stroke(t.line({ x: 328, y: 328 }, { x: 372, y: 432 }, 30));
    t.stroke(t.circle(400, 370, 190)); t.takeLoop(400, 370, 190); await wait(60);
    const pill32 = [...document.querySelectorAll('#summon .item')].find(b => /Show it in 3D/.test(b.textContent));
    step('32. circles joined by lines offer to stand in 3D with no model, and the pill says where it leads', !!pill32 && !pill32.querySelector('.dot') && /then: What is this/.test(pill32.title), { chips: t.chips(), title: pill32 && pill32.title });
    step('32z. the panel says where the selection stands on the map of becoming, and the rung after it', /becomes\s*a structure, a graph.*Show it in 3D/.test(document.getElementById('inspector').textContent), document.getElementById('inspector').textContent.slice(0, 200));
    const calls32 = window.__calls.length;
    if (pill32) pill32.click();
    await wait(100);
    const st32 = mm.session.getState();
    const id32 = st32.live[st32.live.length - 1];
    const rep32 = id32 && codeRepOfNode(st32.nodes.get(id32));
    step('32a. the program is the engine\'s, from the drawing: three spheres, two bonds, playing, no model asked', !!rep32 && rep32.data.kind === 'run' && /3 spheres, 2 bonds/.test(rep32.data.code) && rep32.source === MM.ENGINE_PARTICIPANT && !!st32.clocks[id32] && st32.clocks[id32].playing && window.__calls.length === calls32, { code: rep32 && rep32.data.code.slice(0, 60), source: rep32 && rep32.source, calls: window.__calls.length - calls32 });
    let parts32 = [];
    for (let i = 0; i < 60 && parts32.length < 3; i++) { await wait(100); parts32 = mm.reportedRegions(id32); }
    const regionIds32 = id32 ? MM.regionsOf(st32.nodes.get(id32), st32.nodes).map(r => r.id) : [];
    step('32b. the running frame reports each sphere under the id of the mark it stands for', parts32.length >= 3 && parts32.every(p => regionIds32.includes(p.id)), { parts: parts32.map(p => p.id), regionIds: regionIds32 });
    step('32c. the library now holds it, so the next drawing like it is one tap from 3D', mm.libraryEntries().some(e => e.id === id32 && e.code.startsWith(MM.GRAPH3D_MARK)), mm.libraryEntries().map(e => e.name));
    mm.session.load([]);
  }

  // ---- 33. Foundations (v10 F1–F7): letters at any size, a mark that crosses, every option, readings that stay, a minimap ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    // F1: a hand twice the size the old cap allowed — an unplaced stroke 90 tall, a line, an x-height circle, a line — is one word.
    const zig = t.line({ x: 300, y: 390 }, { x: 300, y: 300 }, 14).concat(t.line({ x: 300, y: 300 }, { x: 318, y: 390 }, 14).slice(1), t.line({ x: 318, y: 390 }, { x: 318, y: 300 }, 14).slice(1));
    t.stroke(zig); t.stroke(t.line({ x: 332, y: 300 }, { x: 332, y: 390 }, 14)); t.stroke(t.circle(358, 372, 18)); t.stroke(t.line({ x: 386, y: 300 }, { x: 386, y: 390 }, 14));
    const st33 = mm.session.getState();
    const word33 = st33.contentIds.map(id => st33.nodes.get(id)).find(n => MM.isWord(n));
    step('33. letters with ascenders, at a big hand, gather into one word', st33.contentIds.length === 1 && !!word33 && MM.lettersOf(word33).length === 4, { content: st33.contentIds.length, letters: word33 && MM.lettersOf(word33).length });
    // F3: a stroke shaped like the mark beside the word, crossing nothing, summons nothing.
    t.stroke(t.check(420, 330, 1));
    step('33a. a mark-shaped stroke that crosses nothing summons nothing', !mm.session.getState().summon, { summon: !!mm.session.getState().summon, source: mm.session.getState().summon && mm.session.getState().summon.scopeSource });
    // F5, as U1d scopes it (PLAN-USER-SURFACE): ink the rung could not place for sure — a hand's h,
    // which it calls an arc — still offers to be read as writing, on request; bubbles it reads
    // confidently as circles no longer do (offered on every shape it was noise, audit row 5).
    mm.session.load([]);
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    const h33 = (x, y) => t.line({ x, y }, { x, y: y + 60 }, 20).concat(t.line({ x, y: y + 60 }, { x, y: y + 32 }, 10).slice(1),
      Array.from({ length: 14 }, (_, i) => { const a = Math.PI + (i / 13) * Math.PI; return { x: x + 11 + 11 * Math.cos(a), y: y + 34 + 9 * Math.sin(a) }; }).slice(1),
      t.line({ x: x + 22, y: y + 34 }, { x: x + 22, y: y + 60 }, 10).slice(1));
    t.stroke(h33(300, 270)); t.stroke(t.rect(360, 260, 60, 70));
    t.stroke(t.circle(360, 300, 120)); t.takeLoop(360, 300, 120); await wait(60);
    t.typeIn('read');
    step('33b. typing read on ink the rung could not place for sure — an h it calls an arc — offers Read as writing, marked as asking a model', t.chips().some(c => /Read as writing/.test(c)) && !!([...document.querySelectorAll('#summon .item')].find(b => /Read as writing/.test(b.textContent)) || {}).querySelector('.dot'), t.chips());
    t.typeIn('');
    { const sm = mm.session.getState().summon; if (sm) mm.session.dismiss(sm.id, Date.now()); if (mm.session.getState().selection.length) mm.session.deselect(Date.now()); }
    mm.session.load([]);
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    t.stroke(t.circle(300, 300, 30)); t.stroke(t.circle(380, 300, 30)); t.stroke(t.circle(460, 300, 30));
    t.stroke(t.circle(380, 300, 120)); t.takeLoop(380, 300, 120); await wait(60);
    step('33b2. bubbles the rung reads confidently as circles are not offered to be read as writing', !t.chips().some(c => /Read as writing/.test(c)), t.chips());
    // F6: what a model reads the group as stays beside it after the field is gone.
    const whatPill = [...document.querySelectorAll('#summon .item')].find(b => /What is this/.test(b.textContent));
    const calls33 = window.__calls.length;
    if (whatPill) whatPill.click();
    for (let i = 0; i < 30 && window.__calls.length === calls33; i++) await wait(100);
    for (let i = 0; i < 30 && !mm.chips().some(c => c.ids.length === 3); i++) await wait(100);
    const s33 = mm.session.getState();
    const ground = mm.worldToScreen(700, 600);
    t.stroke([{ x: ground.x, y: ground.y }]); // a tap on the ground lets the field go
    await wait(50);
    const chip33 = mm.chips().find(c => c.ids.length === 3);
    step('33c. the model\'s reading of the group is a chip beside it, and it stays when the field is gone', !!chip33 && !mm.session.getState().summon && mm.readGroups.size >= 1, { chips: mm.chips().map(c => c.ids.length), summon: !!mm.session.getState().summon });
    sameAsWhole('a model\'s reading, a chip beside the group it read');
    // A tap on the chip opens the field on the group again.
    if (chip33) { const at = mm.worldToScreen(chip33.x + chip33.w / 2, chip33.y + chip33.h / 2); t.stroke([{ x: at.x, y: at.y }]); }
    const s33b = mm.session.getState();
    step('33d. a tap on the reading\'s chip opens the field on those marks', !!s33b.summon && s33b.summon.enclosedIds.length === 3 && s33b.summon.scopeSource === 'pointed', { summon: s33b.summon && s33b.summon.enclosedIds });
    if (s33b.summon) mm.session.dismiss(s33b.summon.id, Date.now());
    // F7: the minimap shows the board; a press on it pans there.
    const mini = mm.minimap();
    const miniEl = document.getElementById('minimap');
    step('33e. the minimap is shown while the board holds marks', !!mini && !miniEl.hidden && miniEl.getBoundingClientRect().width > 0, { mini: !!mini, hidden: miniEl.hidden });
    if (mini) {
      const r = miniEl.getBoundingClientRect();
      const px = r.left + (mini.ox + 460 * mini.scale) * (r.width / 176), py = r.top + (mini.oy + 300 * mini.scale) * (r.height / 108);
      miniEl.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, isPrimary: true, bubbles: true, clientX: px, clientY: py, button: 0, buttons: 1 }));
      miniEl.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, isPrimary: true, bubbles: true, clientX: px, clientY: py, button: 0, buttons: 0 }));
      const c = mm.screenToWorld(innerWidth / 2, innerHeight / 2);
      step('33f. a press on the minimap centres the view there', Math.hypot(c.x - 460, c.y - 300) < 40, { centre: { x: Math.round(c.x), y: Math.round(c.y) } });
    }
    mm.session.load([]);
  }

  // ---- 34. Writing taken is text in place: fitted, flippable, editable, never a definition (v10 F8–F10) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    t.stroke(t.word(200, 300, 90, 28, 6)); t.stroke(t.word(320, 302, 110, 26, 7)); t.stroke(t.word(460, 300, 80, 28, 5));
    t.stroke(t.circle(370, 330, 220)); t.takeLoop(370, 330, 220); await wait(60);
    window.__readReply = [{ text: 'hello wide world', confidence: 0.9 }];
    const readPill34 = t.readPill(); // the one option that reads the writing (W2)
    if (readPill34) readPill34.click();
    const readCount34 = () => { const st = mm.session.getState(); return st.contentIds.filter(id => MM.transcriptOf(st.nodes.get(id))).length; };
    for (let i = 0; i < 30 && readCount34() < 3; i++) await wait(100);
    await wait(100);
    const linePill = [...document.querySelectorAll('#summon .item')].find(b => /^“hello wide world” 0\.90/.test(b.textContent.trim()));
    step('34. the line, read, is offered as text in place — not as a name', !!linePill && /as text, here/.test(linePill.title), linePill && linePill.title);
    if (linePill) linePill.click();
    await wait(60);
    const st34 = mm.session.getState();
    const textArt = st34.artifacts.map(id => st34.nodes.get(id)).find(n => { const r = codeRepOfNode(n); return r && r.data.kind === 'text' && r.data.from === 'writing'; });
    const f34 = textArt && mm.frames.get(textArt.id);
    step('34a. taken, the writing is one text artifact holding the words — live, fitted, clear — and nothing stays selected', !!textArt && st34.contentIds.length === 1 && st34.live.includes(textArt.id) && !st34.selection.length && !st34.summon && !!f34 && f34.wrap.classList.contains('writing') && /textLength=/.test(f34.iframe.srcdoc), { content: st34.contentIds.length, selection: st34.selection.length, summon: !!st34.summon, writing: !!(f34 && f34.wrap.classList.contains('writing')) });
    t.stroke(t.word(200, 500, 90, 28, 6)); t.stroke(t.word(320, 502, 110, 26, 7)); t.stroke(t.word(460, 500, 80, 28, 5));
    step('34b. writing taken as text is not vocabulary: more writing like it is never offered as another “hello wide world”', mm.session.getState().clusterCandidates.length === 0, mm.session.getState().clusterCandidates.map(c => c.matches.map(m => m.name)));
    if (textArt) mm.session.summonMarks([textArt.id], Date.now());
    await wait(30);
    const chips34 = t.chips();
    step('34c. the field on the text offers to edit it and to show the ink, and never to play it', chips34.some(c => /Edit the text/.test(c)) && chips34.some(c => /Show the ink/.test(c)) && !chips34.some(c => /^Play /.test(c)), chips34);
    const flipPill = [...document.querySelectorAll('#summon .item')].find(b => /Show the ink/.test(b.textContent));
    if (flipPill) flipPill.click();
    await wait(30);
    step('34d. flipped, the frame steps aside and the writing shows', !!f34 && f34.wrap.classList.contains('flipped') && t.chips().some(c => /Show the text/.test(c)), t.chips());
    const g34 = mm.worldToScreen(900, 700);
    t.stroke([{ x: g34.x, y: g34.y }]); // one tap on the ground lets go of the field and the selection together
    const s34e = mm.session.getState();
    step('34e. one tap on the ground lets go of the field and the selection together', !s34e.summon && !s34e.selection.length, { summon: !!s34e.summon, selection: s34e.selection.length });
    window.__readReply = null;
    mm.session.load([]);
  }

  // ---- 35. Text folds back from ink: scratch a word to strike it, write beside the gap, fold it in (v10 F12) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    t.stroke(t.word(200, 300, 90, 28, 6)); t.stroke(t.word(320, 302, 110, 26, 7)); t.stroke(t.word(460, 300, 80, 28, 5));
    t.stroke(t.circle(370, 330, 220)); t.takeLoop(370, 330, 220); await wait(60);
    window.__readReply = [{ text: 'hello wide world', confidence: 0.9 }];
    const rp35 = t.readPill(); // the one option that reads the writing (W2)
    if (rp35) rp35.click();
    const read35 = () => { const st = mm.session.getState(); return st.contentIds.filter(id => MM.transcriptOf(st.nodes.get(id))).length; };
    for (let i = 0; i < 30 && read35() < 3; i++) await wait(100);
    await wait(100);
    const lp35 = [...document.querySelectorAll('#summon .item')].find(b => /^“hello wide world” 0\.90/.test(b.textContent.trim()));
    if (lp35) lp35.click();
    await wait(60);
    const st35 = mm.session.getState();
    const art35 = st35.artifacts.map(id => st35.nodes.get(id)).find(n => { const r = codeRepOfNode(n); return r && r.data.kind === 'text' && r.data.from === 'writing'; });
    for (let i = 0; i < 40 && (!art35 || mm.textWords(art35.id).length < 3); i++) await wait(100);
    const words35 = art35 ? mm.textWords(art35.id) : [];
    step('35. the text made from writing stands as three words, each a region where it is', words35.length === 3 && words35.map(w => w.word).join(' ') === 'hello wide world', words35.map(w => w.word));
    const w2 = words35.find(w => w.index === 1);
    if (w2) {
      const bw = w2.box.maxX - w2.box.minX, bh = w2.box.maxY - w2.box.minY;
      const a = mm.worldToScreen(w2.box.minX - 12, w2.box.minY + bh * 0.2), b = mm.worldToScreen(w2.box.maxX + 12, w2.box.minY + bh * 0.8);
      t.stroke(t.scratch(a.x, a.y, b.x - a.x, b.y - a.y, 3)); // three passes across the second word
      await wait(60);
    }
    const st35b = mm.session.getState();
    const code35 = art35 && codeRepOfNode(st35b.nodes.get(art35.id)).data.code;
    step('35a. a scratch across a word strikes it: a gap where it was, the scratch gone, the strokes underneath untouched', code35 === 'hello … world' && st35b.contentIds.length === 1 && st35b.live.includes(art35 && art35.id), { code: code35, content: st35b.contentIds.length, status: document.getElementById('status').textContent.slice(0, 80) });
    // Write beside the gap, read it, fold it in.
    if (w2) t.stroke(t.word(w2.box.minX, w2.box.minY - 44, 110, 28, 5)); // a line or two above the gap
    if (w2) { t.stroke(t.circle(w2.box.minX + 55, w2.box.minY - 37, 80)); t.takeLoop(w2.box.minX + 55, w2.box.minY - 37, 80); }
    await wait(60);
    window.__readReply = [{ text: 'wide', confidence: 0.9 }];
    const rp35b = t.readPill(); // the one option that reads the writing (W2)
    if (rp35b) rp35b.click();
    for (let i = 0; i < 30 && !t.chips().some(c => /Fold “wide” into the text/.test(c)); i++) await wait(100);
    const foldPill = [...document.querySelectorAll('#summon .item')].find(b => /Fold “wide” into the text/.test(b.textContent));
    step('35b. writing beside the gap, read, is offered to fold into the text', !!foldPill, t.chips());
    if (foldPill) foldPill.click();
    await wait(60);
    const st35c = mm.session.getState();
    const code35c = art35 && codeRepOfNode(st35c.nodes.get(art35.id)).data.code;
    step('35c. folded, the text is whole again, the writing has left, nothing is held', code35c === 'hello wide world' && st35c.contentIds.length === 1 && !st35c.summon && !st35c.selection.length, { code: code35c, content: st35c.contentIds.length });
    mm.session.undo(); mm.session.undo();
    const code35d = art35 && codeRepOfNode(mm.session.getState().nodes.get(art35.id)).data.code;
    step('35d. undo walks the versions back: the gap returns', code35d === 'hello … world', { code: code35d });
    window.__readReply = null;
    mm.session.load([]);
  }

  // ---- 36. The explanation plane has a layout: cards off each other, off the ink they are about ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    // Six boxes in a column, each given a sentence — the shape of a canvas_say
    // run from the MCP hand. Anchored alike, six cards would land on each other.
    const boxes = [];
    for (let i = 0; i < 6; i++) { t.stroke(t.rect(520, 120 + i * 96, 150, 62)); boxes.push(mm.session.getState().contentIds[i]); }
    // Sentences long enough that a card is taller than the gap between two
    // marks: side by side at the anchor they would overlap, so the placing
    // has to shift them along the free side to find room.
    const said = [0, 1, 2, 3, 4, 5].map((i) => 'box ' + (i + 1) + ' is a container; the marks inside it sit in a row, roughly lined up, and the one below points back at it — so the whole reads as a frame holding a flow');
    boxes.forEach((id, i) => mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: said[i], aboutIds: [id], at: Date.now() + i }));
    await wait(60);
    const cards36 = mm.answerCards();
    const hit = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
    const pairs = () => { const c = mm.answerCards(); const bad = []; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) if (hit(c[i], c[j])) bad.push([i, j]); return bad; };
    const overAnchor = () => mm.answerCards().filter((c) => c.about.some((id) => {
      const b = MM.boundsOf(mm.session.getState().nodes.get(id));
      return b && hit(c, { x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY });
    })).map((c) => c.id);
    step('36. six answers on six stacked marks are six cards, none on another', cards36.length === 6 && pairs().length === 0, { cards: cards36.length, overlapping: pairs() });
    step('36a. no card covers the marks it is about', overAnchor().length === 0, overAnchor());
    // The placing is runtime: an answer event carries what was said, what it is
    // about, and the event's own AUTHORSHIP — the log that wrote it and its
    // number in that log, which is what every node id is derived from once a
    // hand has joined a room (ids per hand, T8) — and nothing about where its
    // card ended up. Named, not enumerated: pinning the whole key set made
    // this step fail for a field that is exactly as much an input as `at`.
    const answers36 = JSON.parse(mm.exportLog()).filter((e) => e.type === 'answer');
    const keys36 = [...new Set(answers36.flatMap((e) => Object.keys(e)))].sort();
    const said36 = ['aboutIds', 'at', 'participantId', 'question', 'text', 'type'];
    const authored36 = ['by', 'origin', 'seq'];
    const stray36 = keys36.filter((k) => !said36.includes(k) && !authored36.includes(k));
    step('36b. the placing is runtime, never in the log', answers36.length === 6 && said36.every((k) => keys36.includes(k)) && !stray36.length, { keys: keys36, stray: stray36 });
    // Positions are in canvas units and sizes in screen ones, so a zoom re-places them.
    const before36 = mm.answerCards().map((c) => c.w)[0];
    mm.setView(0.5, 0, 0);
    await wait(30);
    const after36 = mm.answerCards();
    step('36c. zoomed out, the cards keep their screen size and are re-placed, still clear of each other',
      after36.length === 6 && Math.abs(after36[0].w - before36 * 2) < 1 && pairs().length === 0 && overAnchor().length === 0,
      { w: after36.length ? Math.round(after36[0].w) : 0, was: Math.round(before36), overlapping: pairs(), onInk: overAnchor() });
    mm.setView(1, -300, -80);
    await wait(30);
    step('36d. panned, they are placed again and still clear', mm.answerCards().length === 6 && pairs().length === 0 && overAnchor().length === 0, { overlapping: pairs(), onInk: overAnchor() });
    // Staying on screen is a preference among the places beside a mark, never a
    // reason to leave it: a card whose marks are a screenful away belongs with
    // them, not crowded against the edge of what is being looked at.
    mm.setView(1, 0, 0);
    t.stroke(t.rect(3000, 200, 150, 62));
    const far = mm.session.getState().contentIds.slice(-1)[0];
    mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: 'a sentence about marks that are nowhere near the viewport', aboutIds: [far], at: Date.now() });
    await wait(60);
    const farCard = mm.answerCards().find((c) => c.about[0] === far);
    step('36e. a card whose marks are off screen stays with them', !!farCard && farCard.x > 2400 && pairs().length === 0, farCard && { x: Math.round(farCard.x), y: Math.round(farCard.y) });
    sameAsWhole('seven cards, one with its marks off screen');
    mm.setView(1, 0, 0);
    mm.session.load([]);
  }

  // ---- 37. A figure is not a page: svg and text on the board, a card that says its subject ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const txt = mm.session.import({ kind: 'text', path: 'c/anchor.txt', name: 'anchor.txt', code: 'THE ANCHOR', bounds: { minX: 200, minY: 200, maxX: 440, maxY: 250 }, at: Date.now() });
    const svg = mm.session.import({ kind: 'svg', path: 'c/badge.svg', name: 'badge.svg', code: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><text x="16" y="38">1</text></svg>', bounds: { minX: 200, minY: 320, maxX: 440, maxY: 380 }, at: Date.now() });
    const page = mm.session.import({ kind: 'html', path: 'c/page.html', name: 'page.html', code: '<div data-region="a">a page</div>', bounds: { minX: 200, minY: 430, maxX: 520, maxY: 530 }, at: Date.now() });
    for (let i = 0; i < 40 && !(mm.frames.get(txt) && mm.frames.get(svg) && mm.frames.get(page)); i++) await wait(50);
    await wait(150);
    const fig = (id) => { const f = mm.frames.get(id); return f && f.wrap.classList.contains('figure'); };
    step('37. words and a drawing are figures on the board; a page keeps its plate', fig(txt) && fig(svg) && !fig(page), { text: fig(txt), svg: fig(svg), page: fig(page) });
    const srcOf = (id) => { const f = mm.frames.get(id); return f && f.iframe ? f.iframe.srcdoc : ''; };
    // A few words are a caption and FILL their frame, so they scale with the board.
    step('37a. a caption fills its frame, on a clear ground', /background:transparent/.test(srcOf(txt)) && /<svg/.test(srcOf(txt)) && /textLength=/.test(srcOf(txt)), { grounds: /background:transparent/.test(srcOf(txt)), fitted: /textLength=/.test(srcOf(txt)) });
    // A file of text flows at a size the screen holds — and sets its words ONCE:
    // a text run's addressable label is its own first words, so printing every
    // region's label over it, right for a function or a key, doubled every line.
    const doc = mm.session.import({ kind: 'text', path: 'c/long.txt', name: 'long.txt', code: Array.from({ length: 12 }, (_, i) => 'line ' + (i + 1) + ' of a file, which is a document and not a caption').join('\n\n'), bounds: { minX: 600, minY: 600, maxX: 900, maxY: 900 }, at: Date.now() });
    for (let i = 0; i < 40 && !mm.frames.get(doc); i++) await wait(50);
    await wait(120);
    const shown = (id) => srcOf(id).replace(/ title="[^"]*"/g, ''); // the tooltip is not the page
    step('37a2. a file of text flows, clear, with its words set once', fig(doc) && /background:transparent/.test(srcOf(doc)) && !/class="lb"/.test(srcOf(doc)) && (shown(doc).match(/line 1 of a file/g) || []).length === 1, { figure: fig(doc), heading: /class="lb"/.test(srcOf(doc)), times: (shown(doc).match(/line 1 of a file/g) || []).length });
    step('37b. a page is still source on a page', /background:#fbfaf7/.test(srcOf(page)), { plate: /background:#fbfaf7/.test(srcOf(page)) });
    // The card says what it is about and how long ago, as chrome.
    t.stroke(t.rect(700, 200, 180, 110));
    const mk = mm.session.getState().contentIds.slice(-1)[0];
    mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: 'a sentence with no label smuggled into it', aboutIds: [mk], at: Date.now() });
    await wait(80);
    const card = mm.answerCards().find((c) => c.about[0] === mk);
    step('37c. an answer card carries its subject and its age in the chrome', !!card && card.what === 'rectangle' && card.ago === 'just now', card && { what: card.what, ago: card.ago });
    // A figure's document carries the board's ink colour, baked in: an iframe
    // inherits no token, so the theme is part of what the document is made of.
    const themeBefore = mm.themeMode();
    const darkSrc = srcOf(txt);
    mm.setThemeMode(mm.theme === 'paper' ? 'dark' : 'light');
    for (let i = 0; i < 30 && srcOf(txt) === darkSrc; i++) await wait(50);
    step('37d. a figure is rebuilt for the theme, so its words never vanish when the light changes', srcOf(txt) !== darkSrc && /fill:/.test(srcOf(txt)), { changed: srcOf(txt) !== darkSrc });
    mm.setThemeMode(themeBefore);
    await wait(200);
    // A figure wears its brackets and its filename only while pointed at.
    mm.session.load([]); mm.setView(1, 0, 0);
    const lab = mm.session.import({ kind: 'text', path: 'c/lab.txt', name: 'lab.txt', code: 'a label', bounds: { minX: 300, minY: 300, maxX: 460, maxY: 340 }, at: Date.now() });
    t.stroke(t.rect(900, 700, 120, 80)); // something else is the mark the hand is on
    await wait(120);
    const pg2 = mm.session.import({ kind: 'html', path: 'c/p.html', name: 'p.html', code: '<div data-region="a">a page</div>', bounds: { minX: 300, minY: 500, maxX: 600, maxY: 620 }, at: Date.now() });
    await wait(150);
    const atRest = mm.chromeDrawn();
    step('37e. a figure is quiet at rest; a page keeps its brackets and name', !atRest.includes(lab) && atRest.includes(pg2), { drawn: atRest, label: lab, page: pg2 });
    // Pointing at it brings its identity back.
    mm.session.summonMarks([lab], Date.now());
    await wait(120);
    step('37f. pointed at, the figure wears its name again', mm.chromeDrawn().includes(lab), mm.chromeDrawn());
    sameAsWhole('figures, one wearing its name while held');
    const su = mm.session.getState().summon;
    if (su) mm.session.dismiss(su.id, Date.now());
    mm.session.load([]);
  }

  // ---- 38. The space actually visible: the field and the fit respect it ----
  // The reproduction (DIRECTOR-REVIEW-2026-09-15, UI-1): open the field at
  // 1440x1000, resize to 390x844, and it stays at x=504 with its right edge at
  // 878 — off the screen; fit-to-content with the panel docked along the
  // BOTTOM reads that sheet as a left sidebar and sets the zoom to 0.08.
  // A tab cannot resize itself, so the narrow layout is pinned instead: the
  // viewport and the chrome rects the stylesheet would lay out at that width.
  {
    const V = { w: 390, h: 844 };
    // 390px: the bar across the top, the panel along the bottom (surface.css
    // @media max-width 820), and the minimap hidden.
    const BAR = { id: 'bar', left: 0, top: 0, right: 390, bottom: 46 };
    const SHEET = { id: 'inspector', left: 10, top: 523, right: 380, bottom: 810 };
    const WIDE = { left: 0, top: 0, right: 1440, bottom: 1000 };
    const SIDE = { id: 'inspector', left: 14, top: 52, right: 314, bottom: 652 };
    const CARD = { id: 'minimap', left: 1250, top: 856, right: 1426, bottom: 964 };

    const uSheet = mm.usableRect({ left: 0, top: 0, right: V.w, bottom: V.h }, [BAR, SHEET]);
    step('38. a panel lying along the bottom is read as a bottom sheet, not as a left sidebar',
      uSheet.docks.find(d => d.id === 'inspector').edge === 'bottom' && uSheet.left === 0 && uSheet.right === 390 && uSheet.top === 46 && uSheet.bottom === 523,
      { docks: uSheet.docks.map(d => d.id + ':' + d.edge), rect: [uSheet.left, uSheet.top, uSheet.right, uSheet.bottom] });

    const uSide = mm.usableRect(WIDE, [{ id: 'bar', left: 0, top: 0, right: 1440, bottom: 46 }, SIDE, CARD]);
    step('38a. the same panel standing at the left is read as a side wall, and a card in a corner walls nothing',
      uSide.docks.find(d => d.id === 'inspector').edge === 'left' && uSide.left === 314
        && uSide.docks.find(d => d.id === 'minimap').edge === 'none' && uSide.bottom === 1000,
      { docks: uSide.docks.map(d => d.id + ':' + d.edge + ' (' + d.why + ')'), rect: [uSide.left, uSide.top, uSide.right, uSide.bottom] });

    // The fit, through the real fitAll, with the narrow layout pinned.
    mm.setView(1, 0, 0);
    t.stroke(t.rect(200, 180, 400, 300));
    mm.setTestViewport(V.w, V.h, [BAR, SHEET]);
    mm.fitAll();
    const zoomSheet = mm.view.zoom;
    const fitted = MM.boundsOf(mm.session.getState().nodes.get(mm.session.getState().contentIds[0]));
    const a36 = mm.worldToScreen(fitted.minX, fitted.minY), z36 = mm.worldToScreen(fitted.maxX, fitted.maxY);
    step('38b. fit with the panel docked at the bottom does not slam the zoom to its minimum, and lands the drawing in the free band',
      zoomSheet > 0.5 && a36.x >= 0 && z36.x <= V.w && a36.y >= 46 && z36.y <= 523,
      { zoom: +zoomSheet.toFixed(3), min: 0.08, box: [a36.x, a36.y, z36.x, z36.y].map(Math.round), band: [0, 46, V.w, 523] });

    // The field, through the real placeField, at the narrow viewport.
    mm.setTestViewport(null);
    mm.setView(1, 0, 0);
    t.stroke(t.circle(400, 330, 190));
    t.takeLoop(400, 330, 190);
    await wait(60);
    const f36 = t.typeIn('hello there');
    const openedAt = document.getElementById('summon').getBoundingClientRect();
    if (f36) { f36.focus(); f36.setSelectionRange(2, 7); }
    const boundsBefore = MM.boundsOf(mm.session.getState().nodes.get(mm.session.getState().contentIds[0]));
    const viewBefore = { zoom: mm.view.zoom, panX: mm.view.panX, panY: mm.view.panY };
    // The resize the user makes: the viewport narrows, the panel docks below.
    mm.setTestViewport(V.w, V.h, [BAR, SHEET]);
    mm.placeField();
    const after = document.getElementById('summon').getBoundingClientRect();
    const g36 = document.querySelector('#summon input.filter');
    const boundsAfter = MM.boundsOf(mm.session.getState().nodes.get(mm.session.getState().contentIds[0]));
    step('38c. the field re-placed at 390x844 is inside the viewport, clear of the sheet, and its text, caret and focus are untouched',
      !!g36 && after.left >= 0 && after.right <= V.w && after.top >= 0 && after.bottom <= 523
        && g36 === f36 && g36.value === 'hello there' && g36.selectionStart === 2 && g36.selectionEnd === 7
        && document.activeElement === g36,
      { opened: [Math.round(openedAt.left), Math.round(openedAt.right)], after: [after.left, after.top, after.right, after.bottom].map(Math.round),
        value: g36 && g36.value, sel: g36 && [g36.selectionStart, g36.selectionEnd], focused: document.activeElement === g36, sameNode: g36 === f36 });
    step('38d. the drawing did not move: re-placing the field is geometry, never the view',
      boundsAfter.minX === boundsBefore.minX && boundsAfter.minY === boundsBefore.minY
        && mm.view.zoom === viewBefore.zoom && mm.view.panX === viewBefore.panX && mm.view.panY === viewBefore.panY,
      { before: [boundsBefore.minX, boundsBefore.minY], after: [boundsAfter.minX, boundsAfter.minY], view: viewBefore });
    mm.setTestViewport(null);
    mm.session.load([]);
    mm.setView(1, 0, 0);
  }

  // ---- 39. A word on your own ink: the label on the board (V1-PLAN L2b; notes §B, §D) ----
  // Whoever made a mark can put a word on it — a `label` event, attributed,
  // replayed, undone. Not a bless and not a file: it is drawn beside the mark
  // in the ink's own colour, at a size in the board's own units (the caption
  // rule of 13-kinds.js — it scales with the board and is never held at
  // screen size), in both themes; it makes no artifact, no library entry and
  // no name; erasing the mark takes it, and undo of the erase brings both.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const theme39 = mm.themeMode();
    mm.setThemeMode('dark');
    const drawn39 = () => (typeof mm.labelsDrawn === 'function' ? mm.labelsDrawn() : []);
    const colour39 = (id) => (typeof mm.colourOf === 'function' ? mm.colourOf(id) : null);
    const ink39 = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    t.stroke(t.rect(300, 220, 220, 140));
    const box39 = mm.session.getState().contentIds[0];
    const arts39 = mm.session.getState().artifacts.length, lib39 = mm.libraryEntries().length, evs39 = mm.session.getEvents().length;
    const took39 = mm.session.label({ nodeId: box39, text: 'inlet', at: Date.now() });
    await wait(30);
    const at1 = drawn39().find(l => l.id === box39);
    const bb39 = MM.boundsOf(mm.session.getState().nodes.get(box39));
    step('39. a hand labels its own mark: the word is drawn beside it, above its top edge, in the ink\'s own colour',
      took39 === box39 && !!at1 && at1.text === 'inlet' && at1.y < bb39.minY && Math.abs(at1.x - bb39.minX) < 1 && !!at1.colour && at1.colour === colour39(box39) && at1.colour === ink39(),
      { took: took39, label: at1, bounds: bb39, ink: colour39(box39), token: ink39() });
    mm.setView(2, 0, 0); await wait(30);
    const at2 = drawn39().find(l => l.id === box39);
    step('39a. it scales with the board — the same size in the board\'s units at every zoom, twice the pixels at twice the zoom: a caption, not screen-size type',
      !!at1 && !!at2 && Math.abs(at2.size - at1.size) < 1e-9 && Math.abs(at2.px - 2 * at1.px) < 0.01,
      { zoom1: at1 && { size: at1.size, px: at1.px }, zoom2: at2 && { size: at2.size, px: at2.px } });
    mm.setView(1, 0, 0);
    mm.setThemeMode('light'); await wait(30);
    const atL = drawn39().find(l => l.id === box39);
    step('39b. in both themes: on paper it is drawn in paper\'s ink, not the dark board\'s',
      !!at1 && !!atL && atL.colour === ink39() && atL.colour !== at1.colour,
      { dark: at1 && at1.colour, light: atL && atL.colour, token: ink39() });
    mm.setThemeMode('dark'); await wait(30);
    const s39 = mm.session.getState();
    const panel39 = document.getElementById('inspector').textContent;
    step('39c. a label is one event — no artifact, no library entry, no name — and the shape rung\'s reading still stands, in the panel too',
      s39.artifacts.length === arts39 && mm.libraryEntries().length === lib39 && mm.session.getEvents().length === evs39 + 1
        && !MM.wordOf(s39.nodes.get(box39)) && MM.topInterpretation(s39.nodes.get(box39)) === 'rectangle'
        && /shape\s*rectangle/.test(panel39) && /label\s*“inlet”/.test(panel39),
      { artifacts: s39.artifacts.length, library: mm.libraryEntries().length, events: mm.session.getEvents().length - evs39, panel: panel39.slice(0, 600) });
    // Erasing the mark takes the label with it; undo of the erase brings both.
    const e0 = mm.worldToScreen(280, 250), e1 = mm.worldToScreen(540, 330);
    t.stroke(t.scratch(e0.x, e0.y, e1.x - e0.x, e1.y - e0.y, 3));
    await wait(30);
    const gone39 = !mm.session.getState().contentIds.includes(box39) && !drawn39().some(l => l.id === box39);
    mm.session.undo(); await wait(30);
    const back39 = drawn39().find(l => l.id === box39);
    step('39d. erasing the mark takes its label; undo of the erase brings mark and label back',
      gone39 && mm.session.getState().contentIds.includes(box39) && !!back39 && back39.text === 'inlet',
      { gone: gone39, back: back39 });
    // A label is the log's: undone like any event, and replayed.
    mm.session.undo(); await wait(30);
    const undone39 = !drawn39().some(l => l.id === box39);
    const evs = mm.session.getEvents().slice();
    mm.session.load(evs.concat([{ type: 'label', nodeId: box39, text: 'outlet', at: Date.now() }])); await wait(30);
    const replayed39 = drawn39().find(l => l.id === box39);
    step('39e. undo takes the label off; a log that carries one replays it',
      undone39 && !!replayed39 && replayed39.text === 'outlet', { undone: undone39, replayed: replayed39 });
    // Another hand's word on its own ink arrives in its log and is drawn in
    // that hand's colour, attributed to it — a label on the merged node.
    const fern = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f1' }));
    const kite = fern.addStroke(t.circle(700, 300, 50).map(p => ({ x: p.x, y: p.y })), Date.now() - 5000, undefined, 1, { content: true });
    fern.label({ nodeId: kite, text: 'kite', at: Date.now() - 4000 });
    mm.session.load(MM.mergeLogs({ 'fern~f1': fern.getEvents(), 'me~m1': mm.session.getEvents().filter(e => !e.by) }, { me: 'me~m1' })); await wait(30);
    const kite39 = drawn39().find(l => l.id === kite);
    step('39f. another hand\'s word on its own ink is drawn in that hand\'s colour, attributed to it',
      !!kite39 && kite39.text === 'kite' && kite39.colour === mm.handColour('fern') && kite39.who === 'fern' && kite39.colour !== colour39(box39),
      { kite: kite39, hue: mm.handColour('fern') });
    mm.setThemeMode(theme39);
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 40. One Enter, one act: a brief sent twice on one loop (V1-PLAN L2d; week 1's U5) ----
  // Two Enters on one loop blessed two artifacts and asked every model twice —
  // two builds in flight for one drawing, the later refused as superseded
  // when it landed, minutes after the hand had stopped watching. Disabling the
  // input covers the key, not the act: the reading's `run` is a closure over
  // the summon, and a pill, a touch or a second key still holds it after the
  // first act has consumed the summon. So the second is refused at the door
  // and says so. The stub is DELAYED, so the model is still thinking when the
  // second Enter lands, 80 ms after the first.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    // A fresh board drops the stub's `join`; it joins again, as a remembered model does at boot.
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    const working40 = () => (typeof mm.working === 'function' ? mm.working() : []);
    const statusNow = () => document.getElementById('status').textContent;
    t.stroke(t.rect(200, 180, 260, 150));
    t.stroke(t.rect(520, 180, 260, 150));
    t.stroke(t.rect(200, 380, 580, 120));
    t.stroke(t.circle(490, 330, 430));
    t.takeLoop(490, 330, 430);
    await wait(60);
    const before40 = mm.session.getState().artifacts.length;
    const calls40 = window.__calls.length;
    window.__stubDelayMs = 700;
    // The reading Enter would run, held — exactly what a pill's closure holds.
    const r40 = mm.readField('a pricing page');
    const ran40 = !!(r40 && r40.run && r40.kind === 'brief');
    let status40 = '', keys40 = [];
    if (ran40) {
      r40.run();
      await wait(80);
      r40.run();
      // The refusal is said the moment the second act is refused: the status
      // line is the LIVE line, read here and not after the model has answered.
      status40 = statusNow();
      keys40 = working40().filter((k) => /^(build|program):/.test(k));
    }
    const s40 = mm.session.getState();
    const art40 = s40.artifacts[s40.artifacts.length - 1];
    step('40. two Enters within 200 ms on one loop bless exactly one artifact and start one build, while the model is still thinking',
      ran40 && s40.artifacts.length === before40 + 1 && keys40.length === 1 && keys40[0].endsWith(':' + art40) && window.__calls.length - calls40 === 1,
      { kind: r40 && r40.kind, artifacts: s40.artifacts.length, was: before40, building: keys40, calls: window.__calls.length - calls40 });
    step('40a. the second is refused at the door, and the status says it is already under way — not that the group could not be held',
      /already under way/.test(status40) && !/could not hold/.test(status40), { status: status40 });
    await wait(900);
    step('40b. and when the model answers, it was asked once: one call, one artifact',
      window.__calls.length - calls40 === 1 && mm.session.getState().artifacts.length === before40 + 1,
      { calls: window.__calls.length - calls40, systems: window.__calls.slice(calls40).map((c) => c.system) });
    // The REVISION is where it really bit: no bless to fail at, so a second
    // run dismissed again and asked every model again — two revisions in
    // flight for one artifact, the later refused as superseded when it landed.
    const vers40 = () => { const n = mm.session.getState().nodes.get(art40); return n ? n.reps.filter((r) => r.modality === 'code').length : 0; };
    if (art40 && mm.session.getState().live.includes(art40)) {
      const codeBefore = vers40();
      const ab = MM.boundsOf(mm.session.getState().nodes.get(art40));
      const cx = (ab.minX + ab.maxX) / 2, cy = (ab.minY + ab.maxY) / 2;
      t.stroke(t.circle(cx, cy, 60));
      t.takeLoop(cx, cy, 60);
      await wait(60);
      const calls40c = window.__calls.length;
      const r40c = mm.readField('make it blue');
      let status40c = '';
      if (r40c && r40c.run) { r40c.run(); await wait(80); r40c.run(); status40c = statusNow(); }
      await wait(900);
      step('40c. a revision sent twice within 200 ms asks once and leaves one new version, not two, and says the second was already under way',
        !!(r40c && r40c.run) && window.__calls.length - calls40c === 1 && vers40() === codeBefore + 1 && /already under way/.test(status40c),
        { kind: r40c && r40c.kind, calls: window.__calls.length - calls40c, versions: vers40(), was: codeBefore, status: status40c });
      // A later act on a NEW summon is not refused: the door holds one key.
      t.stroke(t.circle(cx, cy, 60));
      t.takeLoop(cx, cy, 60);
      await wait(60);
      const calls40d = window.__calls.length;
      const r40d = mm.readField('make it green');
      if (r40d && r40d.run) r40d.run();
      await wait(900);
      step('40d. a new loop on the same page is a new act: it is asked, not refused',
        !!(r40d && r40d.run) && window.__calls.length - calls40d === 1 && vers40() === codeBefore + 2,
        { calls: window.__calls.length - calls40d, versions: vers40(), was: codeBefore });
    } else {
      step('40c. a revision sent twice asks once — skipped: no live artifact to revise', true, {});
    }
    window.__stubDelayMs = 0;
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 41. fitAll fits the CONTENT, and the cards place themselves in it (V1-PLAN L2d; notes §E) ----
  // `fitAll` unioned the content with the explanation nodes' LOGGED bounds.
  // Placing became runtime, so a card is not drawn where it is logged: one of
  // the two numbers was fiction. The fit is the content's now, and the cards
  // are placed inside the result — checked against where they were DRAWN.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const boxes41 = [];
    for (let i = 0; i < 6; i++) { t.stroke(t.rect(520, 120 + i * 96, 150, 62)); boxes41.push(mm.session.getState().contentIds[i]); }
    // The fit of the CONTENT alone — the number the fix says is the whole of it.
    mm.fitAll();
    await wait(30);
    const bare41 = { zoom: mm.view.zoom, panX: mm.view.panX, panY: mm.view.panY };
    mm.setView(1, 0, 0);
    boxes41.forEach((id, i) => mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why',
      text: 'box ' + (i + 1) + ' is a container; the marks inside it sit in a row, roughly lined up, and the one below points back at it — so the whole reads as a frame holding a flow',
      aboutIds: [id], at: Date.now() + i }));
    await wait(60);
    mm.fitAll();
    await wait(60);
    const free41 = mm.usableViewport();
    const onScreen = (r) => {
      const a = mm.worldToScreen(r.x, r.y), b = mm.worldToScreen(r.x + r.w, r.y + r.h);
      return a.x >= free41.left - 1 && a.y >= free41.top - 1 && b.x <= free41.right + 1 && b.y <= free41.bottom + 1;
    };
    const markIn = (id) => {
      const b = MM.boundsOf(mm.session.getState().nodes.get(id));
      return !!b && onScreen({ x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY });
    };
    const cards41 = mm.answerCards();
    const off41 = cards41.filter((c) => !onScreen(c)).map((c) => c.id);
    step('41. fitAll lands every content mark in the free ground',
      boxes41.every(markIn) && mm.view.zoom > 0.08,
      { zoom: +mm.view.zoom.toFixed(3), min: 0.08, free: [free41.left, free41.top, free41.right, free41.bottom].map(Math.round) });
    step('41a. six cards, none off screen — the fit read where they were DRAWN, not where they are logged',
      cards41.length === 6 && off41.length === 0,
      { cards: cards41.length, off: off41, rects: cards41.map((c) => [c.x, c.y, c.w, c.h].map(Math.round)) });
    // The fit is the CONTENT'S. Six answers whose cards all land inside it do
    // not move it at all — the logged bounds of an explanation node are not an
    // input any more, which is exactly what made the old fit fiction.
    step('41b. six answers that fit do not move the fit: the explanation nodes\' logged bounds are not an input',
      Math.abs(mm.view.zoom - bare41.zoom) < 1e-6 && Math.abs(mm.view.panX - bare41.panX) < 0.5 && Math.abs(mm.view.panY - bare41.panY) < 0.5,
      { content: { zoom: +bare41.zoom.toFixed(4), panX: Math.round(bare41.panX), panY: Math.round(bare41.panY) },
        withCards: { zoom: +mm.view.zoom.toFixed(4), panX: Math.round(mm.view.panX), panY: Math.round(mm.view.panY) } });
    // The correction pass is one pass, not a loop: a second fit on the same
    // board must not walk the view further out every time it is asked.
    const view41 = { zoom: mm.view.zoom, panX: mm.view.panX, panY: mm.view.panY };
    mm.fitAll();
    await wait(60);
    step('41c. fitting again settles: one correction pass, never a chase',
      Math.abs(mm.view.zoom - view41.zoom) < 1e-6 && Math.abs(mm.view.panX - view41.panX) < 0.5 && Math.abs(mm.view.panY - view41.panY) < 0.5,
      { was: { zoom: +view41.zoom.toFixed(4), panX: Math.round(view41.panX), panY: Math.round(view41.panY) },
        now: { zoom: +mm.view.zoom.toFixed(4), panX: Math.round(mm.view.panX), panY: Math.round(mm.view.panY) } });
    // A board of a few dozen marks, answers about some of them — and one
    // answer whose LOGGED place is far from anything: it was said about a
    // mark while that mark stood twenty thousand units away, and the mark was
    // moved home after. The card is drawn beside the mark where it is; the
    // logged bounds stay where the mark was. The old union read that fiction
    // and fitted a board twenty thousand units wide — the slam to MIN_ZOOM
    // seen once on a busy live board is one way there.
    mm.session.load([]); mm.setView(1, 0, 0);
    const marks41 = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const pts = (r + c) % 3 === 0 ? t.circle(160 + c * 150, 130 + r * 110, 32) : t.rect(120 + c * 150, 100 + r * 110, 90, 60);
      marks41.push(mm.session.addStroke(pts.map((p) => ({ x: p.x, y: p.y })), Date.now() + marks41.length, undefined, 1, { content: true }));
    }
    for (let i = 0; i < 7; i++) mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: 'mark ' + (i + 1) + ' sits in the grid with its neighbours', aboutIds: [marks41[i * 5 + 1]], at: Date.now() + 100 + i });
    const moved41 = marks41[35];
    mm.session.move({ ids: [moved41], dx: 20000, dy: 20000, at: Date.now() + 200 });
    const stale41 = mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: 'said while this mark stood far away', aboutIds: [moved41], at: Date.now() + 201 });
    mm.session.move({ ids: [moved41], dx: -20000, dy: -20000, at: Date.now() + 202 });
    await wait(60);
    mm.fitAll();
    await wait(60);
    const free41d = mm.usableViewport();
    const inFree = (b) => {
      const a = mm.worldToScreen(b.minX, b.minY), z = mm.worldToScreen(b.maxX, b.maxY);
      return a.x >= free41d.left - 1 && a.y >= free41d.top - 1 && z.x <= free41d.right + 1 && z.y <= free41d.bottom + 1;
    };
    const content41 = mm.session.getState().contentIds;
    const outside41 = content41.filter((id) => { const b = MM.boundsOf(mm.session.getState().nodes.get(id)); return !b || !inFree(b); });
    const cards41d = mm.answerCards();
    const offCards41 = cards41d.filter((c) => !inFree({ minX: c.x, minY: c.y, maxX: c.x + c.w, maxY: c.y + c.h })).map((c) => c.id);
    const logged41 = stale41 && MM.boundsOf(mm.session.getState().nodes.get(stale41));
    step('41d. on a board of ' + content41.length + ' marks and 8 answers — one logged twenty thousand units from its card — every mark lands in the free ground and the zoom stays far above its minimum (the old union slammed it to MIN_ZOOM here)',
      content41.length === 36 && outside41.length === 0 && mm.view.zoom > 0.5 && cards41d.length === 8 && !!logged41 && logged41.minX > 10000,
      { marks: content41.length, outside: outside41, zoom: +mm.view.zoom.toFixed(3), min: 0.08, cards: cards41d.length, offCards: offCards41, logged: logged41 && [Math.round(logged41.minX), Math.round(logged41.minY)] });
    step('41e. and every card is drawn inside the free ground with the marks — placed in the fit, not fitted around',
      offCards41.length === 0, { off: offCards41, cards: cards41d.map((c) => [c.x, c.y, c.w, c.h].map(Math.round)) });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 42. A person labels their own ink, from the field (V1-PLAN L2e) ----
  // Week 1's U2: whoever made a mark can put a word on it. The `label` event
  // and the MCP hand could (L2b); a person on the canvas could not — labels
  // reached the board only through the hand. With a mark held, the field
  // reads `label: word`, the line under it says what Enter will do before
  // Enter is pressed, and Enter writes one `label` event on the mark, in the
  // person's name, drawn beside it. No model is asked: a label is not a brief.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const drawn42 = () => (typeof mm.labelsDrawn === 'function' ? mm.labelsDrawn() : []);
    const b0 = mm.worldToScreen(300, 220), b1 = mm.worldToScreen(520, 360);
    t.stroke(t.rect(b0.x, b0.y, b1.x - b0.x, b1.y - b0.y));
    const box42 = mm.session.getState().contentIds[0];
    const c42 = mm.worldToScreen(410, 290);
    t.stroke(t.circle(c42.x, c42.y, 190)); t.takeLoop(c42.x, c42.y, 190); await wait(60);
    const held42 = mm.session.getState().summon;
    t.typeIn('label: inlet');
    const line42 = t.readingLine();
    const evs42 = mm.session.getEvents().length, calls42 = window.__calls.length;
    t.typeEnter('label: inlet'); await wait(60);
    const labels42 = mm.session.getEvents().slice(evs42).filter((e) => e.type === 'label');
    const node42 = mm.session.getState().nodes.get(box42);
    const lab42 = node42 && MM.labelOf(node42);
    const at42 = drawn42().find((l) => l.id === box42);
    step('42. with a mark held, the field reads “label: inlet” — the line says ↵ label it “inlet” before Enter',
      !!held42 && held42.enclosedIds.includes(box42) && line42 === '↵ label it “inlet”',
      { held: held42 && held42.enclosedIds, line: line42 });
    step('42a. Enter puts the word on the mark — one label event, in your name, drawn beside it — and asks no model',
      labels42.length === 1 && labels42[0].nodeId === box42 && !!lab42 && lab42.text === 'inlet' && lab42.source === MM.LOCAL_PARTICIPANT
        && !!at42 && at42.text === 'inlet' && window.__calls.length === calls42,
      { events: mm.session.getEvents().slice(evs42).map((e) => e.type), label: lab42, drawn: at42, calls: window.__calls.length - calls42 });
    // The field closed BEFORE the word was written, so the label is the last event:
    // one undo takes it off, and only it.
    mm.session.undo(); await wait(30);
    const undone42 = mm.session.getState();
    step('42b. one undo takes the label off, and only the label: the mark stays, the field stays closed',
      !MM.labelOf(undone42.nodes.get(box42)) && !drawn42().some((l) => l.id === box42) && !undone42.summon && undone42.contentIds.includes(box42),
      { label: MM.labelOf(undone42.nodes.get(box42)) || null, summon: !!undone42.summon, last: (mm.session.getEvents().slice(-1)[0] || {}).type });
    // The same act run twice — a second Enter, a pill's closure held after the first —
    // writes one label: the second finds the mark already saying the word, and says so.
    t.stroke(t.circle(c42.x, c42.y, 190)); t.takeLoop(c42.x, c42.y, 190); await wait(60);
    const r42 = mm.readField('label: inlet');
    const evs42c = mm.session.getEvents().length;
    if (r42 && r42.run) { r42.run(); await wait(30); r42.run(); }
    const labels42c = mm.session.getEvents().slice(evs42c).filter((e) => e.type === 'label');
    const status42c = document.getElementById('status').textContent;
    step('42c. the same act run twice writes one label, and the second says the mark already carries it',
      !!(r42 && r42.run) && labels42c.length === 1 && /already says “inlet”/.test(status42c)
        && (MM.labelOf(mm.session.getState().nodes.get(box42)) || {}).text === 'inlet',
      { kind: r42 && r42.kind, labels: labels42c.length, status: status42c });
    // Drawn exactly as the hand's is. A twin box labelled through the core door — the
    // way the MCP hand labels — stands beside it, and the two labels are one thing:
    // the same size in the board's units, the same place over their marks, the same
    // hand, the ink's own colour in the dark and on paper, twice the pixels at twice
    // the zoom.
    const theme42 = mm.themeMode();
    const ink42 = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    const w0 = mm.worldToScreen(700, 220), w1 = mm.worldToScreen(920, 360);
    t.stroke(t.rect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y));
    const twin42 = mm.session.getState().contentIds[mm.session.getState().contentIds.length - 1];
    const tookTwin42 = mm.session.label({ nodeId: twin42, text: 'inlet', at: Date.now() });
    const pair42 = () => { const d = drawn42(); return { mine: d.find((l) => l.id === box42) || null, twin: d.find((l) => l.id === twin42) || null }; };
    const same42 = (p) => {
      const st = mm.session.getState();
      const bm = MM.boundsOf(st.nodes.get(box42)), bt = MM.boundsOf(st.nodes.get(twin42));
      return !!p.mine && !!p.twin && !!bm && !!bt && Math.abs(p.mine.size - p.twin.size) < 1e-9 && Math.abs(p.mine.px - p.twin.px) < 1e-6
        && p.mine.colour === p.twin.colour && p.mine.who === p.twin.who
        && Math.abs((p.mine.x - bm.minX) - (p.twin.x - bt.minX)) < 0.5 && Math.abs((p.mine.y - bm.minY) - (p.twin.y - bt.minY)) < 0.5;
    };
    mm.setThemeMode('dark'); await wait(30);
    const dark42 = pair42(), darkInk42 = ink42();
    mm.setView(2, 0, 0); await wait(30);
    const zoom42 = pair42();
    mm.setView(1, 0, 0); mm.setThemeMode('light'); await wait(30);
    const light42 = pair42(), lightInk42 = ink42();
    step('42d. the label from the field is drawn exactly as the hand\'s: the same size in the board\'s units and place over its mark, the ink\'s own colour in both themes, twice the pixels at twice the zoom',
      tookTwin42 === twin42 && same42(dark42) && same42(zoom42) && same42(light42)
        && dark42.mine.colour === darkInk42 && light42.mine.colour === lightInk42 && darkInk42 !== lightInk42
        && Math.abs(zoom42.mine.size - dark42.mine.size) < 1e-9 && Math.abs(zoom42.mine.px - 2 * dark42.mine.px) < 0.01,
      { dark: dark42, zoom2: zoom42, light: light42, tokens: [darkInk42, lightInk42] });
    mm.setThemeMode(theme42); await wait(30);
    // Erasing the mark takes its label; undo of the erase brings both back.
    const e0 = mm.worldToScreen(280, 250), e1 = mm.worldToScreen(540, 330);
    t.stroke(t.scratch(e0.x, e0.y, e1.x - e0.x, e1.y - e0.y, 3)); await wait(30);
    const gone42 = !mm.session.getState().contentIds.includes(box42) && !drawn42().some((l) => l.id === box42);
    mm.session.undo(); await wait(30);
    const back42 = drawn42().find((l) => l.id === box42);
    step('42e. erasing the mark takes the label from the field with it, and undo of the erase brings mark and label back',
      gone42 && mm.session.getState().contentIds.includes(box42) && !!back42 && back42.text === 'inlet' && drawn42().some((l) => l.id === twin42),
      { gone: gone42, back: back42 || null });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 42f–m. One word, two acts: Name it and Label it, side by side (V1-PLAN L2e) ----
  // The row offers the word two ways — when the writing has been read, and when a
  // word is typed — and the two must not read as one thing twice. The difference is
  // said in words the field already has: each pill's tooltip says what it does and
  // what it does not, and the reading line says what a pill will do while it is
  // pointed at. Naming blesses one thing, a definition; labelling makes nothing.
  // The four core buttons stay four.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    // A fresh board drops the stub's join; it joins again, as a remembered model does at boot.
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    window.__readReply = null;
    const S = (x, y) => mm.worldToScreen(x, y);
    const pills = (row) => [...document.querySelectorAll('#summon .row.' + row + ' .item')];
    const said = (b) => b.querySelector('span').textContent.trim();
    const calls = window.__calls.length;
    // A box with a word written in it, read by the model that can see.
    const r0 = S(500, 240), r1 = S(800, 420);
    t.stroke(t.rect(r0.x, r0.y, r1.x - r0.x, r1.y - r0.y));
    const box = mm.session.getState().contentIds[0];
    const w0 = S(540, 300);
    t.stroke(t.word(w0.x, w0.y, 200, 40, 7));
    const word = mm.session.getState().contentIds[1];
    const c = S(650, 330);
    t.stroke(t.circle(c.x, c.y, 230)); t.takeLoop(c.x, c.y, 230); await wait(80);
    t.typeEnter('read');
    for (let i = 0; i < 30 && !MM.transcriptOf(mm.session.getState().nodes.get(word)); i++) await wait(100);
    t.typeIn('');
    const certainF = pills('certain'), affordF = pills('afford');
    const namePill = certainF.find((b) => /^“Pricing” 0\.92/.test(said(b)));
    const labelPill = affordF[0];
    step('42f. writing read beside a shape: the reading takes the word as the name, and Label it “Pricing” leads what it affords, right under it — the four core buttons still four',
      !!namePill && !!labelPill && said(labelPill) === 'Label it “Pricing”' && t.coreSlots().join(',') === 'name,copy,paste,erase' && window.__calls.length === calls + 1,
      { certain: certainF.map(said), afford: affordF.map(said), core: t.coreSlots(), calls: window.__calls.length - calls });
    step('42g. each says what it does and what it does not: naming makes one thing, a definition, and writes no word on the ink; labelling puts the word on your ink and makes nothing',
      !!namePill && !!labelPill && /one thing/.test(namePill.title) && /definition/.test(namePill.title) && /writes no word on the ink/.test(namePill.title)
        && /your ink/.test(labelPill.title) && /makes nothing/.test(labelPill.title) && /no definition/.test(labelPill.title) && !/makes nothing/.test(namePill.title),
      { name: namePill && namePill.title, label: labelPill && labelPill.title });
    // Pointed at, the pill says in the reading line what it will do; let go, the line is Enter's again.
    const before = t.readingLine();
    if (labelPill) labelPill.dispatchEvent(new MouseEvent('mouseenter'));
    const pointed = t.readingLine();
    if (labelPill) labelPill.dispatchEvent(new MouseEvent('mouseleave'));
    const after = t.readingLine();
    step('42h. pointed at, Label it says in the reading line what it will do — no badge, no new row — and the line is Enter\'s again when the pointer leaves',
      pointed === '↵ label it “Pricing” — on your ink; makes nothing' && after === before && before !== pointed && before === mm.readField('').line,
      { before, pointed, after });
    const arts = mm.session.getState().artifacts.length, lib = mm.libraryEntries().length, evs = mm.session.getEvents().length;
    if (labelPill) labelPill.click();
    await wait(30);
    const sF = mm.session.getState();
    const newF = mm.session.getEvents().slice(evs);
    step('42i. taken, the word goes on the shape held with the writing — not on the writing, which says it already — and nothing is made: no bless, no artifact, no library entry',
      (MM.labelOf(sF.nodes.get(box)) || {}).text === 'Pricing' && !MM.labelOf(sF.nodes.get(word))
        && newF.filter((e) => e.type === 'label').length === 1 && !newF.some((e) => e.type === 'bless')
        && sF.artifacts.length === arts && mm.libraryEntries().length === lib && !MM.wordOf(sF.nodes.get(box)),
      { events: newF.map((e) => e.type), box: MM.labelOf(sF.nodes.get(box)) || null, word: MM.labelOf(sF.nodes.get(word)) || null });

    // A typed word: Name it and Label it, the pair together, Enter unchanged.
    mm.session.load([]); mm.setView(1, 0, 0);
    const t0 = S(300, 220), t1 = S(520, 360);
    t.stroke(t.rect(t0.x, t0.y, t1.x - t0.x, t1.y - t0.y));
    const tbox = mm.session.getState().contentIds[0];
    const tc = S(410, 290);
    t.stroke(t.circle(tc.x, tc.y, 190)); t.takeLoop(tc.x, tc.y, 190); await wait(60);
    t.typeIn('inlet');
    const affordT = pills('afford');
    const lineT = t.readingLine();
    step('42j. a typed word is offered two ways, side by side — Name it “inlet”, then Label it “inlet” — as plain pills in the rows the field has, and Enter still does what the line says',
      affordT.map(said).join(' | ') === 'Name it “inlet” | Label it “inlet”' && !!lineT && !/label/i.test(lineT)
        && affordT.every((b) => b.className === 'pill item') && document.querySelectorAll('#summon .row').length === 3
        && t.coreSlots().join(',') === 'name,copy,paste,erase',
      { afford: affordT.map(said), line: lineT, classes: affordT.map((b) => b.className), rows: document.querySelectorAll('#summon .row').length, core: t.coreSlots() });
    const nameT = affordT[0], labelT = affordT[1];
    step('42k. their tooltips keep them apart: Name it makes one thing, a definition, and writes no word on the ink; Label it puts the word on the mark you made and makes nothing',
      !!nameT && !!labelT && /one thing/.test(nameT.title) && /definition/.test(nameT.title) && /writes no word on the ink/.test(nameT.title)
        && /on the mark you made/.test(labelT.title) && /makes nothing/.test(labelT.title) && /no definition/.test(labelT.title),
      { name: nameT && nameT.title, label: labelT && labelT.title });
    // `label:` and `name:` choose one of the pair: the reading line and the marked pill agree.
    t.typeIn('label: inlet');
    const selL = pills('afford').map((b) => said(b) + '=' + b.getAttribute('aria-selected')), lineL = t.readingLine();
    t.typeIn('name: inlet');
    const selN = pills('afford').map((b) => said(b) + '=' + b.getAttribute('aria-selected')), lineN = t.readingLine();
    step('42l. “label: inlet” marks Label it as what Enter will do, “name: inlet” marks Name it — the line and the pill agree',
      selL.join(' | ') === 'Name it “inlet”=false | Label it “inlet”=true' && lineL === '↵ label it “inlet”'
        && selN.join(' | ') === 'Name it “inlet”=true | Label it “inlet”=false' && lineN === '↵ name it “inlet”',
      { label: selL, lineL, name: selN, lineN });
    // Taken, they stay two acts: Name it blesses one thing; Label it makes nothing.
    t.typeIn('inlet');
    const artsT = mm.session.getState().artifacts.length, evsT = mm.session.getEvents().length;
    const n1 = pills('afford').find((b) => said(b) === 'Name it “inlet”');
    if (n1) n1.click();
    await wait(30);
    const sN = mm.session.getState();
    const namedArt = sN.artifacts[sN.artifacts.length - 1];
    const named = !!n1 && sN.artifacts.length === artsT + 1 && MM.wordOf(sN.nodes.get(namedArt)) === 'inlet' && !mm.session.getEvents().slice(evsT).some((e) => e.type === 'label');
    mm.session.undo(); await wait(60);
    t.typeIn('inlet');
    const evsT2 = mm.session.getEvents().length;
    const l1 = pills('afford').find((b) => said(b) === 'Label it “inlet”');
    if (l1) l1.click();
    await wait(30);
    const sL = mm.session.getState();
    const newL = mm.session.getEvents().slice(evsT2);
    step('42m. taken, they stay two acts: Name it blesses one thing called “inlet”; Label it puts “inlet” on the mark and makes nothing — and no model was asked for either',
      named && !!l1 && sL.artifacts.length === artsT && newL.filter((e) => e.type === 'label').length === 1 && !newL.some((e) => e.type === 'bless')
        && (MM.labelOf(sL.nodes.get(tbox)) || {}).text === 'inlet' && !MM.wordOf(sL.nodes.get(tbox)) && window.__calls.length === calls + 1,
      { named, artifacts: [artsT, sL.artifacts.length], events: newL.map((e) => e.type), calls: window.__calls.length - calls });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 42n–p. Another hand's ink is refused in words, never skipped (V1-PLAN L2e) ----
  // A label is a word on your OWN ink: the maker is the only one who may label a
  // mark (the notes, §B). Held with marks fern and a model made, the word goes on
  // yours alone; the line names theirs before Enter, and the status line says after
  // it whose marks were left, and why. Held alone, fern's mark is not labelled and
  // nothing is written — said quietly before Enter, and out loud after it.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const S = (x, y) => mm.worldToScreen(x, y);
    const fern = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f1' }));
    const kite = fern.addStroke(t.circle(760, 320, 50).map((p) => ({ x: p.x, y: p.y })), Date.now() - 5000, undefined, 1, { content: true });
    mm.session.load(MM.mergeLogs({ 'fern~f1': fern.getEvents(), 'me~m1': [] }, { me: 'me~m1' }));
    // A model joins and draws a mark in its own name, as `draw:` has it do.
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    const agentId = mm.agents[0].id;
    const model = mm.session.addStroke(t.rect(540, 410, 80, 50).map((p) => ({ x: p.x, y: p.y })), Date.now(), agentId, 1, { content: true });
    const modelName = MM.handLabel(MM.wordOf(mm.session.getState().nodes.get(agentId)) || agentId);
    const m0 = S(440, 250), m1 = S(590, 360);
    t.stroke(t.rect(m0.x, m0.y, m1.x - m0.x, m1.y - m0.y));
    const mine = mm.session.getState().contentIds[mm.session.getState().contentIds.length - 1];
    const calls = window.__calls.length;
    const c = S(630, 340);
    t.stroke(t.circle(c.x, c.y, 250)); t.takeLoop(c.x, c.y, 250); await wait(60);
    const held = mm.session.getState().summon;
    // Whose marks the label will not go on, in the order the loop holds them.
    const theirs = held ? held.enclosedIds.filter((id) => id === kite || id === model).map((id) => (id === kite ? 'fern' : modelName)) : [];
    t.typeIn('label: inlet');
    const lineM = t.readingLine();
    const evsM = mm.session.getEvents().length;
    t.typeEnter('label: inlet'); await wait(60);
    const sM = mm.session.getState();
    const labM = mm.session.getEvents().slice(evsM).filter((e) => e.type === 'label');
    const statusM = document.getElementById('status').textContent;
    step('42n. held with marks fern and a model made, the line names them before Enter: the word goes on yours, not on theirs',
      !!held && [kite, model, mine].every((id) => held.enclosedIds.includes(id))
        && theirs.length === 2 && lineM === '↵ label it “inlet” — on yours, not the 2 marks ' + theirs.join(' and ') + ' made',
      { held: held && held.enclosedIds, line: lineM, model: modelName });
    step('42o. Enter labels your mark alone — one label event — and says in the status line whose marks it left, and why: never passed over in silence, and no model asked',
      labM.length === 1 && labM[0].nodeId === mine && (MM.labelOf(sM.nodes.get(mine)) || {}).text === 'inlet'
        && !MM.labelOf(sM.nodes.get(kite)) && !MM.labelOf(sM.nodes.get(model))
        && /labelled it “inlet”/.test(statusM) && /fern/.test(statusM) && statusM.includes(modelName) && /your own ink/.test(statusM) && window.__calls.length === calls,
      { events: mm.session.getEvents().slice(evsM).map((e) => e.type), status: statusM, calls: window.__calls.length - calls });
    // Fern's mark held alone: nothing of yours to label.
    const k = S(760, 320);
    t.stroke(t.circle(k.x, k.y, 100)); t.takeLoop(k.x, k.y, 100); await wait(60);
    const heldK = mm.session.getState().summon;
    t.typeIn('label: kite');
    const lineK = t.readingLine();
    const quietK = !!document.querySelector('#summon .reading.quiet');
    const evsK = mm.session.getEvents().length;
    t.typeEnter('label: kite'); await wait(60);
    const statusK = document.getElementById('status').textContent;
    step('42p. held alone, fern\'s mark is not yours to label: the line says so quietly before Enter, and Enter writes nothing and says so in the status line',
      !!heldK && heldK.enclosedIds.length === 1 && heldK.enclosedIds[0] === kite && quietK && lineK === '↵ no label — fern made this mark; a label goes on your own ink'
        && !mm.session.getEvents().slice(evsK).some((e) => e.type === 'label') && !MM.labelOf(mm.session.getState().nodes.get(kite))
        && /no label on the mark fern made/.test(statusK) && /your own ink/.test(statusK),
      { held: heldK && heldK.enclosedIds, line: lineK, quiet: quietK, status: statusK, events: mm.session.getEvents().slice(evsK).map((e) => e.type) });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 43. An artifact is made by whoever blessed it (V1-PLAN L2f) ----
  // A bless wrote no maker, so every board read an artifact as its reader's own:
  // fern's word on the thing she made was dropped here, the marks inside it were
  // drawn in this hand's ink, and this hand could label it. The maker of an
  // artifact is who BLESSED it — and not who drew its marks: fern takes her
  // circle up together with this hand's box, and each mark keeps its drawer's colour.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const S = (x, y) => mm.worldToScreen(x, y);
    const b0 = S(300, 250), b1 = S(460, 350);
    t.stroke(t.rect(b0.x, b0.y, b1.x - b0.x, b1.y - b0.y));
    const box43 = mm.session.getState().contentIds[0];
    const mine43 = mm.session.getEvents().filter((e) => !e.by);
    // Fern, holding this hand's log, draws a circle beside the box, takes the two up as one thing, and puts a word on it.
    const fern = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f1' }));
    fern.load(MM.mergeLogs({ 'me~m1': mine43, 'fern~f1': [] }, { me: 'fern~f1' }));
    const at43 = Date.now();
    const kite43 = fern.addStroke(t.circle(600, 300, 50).map((p) => ({ x: p.x, y: p.y })), at43, undefined, 1, { content: true });
    const pair43 = fern.bless({ summonId: fern.summonMarks([box43, kite43], at43 + 1), name: 'pair', at: at43 + 2 });
    const worded43 = fern.label({ nodeId: pair43, text: 'kite and box', at: at43 + 3 });
    mm.session.load(MM.mergeLogs({ 'fern~f1': fern.getEvents().filter((e) => !e.by), 'me~m1': mine43 }, { me: 'me~m1' })); await wait(30);
    const s43 = mm.session.getState();
    const node43 = s43.nodes.get(pair43);
    const panel43 = document.getElementById('inspector').textContent;
    step('43. fern blesses her circle with this hand\'s box: on this board the thing is hers, and the panel says so',
      !!pair43 && s43.artifacts.includes(pair43) && !!node43 && MM.authorOf(node43) === 'participant:hand:fern_f1'
        && MM.authorOf(s43.nodes.get(box43)) === MM.LOCAL_PARTICIPANT && MM.authorOf(s43.nodes.get(kite43)) === 'participant:hand:fern_f1'
        && /by\s*fern/.test(panel43),
      { artifact: pair43, maker: node43 && MM.authorOf(node43), box: MM.authorOf(s43.nodes.get(box43)), panel: panel43.slice(0, 200) });
    const lab43 = (typeof mm.labelsDrawn === 'function' ? mm.labelsDrawn() : []).find((l) => l.id === pair43);
    step('43a. her word on the thing she made survives this board\'s replay, drawn in her colour and attributed to her',
      worded43 === pair43 && !!lab43 && lab43.text === 'kite and box' && lab43.colour === mm.handColour('fern') && lab43.who === 'fern',
      { worded: worded43, label: lab43, hue: mm.handColour('fern') });
    const ink43 = (id) => (typeof mm.inkDrawn === 'function' ? mm.inkDrawn(id) : null);
    step('43b. each mark inside it keeps the colour of the hand that DREW it: this hand\'s box in its own ink, her circle in hers',
      !!ink43(box43) && ink43(box43) === mm.colourOf(box43) && ink43(kite43) === mm.handColour('fern') && ink43(box43) !== ink43(kite43),
      { box: ink43(box43), boxOwn: mm.colourOf(box43), circle: ink43(kite43), hue: mm.handColour('fern') });
    sameAsWhole('a thing of two hands\' marks, each in its drawer\'s colour, and her label');
    // Held, it is not this hand's to label: the field says so before Enter, and Enter writes nothing.
    const c43 = S(475, 300);
    t.stroke(t.circle(c43.x, c43.y, 230)); t.takeLoop(c43.x, c43.y, 230); await wait(60);
    const held43 = mm.session.getState().summon;
    t.typeIn('label: mine');
    const line43 = t.readingLine();
    const evs43 = mm.session.getEvents().length;
    t.typeEnter('label: mine'); await wait(60);
    const status43 = document.getElementById('status').textContent;
    step('43c. held, fern\'s thing is not this hand\'s to label — though it drew one of its marks: the line says so before Enter, and Enter writes nothing',
      !!held43 && held43.enclosedIds.length === 1 && held43.enclosedIds[0] === pair43 && line43 === '↵ no label — fern made this mark; a label goes on your own ink'
        && !mm.session.getEvents().slice(evs43).some((e) => e.type === 'label') && (MM.labelOf(mm.session.getState().nodes.get(pair43)) || {}).text === 'kite and box'
        && /no label on the mark fern made/.test(status43),
      { held: held43 && held43.enclosedIds, line: line43, status: status43, events: mm.session.getEvents().slice(evs43).map((e) => e.type) });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 44. A word is made by whoever wrote its letters (V1-PLAN L2g) ----
  // Printed letters gather into a word, and the gathering wrote every word made
  // by this board's own hand: fern's word read as this hand's here, her label on
  // it was dropped, and this hand could label it. And gathering never asked whose
  // a letter was: a mark of this hand's that the merge set between two of her
  // letters broke her run, and a letter printed beside her word joined it. A word
  // is one hand's run.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const S = (x, y) => mm.worldToScreen(x, y);
    const seg44 = (a, b) => t.line(a, b, 14);
    // N, A in two strokes, and V, as a hand prints them: 30 units tall, in the board's units.
    const nav44 = (x, y) => [
      seg44({ x, y: y + 30 }, { x, y }).concat(seg44({ x, y }, { x: x + 18, y: y + 30 }).slice(1), seg44({ x: x + 18, y: y + 30 }, { x: x + 18, y }).slice(1)),
      seg44({ x: x + 26, y: y + 30 }, { x: x + 36, y }).concat(seg44({ x: x + 36, y }, { x: x + 46, y: y + 30 }).slice(1)),
      seg44({ x: x + 30, y: y + 18 }, { x: x + 42, y: y + 18 }),
      seg44({ x: x + 54, y }, { x: x + 64, y: y + 30 }).concat(seg44({ x: x + 64, y: y + 30 }, { x: x + 74, y }).slice(1)),
    ];
    const wordHolding44 = (s, letter) => s.contentIds.find((id) => MM.isWord(s.nodes.get(id)) && MM.lettersOf(s.nodes.get(id)).includes(letter));
    // This hand prints an I on the line, well to the right of where fern's word will stand.
    const i0 = S(500, 300), i1 = S(500, 330);
    t.stroke(t.line(i0, i1, 14));
    const mine44 = mm.session.getEvents().filter((e) => !e.by);
    const myI44 = mm.session.getState().contentIds[0];
    const myAt44 = mine44[mine44.length - 1].at;
    // Fern prints N A V on her own board — her A's crossbar a moment AFTER this hand's I,
    // so the merge sets this hand's mark between two of her letters — and puts a word on hers.
    const fern44 = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f1' }));
    const hers44 = nav44(300, 300).map((pts, i) => fern44.addStroke(pts, myAt44 + [-800, -400, 400, 800][i], undefined, 1));
    const word44 = wordHolding44(fern44.getState(), hers44[0]);
    const worded44 = word44 && fern44.label({ nodeId: word44, text: 'nav', at: myAt44 + 1200 });
    mm.session.load(MM.mergeLogs({ 'fern~f1': fern44.getEvents().filter((e) => !e.by), 'me~m1': mine44 }, { me: 'me~m1' })); await wait(30);
    // The panel reports on the mark the pointer rests on: rest it on her word.
    const w44 = S(337, 315);
    document.getElementById('canvas').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, isPrimary: true, bubbles: true, clientX: w44.x, clientY: w44.y, buttons: 0 }));
    await wait(30);
    const s44 = mm.session.getState();
    const node44 = word44 && s44.nodes.get(word44);
    const panel44 = document.getElementById('inspector').textContent;
    step('44. fern\'s word stands whole on this board — her four letters, though the merge set this hand\'s I between two of them — and it is hers, as the panel says; the I is this hand\'s, alone',
      !!node44 && MM.isWord(node44) && JSON.stringify(MM.lettersOf(node44)) === JSON.stringify(hers44)
        && MM.authorOf(node44) === 'participant:hand:fern_f1' && /word/.test(panel44) && /by\s*fern/.test(panel44)
        && s44.contentIds.includes(myI44) && MM.authorOf(s44.nodes.get(myI44)) === MM.LOCAL_PARTICIPANT,
      { word: word44, letters: node44 && MM.lettersOf(node44), hers: hers44, maker: node44 && MM.authorOf(node44), content: s44.contentIds, panel: panel44.slice(0, 200) });
    const lab44 = (typeof mm.labelsDrawn === 'function' ? mm.labelsDrawn() : []).find((l) => l.id === word44);
    step('44a. her label on her word survives this board\'s replay, drawn in her colour and attributed to her',
      !!word44 && worded44 === word44 && !!lab44 && lab44.text === 'nav' && lab44.colour === mm.handColour('fern') && lab44.who === 'fern',
      { worded: worded44, label: lab44, hue: mm.handColour('fern') });
    // Held, her word is not this hand's to label: the line says so before Enter, and Enter writes nothing.
    t.stroke(t.circle(w44.x, w44.y, 90)); t.takeLoop(w44.x, w44.y, 90); await wait(60);
    const held44 = mm.session.getState().summon;
    t.typeIn('label: mine');
    const line44 = t.readingLine();
    const evs44 = mm.session.getEvents().length;
    t.typeEnter('label: mine'); await wait(60);
    const status44 = document.getElementById('status').textContent;
    step('44b. held, fern\'s word is not this hand\'s to label: the line says so before Enter, and Enter writes nothing',
      !!held44 && held44.enclosedIds.length === 1 && held44.enclosedIds[0] === word44 && line44 === '↵ no label — fern made this mark; a label goes on your own ink'
        && !mm.session.getEvents().slice(evs44).some((e) => e.type === 'label') && (MM.labelOf(mm.session.getState().nodes.get(word44)) || {}).text === 'nav'
        && /no label on the mark fern made/.test(status44),
      { held: held44 && held44.enclosedIds, line: line44, status: status44, events: mm.session.getEvents().slice(evs44).map((e) => e.type) });
    // Live: fern has just printed a word, and this hand prints a letter beside it — on her
    // line, a letter's gap from her V, within the moment a word is written. It stays this hand's.
    const fern44c = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f2' }));
    const now44 = Date.now();
    const hers44c = nav44(300, 500).map((pts, i) => fern44c.addStroke(pts, now44 - 1600 + 400 * i, undefined, 1));
    const word44c = wordHolding44(fern44c.getState(), hers44c[0]);
    mm.session.load(MM.mergeLogs({ 'fern~f2': fern44c.getEvents().filter((e) => !e.by), 'me~m1': [] }, { me: 'me~m1' })); await wait(30);
    const j0 = S(382, 500), j1 = S(382, 530);
    t.stroke(t.line(j0, j1, 14)); await wait(30);
    const s44c = mm.session.getState();
    const myJ44 = [...s44c.nodes.values()].find((n) => !!MM.strokePointsOf(n) && MM.authorOf(n) === MM.LOCAL_PARTICIPANT);
    const herWord44c = word44c && s44c.nodes.get(word44c);
    step('44c. a letter this hand prints beside her word — on her line, a letter\'s gap from it, just after she wrote it — never joins it: a word is one hand\'s run',
      !!herWord44c && JSON.stringify(MM.lettersOf(herWord44c)) === JSON.stringify(hers44c) && MM.authorOf(herWord44c) === 'participant:hand:fern_f2'
        && !!myJ44 && s44c.contentIds.includes(myJ44.id) && !wordHolding44(s44c, myJ44.id),
      { word: word44c, letters: herWord44c && MM.lettersOf(herWord44c), hers: hers44c, mine: myJ44 && myJ44.id, content: s44c.contentIds });
    document.getElementById('canvas').dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, isPrimary: true, bubbles: true }));
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 45. Gestures are per hand (V1-PLAN L2h) ----
  // The gesture state — a loop that waits, a summon, the selection — was one for
  // the whole board, while a room's logs interleave by time. So a stroke fern
  // drew while this hand's field stood open dissolved the field at the next
  // merge, and the name given in it made nothing, on any board; her loop and her
  // check opened this hand's field on her marks; and her stroke between this
  // hand's loop and its check left the loop untaken, so the check read backwards
  // and held the loop's own ink. Two tabs in one room: this one, driven through
  // its own surface, and fern's, a hand with its own board on the same hub.
  {
    // This hand takes its loops up with the built-in check here; a mark held on
    // the device (record 12 leaves one) is record 46's business.
    if (mm.savedMark()) mm.forgetMark();
    mm.session.load([]); mm.setView(1, 0, 0);
    const S = (x, y) => mm.worldToScreen(x, y);
    const hub45 = new MM.LocalHub();
    const fernStore45 = new MM.LiveStore(hub45.connect(), 'fern~f1', 'pair45');
    const fern45 = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f1' }));
    await mm.openLive('pair45', { transport: hub45.connect() });
    const me45 = mm.folder().me;
    const myHand45 = 'participant:hand:' + me45.replace(/[^A-Za-z0-9._-]+/g, '_');
    // fern acts on her own board and sends what she wrote; this board merges it as it lands.
    const fernActs45 = async (fn) => { const n = fern45.getEvents().length; const out = fn(); await fernStore45.appendLog('fern~f1', fern45.getEvents().slice(n)); return out; };
    const until45 = async (pred) => { for (let i = 0; i < 40 && !pred(); i++) await wait(50); };
    const fieldShown45 = () => { const el = document.getElementById('summon'); return !!el && el.style.display !== 'none'; };
    // This hand draws two boxes, circles them and takes the loop up: the field opens on the two.
    const p0 = S(200, 200), p1 = S(340, 290), q0 = S(400, 200), q1 = S(540, 290), c45 = S(370, 245);
    t.stroke(t.rect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y));
    t.stroke(t.rect(q0.x, q0.y, q1.x - q0.x, q1.y - q0.y));
    const boxes45 = mm.session.getState().contentIds.slice();
    t.stroke(t.circle(c45.x, c45.y, 240)); t.takeLoop(c45.x, c45.y, 240); await wait(60);
    const sum45 = mm.session.getState().summon;
    // fern draws a box well away while the field stands open, and her line lands here.
    await wait(30);
    const fernBox45 = await fernActs45(() => fern45.addStroke(t.rect(1100, 700, 120, 80), Date.now(), undefined, 1));
    await until45(() => mm.session.getState().contentIds.includes(fernBox45));
    await wait(60);
    const st45 = mm.session.getState();
    step('45. fern draws while this hand\'s field stands open on its two boxes: her box lands on this board, and the field stays open on the same two',
      !!sum45 && JSON.stringify([...sum45.enclosedIds].sort()) === JSON.stringify([...boxes45].sort()) && st45.contentIds.includes(fernBox45)
        && !!st45.summon && st45.summon.id === sum45.id && JSON.stringify([...st45.summon.enclosedIds].sort()) === JSON.stringify([...boxes45].sort()) && fieldShown45(),
      { summon: sum45 && sum45.id, boxes: boxes45, now: st45.summon && { id: st45.summon.id, enclosed: st45.summon.enclosedIds }, fern: fernBox45, content: st45.contentIds, shown: fieldShown45() });
    // This hand names what it circled, in the field.
    await wait(30);
    t.typeEnter('name: pair'); await wait(80);
    const st45a = mm.session.getState();
    const pair45 = st45a.artifacts.find((id) => MM.wordOf(st45a.nodes.get(id)) === 'pair');
    const partsOf45 = (s, id) => { const n = id && s.nodes.get(id); return n ? n.edges.filter((e) => e.rel === 'has-part').map((e) => e.to).sort() : []; };
    step('45a. the name given in the field makes the thing on this board, holding this hand\'s two boxes; fern\'s box stays loose, and hers',
      !!pair45 && JSON.stringify(partsOf45(st45a, pair45)) === JSON.stringify([...boxes45].sort()) && MM.authorOf(st45a.nodes.get(pair45)) === MM.LOCAL_PARTICIPANT
        && st45a.contentIds.includes(fernBox45) && MM.authorOf(st45a.nodes.get(fernBox45)) === 'participant:hand:fern_f1' && !st45a.summon && !fieldShown45(),
      { artifact: pair45 || null, artifacts: st45a.artifacts, parts: partsOf45(st45a, pair45), content: st45a.contentIds, summon: st45a.summon && st45a.summon.id });
    // What this hand wrote reaches fern; her board is her log and the room's, merged.
    await mm.saveNow(); await wait(120);
    const fernBoard45 = () => {
      const s = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f1' }));
      return fernStore45.readLogs().then((logs) => { s.load(MM.mergeLogs(Object.assign({}, logs, { 'fern~f1': fern45.getEvents().filter((e) => !e.by) }), { me: 'fern~f1' })); return s.getState(); });
    };
    const fb45 = await fernBoard45();
    step('45b. on fern\'s board the thing stands too — this hand\'s, holding this hand\'s two boxes — and no field of hers was ever opened by it',
      !!pair45 && fb45.artifacts.includes(pair45) && JSON.stringify(partsOf45(fb45, pair45)) === JSON.stringify([...boxes45].sort())
        && MM.authorOf(fb45.nodes.get(pair45)) === myHand45 && fb45.summon === null && fb45.selection.length === 0,
      { artifacts: fb45.artifacts, parts: partsOf45(fb45, pair45), maker: pair45 && fb45.nodes.get(pair45) ? MM.authorOf(fb45.nodes.get(pair45)) : null, summon: fb45.summon && fb45.summon.id });
    // A third reader who was never in the room, the logs handed over in both orders.
    const logs45 = await fernStore45.readLogs();
    const mine45 = logs45[me45] || [], hers45 = fern45.getEvents().filter((e) => !e.by);
    const third45 = [[me45, mine45, 'fern~f1', hers45], ['fern~f1', hers45, me45, mine45]].map(([k1, v1, k2, v2]) => {
      const s = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'cleo~c1' }));
      s.load(MM.mergeLogs({ [k1]: v1, [k2]: v2 }, { me: 'cleo~c1' }));
      return s.getState();
    });
    step('45c. and on a third reader\'s replay, the two logs handed over in either order, the thing stands holding this hand\'s two boxes',
      !!pair45 && third45.every((s) => s.artifacts.includes(pair45) && JSON.stringify(partsOf45(s, pair45)) === JSON.stringify([...boxes45].sort()) && MM.authorOf(s.nodes.get(pair45)) === myHand45 && s.contentIds.includes(fernBox45)),
      { mine: mine45.length, hers: hers45.length, third: third45.map((s) => ({ artifacts: s.artifacts, parts: partsOf45(s, pair45) })) });
    // fern circles her box and takes her loop up on her own board: her field is hers.
    await wait(30);
    await fernActs45(() => fern45.addStroke(t.circle(1160, 740, 110), Date.now(), undefined, 1));
    await wait(30);
    await fernActs45(() => fern45.addStroke(t.check(1235, 730, 1), Date.now(), undefined, 1));
    const fernSummon45 = fern45.getState().summon;
    await until45(() => mm.session.getEvents().filter((e) => e.by === 'fern~f1').length >= 3);
    await wait(60);
    const st45d = mm.session.getState();
    step('45d. fern takes her own loop up and her field opens on her box, on her board — never this hand\'s: nothing opens here, and nothing here is selected or waiting',
      !!fernSummon45 && fernSummon45.enclosedIds.length === 1 && fernSummon45.enclosedIds[0] === fernBox45
        && st45d.summon === null && st45d.selection.length === 0 && st45d.pendingLassoId === null && !fieldShown45(),
      { hers: fernSummon45 && fernSummon45.enclosedIds, here: st45d.summon && st45d.summon.enclosedIds, selection: st45d.selection, pending: st45d.pendingLassoId, shown: fieldShown45() });
    // This hand circles a new box; fern draws between its loop and its check; the check takes the loop up.
    const r0 = S(200, 450), r1 = S(340, 540), c45e = S(270, 495);
    t.stroke(t.rect(r0.x, r0.y, r1.x - r0.x, r1.y - r0.y));
    const box45e = mm.session.getState().contentIds[mm.session.getState().contentIds.length - 1];
    t.stroke(t.circle(c45e.x, c45e.y, 150));
    const loop45e = mm.session.getState().pendingLassoId;
    await wait(30);
    const fernLine45 = await fernActs45(() => fern45.addStroke(t.line({ x: 1100, y: 950 }, { x: 1300, y: 950 }, 30), Date.now(), undefined, 1));
    await until45(() => mm.session.getState().contentIds.includes(fernLine45));
    await wait(40);
    const waiting45e = mm.session.getState().pendingLassoId;
    t.takeLoop(c45e.x, c45e.y, 150); await wait(60);
    const st45e = mm.session.getState();
    step('45e. a stroke of fern\'s lands between this hand\'s loop and its check: the loop still waits for this hand, the check takes it up, and the field holds what the loop held — not the loop\'s own ink',
      !!loop45e && waiting45e === loop45e && !!st45e.summon && st45e.summon.scopeSource === 'lasso'
        && JSON.stringify(st45e.summon.enclosedIds) === JSON.stringify([box45e]) && !st45e.summon.enclosedIds.includes(loop45e) && fieldShown45(),
      { loop: loop45e, waiting: waiting45e, summon: st45e.summon && { source: st45e.summon.scopeSource, enclosed: st45e.summon.enclosedIds }, box: box45e });
    if (st45e.summon) mm.session.dismiss(st45e.summon.id, Date.now());
    fernStore45.close();
    if (mm.folder().store && mm.folder().store.close) mm.folder().store.close();
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 46. A hand's own mark in a room (V1-PLAN L2h) ----
  // The mark that takes a loop up is the hand's that taught it. The mark held on
  // this device is re-taught as a room opens — but only when no log taught one,
  // so a room where fern's log teaches her own mark taught this hand nothing and
  // judged it by hers; and when it was re-taught, the room's first merge counted
  // that teach as the room's and dropped it from this hand's log.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const S = (x, y) => mm.worldToScreen(x, y);
    const until46 = async (pred) => { for (let i = 0; i < 40 && !pred(); i++) await wait(50); };
    const fieldShown46 = () => { const el = document.getElementById('summon'); return !!el && el.style.display !== 'none'; };
    // This device holds the caret, taught on the pad.
    window.__teach();
    mm.session.load([]);
    const held46 = mm.savedMark();
    // fern taught a check of her own on her board, and drew a box.
    const fern46 = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f2' }));
    fern46.teachCommandMark(MM.learnCommandMark(MM.canonicalCheckSamples(), 'fern\'s check'), Date.now() - 3000);
    const fernBox46 = fern46.addStroke(t.rect(1100, 450, 120, 80), Date.now() - 2000, undefined, 1);
    const hub46 = new MM.LocalHub();
    const fernStore46 = new MM.LiveStore(hub46.connect(), 'fern~f2', 'mark46');
    await fernStore46.appendLog('fern~f2', fern46.getEvents().slice());
    // The room replays what it holds as a hand connects, the way a relay replays its buffer.
    const conn46 = hub46.connect();
    const transport46 = {
      send: (line) => conn46.send(line),
      onMessage: (cb) => { const off = conn46.onMessage(cb); cb({ participant: 'fern~f2', events: fern46.getEvents().slice(), at: Date.now(), full: true, sid: fernStore46.sitting }); return off; },
    };
    await mm.openLive('mark46', { transport: transport46 });
    // Wait for the room's answer to this hand's hello — the first merge after opening.
    await wait(150);
    const st46 = mm.session.getState();
    step('46. the mark this device holds is this hand\'s in a room whose other hand taught her own: re-taught as the room opened, and still its mark once the room\'s logs have merged',
      !!held46 && st46.contentIds.includes(fernBox46) && !!st46.commandMark && st46.commandMark.name === held46.mark.name && document.getElementById('markName').textContent === held46.mark.name,
      { held: held46 && held46.mark.name, mark: st46.commandMark && st46.commandMark.name, chip: document.getElementById('markName').textContent, teaches: mm.session.getEvents().filter((e) => e.type === 'teach').map((e) => ({ by: e.by || 'me', mark: e.mark && e.mark.name })) });
    // This hand circles a box and takes the loop up with its caret; fern takes hers up with her check.
    const b0 = S(300, 450), b1 = S(440, 540), c46 = S(370, 495);
    t.stroke(t.rect(b0.x, b0.y, b1.x - b0.x, b1.y - b0.y));
    const box46 = mm.session.getState().contentIds[mm.session.getState().contentIds.length - 1];
    t.stroke(t.circle(c46.x, c46.y, 150));
    const loop46 = mm.session.getState().pendingLassoId;
    t.stroke(t.caret(c46.x + 150 - 30, c46.y - 20)); await wait(60);
    const sum46 = mm.session.getState().summon;
    await wait(30);
    const n46 = fern46.getEvents().length;
    const fernLoop46 = fern46.addStroke(t.circle(1160, 490, 110), Date.now(), undefined, 1);
    const fernCheck46 = fern46.addStroke(t.check(1235, 480, 1), Date.now() + 1, undefined, 1);
    await fernStore46.appendLog('fern~f2', fern46.getEvents().slice(n46));
    await until46(() => mm.session.getState().contentIds.includes(fernBox46) && mm.session.getEvents().some((e) => e.by === 'fern~f2' && e.seq === fern46.getEvents()[fern46.getEvents().length - 1].seq));
    await wait(60);
    const st46a = mm.session.getState();
    const role46 = (id) => { const n = st46a.nodes.get(id); const g = n && n.reps.find((r) => r.modality === 'gesture'); return g ? g.data.role : null; };
    step('46a. its caret takes its loop up and the field opens on its box — and stays open when fern takes her loop up with her own check, which is read as hers, on this board',
      !!loop46 && !!sum46 && sum46.scopeSource === 'lasso' && JSON.stringify(sum46.enclosedIds) === JSON.stringify([box46])
        && !!st46a.summon && st46a.summon.id === sum46.id && fieldShown46() && !!st46a.commandMark && st46a.commandMark.name === held46.mark.name
        && role46(fernLoop46) === 'lasso' && role46(fernCheck46) === 'command' && !st46a.contentIds.includes(fernLoop46),
      { loop: loop46, summon: sum46 && { source: sum46.scopeSource, enclosed: sum46.enclosedIds }, now: st46a.summon && st46a.summon.id, mark: st46a.commandMark && st46a.commandMark.name, hers: { loop: role46(fernLoop46), check: role46(fernCheck46) }, miss: st46a.markMiss });
    if (st46a.summon) mm.session.dismiss(st46a.summon.id, Date.now());
    fernStore46.close();
    if (mm.folder().store && mm.folder().store.close) mm.folder().store.close();
    mm.forgetMark();
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 47. A person is the same person across sittings (V1-PLAN L2i) ----
  // A live tab's log is one sitting — this page load — shown under the person's
  // name and colour. But the rule that asks "is this mine?" compared the exact
  // log name, so after a reload the person was a stranger to their own ink: the
  // field said *no label — <name> made this mark*, and core refused the word.
  // The harness cannot reload its own page, so the sitting before the reload is
  // a hand of this person's name under another suffix — what a reload leaves in
  // the room — and this tab is the sitting after it; then the other way round,
  // this tab draws and its next sitting labels. fern shares the room.
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    const S = (x, y) => mm.worldToScreen(x, y);
    const until47 = async (pred) => { for (let i = 0; i < 40 && !pred(); i++) await wait(50); };
    const handIdOf47 = (name) => 'participant:hand:' + name.replace(/[^A-Za-z0-9._-]+/g, '_');
    const named47 = (name) => MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: name }));
    const hub47 = new MM.LocalHub();
    await mm.openLive('reload47', { transport: hub47.connect() });
    const me47 = mm.folder().me;
    const person47 = MM.handLabel(me47);
    // The sitting before the reload: this person, another suffix (five letters, so
    // never this page load's four). It drew a box in the room; fern drew a circle.
    // Both are in the room before either sends, so each hears the other.
    const prev47 = MM.sittingName(person47, 'prev1');
    const prevSession47 = named47(prev47);
    const prevStore47 = new MM.LiveStore(hub47.connect(), prev47, 'reload47');
    const fern47 = named47('fern~f7');
    const fernStore47 = new MM.LiveStore(hub47.connect(), 'fern~f7', 'reload47');
    const box47 = prevSession47.addStroke(t.rect(200, 200, 160, 100).map((p) => ({ x: p.x, y: p.y })), Date.now() - 60000, undefined, 1);
    await prevStore47.appendLog(prev47, prevSession47.getEvents().slice());
    const kite47 = fern47.addStroke(t.circle(560, 250, 50).map((p) => ({ x: p.x, y: p.y })), Date.now() - 50000, undefined, 1);
    await fernStore47.appendLog('fern~f7', fern47.getEvents().slice());
    await until47(() => mm.session.getState().contentIds.includes(box47) && mm.session.getState().contentIds.includes(kite47));
    await wait(60);
    const st47 = mm.session.getState();
    const prevHand47 = st47.nodes.get(handIdOf47(prev47));
    step('47. after a reload the room brings back the box this person drew before it: the earlier sitting\'s mark, shown under this person\'s name',
      person47 !== '' && prev47 !== me47 && st47.contentIds.includes(box47) && MM.authorOf(st47.nodes.get(box47)) === handIdOf47(prev47)
        && !!prevHand47 && MM.wordOf(prevHand47) === person47,
      { me: me47, person: person47, prev: prev47, maker: st47.nodes.get(box47) ? MM.authorOf(st47.nodes.get(box47)) : null, content: st47.contentIds });
    // Held alone: the word goes on it — no longer *no label — <name> made this mark*.
    const b47 = S(280, 250);
    t.stroke(t.circle(b47.x, b47.y, 130)); t.takeLoop(b47.x, b47.y, 130); await wait(60);
    const held47 = mm.session.getState().summon;
    t.typeIn('label: inlet');
    const line47 = t.readingLine();
    const quiet47 = !!document.querySelector('#summon .reading.quiet');
    const evs47 = mm.session.getEvents().length;
    t.typeEnter('label: inlet'); await wait(60);
    const s47 = mm.session.getState();
    const lab47 = mm.session.getEvents().slice(evs47).filter((e) => e.type === 'label');
    const status47 = document.getElementById('status').textContent;
    step('47a. held after the reload, the box drawn before it is this person\'s to label: the line says the word goes on it, before Enter',
      !!held47 && held47.enclosedIds.length === 1 && held47.enclosedIds[0] === box47 && line47 === '↵ label it “inlet”' && !quiet47,
      { held: held47 && held47.enclosedIds, line: line47, quiet: quiet47 });
    step('47b. Enter puts the word on it — one label event, this sitting\'s — and the box is still the earlier sitting\'s mark: the rule changed, not whose it is',
      lab47.length === 1 && lab47[0].nodeId === box47 && !lab47[0].by && (MM.labelOf(s47.nodes.get(box47)) || {}).text === 'inlet'
        && MM.labelOf(s47.nodes.get(box47)).source === MM.LOCAL_PARTICIPANT && MM.authorOf(s47.nodes.get(box47)) === handIdOf47(prev47)
        && /labelled it “inlet”/.test(status47),
      { labels: lab47, label: MM.labelOf(s47.nodes.get(box47)) || null, maker: MM.authorOf(s47.nodes.get(box47)), status: status47, stale: s47.staleResult });
    // The word reaches the room: every board holds it on the box.
    await mm.saveNow(); await wait(150);
    const room47 = await fernStore47.readLogs();
    const boardOf47 = (me, own) => {
      const s = named47(me);
      s.load(MM.mergeLogs(Object.assign({}, room47, own ? { [me]: own } : {}), { me }));
      return s.getState();
    };
    const boards47 = [
      ['the earlier sitting\'s', boardOf47(prev47, prevSession47.getEvents().filter((e) => !e.by))],
      ['fern\'s', boardOf47('fern~f7', fern47.getEvents().filter((e) => !e.by))],
      ['a third reader\'s', boardOf47('cleo~c7', null)],
    ];
    step('47c. the word reaches the room: on the earlier sitting\'s board — a tab still open — on fern\'s and on a third reader\'s, it stands on the box',
      boards47.every(([, s]) => (MM.labelOf(s.nodes.get(box47)) || {}).text === 'inlet' && MM.labelOf(s.nodes.get(box47)).source === handIdOf47(me47)),
      { boards: boards47.map(([who, s]) => ({ who, label: s.nodes.get(box47) ? MM.labelOf(s.nodes.get(box47)) || null : 'no box' })), room: Object.keys(room47) });
    // Held with fern's circle: another person is refused as before, said before Enter and after it.
    const c47 = S(420, 250);
    t.stroke(t.circle(c47.x, c47.y, 250)); t.takeLoop(c47.x, c47.y, 250); await wait(60);
    const heldBoth47 = mm.session.getState().summon;
    t.typeIn('label: outlet');
    const lineBoth47 = t.readingLine();
    const evsBoth47 = mm.session.getEvents().length;
    t.typeEnter('label: outlet'); await wait(60);
    const sBoth47 = mm.session.getState();
    const labBoth47 = mm.session.getEvents().slice(evsBoth47).filter((e) => e.type === 'label');
    const statusBoth47 = document.getElementById('status').textContent;
    step('47d. held with fern\'s circle, the word goes on this person\'s box and not on hers — another person is refused as before, said before Enter and after it',
      !!heldBoth47 && heldBoth47.enclosedIds.length === 2 && [box47, kite47].every((id) => heldBoth47.enclosedIds.includes(id))
        && lineBoth47 === '↵ label it “outlet” — on yours, not the mark fern made'
        && labBoth47.length === 1 && labBoth47[0].nodeId === box47 && (MM.labelOf(sBoth47.nodes.get(box47)) || {}).text === 'outlet' && !MM.labelOf(sBoth47.nodes.get(kite47))
        && /labelled it “outlet”/.test(statusBoth47) && /not on the mark fern made/.test(statusBoth47),
      { held: heldBoth47 && heldBoth47.enclosedIds, line: lineBoth47, labels: labBoth47.map((e) => e.nodeId), status: statusBoth47 });
    // And the other way round: this tab draws in the room, and its next sitting — as
    // after the next reload — puts a word on what it drew; the word lands here.
    const d0 = S(800, 200), d1 = S(920, 280);
    t.stroke(t.rect(d0.x, d0.y, d1.x - d0.x, d1.y - d0.y));
    const drawn47 = mm.session.getState().contentIds[mm.session.getState().contentIds.length - 1];
    await mm.saveNow(); await wait(150);
    const next47 = MM.sittingName(person47, 'next1');
    const nextSession47 = named47(next47);
    nextSession47.load(MM.mergeLogs(Object.assign({}, await fernStore47.readLogs(), { [next47]: [] }), { me: next47 }));
    const worded47 = nextSession47.label({ nodeId: drawn47, text: 'cap', at: Date.now() });
    const nextStore47 = new MM.LiveStore(hub47.connect(), next47, 'reload47');
    await nextStore47.appendLog(next47, nextSession47.getEvents().filter((e) => !e.by));
    await until47(() => !!MM.labelOf(mm.session.getState().nodes.get(drawn47)));
    await wait(60);
    const drawnNode47 = mm.session.getState().nodes.get(drawn47);
    const drawnLab47 = (typeof mm.labelsDrawn === 'function' ? mm.labelsDrawn() : []).find((l) => l.id === drawn47);
    step('47e. and the other way round: a box this tab drew in the room is its person\'s next sitting\'s to label — the word lands here, beside it, this tab\'s mark still',
      !!drawn47 && worded47 === drawn47 && !!drawnNode47 && MM.authorOf(drawnNode47) === MM.LOCAL_PARTICIPANT
        && (MM.labelOf(drawnNode47) || {}).text === 'cap' && MM.labelOf(drawnNode47).source === handIdOf47(next47)
        && !!drawnLab47 && drawnLab47.text === 'cap' && drawnLab47.who === person47,
      { drawn: drawn47, worded: worded47, stale: nextSession47.getState().staleResult, label: drawnNode47 ? MM.labelOf(drawnNode47) || null : null, drawnLabel: drawnLab47 || null });
    sameAsWhole('a person across sittings, their words on the board');
    prevStore47.close(); fernStore47.close(); nextStore47.close();
    if (mm.folder().store && mm.folder().store.close) mm.folder().store.close();
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 48. What a paint reads is the log's (V1-PLAN R4c) ----
  // The surface keeps what it derives from the log — what each mark plays, the
  // offers, the chips — and keeps it only while the log it came from stands.
  // So the reading under a mark, a mark's panel, a match chip and an answer
  // card must change the moment the log does: a stroke, an undo, a line from
  // another hand. Each is also painted the whole-board way and compared.
  {
    mm.session.load([]); mm.setView(1, 0, 0); await wait(30);
    const until48 = async (pred) => { for (let i = 0; i < 40 && !pred(); i++) await wait(50); };
    const lastId = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const readingNow = () => { const r = mm.readingDrawn(); return r ? r.id + ' ' + r.text : null; };
    const panel = () => document.getElementById('inspector').textContent;
    const hoverAt = (x, y) => document.getElementById('canvas').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: 0 }));
    const leave = () => document.getElementById('canvas').dispatchEvent(new PointerEvent('pointerleave', { pointerId: 1, bubbles: true }));
    // A box alone plays a node, standing on its own.
    t.stroke(t.rect(300, 260, 160, 100));
    const boxA = lastId();
    const alone = readingNow();
    // A second box, and an arrow from the first to the second: the arrow is an edge.
    t.stroke(t.rect(700, 260, 160, 100));
    t.stroke(t.line({ x: 468, y: 310 }, { x: 692, y: 310 }, 40).concat(t.line({ x: 692, y: 310 }, { x: 666, y: 293 }, 20).slice(1)));
    const arrow48 = lastId();
    step('48. the reading under a mark is the mark just made: a box alone plays a node, then an arrow between two boxes plays an edge',
      alone === boxA + ' rectangle · node' && readingNow() === arrow48 + ' arrow · edge',
      { alone, arrow: readingNow() });
    sameAsWhole('two boxes and an arrow between them');
    // The first box, pointed at: the panel says a connector is attached to it.
    hoverAt(380, 310); await wait(30);
    const wired = panel();
    // The arrow goes (its binds first — the pen landed it on the boxes' sites); the box it joined is not the mark undone.
    for (let i = 0; i < 4 && mm.session.getState().contentIds.includes(arrow48); i++) mm.session.undo();
    await wait(30);
    const unwired = panel();
    step('48a. undo reaches a neighbour: the box the arrow joined says a connector is attached, and after the arrow is undone, that it stands on its own',
      /rectangle with 1 connector attached/.test(wired) && /rectangle standing on its own/.test(unwired) && readingNow() === boxA + ' rectangle · node',
      { wired: (wired.match(/a rectangle[^.]*?(attached|own)/) || [])[0], unwired: (unwired.match(/a rectangle[^.]*?(attached|own)/) || [])[0], reading: readingNow() });
    sameAsWhole('the arrow undone, the box it joined pointed at');
    // A move changes no id, and still changes what a mark plays: a circle drawn
    // inside the box makes the box a container; dragged out, the box is a node again.
    t.stroke(t.circle(380, 310, 24));
    const ring48 = lastId();
    hoverAt(310, 262); await wait(30);
    const holding = readingNow();
    mm.session.move({ ids: [ring48], dx: 0, dy: 420, at: Date.now() }); await wait(30);
    const empty = readingNow();
    step('48a2. a move reaches a neighbour: a circle inside the box makes it a container, and dragged out of it, the box plays a node again — no mark added or taken away',
      holding === boxA + ' rectangle · container' && empty === boxA + ' rectangle · node', { holding, empty });
    sameAsWhole('the circle moved out of the box');
    leave(); await wait(20);
    // A definition, then another like it: a chip with its match beside the second.
    const dumbbell = (x, y) => {
      t.stroke(t.circle(x, y, 40)); const a = lastId();
      t.stroke(t.circle(x + 200, y, 40)); const b = lastId();
      t.stroke(t.line({ x: x + 44, y: y }, { x: x + 156, y: y }, 30)); const l = lastId();
      return [a, b, l];
    };
    const first48 = dumbbell(300, 560);
    const sid48 = mm.session.summonMarks(first48, Date.now());
    mm.session.bless({ summonId: sid48, name: 'dumbbell', at: Date.now() });
    const second48 = dumbbell(700, 560);
    const chipOn = () => mm.chips().some((c) => c.ids.length === 3 && second48.every((id) => c.ids.includes(id)));
    const matched = chipOn();
    sameAsWhole('a definition, and a match chip beside the next one like it');
    // The second dumbbell's bar goes (its binds first): two circles are not a dumbbell.
    for (let i = 0; i < 4 && mm.session.getState().contentIds.includes(second48[2]); i++) mm.session.undo();
    await wait(30);
    const gone = !mm.chips().some((c) => second48.slice(0, 2).every((id) => c.ids.includes(id)));
    sameAsWhole('the bar undone, no chip');
    t.stroke(t.line({ x: 744, y: 560 }, { x: 856, y: 560 }, 30)); second48[2] = lastId();
    const back = chipOn();
    step('48b. a match chip stands beside the second dumbbell, goes the moment its bar is undone, and comes back when the bar is drawn again',
      matched && gone && back, { matched, gone, back, chips: mm.chips().map((c) => c.ids.length) });
    // An answer about a mark: a card beside it, gone with the undo, back with the answer.
    const answer48 = () => mm.session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: 'two circles held apart by a bar', aboutIds: [second48[0]], at: Date.now() });
    answer48();
    const card1 = mm.answerCards().some((c) => c.about[0] === second48[0]);
    mm.session.undo(); await wait(30);
    const card0 = !mm.answerCards().some((c) => c.about[0] === second48[0]);
    answer48();
    const card2 = mm.answerCards().some((c) => c.about[0] === second48[0]);
    step('48c. an answer card stands beside the mark it is about, goes with the undo, and comes back with the answer',
      card1 && card0 && card2, { card1, card0, card2, cards: mm.answerCards().length });
    sameAsWhole('a card beside the dumbbell it is about');
    // A pointer move while drawing paints the pen, not the board; a wheel moves the view at once and paints once a frame.
    {
      const c48 = document.getElementById('canvas');
      const pe = (type, x, y) => c48.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
      const p0 = mm.paints();
      pe('pointerdown', 1000, 700);
      for (let i = 1; i <= 30; i++) pe('pointermove', 1000 + i * 4, 700 + (i % 5));
      const moved = mm.paints() - p0;
      pe('pointerup', 1120, 700);
      const released = mm.paints() - p0;
      const line48 = lastId();
      for (let i = 0; i < 4 && mm.session.getState().contentIds.includes(line48); i++) mm.session.undo();
      await wait(30);
      const panX0 = mm.view.panX, w0 = mm.paints();
      for (let i = 0; i < 10; i++) c48.dispatchEvent(new WheelEvent('wheel', { deltaX: 5, deltaY: 0, deltaMode: 0, clientX: 700, clientY: 400, bubbles: true, cancelable: true }));
      const wheeled = mm.paints() - w0, viewMoved = panX0 - mm.view.panX;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const framed = mm.paints() - w0;
      mm.setView(1, 0, 0);
      step('48e. thirty pointer moves while drawing paint the pen and not the board; the release paints it; ten wheel events move the view at once and paint it in the next frame, once',
        moved === 0 && released >= 1 && wheeled === 0 && Math.abs(viewMoved - 50) < 1e-6 && framed === 1,
        { moved, released, wheeled, viewMoved, framed });
    }
    // Another hand's line: in a room, fern draws a box and an arrow from this hand's box to hers.
    mm.session.load([]); mm.setView(1, 0, 0); await wait(30);
    const hub48 = new MM.LocalHub();
    const fernStore48 = new MM.LiveStore(hub48.connect(), 'fern~f8', 'r4c48');
    await mm.openLive('r4c48', { transport: hub48.connect() });
    t.stroke(t.rect(300, 260, 160, 100));
    const mine48 = lastId();
    await mm.saveNow(); await wait(100);
    hoverAt(380, 310); await wait(30);
    const before48 = panel();
    const fern48 = MM.createSession(Object.assign({}, MM.DEFAULT_SESSION_CONFIG, { logName: 'fern~f8' }));
    fern48.addStroke(t.rect(700, 260, 160, 100).map((p) => ({ x: p.x, y: p.y })), Date.now() + 1000, undefined, 1);
    fern48.addStroke(t.line({ x: 460, y: 310 }, { x: 700, y: 310 }, 40).concat(t.line({ x: 700, y: 310 }, { x: 674, y: 293 }, 20).slice(1)).map((p) => ({ x: p.x, y: p.y })), Date.now() + 2000, undefined, 1);
    await fernStore48.appendLog('fern~f8', fern48.getEvents().slice());
    await until48(() => mm.session.getState().contentIds.length === 3);
    await wait(60);
    const after48 = panel();
    step('48d. a line from another hand reaches this board\'s paint at once: her arrow lands on this hand\'s box, and the box, pointed at, says a connector is attached',
      mm.session.getState().contentIds.length === 3 && /rectangle standing on its own/.test(before48) && /rectangle with 1 connector attached/.test(after48) && mm.readingDrawn() && mm.readingDrawn().id === mine48,
      { content: mm.session.getState().contentIds.length, before: (before48.match(/a rectangle[^.]*?(attached|own)/) || [])[0], after: (after48.match(/a rectangle[^.]*?(attached|own)/) || [])[0] });
    sameAsWhole('a room, another hand\'s arrow on this hand\'s box');
    leave(); await wait(20);
    fernStore48.close();
    if (mm.folder().store && mm.folder().store.close) mm.folder().store.close();
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 49. The field's offers, golden (V1-PLAN B1) ----
  // What the field shows for three scopes — a row of three boxes, a molecule,
  // a line of writing — and the states they pass through (typed at, named and
  // drawn again, read, taken as text): every pill's key, label, reason and dot
  // in the order shown, and every item held in the order the reader walks.
  // Captured before the offers came from registered tools; unchanged since.
  {
    const got49 = await window.__fieldGolden();
    for (const name of Object.keys(window.__FIELD_GOLDEN)) {
      const want = window.__FIELD_GOLDEN[name], have = got49[name];
      const same = JSON.stringify(have) === JSON.stringify(want);
      step('49. golden: ' + name + ' — the field offers what it did before B1: the same pills, keys, reasons and order',
        same, same ? { afford: want.afford.map((p) => p.key), ranked: want.ranked } : { have: have, want: want });
    }
  }

  // ---- 49b. A tool is one file and one registration line (V1-PLAN B1) ----
  // A tool written here, as a file of its own would write it, and registered in
  // one line: it offers to count the boxes a scope holds, and taking it puts an
  // answer beside them. The open field offers it the moment it registers (the
  // registry changes offers with no event, and says so); a scope with no box is
  // offered nothing from it; taken, what it writes carries its id; unregistered,
  // it is gone from the field.
  {
    mm.session.load([]); mm.setView(1, 0, 0); mm.resetUses();
    const COUNT_BOXES = {
      id: 'test:count-boxes', name: 'count the boxes', describe: () => 'says how many boxes a scope holds',
      offers: (scope) => {
        const boxes = scope.marks.filter((id) => MM.topInterpretation(scope.state.nodes.get(id)) === 'rectangle');
        return boxes.length ? [{ key: 'test:count-boxes', label: 'Count ' + boxes.length + ' boxes', reason: 'a tool from one file', base: 0.45, tool: 'test:count-boxes', verbs: ['count'], data: { boxes: boxes } }] : [];
      },
      take: (offer, scope, session, at) => { session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'how many boxes', text: offer.data.boxes.length + ' boxes', aboutIds: offer.data.boxes, at: at }); return {}; },
    };
    const lastId49 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const boxes49 = [];
    for (const x of [200, 360, 520]) { t.stroke(t.rect(x, 200, 120, 80)); boxes49.push(lastId49()); }
    t.stroke(t.circle(900, 240, 50)); const ring49 = lastId49();
    mm.session.summonMarks(boxes49, Date.now()); await wait(60);
    const pillOf = () => document.querySelector('#summon .pill[data-key="test:count-boxes"]');
    const before = !!pillOf();
    const unregister = MM.registerTool(COUNT_BOXES); // the one registration line
    await wait(30);
    const pill49 = pillOf();
    const offered = !!pill49 && /Count 3 boxes/.test(pill49.textContent) && pill49.title === 'a tool from one file';
    const slots49 = t.coreSlots().join(',');
    if (pill49) pill49.click();
    await wait(30);
    const evs49 = mm.session.getEvents();
    const answered = evs49[evs49.length - 1];
    step('49b. a tool registered in one line is offered in the open field for a scope it applies to, the four core slots unmoved, and what taking it writes carries its id and the offer\'s key',
      !before && offered && slots49 === 'name,copy,paste,erase' && answered.type === 'answer' && answered.tool === 'test:count-boxes' && answered.offer === 'test:count-boxes' && answered.text === '3 boxes',
      { before, offered, slots: slots49, last: { type: answered.type, tool: answered.tool, offer: answered.offer, text: answered.text } });
    mm.session.summonMarks([ring49], Date.now()); await wait(60);
    const onCircle = !!pillOf();
    mm.session.summonMarks(boxes49, Date.now()); await wait(60);
    const again = !!pillOf();
    unregister();
    await wait(30);
    const gone = !pillOf();
    step('49c. a scope it does not apply to is offered nothing from it; unregistered, it is gone from the open field',
      !onCircle && again && gone, { onCircle, again, gone });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 50. The steady top beside a flowchart (V1-PLAN §2.2, B2) ----
  // A flowchart — three processes and a decision joined by arrows — and three
  // boxes drawn one after another beside it, each time the boxes drawn so far
  // held, the way a hand works along: one box, then two, then three. With
  // nothing beside them the top offer flips — one box is only drawn clean, two
  // in a row are lined up first. Beside a flowchart it holds, and says why.
  // What a flowchart beside the hand makes likelier is its pack's to say (B3):
  // the board uses flowchart@1, from the moment the flowchart is drawn.
  // Then an offer a little ahead of it arrives (a tool registered in one line,
  // as 49b does): within the margin the top holds; past it, the new one leads.
  // A board away, two boxes rank as they did before context, lifted by nothing.
  {
    mm.session.load([]); mm.setView(1, 0, 0); mm.resetUses();
    const lastId50 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const diamond50 = (cx, cy, w, h) => {
      const v = [{ x: cx, y: cy - h / 2 }, { x: cx + w / 2, y: cy }, { x: cx, y: cy + h / 2 }, { x: cx - w / 2, y: cy }];
      const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
      const path = [mid, v[1], v[2], v[3], v[0], mid];
      let p = [];
      for (let i = 0; i < path.length - 1; i++) p = p.concat(t.line(path[i], path[i + 1], 26).slice(i ? 1 : 0));
      return p;
    };
    // A shaft down, and one wing drawn back at the tip.
    const arrowDown50 = (x, y0, y1) => t.line({ x: x, y: y0 }, { x: x, y: y1 }, 40).concat(t.line({ x: x, y: y1 }, { x: x - 14, y: y1 - 20 }, 16).slice(1));
    t.stroke(t.rect(200, 100, 160, 70));
    t.stroke(arrowDown50(280, 174, 236));
    t.stroke(t.rect(200, 240, 160, 70));
    t.stroke(arrowDown50(280, 314, 382));
    t.stroke(diamond50(280, 440, 180, 110));
    t.stroke(arrowDown50(280, 499, 566));
    t.stroke(t.rect(200, 570, 160, 70));
    mm.session.use('flowchart@1', Date.now());
    const flowRead50 = MM.notationsOf(mm.session.getState()).map(MM.describeNotation);
    const topPill50 = () => document.querySelector('#summon .row.afford .pill');
    const letGo50 = async () => { const sum = mm.session.getState().summon; if (sum) mm.session.dismiss(sum.id, Date.now()); await wait(30); };
    const drawn50 = [], tops50 = [], titles50 = [];
    for (const x of [440, 580, 720]) {
      t.stroke(t.rect(x, 250, 120, 60)); drawn50.push(lastId50());
      mm.session.summonMarks(drawn50.slice(), Date.now()); await wait(60);
      const pill = topPill50();
      tops50.push(pill ? pill.dataset.key : null); titles50.push(pill ? pill.title : '');
      if (x !== 720) await letGo50();
    }
    step('50. three boxes drawn one after another beside a flowchart keep the same top offer, and it says why',
      /^a flowchart /.test(flowRead50[0] || '') && tops50.length === 3 && tops50.every((k) => k === 'snap') &&
        titles50.every((ti) => /first because it sits beside a flowchart: three processes, one decision/.test(ti)),
      { flowRead: flowRead50, tops: tops50, title: titles50[1] });
    // The panel says it too: what stands beside the selection, and what that put first.
    const panel50 = document.getElementById('inspector').textContent;
    const ctx50 = mm.paletteContext ? mm.paletteContext() : null;
    step('50a. the panel says what stands beside the selection and what it put first, and why',
      /beside\s*a flowchart 0\.\d\d — three processes, one decision, three flows/.test(panel50) &&
        /first\s*Draw them clean\s*because it sits beside a flowchart: three processes, one decision/.test(panel50) &&
        !!ctx50 && /^notation:flowchart@/.test(ctx50.key || ''),
      { panel: (panel50.match(/beside[\s\S]{0,220}/) || [''])[0], key: ctx50 && ctx50.key });

    // An offer a little ahead of the held top, then well ahead: the margin decides.
    const near50 = (base) => ({
      id: 'test:near-top', name: 'a near rival', describe: () => 'offers one thing, a little likelier than the top',
      offers: (scope) => (scope.marks.length === 3 ? [{ key: 'test:near-top', label: 'A near rival', reason: 'a tool from one file', base: base, tool: 'test:near-top' }] : []),
      take: () => ({}),
    });
    let off50 = MM.registerTool(near50(1.12)); // ahead of the held top by less than a tenth
    await wait(30);
    const held50 = topPill50() ? topPill50().dataset.key : null;
    const heldWhy50 = topPill50() ? topPill50().title : '';
    const rivalShown50 = !!document.querySelector('#summon .pill[data-key="test:near-top"]');
    off50();
    off50 = MM.registerTool(near50(1.3)); // ahead by more than the margin
    await wait(30);
    const beaten50 = topPill50() ? topPill50().dataset.key : null;
    off50();
    await wait(30);
    step('50b. an offer a little ahead does not take the held top — within the margin it holds, and says so; past the margin the new one leads',
      held50 === 'snap' && rivalShown50 && /first because it led here a moment ago/.test(heldWhy50) && beaten50 === 'test:near-top',
      { held: held50, heldWhy: heldWhy50, rivalShown: rivalShown50, beaten: beaten50 });
    await letGo50();

    // A board away from the flowchart: the same two boxes, ranked as before context.
    t.stroke(t.rect(1100, 700, 120, 60)); const far1 = lastId50();
    t.stroke(t.rect(1240, 700, 120, 60)); const far2 = lastId50();
    mm.session.summonMarks([far1, far2], Date.now()); await wait(60);
    const farTop50 = topPill50();
    const farTitles50 = [...document.querySelectorAll('#summon .pill.item')].map((b) => b.title);
    step('50c. a board away the order is B1’s — two boxes in a row are lined up first — and nothing says it was lifted',
      !!farTop50 && farTop50.dataset.key === 'row:tidy-row' && farTitles50.every((ti) => !/because/.test(ti)),
      { top: farTop50 ? farTop50.dataset.key : null, titles: farTitles50 });
    await letGo50();
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 51. A library pack, used by an event (V1-PLAN §2.3, B3) ----
  // Premade content arrives the way the command mark does — shipped pre-taught
  // — and stands on a board only because the board says so: one `use` event
  // in its log. The packs pane is the control centre's last tile; basics@1
  // used from it, the canonical molecule drawn with nothing taught is named by
  // the field and by a chip beside it, each saying its pack; the journal and
  // the exported log carry the event. Stop using it: gone. Undo: back. Then a
  // board that uses no pack offers what e2e 49's golden holds, a board naming
  // a pack this build lacks loads and says so, and flowchart@1 in use puts
  // the flowchart's ports on the pen.
  {
    mm.session.load([]); mm.setView(1, 0, 0); mm.resetUses();
    const lastId51 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const molecule51 = (ox) => {
      const ids = [];
      for (const [x, y] of [[300, 300], [500, 300], [400, 460]]) { t.stroke(t.circle(ox + x, y, 40)); ids.push(lastId51()); }
      t.stroke(t.line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30)); ids.push(lastId51());
      t.stroke(t.line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30)); ids.push(lastId51());
      return ids;
    };
    const pane51 = document.getElementById('packsPanel');
    const face51 = () => (document.querySelector('#packsBtn .v') || {}).textContent || '';
    const openPacks51 = async () => { mm.openCC(); await wait(20); if (pane51.hasAttribute('hidden')) document.getElementById('packsBtn').click(); await wait(30); };
    const closePacks51 = async () => { const x = pane51.querySelector('.paneClose'); if (x && !pane51.hasAttribute('hidden')) x.click(); mm.closeCC(); await wait(20); };
    const tap51 = async (ref, act) => { const b = pane51.querySelector('.pkItem[data-pack="' + ref + '"] button[data-' + act + ']'); if (b) b.click(); await wait(40); return !!b; };
    const chipOf51 = (ids) => mm.chips().find((c) => c.ids.length === ids.length && ids.every((id) => c.ids.includes(id)));
    const letGo51 = async () => { const sum = mm.session.getState().summon; if (sum) mm.session.dismiss(sum.id, Date.now()); await wait(30); };

    // The tile, last in the grid; its pane; use.
    mm.openCC(); await wait(20);
    // The tiles of the group the packs tile stands in (U1f grouped the centre: packs are a Helper).
    const grid51 = [...document.querySelectorAll('#cc .ccGroup[data-group="helpers"] .ccTiles > button')].map((el) => el.id).filter(Boolean);
    await openPacks51();
    const listed51 = [...pane51.querySelectorAll('.pkItem')].map((r) => r.dataset.pack);
    const tapped51 = await tap51('basics@1', 'use');
    const uses51 = mm.session.getEvents().filter((e) => e.type === 'use');
    const marked51 = !!pane51.querySelector('.pkItem.used[data-pack="basics@1"]');
    const faceIn51 = face51();
    step('51. the packs tile stands with the Helpers in the control centre (U1f; it was the last tile before the centre was grouped); its pane lists what this build ships and never a test pack; use writes one use event, and the board uses basics@1 — the tile and the pane say so',
      grid51.includes('packsBtn') && JSON.stringify(listed51) === '["basics@1","flowchart@1","uml-class@1","sequence@1"]' && tapped51 && uses51.length === 1 && uses51[0].pack === 'basics@1' &&
        JSON.stringify(mm.session.getState().packs) === '["basics@1"]' && faceIn51 === 'basics' && marked51,
      { lastTiles: grid51.slice(-3), listed: listed51, uses: uses51.map((e) => e.pack), face: faceIn51, marked: marked51 });
    await closePacks51();

    // The canonical molecule, nothing taught: named beside the group and in the field, its pack said.
    const mol51 = molecule51(0); await wait(60);
    const chip51 = chipOf51(mol51);
    mm.session.summonMarks(mol51, Date.now()); await wait(60);
    const top51 = document.querySelector('#summon .row.certain .pill');
    const topText51 = top51 ? top51.querySelector('span').textContent : '';
    const ranked51 = (mm.fieldItems('') || { ranked: [] }).ranked;
    step('51a. the canonical molecule drawn with nothing taught is named — the chip beside it and the field’s first reading say “molecule … · basics”, the tooltip the pack it came from — and nothing is made, no model asked',
      !!chip51 && /^molecule \d\.\d\d · basics$/.test(chip51.text) && /^molecule \d\.\d\d · basics$/.test(topText51) && !!top51 && /from the Basics pack \(basics@1\)/.test(top51.title) &&
        ranked51.length > 0 && ranked51[0].key.startsWith('sug:') && mm.session.getState().artifacts.length === 0,
      { chip: chip51 && chip51.text, top: topText51, title: top51 && top51.title, first: ranked51[0] && ranked51[0].key, artifacts: mm.session.getState().artifacts.length });
    await letGo51();

    // The log carries it: the exported log — the export pane's canvas.jsonl, one event a line — read back on a
    // board of its own. (The journal this browser keeps carries it through a reload: the boards scenario's N17.)
    const replayed51 = (evs) => {
      const s = MM.createSession();
      s.load(evs);
      const st = s.getState();
      return { packs: st.packs, names: st.clusterCandidates.map((c) => c.matches[0] ? c.matches[0].name + '·' + c.matches[0].pack : null) };
    };
    const file51 = MM.decodeLog(MM.encodeLog(mm.session.getEvents()));
    const fromFile51 = replayed51(file51.events);
    const fromJson51 = replayed51(JSON.parse(mm.exportLog()));
    step('51b. the exported log carries the use event: read back on a board of its own, it uses basics@1 and names the molecule',
      file51.skipped === 0 && file51.events.some((e) => e.type === 'use' && e.pack === 'basics@1') && JSON.stringify(fromFile51.packs) === '["basics@1"]' &&
        JSON.stringify(fromFile51.names) === '["molecule·basics@1"]' && JSON.stringify(fromJson51) === JSON.stringify(fromFile51),
      { file: fromFile51, json: fromJson51 });

    // Stop using it: gone. Undo: back.
    await openPacks51();
    await tap51('basics@1', 'unuse');
    const lastEv51 = mm.session.getEvents().slice(-1)[0];
    const stopped51 = { packs: mm.session.getState().packs.slice(), chip: !!chipOf51(mol51), matches: mm.session.matchesOf(mol51).length, face: face51() };
    await closePacks51();
    mm.session.undo(); await wait(60);
    const backChip51 = chipOf51(mol51);
    const back51 = { packs: mm.session.getState().packs.slice(), chip: backChip51 ? backChip51.text : null, matches: mm.session.matchesOf(mol51).map((m) => m.name + '·' + m.pack) };
    step('51c. stop using it: one unuse event, and the molecule is matched by nothing — no chip, the tile says none; undo takes the unuse back, and the chip and the match return',
      lastEv51.type === 'unuse' && lastEv51.pack === 'basics@1' && stopped51.packs.length === 0 && !stopped51.chip && stopped51.matches === 0 && stopped51.face === 'none' &&
        JSON.stringify(back51.packs) === '["basics@1"]' && /^molecule \d\.\d\d · basics$/.test(back51.chip || '') && JSON.stringify(back51.matches) === '["molecule·basics@1"]',
      { last: lastEv51 && lastEv51.type, stopped: stopped51, back: back51 });

    // A board that uses no pack, straight after one that did: the field offers what it did before packs.
    const golden51 = await window.__fieldGolden();
    const differs51 = Object.keys(window.__FIELD_GOLDEN).filter((name) => JSON.stringify(golden51[name]) !== JSON.stringify(window.__FIELD_GOLDEN[name]));
    step('51d. on boards that use no pack — straight after one that did — the field offers exactly what e2e 49’s golden holds: the same pills, keys, reasons and order',
      differs51.length === 0, { differs: differs51 });

    // A board naming a pack this build lacks: it loads, and says so — in the standing line, on the tile and in the pane — and can let it go.
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.rect(300, 300, 160, 90));
    const drawn51 = mm.session.getEvents().slice();
    mm.session.load([{ type: 'use', pack: 'garment@9', at: drawn51[0].at - 1 }].concat(drawn51)); await wait(60);
    const st51 = mm.session.getState();
    const standing51 = document.getElementById('status').dataset.standing || '';
    await openPacks51();
    const lost51 = pane51.querySelector('.pkItem.pkLost[data-pack="garment@9"]');
    const lostFace51 = face51();
    await tap51('garment@9', 'unuse');
    const cleared51 = mm.session.getState().packNotices.length === 0 && mm.session.getEvents().slice(-1)[0].type === 'unuse';
    await closePacks51();
    step('51e. a board that names a pack this build lacks still loads — its mark there — and says so in the standing line, on the tile and in the pane; stop using it and the notice goes',
      st51.contentIds.length === 1 && st51.packs.length === 0 && st51.packNotices.length === 1 && st51.packNotices[0].pack === 'garment@9' && /garment@9 is not in this build/.test(standing51) &&
        !!lost51 && /not in this build/.test(lost51.textContent) && lostFace51 === 'garment@9?' && cleared51,
      { content: st51.contentIds.length, notices: st51.packNotices.map((n) => n.pack), standing: standing51, face: lostFace51, cleared: cleared51 });

    // flowchart@1 in use: the flowchart's ports on the pen — a decision offers its vertices — and taken back when it is not.
    mm.session.load([]); mm.setView(1, 0, 0);
    const v51 = [{ x: 500, y: 240 }, { x: 590, y: 300 }, { x: 500, y: 360 }, { x: 410, y: 300 }];
    const mid51 = { x: (v51[0].x + v51[1].x) / 2, y: (v51[0].y + v51[1].y) / 2 };
    const path51 = [mid51, v51[1], v51[2], v51[3], v51[0], mid51];
    let dia51 = [];
    for (let i = 0; i < path51.length - 1; i++) dia51 = dia51.concat(t.line(path51[i], path51[i + 1], 26).slice(i ? 1 : 0));
    t.stroke(dia51); const decision51 = lastId51();
    const portsAt51 = () => { const s = mm.session.getState(); return MM.magnetSites(s.nodes.get(decision51), s.nodes).filter((x) => x.kind === 'port:flowchart').length; };
    const before51 = { registered: MM.registeredPorts().slice(), ports: portsAt51() };
    await openPacks51();
    await tap51('flowchart@1', 'use');
    const inUse51 = { registered: MM.registeredPorts().slice(), ports: portsAt51() };
    await tap51('flowchart@1', 'unuse');
    const after51 = { registered: MM.registeredPorts().slice(), ports: portsAt51() };
    await closePacks51();
    step('51f. flowchart@1 in use puts the flowchart’s ports on the pen — the decision offers its four vertices; stopped, they are taken back',
      before51.registered.length === 0 && before51.ports === 0 && JSON.stringify(inUse51.registered) === '["flowchart"]' && inUse51.ports === 4 && after51.registered.length === 0 && after51.ports === 0,
      { before: before51, inUse: inUse51, after: after51 });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 52. Handles (V1-PLAN E1; CONTROL-POINTS-PLAN P2) ----
  // One mark with a clean form, selected alone, shows its own sites as
  // handles; a corner dragged by the pointer writes one reshape event, and the
  // clean form's corner goes where the hand let go while the ink stays exactly
  // as it was drawn — no stroke, no summon.
  {
    mm.session.load([]); mm.setView(1, 0, 0); await wait(30);
    const last52 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const c52 = document.getElementById('canvas');
    const pe52 = (type, x, y) => c52.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    const drag52 = (from, to, n) => { n = n || 8; pe52('pointerdown', from.x, from.y); for (let i = 1; i <= n; i++) pe52('pointermove', from.x + ((to.x - from.x) * i) / n, from.y + ((to.y - from.y) * i) / n); pe52('pointerup', to.x, to.y); };
    const at52 = (p, q) => !!p && !!q && Math.hypot(p.x - q.x, p.y - q.y) < 0.5;
    const round52 = (ps) => (ps ? ps.map((p) => [Math.round(p.x), Math.round(p.y)]) : null);
    t.stroke(t.rect(420, 260, 220, 140));
    const box52 = last52();
    const node52 = () => mm.session.getState().nodes.get(box52);
    const site52 = (kind, index) => MM.magnetSites(node52(), mm.session.getState().nodes).find((x) => x.kind === kind && x.index === index).point;
    mm.session.select([box52], Date.now()); await wait(30);
    const drawn52 = typeof mm.handlesDrawn === 'function' ? mm.handlesDrawn() : [];
    const ink52 = JSON.stringify(MM.strokePointsOf(node52()));
    const corner52 = site52('corner', 2), across52 = site52('corner', 0);
    const from52 = mm.worldToScreen(corner52.x, corner52.y);
    const n52 = mm.session.getEvents().length;
    drag52(from52, { x: from52.x + 60, y: from52.y + 40 });
    await wait(40);
    const evs52 = mm.session.getEvents().slice(n52);
    const clean52 = MM.cleanPointsOf(node52());
    step('52. a box selected alone shows its own sites as handles — its four corners, four edge middles and centre; its corner dragged by the pointer writes one reshape event: the clean form\'s corner goes where the hand let go, the corner across it stays, and the ink is exactly as drawn — no stroke, no summon',
      drawn52.length === 9 && evs52.length === 1 && evs52[0].type === 'reshape' && evs52[0].id === box52 && evs52[0].handle.kind === 'corner' && evs52[0].handle.index === 2 &&
        !!clean52 && at52(clean52[2], { x: corner52.x + 60, y: corner52.y + 40 }) && at52(clean52[0], across52) &&
        JSON.stringify(MM.strokePointsOf(node52())) === ink52 && !mm.session.getState().summon && mm.session.getState().selection.length === 1,
      { handles: drawn52.map((h) => h.kind + h.index), events: evs52.map((e) => e.type), clean: round52(clean52), corner: round52([corner52]), inkSame: JSON.stringify(MM.strokePointsOf(node52())) === ink52, summon: !!mm.session.getState().summon });

    // The pen feels the new corner: a line released near where the corner now stands binds to it there.
    const moved52 = site52('corner', 2);
    t.stroke(t.line({ x: 900, y: 620 }, { x: moved52.x + 3, y: moved52.y + 3 }, 40));
    const line52 = last52();
    const bind52 = mm.session.getEvents().filter((e) => e.type === 'bind' && e.strokeId === line52);
    const end52 = MM.strokePointsOf(mm.session.getState().nodes.get(line52)).slice(-1)[0];
    step('52a. the magnets follow the reshape: a line released near where the dragged corner now stands binds to that corner, there — not where the ink\'s corner is',
      at52(moved52, { x: corner52.x + 60, y: corner52.y + 40 }) && bind52.length === 1 && bind52[0].nodeId === box52 && bind52[0].site.kind === 'corner' && bind52[0].site.index === 2 && at52(end52, moved52),
      { corner: round52([moved52]), binds: bind52.map((e) => e.site.kind + e.site.index + '→' + e.nodeId), end: round52([end52]) });
    for (let i = 0; i < 4 && mm.session.getState().contentIds.includes(line52); i++) mm.session.undo();
    await wait(30);

    // One undo takes the reshape back whole: born reshaped, the box is ink again, as drawn.
    const before52b = mm.session.getEvents().length;
    mm.session.undo(); await wait(30);
    step('52b. one undo takes the reshape back whole — the box was born reshaped, so it is ink again, unsnapped, exactly as drawn',
      mm.session.getEvents().length === before52b - 1 && !MM.cleanOf(node52()) && JSON.stringify(MM.strokePointsOf(node52())) === ink52 && at52(site52('corner', 2), corner52),
      { clean: !!MM.cleanOf(node52()), corner: round52([site52('corner', 2)]) });

    // The zone rule, both sides of the overlap: a box's corner carries two handles — its own, on
    // the ink, and the selection's scale corner on the outline a little way out. Each owns the
    // ground nearer to it: pressed nearer the box's corner it reshapes, nearer the outline's it scales.
    mm.session.select([box52], Date.now()); await wait(30);
    const sb52 = MM.boundsOf(node52());
    const pad52 = 10 / mm.view.zoom;
    const outlineCorner52 = { x: sb52.maxX + pad52, y: sb52.maxY + pad52 };
    const nearBox52 = mm.worldToScreen(corner52.x + 3, corner52.y + 3), nearOutline52 = mm.worldToScreen(outlineCorner52.x - 3, outlineCorner52.y - 3);
    const n52c = mm.session.getEvents().length;
    drag52(nearBox52, { x: nearBox52.x + 30, y: nearBox52.y + 20 });
    await wait(30);
    const byBox52 = mm.session.getEvents().slice(n52c).map((e) => e.type);
    mm.session.undo(); await wait(30);
    mm.session.select([box52], Date.now()); await wait(30);
    const n52d = mm.session.getEvents().length;
    drag52(nearOutline52, { x: nearOutline52.x + 30, y: nearOutline52.y + 20 });
    await wait(30);
    const byOutline52 = mm.session.getEvents().slice(n52d).map((e) => e.type);
    mm.session.undo(); await wait(30);
    step('52c. where a box\'s corner carries both handles, each owns the ground nearer to it: 3 px off the box\'s corner the drag reshapes; 3 px off the outline\'s corner it scales',
      JSON.stringify(byBox52) === '["reshape"]' && JSON.stringify(byOutline52) === '["scale"]',
      { byBox: byBox52, byOutline: byOutline52 });

    // The selection's own handles keep working: the knob turns, the move zone moves — and the form rides with the ink.
    mm.session.select([box52], Date.now()); await wait(30);
    mm.session.reshape({ id: box52, handle: { kind: 'corner', index: 2 }, to: { x: corner52.x + 60, y: corner52.y + 40 }, at: Date.now() }); await wait(30);
    mm.session.select([box52], Date.now()); await wait(30);
    const sb52e = MM.boundsOf(node52());
    const knob52 = mm.worldToScreen((sb52e.minX + sb52e.maxX) / 2, sb52e.minY - pad52 - 26 / mm.view.zoom);
    const n52e = mm.session.getEvents().length;
    drag52(knob52, { x: knob52.x + 80, y: knob52.y + 30 });
    await wait(30);
    const byKnob52 = mm.session.getEvents().slice(n52e).map((e) => e.type);
    mm.session.undo(); await wait(30);
    mm.session.select([box52], Date.now()); await wait(30);
    const inside52 = mm.worldToScreen(sb52e.minX + (sb52e.maxX - sb52e.minX) * 0.3, sb52e.minY + (sb52e.maxY - sb52e.minY) * 0.3);
    const clean52f = MM.cleanPointsOf(node52()), ink52f = MM.strokePointsOf(node52());
    const n52f = mm.session.getEvents().length;
    drag52(inside52, { x: inside52.x + 50, y: inside52.y - 20 });
    await wait(30);
    const byInside52 = mm.session.getEvents().slice(n52f).map((e) => e.type);
    const clean52g = MM.cleanPointsOf(node52()), ink52g = MM.strokePointsOf(node52());
    const rode52 = at52(clean52g[2], { x: clean52f[2].x + 50, y: clean52f[2].y - 20 }) && at52(ink52g[0], { x: ink52f[0].x + 50, y: ink52f[0].y - 20 });
    step('52d. the selection\'s own handles keep working on a reshaped box: its knob turns it (one rotate), and a press inside, away from the handles, moves it (one move) — the clean form riding with the ink',
      JSON.stringify(byKnob52) === '["rotate"]' && JSON.stringify(byInside52) === '["move"]' && rode52,
      { byKnob: byKnob52, byInside: byInside52, rode: rode52 });

    // Nothing is pretended: writing has no clean form and shows no handles; nor do two marks held together.
    t.stroke(t.word(300, 560, 180, 40));
    const writing52 = last52();
    mm.session.select([writing52], Date.now()); await wait(30);
    const onWriting52 = mm.handlesDrawn().length;
    mm.session.select([writing52, box52], Date.now()); await wait(30);
    const onTwo52 = mm.handlesDrawn().length;
    mm.session.select([box52], Date.now()); await wait(30);
    const onBox52 = mm.handlesDrawn().length;
    step('52e. nothing is pretended: writing selected alone shows no handles — it has no clean form — and two marks selected together show none; the box alone shows its nine',
      onWriting52 === 0 && onTwo52 === 0 && onBox52 === 9 && !MM.snapReading(mm.session.getState().nodes.get(writing52), mm.session.getState().nodes).ok,
      { writing: onWriting52, two: onTwo52, box: onBox52 });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 53. Bindings follow (V1-PLAN E2; CONTROL-POINTS-PLAN P3) ----
  // Two arrows drawn from box A to box B — each begun on one of A's sites, so
  // the pen ties its tail there, and its tip tied to one of B's sites. B
  // dragged by the pointer carries both: each tip stands on its site where B
  // now stands, each tail where it was, and each still reads as pointing at
  // B. The move is the one event — the following is derived — and one undo
  // takes the move back, and the arrows with it.
  {
    mm.session.load([]); mm.setView(1, 0, 0); await wait(30);
    const last53 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const c53 = document.getElementById('canvas');
    const pe53 = (type, x, y) => c53.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    const drag53 = (from, to, n) => { n = n || 8; pe53('pointerdown', from.x, from.y); for (let i = 1; i <= n; i++) pe53('pointermove', from.x + ((to.x - from.x) * i) / n, from.y + ((to.y - from.y) * i) / n); pe53('pointerup', to.x, to.y); };
    const at53 = (p, q) => !!p && !!q && Math.hypot(p.x - q.x, p.y - q.y) < 0.5;
    const round53 = (p) => (p ? [Math.round(p.x), Math.round(p.y)] : null);
    const nodes53 = () => mm.session.getState().nodes;
    const site53 = (id, kind, index) => MM.magnetSites(nodes53().get(id), nodes53()).find((x) => x.kind === kind && x.index === index).point;
    const ends53 = (id) => (typeof MM.connectorEnds === 'function' ? MM.connectorEnds(nodes53().get(id), nodes53()) : null);
    // A single-stroke arrow as a hand draws one: the shaft, out one wing, back to the tip, out the other.
    const arrow53 = (from, to) => {
      const len = Math.hypot(to.x - from.x, to.y - from.y), ux = (to.x - from.x) / len, uy = (to.y - from.y) / len;
      const wing = (side) => ({ x: to.x - 22 * (ux * Math.cos(0.5) - side * uy * Math.sin(0.5)), y: to.y - 22 * (uy * Math.cos(0.5) + side * ux * Math.sin(0.5)) });
      return t.line(from, to, 60).concat(t.line(to, wing(1), 10).slice(1), t.line(wing(1), to, 10).slice(1), t.line(to, wing(-1), 10).slice(1));
    };
    t.stroke(t.rect(160, 240, 180, 120)); await wait(40);
    const a53 = last53();
    t.stroke(t.rect(640, 180, 200, 280)); await wait(40);
    const b53 = last53();
    const tails53 = [site53(a53, 'middle', 1), site53(a53, 'corner', 1)];
    const tipSites53 = [{ kind: 'middle', index: 3 }, { kind: 'corner', index: 0 }];
    const arrows53 = [];
    // Each tip three pixels short of its site, outside B: a two-wing head whose tip lands ON
    // an outline visits it three times, and three crossings would rub B out. Tied, the tip is
    // carried onto its site.
    const short53 = (from, to) => { const l = Math.hypot(to.x - from.x, to.y - from.y); return { x: to.x - (3 * (to.x - from.x)) / l, y: to.y - (3 * (to.y - from.y)) / l }; };
    for (let i = 0; i < 2; i++) {
      t.stroke(arrow53(tails53[i], short53(tails53[i], site53(b53, tipSites53[i].kind, tipSites53[i].index)))); await wait(40);
      const id = last53();
      arrows53.push(id);
      mm.session.bind({ strokeId: id, nodeId: b53, site: tipSites53[i], end: 'end', at: Date.now() });
    }
    const tied53 = arrows53.map((id) => mm.session.getEvents().filter((e) => e.type === 'bind' && e.strokeId === id).map((e) => e.end + '→' + (e.nodeId === a53 ? 'A' : e.nodeId === b53 ? 'B' : e.nodeId)).sort().join(' '));
    const standing53 = [a53, b53].concat(arrows53).every((id) => mm.session.getState().contentIds.includes(id));
    const before53 = arrows53.map((id) => JSON.stringify(MM.strokePointsOf(nodes53().get(id))));
    // B selected, and dragged by a press inside it, away from its handles.
    mm.session.select([b53], Date.now()); await wait(30);
    const n53 = mm.session.getEvents().length;
    const inside53 = mm.worldToScreen(700, 264);
    drag53(inside53, { x: inside53.x + 120, y: inside53.y + 90 });
    await wait(40);
    const evs53 = mm.session.getEvents().slice(n53).map((e) => e.type);
    const followed53 = arrows53.map((id, i) => {
      const e = ends53(id);
      return !!e && at53(e.end, site53(b53, tipSites53[i].kind, tipSites53[i].index)) && at53(e.start, tails53[i]);
    });
    const read53 = mm.session.read([a53, b53].concat(arrows53));
    // How far a stroke's ink, where it stands, comes to a mark's outline, where it stands.
    const gap53 = (id, other) => {
      const ink = MM.strokePointsOf(nodes53().get(id)), outline = MM.standingPointsOf(nodes53().get(other));
      let best = Infinity;
      for (const p of ink) for (let i = 1; i < outline.length; i++) {
        const a = outline[i - 1], b = outline[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
        const u = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
        best = Math.min(best, Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy)));
      }
      return best;
    };
    const points53 = arrows53.map((id) => {
      const n = nodes53().get(id);
      const to = (n.edges.find((e) => e.rel === 'points-to') || {}).to;
      const role = read53.roles.find((r) => r.id === id) || {};
      return to === b53 && gap53(id, b53) < 0.5 && role.role === 'edge' && !!role.direction && role.direction.to === b53;
    });
    step('53. two arrows tied to box B follow it when the pointer drags it: each tip stands on its site where B now stands, each tail where it was on A, and each still reads as pointing at B — an edge to B, its ink touching the outline of B — the drag is one move event, the following derived',
      standing53 && tied53.every((x) => x === 'end→B start→A') && JSON.stringify(evs53) === '["move"]' && followed53.every(Boolean) && points53.every(Boolean),
      { standing: standing53, tied: tied53, events: evs53, followed: followed53, pointsAtB: points53, tips: arrows53.map((id) => round53(ends53(id) && ends53(id).end)), sites: tipSites53.map((x) => round53(site53(b53, x.kind, x.index))) });
    mm.session.undo(); await wait(30);
    const back53 = arrows53.map((id, i) => JSON.stringify(MM.strokePointsOf(nodes53().get(id))) === before53[i]);
    step('53a. one undo takes the move back, and both arrows with it: each exactly where it stood before the drag, its tip on B\'s site where B stands again',
      mm.session.getEvents().length === n53 && back53.every(Boolean) && arrows53.every((id, i) => { const e = ends53(id); return !!e && at53(e.end, site53(b53, tipSites53[i].kind, tipSites53[i].index)); }),
      { events: mm.session.getEvents().length - n53, back: back53 });

    // While B is dragged, before the hand lets go, both arrows are drawn following it — as the
    // replay will carry them, so the preview is the act.
    mm.session.select([b53], Date.now()); await wait(30);
    const from53b = mm.worldToScreen(700, 264);
    const sitesMid53 = tipSites53.map((x) => { const p = site53(b53, x.kind, x.index); return { x: p.x + 60, y: p.y + 45 }; });
    pe53('pointerdown', from53b.x, from53b.y);
    for (let i = 1; i <= 6; i++) pe53('pointermove', from53b.x + (60 * i) / 6, from53b.y + (45 * i) / 6);
    await wait(30);
    const during53 = typeof mm.followDrawn === 'function' ? mm.followDrawn() : [];
    const logged53 = mm.session.getEvents().length;
    pe53('pointerup', from53b.x + 60, from53b.y + 45); await wait(40);
    const shown53 = arrows53.map((id, i) => {
      const d = during53.find((f) => f.id === id), e = ends53(id);
      return !!d && !!d.ends && at53(d.ends.end, sitesMid53[i]) && at53(d.ends.start, tails53[i]) && !!e && at53(e.end, d.ends.end) && at53(e.start, d.ends.start);
    });
    step('53b. while B is dragged, before the hand lets go, both arrows are drawn following it — each tip on its site where B will stand, each tail on A — with nothing logged yet; let go, each stands exactly where it was drawn following',
      during53.length === 2 && logged53 === n53 + 1 && shown53.every(Boolean),
      { during: during53.map((f) => ({ id: f.id, tip: round53(f.ends && f.ends.end) })), sites: sitesMid53.map(round53), shown: shown53 });
    mm.session.undo(); await wait(30);

    // Arrow 1's own tip dragged by its handle onto box C's corner: the pen's magnet holds it there,
    // and let go it binds there — its claim on B replaced, in one act; one undo takes the act back.
    t.stroke(t.rect(980, 520, 160, 120)); await wait(40);
    const boxC53 = last53();
    const corner53 = site53(boxC53, 'corner', 0);
    mm.session.select([arrows53[0]], Date.now()); await wait(30);
    const tip53 = (typeof mm.handlesDrawn === 'function' ? mm.handlesDrawn() : []).find((h) => h.kind === 'tip');
    const n53c = mm.session.getEvents().length;
    let held53 = null;
    if (tip53) {
      const a = mm.worldToScreen(tip53.x, tip53.y), b = mm.worldToScreen(corner53.x + 4, corner53.y + 3);
      pe53('pointerdown', a.x, a.y);
      for (let i = 1; i <= 8; i++) pe53('pointermove', a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
      await wait(30);
      held53 = typeof mm.dragHold === 'function' ? mm.dragHold() : null;
      pe53('pointerup', b.x, b.y); await wait(40);
    }
    const evs53c = mm.session.getEvents().slice(n53c);
    const bound53 = () => MM.bindingsOf(nodes53().get(arrows53[0]), nodes53()).map((x) => x.end + '→' + (x.nodeId === a53 ? 'A' : x.nodeId === b53 ? 'B' : x.nodeId === boxC53 ? 'C' : x.nodeId) + ' ' + x.site.kind + ' ' + x.site.index).sort().join(', ');
    const oneAct53 = evs53c.length === 3 && typeof evs53c[0].act === 'number' && evs53c.every((e) => e.act === evs53c[0].act);
    const tied53c = bound53();
    const tipAt53 = ends53(arrows53[0]);
    step('53c. arrow 1\'s tip dragged by its handle onto box C\'s corner: the magnet holds it there as it goes, and let go it binds there — the claim on B let go and C\'s corner taken, with the reshape, in one act; the tail stays tied to A',
      !!tip53 && !!held53 && held53.nodeId === boxC53 && held53.kind === 'corner' && held53.index === 0 && JSON.stringify(evs53c.map((e) => e.type)) === '["unbind","reshape","bind"]' && oneAct53 &&
        tied53c === 'end→C corner 0, start→A middle 1' && !!tipAt53 && at53(tipAt53.end, corner53) && at53(tipAt53.start, tails53[0]),
      { handle: tip53 ? round53(tip53) : null, held: held53, events: evs53c.map((e) => e.type + (typeof e.act === 'number' ? '#' + e.act : '')), bound: tied53c, tip: round53(tipAt53 && tipAt53.end), corner: round53(corner53) });
    mm.session.undo(); await wait(30);
    const back53d = ends53(arrows53[0]);
    step('53d. one undo takes that act back whole: the tip tied to B again and standing on its site, the arrow drawn as it was',
      mm.session.getEvents().length === n53c && bound53() === 'end→B middle 3, start→A middle 1' && !!back53d && at53(back53d.end, site53(b53, 'middle', 3)),
      { events: mm.session.getEvents().length - n53c, bound: bound53(), tip: round53(back53d && back53d.end) });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 54. A tap never leaves a dot (PLAN-USER-SURFACE W3; audit row 15) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.rect(200, 200, 120, 80)); t.stroke(t.line({ x: 320, y: 240 }, { x: 420, y: 240 }, 30)); t.stroke(t.circle(460, 240, 40));
    const c54 = document.getElementById('canvas');
    const pe54 = (type, x, y) => c54.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    const strokes54 = () => mm.session.getEvents().filter((e) => e.type === 'stroke').length;
    // A click with `px` of wobble: down, three moves out to `px` along a diagonal-ish path, up where it ended.
    const wobble54 = (x, y, px) => { pe54('pointerdown', x, y); for (let i = 1; i <= 3; i++) pe54('pointermove', x + (px * i) / 3, y + (px * i) / 6); pe54('pointerup', x + px, y + px / 2); };
    const on54 = mm.worldToScreen(260, 200), far54 = mm.worldToScreen(640, 420);
    const tries54 = [];
    for (const px of [1, 3, 6]) {
      pe54('pointerdown', on54.x, on54.y); await wait(700); pe54('pointerup', on54.x, on54.y); await wait(30);
      const opened = !!mm.session.getState().summon;
      const n0 = strokes54(), c0 = mm.session.getState().contentIds.length;
      wobble54(far54.x, far54.y, px); await wait(30);
      const s1 = mm.session.getState();
      tries54.push({ px, opened, closed: !s1.summon, strokes: strokes54() - n0, content: s1.contentIds.length - c0 });
    }
    step('54. with the field open, a click off it with 1, 3 or 6 px of wobble closes the field and leaves no dot',
      tries54.every((x) => x.opened && x.closed && x.strokes === 0 && x.content === 0), tries54);
    // A selection is dismissable too: one mark selected, a wobbling click off it lets go and draws nothing.
    const ids54 = mm.session.getState().contentIds.slice();
    mm.session.select([ids54[0]], Date.now()); await wait(20);
    const n54b = strokes54();
    wobble54(far54.x, far54.y, 6); await wait(30);
    const s54b = mm.session.getState();
    step('54b. with a selection standing, a click off it with 6 px of wobble lets go and leaves no dot',
      !s54b.selection.length && strokes54() === n54b, { selection: s54b.selection.length, strokes: strokes54() - n54b });
    // With nothing to dismiss, a dot deliberately drawn is still a dot.
    const n54c = strokes54();
    wobble54(far54.x, far54.y, 3); await wait(30);
    step('54c. with nothing open, a small deliberate dot is still drawn', strokes54() === n54c + 1, { strokes: strokes54() - n54c });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 55. Writing reads when it is writing (PLAN-USER-SURFACE W2; audit row 4) ----
  {
    const visible55 = () => [...document.querySelectorAll('#summon .row.certain .pill.item, #summon .row.afford .pill.item')].map((b) => ({ key: b.dataset.key, label: (b.querySelector('span') || b).textContent.trim(), dot: !!b.querySelector('.dot') }));
    const last55 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const said55 = (ids) => { const st = mm.session.getState(); return ids.map((id) => MM.transcriptOf(st.nodes.get(id))).filter(Boolean); };
    // A model is a participant only through its join event, which a load wipes: the stub joins again.
    const rejoin55 = () => { mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now())); };
    // A written word, held: the one option is to read it, and Enter does.
    mm.session.load([]); mm.setView(1, 0, 0); rejoin55();
    t.stroke(t.word(200, 300, 90, 28, 6)); const word55 = last55();
    mm.session.summonMarks([word55], Date.now()); await wait(80);
    const pills55 = visible55(), line55 = t.readingLine();
    const calls55 = window.__calls.length;
    window.__readReply = [{ text: 'hello', confidence: 0.9 }];
    t.typeEnter(''); for (let i = 0; i < 30 && !said55([word55]).length; i++) await wait(100);
    step('55. a written word held: the field offers one option, reading it, and the line says ↵ read it — Enter reads it',
      pills55.length === 1 && pills55[0].dot && !pills55.some((p) => /Read the writing|What is this/.test(p.label)) && /^↵ read it/.test(line55)
        && window.__calls.length === calls55 + 1 && said55([word55]).join(' ') === 'hello',
      { pills: pills55, line: line55, calls: window.__calls.length - calls55, said: said55([word55]) });
    // A written line, held: the same, and the line is read in one call.
    mm.session.load([]); mm.setView(1, 0, 0); rejoin55();
    const words55 = [];
    for (const [x, y, w, h, humps] of [[200, 300, 90, 28, 6], [320, 302, 110, 26, 7], [460, 300, 80, 28, 5]]) { t.stroke(t.word(x, y, w, h, humps)); words55.push(last55()); }
    mm.session.summonMarks(words55, Date.now()); await wait(80);
    const pills55b = visible55(), line55b = t.readingLine();
    const calls55b = window.__calls.length;
    window.__readReply = [{ text: 'hello wide world', confidence: 0.9 }];
    t.typeEnter(''); for (let i = 0; i < 30 && said55(words55).length < 3; i++) await wait(100);
    await wait(100);
    step('55b. a written line held: one option, the writing reading, with its dot; the line says ↵ read it, and Enter reads the line in one call — never names it "writing"',
      pills55b.length === 1 && pills55b[0].dot && /^writing 0\.\d\d$/.test(pills55b[0].label) && /^↵ read it/.test(line55b)
        && window.__calls.length === calls55b + 1 && said55(words55).join(' ') === 'hello wide world' && !mm.session.getState().artifacts.length,
      { pills: pills55b, line: line55b, calls: window.__calls.length - calls55b, said: said55(words55), artifacts: mm.session.getState().artifacts.length });
    const chips55c = t.chips();
    step('55c. when the words land they lead as before: the line as a name, Make it text, Label it', chips55c.some((c) => /^“hello wide world” 0\.90/.test(c)) && chips55c.some((c) => /Make it text/.test(c)) && chips55c.some((c) => /^Label it/.test(c)), chips55c);
    // With no model that can see: the line says what would read it, in the field, and Enter keeps the ask.
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.word(200, 300, 90, 28, 6)); const word55d = last55();
    const agents55 = mm.agents.splice(0, mm.agents.length);
    mm.session.summonMarks([word55d], Date.now()); await wait(80);
    const line55d = t.readingLine(), calls55d = window.__calls.length;
    t.typeEnter(''); await wait(200);
    const kept55 = typeof mm.keptAsk === 'function' ? mm.keptAsk() : null;
    const need55 = ((document.querySelector('#summon .need') || {}).textContent || '').trim();
    const pane55 = !document.getElementById('modelPanel').hasAttribute('hidden');
    step('55d. with no model that can see, the line says what would read it, Enter keeps the ask, said in the field — no pane, no call',
      /^↵ read it — needs a model that can see/.test(line55d) && !!kept55 && /can see/.test(need55) && !pane55 && window.__calls.length === calls55d,
      { line: line55d, kept: kept55 && kept55.what, need: need55, pane: pane55, calls: window.__calls.length - calls55d });
    mm.agents.push(...agents55);
    window.__readReply = null;
    mm.session.load([]); rejoin55();
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 56. The panel speaks to the user; the inspector waits behind details (PLAN-USER-SURFACE U1a; audit rows 1–2) ----
  {
    // What the panel SAYS: its text with every closed <details> left out, as a reader sees it.
    const said56 = () => {
      const el = document.getElementById('inspector').cloneNode(true);
      el.querySelectorAll('details:not([open])').forEach((d) => [...d.childNodes].forEach((c) => { if (!(c.nodeType === 1 && c.tagName === 'SUMMARY')) c.remove(); }));
      const parts = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) parts.push(walk.currentNode.nodeValue);
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };
    const system56 = (text) => ({ id: /\bid\b|stroke:\d|participant:|figure:|\bllm:/.test(text), tier: /\btier\b/i.test(text), coordinate: /\(\s*-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?\s*\)/.test(text) });
    const clean56 = (x) => !x.id && !x.tier && !x.coordinate;
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.rect(200, 200, 120, 80)); t.stroke(t.line({ x: 320, y: 240 }, { x: 420, y: 240 }, 30)); t.stroke(t.circle(460, 240, 40)); await wait(60);
    const afterStroke56 = said56();
    const inspect56 = document.querySelector('#inspector details.inspect');
    step('56. after a stroke the panel says what the mark is and what it can become, in the user\'s words — no id, no tier, no coordinate; the inspector is behind details, closed',
      clean56(system56(afterStroke56)) && /becomes|could become|can become/.test(afterStroke56) && !!inspect56 && !inspect56.open && [...inspect56.querySelectorAll('.k')].some((k) => k.textContent === 'id'),
      { said: afterStroke56.slice(0, 300), system: system56(afterStroke56), details: !!inspect56, open: inspect56 && inspect56.open });
    const on56 = mm.worldToScreen(260, 200);
    const c56 = document.getElementById('canvas');
    const pe56 = (type, x, y) => c56.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    pe56('pointerdown', on56.x, on56.y); await wait(700); pe56('pointerup', on56.x, on56.y); await wait(60);
    const afterHold56 = said56();
    const held56 = !!mm.session.getState().summon;
    step('56b. after a hold the panel says what is held and what it becomes — no id, no tier, no coordinate; the rest behind details',
      held56 && clean56(system56(afterHold56)) && /becomes/.test(afterHold56) && !!document.querySelector('#inspector details.inspect'),
      { held: held56, said: afterHold56.slice(0, 300), system: system56(afterHold56) });
    // Opened, details stays open for the next thing the panel reports: remembered on this device.
    const d56 = document.querySelector('#inspector details.inspect');
    if (d56) { d56.open = true; d56.dispatchEvent(new Event('toggle')); }
    await wait(30);
    mm.session.dismiss(mm.session.getState().summon && mm.session.getState().summon.id, Date.now()); await wait(30);
    t.stroke(t.circle(700, 400, 50)); await wait(60);
    const again56 = document.querySelector('#inspector details.inspect');
    step('56c. details opened stays open for the next mark, remembered on this device', !!again56 && again56.open, { open: again56 && again56.open });
    if (again56) { again56.open = false; again56.dispatchEvent(new Event('toggle')); }
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 57. The status line in words (PLAN-USER-SURFACE U1b; audit rows 1, 2, 9) ----
  {
    const status57 = () => (document.getElementById('status').textContent || '').trim();
    const standing57 = () => document.getElementById('status').dataset.standing || '';
    const system57 = (text) => /\bloose\b|stroke:|participant:|\(\s*-?\d+,\s*-?\d+\s*\)|\bllm:/.test(text);
    mm.session.load([]); mm.setView(1, 0, 0);
    t.stroke(t.rect(200, 200, 160, 100)); t.stroke(t.circle(600, 250, 50)); t.stroke(t.rect(800, 200, 100, 80)); await wait(1800); // past the flash
    const st57 = standing57();
    step('57. the standing line counts in words — "3 marks", never "3 loose" — and names no id or coordinate', /\b3 marks\b/.test(st57) && !system57(st57), st57);
    // A line drawn from the box's side to the circle's: tied, said in words.
    const box57 = mm.session.getState().contentIds[0], circle57 = mm.session.getState().contentIds[1];
    const siteOf57 = (id, kind, index) => MM.magnetSites(mm.session.getState().nodes.get(id), mm.session.getState().nodes).find((x) => x.kind === kind && x.index === index);
    const from57 = siteOf57(box57, 'middle', 1) || siteOf57(box57, 'edge', 1), to57 = MM.magnetSites(mm.session.getState().nodes.get(circle57), mm.session.getState().nodes).find((x) => x.point.x < 600);
    let bound57 = '';
    if (from57 && to57) {
      const a = mm.worldToScreen(from57.point.x + 2, from57.point.y), b = mm.worldToScreen(to57.point.x - 3, to57.point.y + 2);
      t.stroke(t.line(a, b, 30)); await wait(40); bound57 = status57();
    }
    const tied57 = MM.bindingsOf(mm.session.getState().nodes.get(mm.session.getState().contentIds[3]), mm.session.getState().nodes).length;
    step('57b. a line tied to what it touches is said in words — "the line is tied to the circle" — with no coordinates', tied57 >= 1 && /tied to the (circle|box)/.test(bound57) && !system57(bound57), { tied: tied57, said: bound57, sites: [!!from57, !!to57] });
    // Work in flight, summarised: one model at three things is one phrase, and Esc is said; the detail is on the marks.
    const ids57 = mm.session.getState().contentIds.slice(0, 3);
    const hook57 = typeof mm.beginWork === 'function';
    if (hook57) ids57.forEach((id, i) => mm.beginWork('e2e57:' + i, [id], 'e2e-stub · reading the group'));
    await wait(60);
    const work57 = status57();
    if (hook57) ids57.forEach((id, i) => mm.endWork('e2e57:' + i));
    step('57c. three calls of one model in flight are one phrase in the status line — "e2e-stub is working on 3 things · Esc stops it" — not a run-on of every task',
      hook57 && /e2e-stub is working on 3 things/.test(work57) && /Esc stops it/.test(work57) && (work57.match(/reading the group/g) || []).length === 0, { hook: hook57, said: work57 });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 58. The field by the hand, whole (PLAN-USER-SURFACE U1c; audit row 3) ----
  {
    mm.session.load([]); mm.setView(1, 0, 0);
    mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    const c58 = document.getElementById('canvas');
    const pe58 = (type, x, y) => c58.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    const rect58 = (el) => { if (!el || el.hidden || getComputedStyle(el).display === 'none') return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
    const meets58 = (a, b) => !!a && !!b && a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    const W = innerWidth, H = innerHeight;
    // A box near each corner of the screen, drawn before any is held — so the last stroke ends far from three of them.
    const spots58 = { 'top left': [360, 90], 'top right': [W - 170, 90], 'bottom left': [360, H - 170], 'bottom right': [W - 250, H - 150] };
    for (const [x, y] of Object.values(spots58)) t.stroke(t.rect(x, y, 110, 70));
    await wait(60);
    const tries58 = [];
    for (const [name, [x, y]] of Object.entries(spots58)) {
      const press = { x: x + 55, y: y };
      pe58('pointerdown', press.x, press.y); await wait(700); pe58('pointerup', press.x, press.y); await wait(80);
      const f = rect58(document.getElementById('summon'));
      const mini = rect58(document.getElementById('minimap')), bar = rect58(document.getElementById('bar')), panel = rect58(document.getElementById('inspector'));
      const dx = f ? Math.max(f.left - press.x, 0, press.x - f.right) : Infinity, dy = f ? Math.max(f.top - press.y, 0, press.y - f.bottom) : Infinity;
      tries58.push({ name, open: !!mm.session.getState().summon && !!f, inView: !!f && f.left >= -0.5 && f.top >= -0.5 && f.right <= W + 0.5 && f.bottom <= H + 0.5,
        offMinimap: !meets58(f, mini), offBar: !meets58(f, bar), offPanel: !meets58(f, panel), fromPress: Math.round(Math.hypot(dx, dy)),
        // …and never over the press itself: a field that slid back under the hand opened under the pointer (found walking the audit again, U2).
        clearOfPress: !!f && !(press.x > f.left - 8 && press.x < f.right + 8 && press.y > f.top - 8 && press.y < f.bottom + 8) });
      const sm = mm.session.getState().summon; if (sm) mm.session.dismiss(sm.id, Date.now());
      if (mm.session.getState().selection.length) mm.session.deselect(Date.now()); // a hold needs nothing held
      await wait(30);
    }
    step('58. the field opens by the press on the held marks — at every corner of the screen it stands within reach of the hand, never over the press itself, whole on screen, and never over the minimap, the bar or the panel',
      tries58.every((x) => x.open && x.inView && x.offMinimap && x.offBar && x.offPanel && x.fromPress <= 60 && x.clearOfPress), tries58);
    // A model's long readings arrive: every pill stays inside the field, and the field on screen.
    window.__whatReply = [
      { label: 'an-entity-association-diagram-with-several-parts-and-a-long-name', confidence: 0.85, reasoning: 'a long reading' },
      { label: 'state-transformation-of-the-whole-arrangement-drawn-here', confidence: 0.8, reasoning: 'another long one' },
    ];
    const [bx, by] = spots58['bottom right'];
    pe58('pointerdown', bx + 55, by); await wait(700); pe58('pointerup', bx + 55, by); await wait(80);
    const what58 = [...document.querySelectorAll('#summon .pill.item')].find((b) => /What is this/.test(b.textContent));
    if (what58) what58.click();
    for (let i = 0; i < 30 && !t.chips().some((c) => /entity/.test(c)); i++) await wait(100);
    await wait(80);
    const f58 = rect58(document.getElementById('summon'));
    const pills58 = [...document.querySelectorAll('#summon .pill.item')].map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim().slice(0, 30), right: r.right, left: r.left }; });
    const whole58 = !!f58 && pills58.length > 0 && pills58.every((p) => p.left >= f58.left - 0.5 && p.right <= f58.right + 0.5);
    pills58.forEach((p) => { p.left = Math.round(p.left); p.right = Math.round(p.right); });
    step('58b. after a model\'s long readings arrive every pill stands inside the field — none runs off its edge — and the field is whole on screen, off the minimap',
      !!what58 && t.chips().some((c) => /entity/.test(c)) && whole58 && f58.right <= W + 0.5 && f58.bottom <= H + 0.5 && !meets58(f58, rect58(document.getElementById('minimap'))),
      { what: !!what58, field: f58 && [f58.left, f58.top, f58.right, f58.bottom].map(Math.round), pills: pills58 });
    window.__whatReply = null;
    const sm58 = mm.session.getState().summon; if (sm58) mm.session.dismiss(sm58.id, Date.now());
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 59. Enter does the likely act (PLAN-USER-SURFACE U1e; audit row 4) ----
  {
    const fresh59 = () => { mm.session.load([]); mm.setView(1, 0, 0); mm.agents.length = 0; mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now())); };
    const last59 = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
    const cleanCount59 = (ids) => ids.filter((id) => MM.cleanOf(mm.session.getState().nodes.get(id))).length;
    // A row of three boxes: Enter draws them clean — the act ranked first — and names nothing.
    fresh59();
    const row59 = [];
    for (const [x, y] of [[200, 200], [360, 204], [520, 200]]) { t.stroke(t.rect(x, y, 120, 80)); row59.push(last59()); }
    mm.session.summonMarks(row59, Date.now()); await wait(60);
    const lineRow59 = t.readingLine(), arts59 = mm.session.getState().artifacts.length;
    t.typeEnter(''); await wait(60);
    step('59. a row of boxes held: the line says ↵ Draw them clean, and Enter draws them clean — it takes no reading as a name',
      lineRow59 === '↵ Draw them clean' && cleanCount59(row59) === 3 && mm.session.getState().artifacts.length === arts59,
      { line: lineRow59, clean: cleanCount59(row59), artifacts: mm.session.getState().artifacts.length - arts59 });
    // A molecule: the same — never "flow" as its name.
    fresh59();
    const mol59 = [];
    for (const [x, y] of [[300, 300], [500, 300], [400, 460]]) { t.stroke(t.circle(x, y, 40)); mol59.push(last59()); }
    t.stroke(t.line({ x: 340, y: 300 }, { x: 460, y: 300 }, 30)); mol59.push(last59());
    t.stroke(t.line({ x: 328, y: 328 }, { x: 372, y: 432 }, 30)); mol59.push(last59());
    mm.session.summonMarks(mol59, Date.now()); await wait(60);
    const lineMol59 = t.readingLine();
    t.typeEnter(''); await wait(60);
    step('59b. a molecule held: ↵ Draw them clean, and Enter does it — "flow" is a reading, taken as a name only by tapping it or typing name:',
      lineMol59 === '↵ Draw them clean' && cleanCount59(mol59) === 5 && !mm.session.getState().artifacts.length,
      { line: lineMol59, clean: cleanCount59(mol59), artifacts: mm.session.getState().artifacts.length });
    // name: still names, and a tap on the reading still takes it.
    { const sm = mm.session.getState().summon; if (sm) mm.session.dismiss(sm.id, Date.now()); if (mm.session.getState().selection.length) mm.session.deselect(Date.now()); }
    mm.session.summonMarks(mol59, Date.now()); await wait(60);
    const flow59 = [...document.querySelectorAll('#summon .row.certain .pill')].find((b) => /^flow /.test(b.textContent.trim()));
    if (flow59) flow59.click();
    await wait(40);
    const named59 = mm.session.getState().artifacts.map((id) => MM.wordOf(mm.session.getState().nodes.get(id)));
    step('59c. a reading tapped is still taken as the name', !!flow59 && named59.includes('flow'), { tapped: !!flow59, named: named59 });
    mm.session.load([]); mm.setView(1, 0, 0);
  }

  // ---- 60. The control centre, grouped (PLAN-USER-SURFACE U1f; audit row 12) ----
  {
    mm.openCC(); await wait(30);
    const groups60 = [...document.querySelectorAll('#cc .ccGroup')].map((g) => ({
      head: ((g.querySelector('.ccHead') || {}).textContent || '').trim(),
      tiles: [...g.querySelectorAll('.ccTiles > button, .ccTiles > .tile')].map((el) => el.id).filter(Boolean),
    }));
    const want60 = [
      { head: 'Board', tiles: ['boardsBtn', 'folderBtn', 'importBtn', 'exportBtn', 'resetBtn'] },
      { head: 'View', tiles: ['zoomTile', 'gridBtn', 'themeBtn', 'handBtn', 'snapMode', 'snapBtn'] },
      { head: 'Helpers', tiles: ['modelBtn', 'liveBtn', 'autoReadBtn', 'packsBtn', 'teachBtn', 'helpBtn'] },
    ];
    const groupOf60 = (id) => groups60.findIndex((g) => g.tiles.includes(id));
    step('60. the control centre is three labelled groups — Board, View, Helpers — every tile in one, keeping its id, and Reset away from Help',
      JSON.stringify(groups60) === JSON.stringify(want60) && groupOf60('resetBtn') !== groupOf60('helpBtn'),
      { groups: groups60 });
    mm.closeCC();
  }

  // ---- 61. Help teaches the loop; your mark says what it is (PLAN-USER-SURFACE U1g; audit rows 13–14) ----
  {
    mm.openCC(); await wait(20);
    const helpPanel61 = document.getElementById('helpPanel');
    if (helpPanel61.hasAttribute('hidden')) document.getElementById('helpBtn').click();
    const body61 = () => ((helpPanel61.querySelector('.helpBody') || {}).textContent || '');
    for (let i = 0; i < 40 && (!body61() || body61() === 'loading…'); i++) await wait(50);
    const help61 = body61();
    const has61 = (re) => re.test(help61);
    step('61. help is one page for a person: draw, hold, choose; the four round buttons; what a model adds and how to ask one, Claude too; boards; live rooms; your mark; undo; the shortcuts — and no developer test plan',
      has61(/press and hold/i) && has61(/Name/) && has61(/Copy/) && has61(/Paste/) && has61(/Erase/) && has61(/model/i) && has61(/Claude/) && has61(/board/i) && has61(/live/i) && has61(/your mark/i) && has61(/undo/i) && has61(/shortcut/i)
        && !has61(/QA for v8|Branch:|http\.server|next-phases/),
      help61.slice(0, 240));
    if (!helpPanel61.hasAttribute('hidden')) document.getElementById('helpBtn').click();
    // Your mark: the pane and the chip say what a mark does, before asking for five.
    const teach61 = document.getElementById('teachPanel');
    if (teach61.hasAttribute('hidden')) document.getElementById('teachBtn').click();
    await wait(20);
    const hint61 = (document.getElementById('teachHint').textContent || '').trim();
    const chip61 = document.getElementById('markChip').title || '';
    step('61b. your mark says what a mark does — circle some marks, then draw it across them to see what they can become; the built-in is a check, and yours is taught by drawing it five times — in the pane and on the chip',
      /circle some marks/i.test(hint61) && /what they can become/i.test(hint61) && /check/i.test(hint61) && /five times/i.test(hint61) && /circle some marks/i.test(chip61),
      { hint: hint61, chip: chip61 });
    if (!teach61.hasAttribute('hidden')) document.getElementById('teachBtn').click();
    mm.closeCC();
  }

  return R;
};

// ===========================================================================
// The field's offers, golden (V1-PLAN B1). Captured from the surface BEFORE
// the field's affordances came from registered tools, and asserted unchanged
// after: for each fixture scope, the four core slots, the reading line, what
// this is and what it affords — every pill's key, label, reason and dot, in
// the order shown — the "+N more", and every item the field holds, hidden
// ones too, in the ranked order the reader walks. A fixture is drawn with the
// helpers every section uses and held the way a tap on a chip holds a group.
// ===========================================================================
window.__fieldGolden = async function () {
  const t = window.__t, mm = window.__mm, MM = mm.MM;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms || 60));
  const out = {};
  const lastId = () => { const st = mm.session.getState(); return st.contentIds[st.contentIds.length - 1]; };
  const pill = (b) => ({ key: b.dataset.key || null, label: (b.querySelector('span') || b).textContent, title: b.title, dot: !!b.querySelector('.dot') });
  // Ids are minted by counter on a board with no log name and by hand once a room has named it,
  // so every id the fixtures made is said by its part in the fixture instead.
  const names = new Map();
  const call = (ids, as) => ids.forEach((id, i) => names.set(id, '<' + as + (ids.length > 1 ? i + 1 : '') + '>'));
  const capture = (q) => {
    if (q !== undefined) t.typeIn(q);
    const f = mm.fieldItems(q || '');
    const row = (cls) => [...document.querySelectorAll('#summon .row.' + cls + ' .pill')].map(pill);
    const more = document.querySelector('#summon .row.afford .more');
    const got = { core: t.coreSlots(), line: t.readingLine(), certain: row('certain'), afford: row('afford'), more: more ? more.textContent : '', ranked: f ? f.ranked.map((i) => i.key) : null };
    if (q !== undefined) t.typeIn('');
    const sum = mm.session.getState().summon;
    if (sum) sum.suggestions.forEach((sg, i) => names.set(sg.id, '<' + sg.kind + '-' + (i + 1) + '>'));
    let json = JSON.stringify(got);
    for (const [id, as] of [...names].sort((a, b) => b[0].length - a[0].length)) json = json.split(id).join(as);
    return JSON.parse(json);
  };
  // An empty board, the stub joined, no learned use, snap offered, reading only when asked.
  const fresh = () => {
    mm.session.load([]); mm.setView(1, 0, 0);
    mm.agents.length = 0;
    mm.agents.push(MM.createAgentParticipant(mm.session, Object.assign({}, MM.PRESETS.ollama, { model: 'e2e-stub', vision: true }), Date.now()));
    mm.resetUses();
  };
  const hold = async (ids) => { mm.session.summonMarks(ids, Date.now()); await wait(60); };
  const snapBefore = mm.snapMode(), readBefore = mm.autoRead();
  mm.setSnapMode('offer'); mm.setAutoRead(false);

  // A row of three boxes: peers side by side, one a little off the line.
  fresh();
  const row = [];
  for (const [x, y] of [[200, 200], [360, 204], [520, 200]]) { t.stroke(t.rect(x, y, 120, 80)); row.push(lastId()); }
  call(row, 'box');
  await hold(row);
  out['row of three boxes'] = capture();
  out['row of three boxes, "row" typed'] = capture('row');
  out['row of three boxes, "nav" typed'] = capture('nav');

  // A molecule: three circles and two lines joining them.
  fresh();
  const molecule = (ox) => {
    const ids = [];
    for (const [x, y] of [[300, 300], [500, 300], [400, 460]]) { t.stroke(t.circle(ox + x, y, 40)); ids.push(lastId()); }
    t.stroke(t.line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30)); ids.push(lastId());
    t.stroke(t.line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30)); ids.push(lastId());
    return ids;
  };
  const first = molecule(0);
  call(first, 'first');
  await hold(first);
  out['molecule'] = capture();
  // Named, and drawn again: the second is known, and can be refused.
  mm.session.bless({ summonId: mm.session.getState().summon.id, name: 'molecule', at: Date.now() });
  const second = molecule(560);
  call(second, 'second');
  const def = mm.session.getState().artifacts.slice(-1);
  call(def, 'molecule');
  await hold(second);
  out['molecule, the second one drawn'] = capture();

  // A line of writing: three cursive words on a band, unread, then read.
  fresh();
  const words = [];
  for (const [x, y, w, h, humps] of [[200, 300, 90, 28, 6], [320, 302, 110, 26, 7], [460, 300, 80, 28, 5]]) { t.stroke(t.word(x, y, w, h, humps)); words.push(lastId()); }
  call(words, 'word');
  await hold(words);
  out['line of writing'] = capture();
  window.__readReply = [{ text: 'hello wide world', confidence: 0.9 }];
  const readPill = t.readPill(); // the writing reading, which reads it (W2)
  if (readPill) readPill.click();
  const heard = () => { const st = mm.session.getState(); return words.filter((id) => MM.transcriptOf(st.nodes.get(id))).length; };
  for (let i = 0; i < 40 && heard() < 3; i++) await wait(100);
  await wait(120);
  out['line of writing, read'] = capture();
  // Taken as text where it is, and held again: a text from writing.
  const linePill = [...document.querySelectorAll('#summon .row.certain .pill')].find((b) => /^“hello wide world”/.test(b.textContent));
  if (linePill) linePill.click();
  await wait(60);
  const st = mm.session.getState();
  const text = st.artifacts[st.artifacts.length - 1];
  if (text) { call([text], 'text'); await hold([text]); }
  out['text made from the writing'] = capture();
  window.__readReply = null;

  mm.session.load([]); mm.setView(1, 0, 0);
  mm.setSnapMode(snapBefore); mm.setAutoRead(readBefore);
  return out;
};

// Today's field, captured on 27 Sep 2026 before B1 (the surface at 365865e + the test handles):
// what each fixture's field shows, and must still show once its offers come from tools.
// Recorded again 28 Sep 2026 by design (PLAN-USER-SURFACE U1d): Read as writing ("read-any")
// leaves the row of boxes and both molecules — shapes the rung reads for sure are not offered as
// writing — and nothing else in any scope changed.
// And again (U1e): with nothing typed Enter takes the likely act, never a reading as a name — the
// line of the row, both molecules and the text made from writing changed, and nothing else.
window.__FIELD_GOLDEN = {
  "row of three boxes": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ Draw them clean",
    certain: [
      {"key": "concept:row", "label": "row 0.83", "title": "3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up — take it as the name — 3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up", "dot": false},
    ],
    afford: [
      {"key": "snap", "label": "Draw them clean", "title": "3 rectangles · ink kept — each reads confidently as one shape", "dot": false},
      {"key": "row:tidy-row", "label": "Line up across", "title": "align and space them evenly — 3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up", "dot": false},
      {"key": "row:equalize", "label": "Match sizes", "title": "make them the same size as the largest — 3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up", "dot": false},
      {"key": "what", "label": "What is this?", "title": "every joined model reads the group; its readings join the row above", "dot": true},
    ],
    more: "",
    ranked: ["snap", "concept:row", "row:tidy-row", "row:equalize", "what", "duplicate", "keep"],
  },
  "row of three boxes, \"row\" typed": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ row 0.83",
    certain: [
      {"key": "concept:row", "label": "row 0.83", "title": "3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up — take it as the name — 3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up", "dot": false},
    ],
    afford: [
      {"key": "row:tidy-row", "label": "Line up across", "title": "align and space them evenly — 3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up", "dot": false},
      {"key": "row:equalize", "label": "Match sizes", "title": "make them the same size as the largest — 3 comparable marks sitting side by side (overlap 0.95, similarity 1.00) — already well lined up", "dot": false},
    ],
    more: "",
    ranked: ["snap", "concept:row", "row:tidy-row", "row:equalize", "what", "duplicate", "keep"],
  },
  "row of three boxes, \"nav\" typed": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ the structure at once (tier 1), then llm:e2e-stub writes the words",
    certain: [],
    afford: [
      {"key": "name-word", "label": "Name it “nav”", "title": "“nav” as the name — naming makes one thing of them, a definition the library keeps and the next drawing like it is offered as; it writes no word on the ink", "dot": false},
      {"key": "label-word", "label": "Label it “nav”", "title": "“nav” on each of the 3 marks you made, in your ink at the board's scale — it makes nothing: no definition, no name the library learns, no file; undo takes it off", "dot": false},
    ],
    more: "",
    ranked: ["snap", "concept:row", "row:tidy-row", "row:equalize", "what", "duplicate", "keep"],
  },
  "molecule": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ Draw them clean",
    certain: [
      {"key": "concept:flow", "label": "flow 0.90", "title": "3 nodes joined by 2 edges — take it as the name — 3 nodes joined by 2 edges", "dot": false},
    ],
    afford: [
      {"key": "snap", "label": "Draw them clean", "title": "3 circles, 2 lines · ink kept — each reads confidently as one shape", "dot": false},
      {"key": "3d", "label": "Show it in 3D", "title": "3 spheres and 2 bonds in the frame, turning — press inside to turn it; ink over a sphere lands on its mark → then: What is this? asks which molecule", "dot": false},
      {"key": "what", "label": "What is this?", "title": "every joined model reads the group; its readings join the row above", "dot": true},
    ],
    more: "",
    ranked: ["snap", "concept:flow", "3d", "what", "duplicate", "keep"],
  },
  "molecule, the second one drawn": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ Draw them clean",
    certain: [
      {"key": "sug:<match-1>", "label": "molecule 1.00", "title": "same shapes (3×circle + 2×line); same links (5 kinds) — against the definition — take it as another molecule — you named this shape before", "dot": false},
      {"key": "concept:flow", "label": "flow 0.90", "title": "3 nodes joined by 2 edges — take it as the name — 3 nodes joined by 2 edges", "dot": false},
    ],
    afford: [
      {"key": "snap", "label": "Draw them clean", "title": "3 circles, 2 lines · ink kept — each reads confidently as one shape", "dot": false},
      {"key": "not:<match-1>", "label": "Not a molecule", "title": "remembered — a group like this is not offered as one again", "dot": false},
      {"key": "3d", "label": "Show it in 3D", "title": "3 spheres and 2 bonds in the frame, turning — press inside to turn it; ink over a sphere lands on its mark → then: What is this? asks which molecule", "dot": false},
      {"key": "what", "label": "What is this?", "title": "every joined model reads the group; its readings join the row above", "dot": true},
    ],
    more: "",
    ranked: ["sug:<match-1>", "snap", "concept:flow", "not:<match-1>", "3d", "what", "duplicate", "keep"],
  },
  // Recorded again 28 Sep 2026 by design (PLAN-USER-SURFACE W2): writing nobody has read is one
  // option — its reading, which reads it (the dot, ↵ read it) — and Read the writing and What is
  // this? leave the row (still typeable: "ranked" keeps them). Every other scope is unchanged.
  "line of writing": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ read it",
    certain: [
      {"key": "concept:writing", "label": "writing 0.75", "title": "a line of 3 words, unread — read it — 3 marks of writing on one line, a word's gap apart", "dot": true},
    ],
    afford: [],
    more: "",
    ranked: ["concept:writing", "read", "what", "duplicate", "keep"],
  },
  "line of writing, read": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ “hello wide world” 0.90 — take it as text, here; the ink stays underneath",
    certain: [
      {"key": "line:<word1>,<word2>,<word3>", "label": "“hello wide world” 0.90", "title": "the line you wrote — take it as text, here; the ink stays underneath — read from your handwriting by llm:e2e-stub", "dot": false},
      {"key": "concept:writing", "label": "writing 0.75", "title": "3 marks of writing on one line, a word's gap apart — take it as the name — 3 marks of writing on one line, a word's gap apart", "dot": false},
    ],
    afford: [
      {"key": "label:hello wide world", "label": "Label it “hello wide world”", "title": "“hello wide world” on the writing itself, as a caption, in your ink at the board's scale — it makes nothing: no definition, no name the library learns, no file; undo takes it off — read from your handwriting by llm:e2e-stub", "dot": false},
      {"key": "line-text:<word1>,<word2>,<word3>", "label": "Make it text “hello wide world”", "title": "text where the line is, fitted to the ink; flip it to see the writing", "dot": false},
      {"key": "what", "label": "What is this?", "title": "every joined model reads the group; its readings join the row above", "dot": true},
    ],
    more: "",
    ranked: ["line:<word1>,<word2>,<word3>", "label:hello wide world", "concept:writing", "line-text:<word1>,<word2>,<word3>", "what", "duplicate", "keep"],
  },
  "text made from the writing": {
    core: ["name", "copy", "paste", "erase"],
    line: "↵ Edit the text",
    certain: [],
    afford: [
      {"key": "edit-text:<text>", "label": "Edit the text", "title": "a new version of the words; every version kept", "dot": false},
      {"key": "flip:<text>", "label": "Show the ink", "title": "flip it over: the writing it came from", "dot": false},
      {"key": "what", "label": "What is this?", "title": "every joined model reads the group; its readings join the row above", "dot": true},
    ],
    more: "",
    ranked: ["edit-text:<text>", "flip:<text>", "what", "duplicate", "keep"],
  },
};
