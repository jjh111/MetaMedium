#!/usr/bin/env node
// Actual index.html, not extracted CSS. Run: node e2e/whitepaper-figures.mjs
// Screenshots/results live outside the repository unless FP_RESULTS is set.
import { chromium, webkit } from 'playwright';
import { startStatic } from './servers.mjs';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.FP_RESULTS || '/tmp/metamedium-figure-audit';
mkdirSync(out, { recursive: true });
const expected = ['spectrum','capacity','triad','negotiation','semiotic','lenses','alignment'];
const server = await startStatic(root);
const results = [];
const browsers = [];
const smoke = process.argv.includes('--smoke');
const failures = [];
function record(label, data) { results.push({ label, ...data }); }

async function inspect(page, key) {
  return page.locator(`[data-plate="${key}"]`).evaluate(figure => {
    const r = figure.getBoundingClientRect();
    const clip = [], targets = [], overlaps = [], contrast = [];
    const rgba = value => {
      const n = value.match(/[\d.]+/g)?.map(Number) || [0,0,0,0];
      return [n[0]/255,n[1]/255,n[2]/255,n.length > 3 ? n[3] : 1];
    };
    const blend = (a,b) => [0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3]));
    const lum = c => c.slice(0,3).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    function contrastOf(el) {
      const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);
      let bg=[1,1,1];for(const p of chain)bg=blend(rgba(getComputedStyle(p).backgroundColor),bg);
      const fg=blend(rgba(getComputedStyle(el).color),bg), a=lum(fg),b=lum(bg);
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    }
    // Check each actual rendered line fragment, not guessed string widths.
    const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement;
      if (!node.textContent.trim() || el.closest('svg,.fp-sr,[hidden]')) continue;
      if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
      contrast.push({text:node.textContent.trim().slice(0,50),ratio:contrastOf(el)});
      const range = document.createRange(); range.selectNodeContents(node);
      for (const box of range.getClientRects()) {
        if (box.width && (box.left < r.left - 1 || box.right > r.right + 1 || box.top < r.top - 1 || box.bottom > r.bottom + 1)) clip.push(node.textContent.trim().slice(0,80));
      }
    }
    for (const b of figure.querySelectorAll('button')) {
      const box = b.getBoundingClientRect();
      if (box.width && (box.width < 44 || box.height < 44)) targets.push(b.textContent.trim());
    }
    const labels = [...figure.querySelectorAll('.fp-map-label')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    for (let i=0;i<labels.length;i++) for(let j=i+1;j<labels.length;j++) {
      const a=labels[i].getBoundingClientRect(), b=labels[j].getBoundingClientRect();
      if(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([labels[i].textContent,labels[j].textContent]);
    }
    const svg = figure.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    const missingMarkers = [...svg.querySelectorAll('[marker-end]')].filter(el => {
      const id=el.getAttribute('marker-end').slice(5,-1);return !document.getElementById(id);
    }).length;
    return { clip:[...new Set(clip)], targets, overlaps, missingMarkers, minContrast:Math.min(...contrast.map(c=>c.ratio)), lowContrast:contrast.filter(c=>c.ratio<4.5), width:r.width, x:r.x, viewport:innerWidth,
      background:getComputedStyle(figure).backgroundColor, ink:getComputedStyle(figure).color,
      visibleReadings:[...figure.querySelectorAll('[data-reading]')].filter(el => !el.hidden && el.checkVisibility({visibilityProperty:true,contentVisibilityAuto:true,opacityProperty:true})).length,
      artWidth:vb.width, hasTitle:!!svg.querySelector('title'), hasDesc:!!svg.querySelector('desc') };
  });
}

