#!/usr/bin/env python3
"""Authored whitepaper plates. --emit DIR writes fragments; --check verifies index.
All visible prose is HTML, not scaled SVG text. Geometry is deterministic artwork,
not sampled model output or measured performance. Runtime has no network calls.
"""
import argparse
import html
import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path

ET.register_namespace('', 'http://www.w3.org/2000/svg')


def snapshot(art, key, state, title):
    """Materialize a reading without duplicate IDs or hidden alternate geometry."""
    tree = ET.fromstring(art)
    for parent in tree.iter():
        for child in list(parent):
            if child.get('data-layer') and child.get('data-layer') != state:
                parent.remove(child)
    for node in tree.iter():
        for attr, value in list(node.attrib.items()):
            if attr in ('id', 'aria-labelledby', 'marker-end', 'marker-start'):
                node.set(attr, value.replace(f'fp-{key}-', f'fp-{key}-{state}-'))
        if node.get('data-layer'):
            node.set('class', 'fp-snapshot-layer')
            del node.attrib['data-layer']
        if node.tag.endswith('}title'):
            node.text = title
    return ET.tostring(tree, encoding='unicode')

ROOT = Path(__file__).resolve().parents[2]
def esc(s): return html.escape(str(s), quote=True)
def path(d, cls='fp-line', extra=''): return f'<path class="{cls}" d="{d}" {extra}/>'
def circle(x,y,r,cls='fp-line',extra=''): return f'<circle class="{cls}" cx="{x}" cy="{y}" r="{r}" {extra}/>'
def rect(x,y,w,h,cls='fp-line',extra=''): return f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" {extra}/>'
def group(key, body, default=False): return f'<g class="fp-layer{" is-selected" if default else ""}" data-layer="{key}">{body}</g>'
def arrow(d, key, cls='fp-key'):
    role = '-model' if 'fp-model' in cls else ''
    return path(d, f'fp-line {cls}', f'marker-end="url(#fp-{key}{role}-arrow)"')
def grid():
    s=''
    for x in range(80,961,40): s+=path(f'M{x} 80V840', 'fp-grid')
    for y in range(80,841,40): s+=path(f'M80 {y}H920', 'fp-grid')
    for x,y in [(40,40),(960,40),(40,880),(960,880)]: s+=path(f'M{x-12} {y}H{x+12}M{x} {y-12}V{y+12}', 'fp-registration')
    return s

def svg(key, title, body, desc):
    return f'''<svg class="fp-art" viewBox="0 0 1000 920" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="fp-{key}-art-title fp-{key}-art-desc">
<title id="fp-{key}-art-title">{esc(title)}</title><desc id="fp-{key}-art-desc">{esc(desc)}</desc>
<defs><marker id="fp-{key}-arrow" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 1L11 6L1 11Z" class="fp-arrowhead"/></marker><marker id="fp-{key}-model-arrow" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 1L11 6L1 11Z" class="fp-arrowhead fp-model-arrow"/></marker></defs>
{grid()}{body}</svg>'''

def label(text,x,y,cls=''):
    return f'<span class="fp-map-label {cls}" style="--x:{x}%;--y:{y}%">{esc(text)}</span>'

def note(title, body, rows):
    return f'<h4>{esc(title)}</h4><p>{esc(body)}</p><dl class="fp-facts">'+''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k,v in rows)+'</dl>'

