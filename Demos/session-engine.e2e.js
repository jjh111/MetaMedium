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

window.__setup = function(){
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
  function chips(){ return [...document.querySelectorAll('#summon button, #summon .scope')].map(b=>b.textContent); }
  window.__t = {stroke,strokeOn,line,rect,circle,caret,check,scratch,summary,chips};

  window.__calls=[];
  window.fetch = async function(url, init){
    const body=JSON.parse(init.body);
    const sys=body.messages.find(m=>m.role==='system').content;
    const usr=body.messages.find(m=>m.role==='user').content;
    window.__calls.push({system:sys.slice(0,50), user:usr});
    if(/revising code/.test(sys)){
      const prev=(usr.match(/EXISTING CODE:\n([\s\S]*?)\n\nThe human drew|EXISTING CODE:\n([\s\S]*?)\n\nThe mark/)||[])[1]||(usr.match(/EXISTING CODE:\n([\s\S]*?)\n\n/)||[])[1]||'';
      const hit=[...usr.matchAll(/^\s{2}(r\d+) \(/gm)].map(m=>m[1]);
      let out=prev;
      hit.forEach(id=>{ out=out.replace(new RegExp('(data-region="'+id+'"[^>]*background:)#[0-9a-f]{6}','i'),'$1#7d2b8c'); });
      window.__lastRevise={hit:hit, prevLen:prev.length, outLen:out.length};
      return new Response(JSON.stringify({choices:[{message:{content:out}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(/REGIONS ARE NOT SUGGESTIONS/.test(sys)){
      const rows=[...usr.matchAll(/(r\d+): x=(-?\d+) y=(-?\d+) w=(\d+) h=(\d+) — drawn as a (\S+)/g)];
      const pal=['#1b3a4b','#c9a84c','#8a3324','#2f5d50'];
      const html=rows.map(([,id,x,y,w,h],i)=>'<div data-region="'+id+'" style="position:absolute;left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;background:'+pal[i%pal.length]+';color:#fff;display:flex;align-items:center;justify-content:center;font:600 '+(i?18:26)+'px/1.2 system-ui;">'+(i===0?'Recombinatorial drawing':'Section '+id)+'</div>').join('\n');
      return new Response(JSON.stringify({choices:[{message:{content:'```html\n'+html+'\n```'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(/answering a question/.test(sys)){
      return new Response(JSON.stringify({choices:[{message:{content:'The three rectangles share edges only through the region frame you drew; nothing else relates them.'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({choices:[{message:{content:'[{"label":"page-layout","confidence":0.78,"reasoning":"three rectangles in a header/two-column arrangement"}]'}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  const a=window.__mm.MM.createAgentParticipant(window.__mm.session, Object.assign({},window.__mm.MM.PRESETS.ollama,{model:'stub-qwen'}), Date.now());
  window.__mm.agents.push(a);

  // Teach the caret as the command mark, through the real pad UI.
  window.__teach = function(){
    document.getElementById('teachBtn').click();
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

  // ---- 1. Teach the command mark ----
  const taught = window.__teach();
  step('1. five samples become a command mark',
    taught.mark && taught.mark.samples === 5 && taught.mark.closed === false,
    taught.mark);

  // ---- 2. Doodle three boxes, zoom out ----
  t.stroke(t.rect(200,180,260,150));
  t.stroke(t.rect(520,180,260,150));
  t.stroke(t.rect(200,380,580,120));
  for(let i=0;i<4;i++) document.getElementById('zoomOut').click();
  step('2. three boxes drawn, zoomed out to see them all',
    t.summary().loose === 3 && mm.view.zoom < 0.5,
    {loose: t.summary().loose, zoom:+mm.view.zoom.toFixed(2)});

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
  step('5b. the offer includes a freeform prompt', t.chips().includes('Make…'), t.chips());

  // ---- 6. Prompt it into living code ----
  const make = [...document.querySelectorAll('#summon button')].find(b=>b.textContent.trim()==='Make…');
  make.click();
  const input = document.querySelector('#summon input.make');
  input.value = 'website with the copy in the squares';
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await wait(350);

  const st1 = mm.session.getState();
  const artId = st1.artifacts[0];
  step('6. the artifact is live', st1.live.length === 1 && st1.live[0] === artId,
    {live: st1.live, status: document.getElementById('mpStatus').textContent});

  // ---- 7. The generated code honours the drawn geometry EXACTLY ----
  const wrap = document.querySelector('.artifactFrame');
  const doc = wrap && wrap.querySelector('iframe').contentDocument;
  const regions = mm.session.regions(artId);
  const mismatches = regions.filter(r=>{
    const el = doc && doc.querySelector('[data-region="'+r.id+'"]');
    if (!el) return true;
    return parseInt(el.style.left)!==Math.round(r.rect.x) || parseInt(el.style.top)!==Math.round(r.rect.y)
        || parseInt(el.style.width)!==Math.round(r.rect.w) || parseInt(el.style.height)!==Math.round(r.rect.h);
  });
  step('7. every drawn box matches its generated div, to the pixel',
    regions.length === 3 && mismatches.length === 0,
    {regions: regions.map(r=>r.id+' '+r.rect.w+'x'+r.rect.h), mismatches: mismatches.map(m=>m.id)});

  // ---- 8. Ink ON the running page addresses what is under it ----
  mm.fitAll();
  await wait(60);
  const inner = mm.worldToScreen(330, 255);       // inside the top-left region
  t.stroke(t.circle(inner.x, inner.y, 55*mm.view.zoom));
  const overLive = t.summary().pending !== null;
  step('8. a loop on the live page is a lasso, though it encloses no mark', overLive);

  const e2 = mm.worldToScreen(385, 250);
  t.stroke(t.caret(e2.x - 55, e2.y - 40, 118, 76));
  const sum2 = mm.session.getState().summon;
  const addressed = sum2 && sum2.onArtifact;
  step('9. the summon resolves the ink to a REGION of the running artifact',
    !!addressed && addressed.artifactId === artId && addressed.regionIds.length >= 1,
    addressed);
  step('9b. the offer on a live page is a change, not a naming',
    t.chips().some(x=>x==='Change…') && !t.chips().some(x=>x==='Name this…'), t.chips());

  // ---- 10. Revise only what the ink covers ----
  const before = doc.querySelector('[data-region="r2"]').style.background;
  const otherBefore = doc.querySelector('[data-region="r1"]').style.background;
  const chg = [...document.querySelectorAll('#summon button')].find(b=>b.textContent.trim()==='Change…');
  chg.click();
  const inp2 = document.querySelector('#summon input.make');
  inp2.value = 'make this one purple';
  inp2.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  await wait(400);

  const doc2 = document.querySelector('.artifactFrame iframe').contentDocument;
  const after = doc2.querySelector('[data-region="r2"]') && doc2.querySelector('[data-region="r2"]').style.background;
  const otherAfter = doc2.querySelector('[data-region="r1"]') && doc2.querySelector('[data-region="r1"]').style.background;
  step('10. the addressed region changed', before !== after, {before, after});
  step('10b. the region the ink did NOT cover is untouched', otherBefore === otherAfter, {otherBefore, otherAfter});

  const codes = mm.session.getState().nodes.get(artId).reps.filter(r=>r.modality==='code');
  step('10c. both versions are held — generation is a proposal', codes.length === 2, {versions: codes.length});

  // ---- 11. Scratch-out erase ----
  mm.fitAll(); await wait(60);
  const stBefore = mm.session.getState().contentIds.length;
  const a = mm.worldToScreen(150, 250), b = mm.worldToScreen(500, 300);
  t.stroke(t.scratch(a.x, a.y, b.x-a.x, b.y-a.y, 3));
  const stAfter = mm.session.getState();
  const said = document.getElementById('status').textContent;
  step('11. scratching across the page rubs out the marks it crossed',
    stAfter.artifacts.length === 0,
    {before: stBefore, after: stAfter.contentIds.length, artifacts: stAfter.artifacts.length, status: said});
  step('11a. and says so — a silent erase is indistinguishable from a bug',
    /erased \d+ mark/.test(said), {status: said});

  mm.session.undo();
  step('11b. and undo brings them back', mm.session.getState().artifacts.length === 1,
    {artifacts: mm.session.getState().artifacts.length});

  return R;
};
