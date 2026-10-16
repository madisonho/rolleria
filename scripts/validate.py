"""Validate the asset contract, recipe coverage, and distributable references."""
from pathlib import Path
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv)>1:
    ROOT=Path(sys.argv[1]).resolve()
data=json.loads((ROOT/'assets/manifest.json').read_text())
assets=data['assets']
lookup={a['id']:a for a in assets}
assert len(lookup)==len(assets), 'Duplicate asset IDs'
ns='{http://www.w3.org/2000/svg}'

for a in assets:
    source=(ROOT/a['file']).read_text()
    svg=ET.fromstring(source)
    assert svg.tag==ns+'svg', a['id']
    assert list(map(float,svg.attrib['viewBox'].split()))==[0,0,a['width'],a['height']], a['id']
    assert svg.find(ns+'title') is not None, a['id']
    ids=[e.attrib['id'] for e in svg.iter() if 'id' in e.attrib]
    assert len(ids)==len(set(ids)), f'Duplicate SVG group ID: {a["id"]}'
    assert 0<=a['anchor'][0]<=a['width'] and 0<=a['anchor'][1]<=a['height']
    assert a['state'] in a['availableStates']
    for element in svg.iter():
        assert element.tag not in [ns+'script',ns+'image',ns+'foreignObject'], a['id']
        for key,value in element.attrib.items():
            if key.endswith('href'): assert value.startswith('#'), a['id']
    assert 'url(http' not in source, a['id']

for d in ['classic','cocoa']:
    for f in ['cinnamon','chocolate-cinnamon']:
        for s in ['raw','underbaked','golden','burnt']:
            a=lookup[f'roll-{d}-{f}-{s}']
            assert [a['width'],a['height'],a['anchor']]==[300,280,[150,160]]
        for s in ['ball','sheet','buttered','filled','log','sliced']:
            assert f'dough-{d}-{f}-{s}' in lookup

for kind,names,container in [('icing',['cream-cheese','vanilla','chocolate'],'tub'),('drizzle',['vanilla','caramel','strawberry'],'bottle'),('topping',['pecans','chocolate-chips','rainbow-sprinkles','cinnamon-crumble'],'jar')]:
    for name in names:
        assert f'{container}-{name}' in lookup
        assert f'symbol-{kind}-{name}' in lookup
        a=lookup[f'{kind}-{name}']
        assert [a['width'],a['height'],a['anchor']]==[300,280,[150,160]], a['id']

for person in data['characters']:
    for view in ['full','counter']:
        for expression in ['neutral','ordering','happy','impatient','disappointed']:
            assert f'{person["id"]}-{view}-{expression}' in lookup

for station in ['order','dough','bake','build']:
    assert f'background-{station}' in lookup
    for s in ['normal','selected','pressed','disabled']: assert f'button-{station}-{s}' in lookup
for r in data['sampleOrder']:
    assert f'roll-{r["dough"]}-{r["filling"]}-golden' in lookup
    for kind in ['icing','drizzle','topping']: assert f'{kind}-{r[kind]}' in lookup

for page in ['index.html','studio.html']:
    html=(ROOT/page).read_text()
    assert 'rel="icon"' in html and 'href="public/favicon.svg"' in html
    ET.parse(ROOT/'public/favicon.svg')
    for ref in re.findall(r'(?:src|href)="([^"#]+)"', html):
        if not ref.startswith(('http','data:')): assert (ROOT/ref).is_file(), ref
print(f'PASS: {len(assets)} SVG files; XML, unique IDs, viewBoxes, anchors, states, all ingredient pairs, character expressions, four stations, sample order, and favicon.')