PLATES=[]
def plate(key,num,eyebrow,title,dek,art,labels,choices,panels,caption,legend,extra='',default=0,foot='Conceptual illustration · explore without sending data'):
    shared = key in ('spectrum', 'triad')
    layout = 'overview' if shared else 'comparison'
    options=''.join(f'<button type="button" data-select="{esc(k)}" aria-pressed="{str(i==default).lower()}" aria-controls="fp-{key}-reading-{esc(k)}"><span class="fp-option-number" aria-hidden="true">{i+1:02}</span>{esc(t)}</button>' for i,(k,t) in enumerate(choices))
    readings = ''
    for i,(k,t) in enumerate(choices):
        header = f'<div class="fp-scene-heading"><span class="fp-step">{i+1:02}</span><span>{esc(t)}</span></div>'
        if shared:
            readings += f'<section class="fp-reading" data-reading="{esc(k)}" aria-label="{esc(t)}">{header}{panels[i]}</section>'
        else:
            drawing = snapshot(art, key, k, f'{t} — {title}')
            readings += f'<article class="fp-scene" data-scene="{esc(k)}" data-state="{esc(k)}" aria-label="{esc(t)}">{header}<div class="fp-map">{drawing}{labels}</div><section class="fp-reading" data-reading="{esc(k)}" aria-label="{esc(t)}">{panels[i]}</section></article>'
    instruction = 'All readings are visible. Select one to trace its role in the map.' if shared else 'Compare every view. Select one to highlight it without hiding the others.'
    controls = f'<div class="fp-toolbar"><div class="fp-controls fp-choices" role="group" aria-label="Explore {esc(eyebrow.lower())}" hidden>{options}</div><button type="button" class="fp-overview-toggle" data-overview aria-pressed="false" hidden>Show all states</button>{extra}<p class="fp-instruction" hidden>{instruction}</p><span class="fp-sr" data-announcement role="status" aria-live="polite" aria-atomic="true"></span></div>'
    if shared:
        body = f'<div class="fp-body"><div class="fp-visual"><div class="fp-map">{art}{labels}</div><div class="fp-legend">{legend}</div></div><div class="fp-aside"><div id="fp-{key}-reading" class="fp-readings" role="group" aria-label="Readings of {esc(eyebrow.lower())}">{readings}</div></div></div>'
    else:
        body = f'<div id="fp-{key}-reading" class="fp-scenes" style="--scenes:{len(choices)}">{readings}</div><div class="fp-legend">{legend}</div>'
    value=f'''<!-- whitepaper-plate:{key}:start -->
<figure class="folio-plate fp-{layout}" id="figure-{key}" data-plate="{key}" data-active="{choices[default][0]}" aria-labelledby="fp-{key}-title">
<div class="fp-heading"><div class="fp-kicker"><span>{num:02} / {esc(eyebrow)}</span><span class="fp-edition">dyna.ink · field notes</span></div>
<h3 id="fp-{key}-title">{esc(title)}</h3><p class="fp-dek">{esc(dek)}</p></div>
{controls}{body}
<div class="fp-print-note">Illustration shown: <span data-current-view>{esc(choices[default][1])}</span>. All reading notes follow.</div>
<div class="fp-footnote">{esc(foot)}</div><figcaption>{caption}</figcaption>
</figure>
<script>window.enhanceWhitepaperFigures?.(document.currentScript.previousElementSibling);</script>
<!-- whitepaper-plate:{key}:end -->'''
    PLATES.append({'key':key,'html':value,'states':[k for k,t in choices],'default':choices[default][0],'layout':layout})

def legend(items): return ''.join(f'<span><i class="{cls}" aria-hidden="true"></i>{esc(text)}</span>' for cls,text in items)

# 01 — Representation: an exploded stack, from pixels to negotiated meaning.
body=''
for i, (key,y) in enumerate([('marks',680),('structure',475),('meaning',270)]):
    a=''
    # Parallel isometric planes are a representation stack, not a ranking of products.
    for off in range(0,49,12): a+=path(f'M120 {y+off}L450 {y-155+off}L880 {y+off}L550 {y+155+off}Z','fp-line fp-hair')
    if i==0:
        for row in range(8):
            for col in range(10):
                x=270+col*34+row*13; yy=y-45+row*14-col*5
                a+=rect(x,yy,10+(col%3)*2,10,'fp-dot fp-held',f'opacity="{0.25+((row+col)%5)*0.13:.2f}"')
    elif i==1:
        for x,dy,r in [(315,0,37),(470,-35,55),(650,35,40)]:
            a+=circle(x,y+dy,r,'fp-line fp-key')
            a+=circle(x,y+dy,5,'fp-dot fp-key')
        a+=path(f'M350 {y-10}L420 {y-30}M520 {y-15}L615 {y+25}','fp-line fp-key')
        a+=rect(555,y-95,95,45,'fp-line fp-dash')
    else:
        for j in range(7): a+=path(f'M{200+j*15} {y+20+j*8}C320 {y-150},670 {y-90},800 {y+20-j*6}','fp-line fp-key fp-hair')
        a+=arrow(f'M280 {y+5}C430 {y+110},630 {y+90},735 {y-2}','spectrum')
        a+=circle(475,y-10,70,'fp-line fp-model')+circle(475,y-10,45,'fp-line fp-model')
    body+=group(key,a,i==2)