try {
  for (const [engine, browserType] of [['chromium',chromium],['webkit',webkit]]) {
    if (smoke && engine === 'webkit') continue;
    const browser = await browserType.launch({ headless:true });
    browsers.push(browser);
    const sizes = smoke ? [[1440,960]] : [[1440,960],[1024,768],[768,1024],[390,844],[320,740],[844,390]];
    for (const [width,height] of sizes) for (const theme of ['light','dark']) {
      const label=`${engine}-${width}-${theme}`;
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<1100,isMobile:width<850,reducedMotion:'reduce'});
      // Remote media are outside the plate test. Keep actual fonts and all local
      // scripts/assets, but don't load YouTube or analytics during the audit.
      await context.route('**/*', route => {
        const url=new URL(route.request().url());
        if (/youtube|googletagmanager|google-analytics/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page=await context.newPage();
      const pageErrors=[]; page.on('pageerror',e=>pageErrors.push(e.message));
      await page.goto(`${server.origin}/?theme=${theme}`,{waitUntil:'load'});
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>document.querySelectorAll('[data-enhanced]').length===7);
      assert.equal(await page.locator('[data-plate]').count(),expected.length);
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme==='dark'?'dark':null);
      const ids=await page.locator('[id]').evaluateAll(els=>els.map(e=>e.id));
      assert.equal(ids.length,new Set(ids).size,`${label}: duplicate IDs`);
      const states=[];
      for (const key of expected) {
        const figure=page.locator(`[data-plate="${key}"]`);
        await figure.scrollIntoViewIfNeeded();
        const initial=await figure.getAttribute('data-active');
        const keys=await figure.locator('[data-select]').evaluateAll(els=>els.map(el=>el.dataset.select));
        // A comparison plate offers its choices on the phone only: from 561px
        // up every scene is already side by side, so choosing one could only
        // decorate what is on screen (figures.css). Where nothing is offered,
        // the resting state is what gets audited.
        const offered=await figure.locator('[data-select]').first().isVisible();
        const audit=async value => {
          const metrics=await inspect(page,key);
          assert.deepEqual(metrics.clip,[],`${label}/${key}/${value}: text outside figure`);
          assert.deepEqual(metrics.targets,[],`${label}/${key}: small target`);
          assert.deepEqual(metrics.lowContrast,[],`${label}/${key}: text contrast below 4.5:1`);
          assert.deepEqual(metrics.overlaps,[],`${label}/${key}: overlapping labels`);
          // Desktop/tablet: all readings visible (overview-first layout). Phone: focus mode.
          const expectedVisible = width < 560 ? 1 : keys.length;
          assert.equal(metrics.visibleReadings, expectedVisible, `${label}/${key}/${value}: expected ${expectedVisible} visible readings`);
          assert.equal(metrics.missingMarkers,0);
          assert.equal(metrics.artWidth,1000);
          assert.ok(metrics.hasTitle&&metrics.hasDesc);
          assert.ok(metrics.x>=-1&&metrics.x+metrics.width<=width+1,`${label}/${key}: horizontal overflow`);
          states.push({key,value,...metrics});
        };
        if(offered) {
          for(const value of keys) {
            const button=figure.locator(`[data-select="${value}"]`);
            if(width<1100) await button.tap(); else await button.click();
            assert.equal(await figure.getAttribute('data-active'),value);
            assert.equal(await button.getAttribute('aria-pressed'),'true');
            await audit(value);
          }
          // Keyboard activation has exactly the same effect and retains focus.
          const reset=figure.locator(`[data-select="${initial}"]`);
          await reset.focus(); await page.keyboard.press('Enter');
          assert.equal(await figure.getAttribute('data-active'),initial);
          await page.evaluate(()=>document.activeElement?.blur());
        } else {
          // Nothing offered means nothing left standing: no empty toolbar, and
          // only a comparison plate may drop its controls at all.
          assert.ok(await figure.evaluate(el=>el.classList.contains('fp-comparison')),`${label}/${key}: an overview plate must keep its controls`);
          assert.equal(await figure.locator('.fp-toolbar').isVisible(),false,`${label}/${key}: a toolbar with nothing to offer`);
          assert.ok(width>=561,`${label}/${key}: the phone must be offered its choices`);
          await audit(initial);
        }
        if(width===1440||width===390||width===768) {
          await figure.screenshot({path:`${out}/${label}-${key}.png`,animations:'disabled',style:'nav { visibility: hidden !important; }'});
        }
      }
      for (const value of ['language','computation','meaning']) {
        const node=page.locator(`[data-inspect="${value}"]`);
        if(width<1100) await node.tap(); else await node.click();
        assert.equal(await page.locator('[data-plate="triad"]').getAttribute('data-active'),value);
        assert.equal(await node.getAttribute('aria-pressed'),'true');
      }
      const loop=page.locator('[data-loop]');
      await loop.uncheck();
      assert.equal(await page.locator('[data-plate="triad"]').getAttribute('data-loop-open'),'true');
      assert.equal(await page.locator('.fp-feedback').evaluate(el=>getComputedStyle(el).opacity),'0');
      await loop.check();
      assert.equal(await page.locator('.fp-feedback').evaluate(el=>getComputedStyle(el).opacity),'1');
      // Sharing a lens view belongs to the phone, with the choices that make a
      // lens the one in view; the link it writes is honoured at every width.
      if(width<561) {
        // HTTP/Tailscale has no clipboard permission: the selected URL is the fallback.
        await page.locator('[data-plate="lenses"] [data-select="combined"]').tap();
        await page.locator('[data-share]').tap();
        const shared=await page.locator('.fp-share-link').inputValue();
        assert.equal(new URL(shared).searchParams.get('lens'),'combined');
        assert.equal(new URL(shared).hash,'#figure-lenses');
        assert.equal(new URL(shared).searchParams.get('theme'),theme);
        await page.locator('[data-plate="lenses"] [data-select="physics"]').tap();
        assert.equal(await page.locator('.fp-share-link').isVisible(),false);
        await page.goto(shared,{waitUntil:'domcontentloaded'});
      } else {
        assert.equal(await page.locator('[data-plate="lenses"] [data-share]').isVisible(),false,`${label}: sharing a lens nobody chose`);
        await page.goto(`${server.origin}/?theme=${theme}&lens=combined#figure-lenses`,{waitUntil:'domcontentloaded'});
      }
      await page.waitForFunction(()=>document.querySelector('[data-plate="lenses"]').dataset.active==='combined');
      // Genuine theme switch on an already-loaded page (same button as readers).
      const before=await page.locator('[data-plate="alignment"]').evaluate(el=>getComputedStyle(el).backgroundColor);
      await page.locator('#themeToggle').click();
      await page.waitForFunction(old => getComputedStyle(document.querySelector('[data-plate="alignment"]')).backgroundColor !== old, before, {timeout:3000});
      const after=await page.locator('[data-plate="alignment"]').evaluate(el=>getComputedStyle(el).backgroundColor);
      assert.notEqual(before,after,`${label}: theme failed to change plate`);
      assert.deepEqual(pageErrors,[],`${label}: runtime errors`);
      record(label,{ok:true,states:states.length,metrics:states});
      console.log(`PASS ${label}: ${states.length} states, layout, touch/keyboard, sharing, theme, no runtime errors`);
      await context.close();
    }
    // Normal motion: a deliberate action settles; nothing animates forever.
    if(!smoke) {
      const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
      const page=await context.newPage();
      await page.goto(`${server.origin}/?theme=dark`,{waitUntil:'load'});
      for(const key of expected) {
        const figure=page.locator(`[data-plate="${key}"]`);
        const first=figure.locator('[data-select]').first();
        await first.tap();
        await page.waitForFunction(key=>[...document.querySelector(`[data-plate="${key}"]`).getAnimations({subtree:true})].every(a=>a.playState!=='running'),key);
        assert.deepEqual((await inspect(page,key)).clip,[]);
      }
      const node=page.locator('[data-inspect="meaning"]');
      await node.focus();await page.keyboard.press('Space');
      assert.equal(await page.locator('[data-plate="triad"]').getAttribute('data-active'),'meaning');
      if(engine==='chromium') {
        await page.locator('[data-plate="capacity"]').evaluate(el=>scrollTo({top:el.offsetTop+600,behavior:'instant'}));
        const before=await page.evaluate(()=>scrollY);
        const session=await context.newCDPSession(page);
        await session.send('Input.synthesizeScrollGesture',{x:190,y:600,yDistance:-300,gestureSourceType:'touch',speed:600});
        assert.ok(await page.evaluate(()=>scrollY)>before,'touch scroll was intercepted');
        await session.detach();
      }
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('[data-reading]:visible').count(),20);
      assert.equal(await page.locator('.fp-map-action:visible').count(),0);
      record(`${engine}-normal-motion-print`,{ok:true});
      console.log(`PASS ${engine}: finite transitions, Space activation, print fallback${engine==='chromium'?', touch scrolling':''}`);
      await context.close();
    }
    // Static page: all explanations remain available with JS blocked.
    if(!smoke) {
      const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
      const page=await context.newPage();
      await page.goto(server.origin,{waitUntil:'load'});
      assert.equal(await page.locator('[data-plate]').count(),7);
      assert.equal(await page.locator('.fp-controls:visible').count(),0);
      assert.equal(await page.locator('[data-reading]:visible').count(),20);
      record(`${engine}-no-js`,{ok:true,readings:20});
      console.log(`PASS ${engine} no-JS: all 20 readings visible, no dead controls`);
      await context.close();
    }
  }
} catch(error) {
  failures.push(String(error.stack||error));
  console.error(error);
} finally {
  for(const browser of browsers) await browser.close();
  await server.stop();
  writeFileSync(`${out}/results${smoke?'-smoke':''}.json`,JSON.stringify({cases:results.length,results,failures},null,2));
}
if(failures.length) process.exitCode=1;
else console.log(`PASS ${results.length} cases. Evidence: ${out}`);