body+=path('M450 115V780M880 270V680M120 270V680','fp-line fp-dash fp-held')
plate('spectrum',1,'Representation','From marks to meaning','A drawing can preserve appearance, expose structure, or become something both parties can question.',svg('spectrum','Three layers of a digital representation',body,'An exploded stack: raster marks below a connected geometry layer, below a revisable interpretation layer. Select a layer to inspect its role.'),label('Interpretation',78,21)+label('Structure',78,49)+label('Marks',65,88),[('marks','Preserve'),('structure','Structure'),('meaning','Interpret')],[
 note('Preserve the mark','Pixels and captured ink remember what was drawn. They do not, by themselves, say what it means.',[('Representation','Samples, strokes, appearance'),('In the paper','Photoshop; OneNote ink capture'),('Trade-off','Fidelity without an explicit semantic model')]),
 note('Expose the structure','Vectors, components and executable sketches give the drawing addressable parts and relationships.',[('Representation','Geometry, instances, links, behavior'),('In the paper','Illustrator; Figma; Miro; Chalktalk'),('Trade-off','Structure still needs an interpretation')]),
 note('Make interpretation revisable','Model-assisted tools can propose what marks stand for. dyna.ink’s aim is to keep that proposal visible, negotiable and reusable.',[('Representation','Marks + relations + readings'),('In the paper','tldraw computer; dyna.ink’s proposal'),('Trade-off','Interpretations can be wrong; preserve the source')])],'<b>The digital representation spectrum</b>A conceptual map of representations, not a current feature audit or a ranking of products. A tool may work across several layers.',legend([('fp-held','preserved source'),('fp-key','addressable structure'),('fp-model','proposed interpretation')]),default=2)

# 02 — Modalities: typographic raster, harmonic engraving, spatial topology.
body=''
a=''
for row in range(10):
    for col in range(16):
        if (col*7+row*3)%11<8: a+=rect(140+col*44,195+row*49,22+(col%3)*6,6,'fp-dot fp-held')
a+=path('M125 180H860V700H125Z','fp-line fp-hair')
body+=group('text',a)
a=''
for j in range(13):
    pts=[]
    for x in range(100,901,5):
        envelope=math.sin(math.pi*(x-100)/800)**2
        y=450+(j-6)*16+math.sin(x*.033+j*.12)*envelope*(85+4*j)
        pts.append(f'{x},{y:.1f}')
    a+=f'<polyline points="{" ".join(pts)}" class="fp-line fp-key fp-hair"/>'
for x in range(140,901,40): a+=path(f'M{x} 685v{20 if x%80 else 35}','fp-line fp-held')
a+=path('M100 450H900','fp-line fp-held fp-dash')
body+=group('voice',a)
a=''
for j in range(9): a+=path(f'M120 {275+j*27}C{290+j*16} {75+j*19},{655-j*12} {785-j*15},880 {370+j*18}','fp-line fp-key fp-hair')
nodes=[(220,320,48),(475,230,65),(730,365,45),(375,630,60),(735,670,48),(535,485,88)]
for ia,ib in [(0,1),(0,3),(1,2),(1,5),(2,4),(3,5),(5,4),(2,5)]:
    x,y,r=nodes[ia]; xx,yy,rr=nodes[ib]; a+=path(f'M{x} {y}L{xx} {yy}','fp-line fp-key')
for x,y,r in nodes:
    a+=circle(x,y,r,'fp-surface fp-key')+circle(x,y,r-12,'fp-line fp-key fp-hair')+circle(x,y,7,'fp-dot fp-key')
a+=path('M180 770H815M180 756V784M815 756V784','fp-line fp-held')
body+=group('drawing',a,True)
plate('capacity',2,'Communication','A wider channel for thought','Sequence, prosody and spatial relations carry different kinds of context. Explore what each medium makes directly available.',svg('capacity','Three ways to carry context',body,'Selectable layers depict a sequence of marks, a family of sound waves, and a spatial network. These are qualitative illustrations, not bandwidth measurements.'),label('Context carried by the medium',50,9)+label('Same intent · different expression',50,90),[('text','Text'),('voice','Voice'),('drawing','Drawing')],[
 note('A sequence to interpret','Words make precise, portable statements. Relationships must usually be named and ordered in the sequence.',[('Directly available','Symbols; order; explicit descriptions'),('Example','“Connect the circle to the square.”'),('Strength','Precise language and searchable records')]),
 note('A sequence with a performance','Speech carries timing, emphasis and tone alongside the words. A hesitation or stress can change the reading.',[('Directly available','Words; rhythm; prosody'),('Example','“Connect THAT circle to the square.”'),('Strength','Temporal nuance and expressive delivery')]),
 note('Relations already on the surface','Position, enclosure and connection can be shown together. Words and gestures can remain attached to the things they qualify.',[('Directly available','Space; topology; gesture; annotation'),('Example','An edge connects two visible objects.'),('Strength','Several relationships can be inspected at once')])],'<b>The communication bottleneck</b>These channels complement one another. The drawing is not a measured “higher-bandwidth” channel; its advantage here is that relationships can be made visible.',legend([('fp-held','sequence'),('fp-key','shared relation')]),default=2)

# 03 — Triadic closure: nested contours and traceable paths, not glowing blobs.
a=''
for inset in range(0,100,16): a+=path(f'M500 {130+inset}L{180+inset} {705-inset*.45}H{820-inset}Z','fp-line fp-hair fp-held')
a+=arrow('M423 305L294 558','triad')+arrow('M340 665H672','triad')
feedback=arrow('M793 567Q750 318 563 223','triad','fp-model')+arrow('M330 600Q480 490 477 294','triad','fp-model')+arrow('M647 730Q440 860 278 723','triad','fp-model')
a+=f'<g class="fp-feedback">{feedback}</g>'
for role,x,y,r in [('language',500,215,98),('computation',245,670,103),('meaning',755,670,103)]:
    a+=f'<g data-emphasis="{role}">'+circle(x,y,r,'fp-surface fp-key')+circle(x,y,r-18,'fp-line fp-hair fp-key')+'</g>'
a+=path('M480 200H520M480 215H520M480 230H507','fp-line fp-key')
for x in [220,245,270]: a+=path(f'M{x} 647V692','fp-line fp-key')
a+=path('M216 655H276M216 682H276','fp-line fp-key')
a+=circle(745,670,22,'fp-line fp-model')+circle(766,670,22,'fp-line fp-model')
extra='<div class="fp-controls fp-check" hidden><label><input type="checkbox" data-loop checked> Include shared meaning</label></div>'
triad_labels=''
for name,x,y in [('Language',50,9),('Computation',24.5,84),('Meaning',75.5,84)]:
    triad_labels+=label(name,x,y,'fp-node-name')
    triad_labels+=f'<button type="button" class="fp-map-action" style="--x:{x}%;--y:{y}%" data-inspect="{name.lower()}" aria-controls="fp-triad-reading-{name.lower()}" hidden>{name}</button>'
triad_labels+=label('Interpret ↔ revise',50,49,'fp-feedback-label')
plate('triad',3,'Triadic closure','Meaning inside the loop','Language expresses. Computation transforms. Meaning connects the result back to an intention.',svg('triad','Language, computation and meaning in a feedback loop',a,'A triangle connects language, computation and meaning. A checkbox removes or restores the return paths, exposing the difference between execution and negotiated interpretation.'),triad_labels,[('language','Language'),('computation','Computation'),('meaning','Meaning')],[
 note('A proposal, not just a command','A word, line or gesture can propose a reading. Its meaning depends on what surrounds it and on the shared vocabulary.',[('Contribution','Express an intention'),('Return path','A visible reading can change the next mark'),('On the surface','An annotation stays attached to its subject')]),
 note('A transformation you can inspect','The system maps marks and relationships to operations. Its response belongs beside the source, not behind an opaque command boundary.',[('Contribution','Calculate, connect, simulate'),('Return path','The outcome helps test the interpretation'),('On the surface','The operation and its effects remain inspectable')]),
 note('The reason the transformation matters','Meaning is the relation between marks, context and purpose. The model participates in interpreting it; the person can still reject its reading.',[('Contribution','Relate an outcome to an intention'),('Return path','Correction changes the next interpretation'),('On the surface','A shared, revisable account of what was meant')])],'<b>Closing the Language–Computation–Meaning loop</b>Switch off shared meaning to isolate a command/output path. Switch it back on to expose interpretation and revision. This is a design model, not a claim that all other interfaces lack feedback.',legend([('fp-key','express / transform'),('fp-model','interpret / revise')]),extra=extra,default=2)

# 04 — Negotiation: the same source persists as the reading is refined.
a=''
for r in range(190,325,22): a+=circle(450,430,r,'fp-line fp-held fp-hair')
a+=path('M100 430H840M450 110V750','fp-line fp-held fp-dash')
a+=path('M600 260C565 185 387 195 303 310C220 425 290 595 414 624C558 660 633 533 637 423C642 339 625 290 600 260','fp-line fp-source')
for x,y in [(303,310),(414,624),(637,423),(600,260)]: a+=circle(x,y,7,'fp-dot fp-held')
a+=group('oval',path('M680 255H818M680 435H863M680 615H796','fp-line fp-model fp-dash'),True)
a+=group('eyes',circle(384,396,13,'fp-dot fp-source')+circle(528,396,13,'fp-dot fp-source')+path('M360 376h44v40h-44ZM505 376h44v40h-44Z','fp-line fp-model'))
a+=group('word',circle(384,396,13,'fp-dot fp-source')+circle(528,396,13,'fp-dot fp-source')+path('M365 500Q452 589 552 490','fp-line fp-model')+arrow('M758 569Q733 686 565 670','negotiation','fp-model'))
labels=label('Persistent source',29,12)+label('Proposed reading',71,87)+ '<span class="fp-map-label fp-word" style="--x:78%;--y:57%">“happy”</span>'
plate('negotiation',4,'Negotiation','Understanding is a sequence','Add evidence to the same drawing. Watch the interpretation change without erasing the mark that started it.',svg('negotiation','An annotated specimen, refined through three exchanges',a,'The original imperfect oval persists across three turns: draw an oval, add eyes, then write happy. The final smile is a model proposal rather than a replacement for the original ink.'),labels,[('oval','Draw an oval'),('eyes','Add two dots'),('word','Write “happy”')],[
 note('01 / Keep the alternatives open','A closed contour is not yet a face. The system can offer “circle”, “face” or “egg” without committing the source to any of them.',[('Person','Draws an imperfect oval'),('System','Offers several possible readings'),('What changed','A mark exists; its referent is unsettled')]),
 note('02 / Add evidence, not a command','Two interior dots make a face-like interpretation more plausible. The added detail negotiates the reading in the drawing itself.',[('Person','Adds two dots inside the contour'),('System','Revises the leading reading to “face”'),('What changed','Internal features constrain the interpretation')]),
 note('03 / Connect a word to a form','“Happy” beside the face supplies semantic context. A smile can be proposed in a separate model layer, ready to accept or reject.',[('Person','Writes “happy” near the mark'),('System','Proposes a smile and a vocabulary entry'),('What changed','Form and language jointly specify a meaning')])],'<b>The negotiation loop</b>Each exchange refines a shared vocabulary. Grey is the preserved source; purple is a proposed interpretation. The sequence is scripted to explain the idea, not live recognition.',legend([('fp-held','original / added ink'),('fp-model','model proposal')]),foot='Scripted example · no recognition model is running')

# 05 — Semiotics: topological triangle + alternative context geometries.
a=path('M210 665L500 205L790 665Z','fp-line fp-key')
for off in range(12,96,14): a+=path(f'M{210-off*.5} {665+off*.25}Q{330-off} 430 {500-off*.25} {205-off*.5}','fp-line fp-hair fp-held')
for x,y in [(210,665),(500,205),(790,665)]: a+=circle(x,y,70,'fp-surface fp-key')+circle(x,y,48,'fp-line fp-key fp-hair')
a+=path('M184 665C175 629 239 623 239 661C247 695 190 705 184 665','fp-line fp-source')
a+=circle(500,205,19,'fp-line fp-key')+path('M770 646L810 685M810 646L770 685','fp-line fp-model')
for key in ['unframed','portrait','orbital']:
    b=''
    if key=='unframed':
        for r in [55,90,125]: b+=circle(500,478,r,'fp-line fp-held fp-dash')
    elif key=='portrait':
        b+=path('M455 350Q405 356 410 429Q401 488 459 523L459 548Q389 559 365 620M540 350Q592 356 588 429Q599 488 540 523L540 548Q610 559 633 620','fp-line fp-model')
        b+=path('M455 350Q500 333 540 350M447 425h23M529 425h23M500 427l-14 48h21M474 505Q500 514 526 505','fp-line fp-model')
    else:
        for angle in [-40,0,40]: b+=f'<ellipse cx="500" cy="475" rx="160" ry="62" transform="rotate({angle} 500 475)" class="fp-line fp-model"/>'
        b+=circle(500,475,22,'fp-dot fp-key')+circle(654,493,10,'fp-dot fp-model')
    a+=group(key,b,key=='unframed')
plate('semiotic',5,'Semiotics','A mark is not its meaning','The same contour can invite different readings. Context changes the relation between sign, referent and interpretation.',svg('semiotic','The semiotic triangle under different contexts',a,'Sign, object and interpretant form a triangle around an ambiguous contour. Portrait and orbital contexts suggest different referents without changing the source sign.'),label('Object / referent',50,9)+label('Sign / form',21,85)+label('Interpretant',79,85),[('unframed','No context'),('portrait','Portrait'),('orbital','Orbital diagram')],[
 note('Hold the reading open','An oval supplies a form, not a unique referent. Face, egg, zero or a drawn orbit remain possibilities until a context makes one useful.',[('Sign','The visible contour'),('Object','What it may refer to'),('Interpretant','The sense made of that relationship')]),
 note('Read it as a portrait','Within a portrait, the contour can stand for a head. Surrounding features support that reading; they do not make every oval a face.',[('Sign','The same contour'),('Object','A person’s head'),('Interpretant','“This contour depicts a face.”')]),
 note('Read it as an orbit','Near a central body and trajectory marks, an oval can stand for a path through space. Meaning comes from connections, not shape alone.',[('Sign','The same contour'),('Object','A possible orbital path'),('Interpretant','“This contour depicts a trajectory.”')])],'<b>The semiotic triad applied</b>The interpretant is the sense made of a sign’s relation to its object—not simply “the AI”. A model can participate in interpretation while its reading remains contestable.',legend([('fp-key','semiotic relation'),('fp-model','contextual reading')]),foot='Conceptual contexts · no probabilities or model outputs are implied')

# 06 — Lenses: a common drawn graph, two transparent reading systems.
a=''
for j in range(13): a+=path(f'M{105+j*9} 730L{407+j*9} 130L{895-j*9} 730','fp-line fp-held fp-hair')
a+=path('M280 570L500 320L735 570Z','fp-line fp-source')
for x,y in [(280,570),(500,320),(735,570)]: a+=circle(x,y,27,'fp-surface fp-held')
physics=''
for x,y,dx,dy in [(280,570,0,-155),(500,320,0,145),(735,570,-125,0)]: physics+=arrow(f'M{x} {y}l{dx} {dy}','lenses')
physics+=path('M170 680H830M170 690V710M830 690V710','fp-line fp-key')
chemistry=''
for x,y,r in [(280,570,78),(500,320,98),(735,570,78)]: chemistry+=circle(x,y,r,'fp-line fp-model')+circle(x,y,r+14,'fp-line fp-model fp-hair')
chemistry+=path('M330 508L453 369M550 369L684 508M360 594H655','fp-line fp-model')
a+=group('physics',physics,True)+group('chemistry',chemistry)+group('combined',physics+chemistry)
extra='<div class="fp-controls fp-secondary" hidden><button type="button" data-share>Share this lens view <span aria-hidden="true">↗</span></button><input class="fp-share-link" type="text" aria-label="Link to this lens view" readonly hidden></div>'
plate('lenses',6,'Cognitive lenses','One drawing. Several readings.','A lens brings a vocabulary to the surface. Compose vocabularies without replacing the drawing underneath.',svg('lenses','A graph read through physics and chemistry lenses',a,'A persistent triangular graph receives a physics overlay of force arrows, a chemistry overlay of bonds and sites, or both overlays together.'),label('Persistent drawing',50,9)+label('Vocabulary overlays',50,87),[('physics','Physics'),('chemistry','Chemistry'),('combined','Compose both')],[
 note('Read forces and constraints','A physics vocabulary treats nodes as bodies and edges as constraints. Directional annotations become candidate force vectors.',[('Apply','Read a new sketch with familiar notation'),('Share','Send this view to a collaborator'),('Compose','Keep this vocabulary alongside another')]),
 note('Read sites and bonds','A chemistry vocabulary treats nodes as sites and edges as possible bonds. This is a diagrammatic analogy, not a chemically valid molecule.',[('Apply','Bring a second vocabulary to the same marks'),('Share','Preserve the chosen context in a link'),('Compose','Compare with the physics reading')]),
 note('Keep both readings inspectable','Composition retains each vocabulary’s contribution. A shared graph can support several readings without pretending their assumptions are identical.',[('Apply','Inspect the force and bond overlays together'),('Share','The link restores this composed view'),('Compose','Preserve disagreements instead of hiding them')])],'<b>Portable interpretation frameworks</b>Apply, share and compose are the proposed lens operations. These overlays are illustrative; sharing here sends only a URL to this view, not a trained recognizer.',legend([('fp-held','source graph'),('fp-key','physics vocabulary'),('fp-model','chemistry vocabulary')]),extra=extra,foot='Illustrative lenses · sharing contains only a view selection')

# 07 — Alignment: constraints remain while visibility changes.
a=''
for r in [270,292,314,336]: a+=circle(500,445,r,'fp-line fp-held fp-hair')
a+=rect(185,155,630,600,'fp-line fp-held', 'rx="24"')
for y in [260,445,630]: a+=path(f'M172 {y}h26M802 {y}h26','fp-line fp-held')
nodes=[(340,360),(475,270),(658,363),(414,574),(658,574),(525,454)]
network=''
for i,j in [(0,1),(1,2),(0,3),(1,5),(5,4),(2,4),(3,4),(0,5),(2,5)]:
    x,y=nodes[i]; xx,yy=nodes[j]; network+=path(f'M{x} {y}L{xx} {yy}','fp-line fp-key')
for i,(x,y) in enumerate(nodes): network+=circle(x,y,24 if i!=5 else 46,'fp-surface fp-key')
a+=circle(500,445,245,'fp-clear')
network+=f'<g class="fp-shared-path">{arrow("M110 520Q170 840 500 819Q830 840 891 520", "alignment", "fp-model")}</g>'
a+=group('shared',network,True)
opaque=rect(300,263,400,363,'fp-opaque','rx="4"')
for j in range(10): opaque+=path(f'M{320+j*37} 290v{260+(j%3)*15}','fp-line fp-hatch')
a+=group('constraints',opaque)
a+=arrow('M85 445H175','alignment')+arrow('M825 445H915','alignment')
plate('alignment',7,'Alignment','Boundaries. And shared ground.','Constraints define what may happen. Communication makes intentions, interpretations and disagreements available for inspection.',svg('alignment','Constraints around an opaque or inspectable process',a,'The outer constraint boundary stays present in both views. In the shared-ground view, the opaque center is replaced by an inspectable network and a return path for revision.'),label('Constraints remain',50,10)+label('Person',10,44)+label('System',90,44)+label('Inspect ↔ revise',50,92,'fp-shared-label'),[('constraints','Constraints only'),('shared','Add shared ground')],[
 note('A necessary boundary','Rules and evaluations can constrain behavior. A person may still see only the interface and outcome, not a shared account of the interpretation.',[('Visible','Inputs, outputs and declared limits'),('Coordination','Specify a rule; evaluate the result'),('Open question','Did the system understand the intended purpose?')]),
 note('Make the interpretation discussable','Both parties work against an external representation. A disputed node or relation can be pointed to, revised and checked together.',[('Visible','Source, proposed reading and relationships'),('Coordination','Inspect, disagree, revise and test'),('Still necessary','Constraints, evaluation and accountability')])],'<b>Alignment through shared ground</b>Communication complements safeguards; it does not replace them or solve alignment by itself. The outer boundary deliberately stays visible in both views.',legend([('fp-held','constraint boundary'),('fp-key','shared relation'),('fp-model','revision path')]),default=1)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--emit', type=Path)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.emit:
        args.emit.mkdir(parents=True,exist_ok=True)
        for p in PLATES: (args.emit/(p['key']+'.html')).write_text(p['html']+'\n')
        (args.emit/'manifest.json').write_text(json.dumps([{k:v for k,v in p.items() if k!='html'} for p in PLATES],indent=2)+'\n')
        print(f'Emitted {len(PLATES)} whitepaper plates to {args.emit}')
    if args.check:
        src=(ROOT/'index.html').read_text()
        missing=[p['key'] for p in PLATES if p['html'] not in src]
        if missing: raise SystemExit('Out-of-date plates: '+', '.join(missing))
        print(f'PASS: all {len(PLATES)} generated plates match index.html')
    if not (args.emit or args.check): parser.print_help()

if __name__=='__main__': main()
