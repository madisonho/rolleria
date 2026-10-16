"""Reproducible, original path-drawn SVG artwork. No image or font dependencies."""
from pathlib import Path
import json
import math
import random

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
INK = '#3c2726'
CREAM = '#fff1d2'
TEAL = '#40c5bb'
manifest = []
bodies = {}

def path(d, fill='none', stroke=INK, sw=5, extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'

def rect(x,y,w,h,fill,rx=0,stroke=INK,sw=5,extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'

def ellipse(x,y,rx,ry,fill,stroke=INK,sw=5,extra=''):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'

def text(x,y,s,size=24,fill=INK,anchor='middle',extra=''):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Trebuchet MS, sans-serif" font-size="{size}" font-weight="900" fill="{fill}" {extra}>{s}</text>'

def group(name,body,transform=''):
    return f'<g id="{name}"'+(f' transform="{transform}"' if transform else '')+'>'+body+'</g>'

def place(body,x,y,scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})">{body}</g>'

def save(id,category,w,h,body,*,family=None,state='default',anchor=None,tags=None):
    p=ASSETS/category/(id+'.svg')
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title"><title id="title">{id.replace("-"," ")}</title>{body}</svg>')
    bodies[id]=body
    manifest.append(dict(id=id,category=category,file=p.relative_to(ROOT).as_posix(),width=w,height=h,anchor=anchor or [w/2,h/2],family=family or id,state=state,tags=tags or []))

def shadow(x,y,rx,ry): return ellipse(x,y,rx,ry,'#382425','none',0,'opacity=".16"')

def spiral(fill='#82432c'):
    return path('M 206 179 C 230 131 190 82 137 89 C 82 94 62 144 82 181 C 105 225 176 223 192 181 C 208 143 168 116 140 129 C 109 141 117 178 143 181 C 162 184 172 169 163 157', 'none',fill,13)

def roll(dough='classic',filling='cinnamon',state='golden'):
    colors={'raw':('#f7ddb0','#dfb97a','#fff0d0'),'underbaked':('#f3ce83','#c89448','#ffe3a6'),'golden':('#eaaa55','#b97032','#ffd68b'),'burnt':('#70402d','#40291f','#945438')}
    main,side,hi=colors[state]
    if dough=='cocoa':
        main,side,hi={'raw':('#b27850','#855237','#dca174'),'underbaked':('#a56842','#75452d','#c79060'),'golden':('#9a5738','#663b2b','#c18453'),'burnt':('#503029','#2b2120','#704433')}[state]
    filling_color='#75402a' if filling=='cinnamon' else '#482b25'
    b=shadow(150,246,116,20)
    b+=group('roll-side',path('M 36 159 C 24 192 40 226 70 241 C 109 260 193 261 226 231 C 246 213 257 181 242 156 Z',side))
    b+=group('roll-top',path('M 34 150 C 38 102 71 65 118 58 C 150 47 183 56 212 75 C 247 95 264 131 251 167 C 243 206 217 224 170 231 C 128 242 75 227 49 202 C 36 188 30 169 34 150 Z',main))
    b+=path('M 52 136 C 68 92 94 80 124 77 M 144 73 C 177 72 210 90 225 113','none',hi,10)
    b+=group('filling-spiral',spiral(filling_color))
    b+=path('M 85 207 Q 139 237 196 212','none',hi,5)
    b+=path('M 66 233 L 63 220 M 95 245 L 94 232 M 216 227 L 220 214','none',side,4)
    return b

ICINGS={'cream-cheese':'#fff0d3','vanilla':'#fffaf0','chocolate':'#694030'}
DRIZZLES={'vanilla':'#fffaf0','caramel':'#d68b36','strawberry':'#f584a1'}
TOPPINGS={'pecans':'#b46f3d','chocolate-chips':'#593127','rainbow-sprinkles':'#ed7196','cinnamon-crumble':'#b67338'}

def icing(kind):
    c=ICINGS[kind]
    return group('icing',path('M 56 140 Q 61 104 98 86 Q 117 80 136 83 Q 169 68 202 92 Q 235 110 233 142 Q 244 165 228 180 Q 225 204 212 207 Q 200 207 202 188 Q 192 195 180 197 Q 177 224 162 223 Q 152 221 157 204 Q 137 207 123 202 Q 118 218 105 210 Q 100 206 102 194 Q 84 191 77 180 Q 55 184 53 170 Q 51 158 56 140 Z',c,'#674735',3)+path('M 78 130 Q 94 102 122 100 M 174 96 Q 201 99 212 118','none','#ffffff',5,'opacity=".6"')+path('M 192 155 C 197 125 155 109 132 126 C 105 145 120 181 149 181 C 174 181 180 155 159 150','none','#b99c79' if kind!='chocolate' else '#9e6850',5))

def drizzle(kind):
    return group('drizzle',path('M 69 125 Q 123 92 178 101 Q 207 110 178 117 L 85 153 Q 63 165 94 167 L 210 129 Q 234 128 216 145 L 115 187 Q 94 199 119 201 Q 177 188 215 168','none','#593127',9)+path('M 69 125 Q 123 92 178 101 Q 207 110 178 117 L 85 153 Q 63 165 94 167 L 210 129 Q 234 128 216 145 L 115 187 Q 94 199 119 201 Q 177 188 215 168','none',DRIZZLES[kind],6))

def topping_piece(kind):
    if kind=='pecans': return path('M 9 29 Q 0 13 12 5 Q 30 -1 35 13 Q 38 29 25 35 Q 15 39 9 29 Z','#b46f3d',INK,2)+path('M 12 12 Q 29 13 21 28 M 15 19 L 28 23','none','#794329',2)
    if kind=='chocolate-chips': return path('M 3 29 Q 14 18 16 3 Q 24 18 31 25 Q 34 33 21 34 L 10 34 Q 3 34 3 29 Z','#593127',INK,2)+path('M 15 24 L 17 17','none','#a77450',3)
    if kind=='rainbow-sprinkles': return path('M 4 6 L 15 19','none','#f2729d',5)+path('M 25 5 L 23 18','none','#40c5bb',5)+path('M 16 30 L 30 29','none','#ffca55',5)
    return path('M 3 12 L 13 6 L 21 11 L 17 21 L 6 24 Z','#c7894b',INK,2)+path('M 25 25 L 32 22 L 36 31 L 26 35 Z','#a56832',INK,2)

def topping_scatter(kind):
    positions=[(89,112,-20),(150,96,13),(197,118,35),(118,157,-10),(180,173,70),(77,170,30),(140,198,0)]
    return group('toppings',''.join(f'<g transform="translate({x} {y}) rotate({a}) scale(.52)">{topping_piece(kind)}</g>' for x,y,a in positions))

def symbol(kind):
    b=ellipse(50,50,44,44,CREAM,INK,4)
    if kind in ICINGS: b+=path('M 20 61 Q 18 42 32 42 Q 29 30 43 28 Q 49 12 58 29 Q 77 28 74 42 Q 89 48 78 64 Z',ICINGS[kind],INK,3)+path('M 29 72 Q 52 82 73 71','none','#c19b6a',4)
    elif kind in DRIZZLES: b+=path('M 44 20 C 16 43 81 42 54 60 C 31 73 48 81 65 77','none',INK,14)+path('M 44 20 C 16 43 81 42 54 60 C 31 73 48 81 65 77','none',DRIZZLES[kind],9)
    elif kind in TOPPINGS: b+=place(topping_piece(kind),29,25,1.3)
    elif kind in ['cocoa','chocolate-cinnamon']: b+=path('M 20 39 L 59 22 L 81 58 L 40 78 Z','#79503a',INK,3)+path('M 32 34 L 53 70 M 46 27 L 67 65 M 28 52 L 68 35 M 34 64 L 76 47','none','#442c25',3)
    elif kind=='classic': b+=ellipse(50,53,28,23,'#f6d89b',INK,3)+path('M 31 48 Q 40 36 53 37','none','#fff3d6',5)
    elif kind=='cinnamon': b+=path('M 26 66 L 51 25 Q 57 18 65 25 L 75 34 L 51 75 Z','#b27142',INK,3)+path('M 35 66 L 59 30 M 47 73 L 70 35','none','#72462e',4)
    else: b+=place(spiral(),-2,-1,.33)
    return b

def tray():
    return shadow(245,127,225,16)+rect(12,17,466,105,'#828f93',22)+rect(25,28,440,77,'#d5e0df',15)+path('M 44 41 L 441 41','none','#f6fbef',6)+path('M 44 95 L 441 95','none','#aababc',5)

def container(kind,typ,color):
    if typ=='bottle':
        b=path('M 68 67 L 77 17 Q 80 10 85 17 L 98 67 Z',color)+rect(48,65,70,21,CREAM,8)+rect(48,83,70,144,color,16)+ellipse(83,228,35,9,color)+path('M 61 107 L 61 201','none','#fff5dd',7,'opacity=".55"')
    elif typ=='jar':
        b=rect(29,63,106,164,'#fff1d2',23)+rect(34,123,96,98,color,15)+rect(23,49,118,30,TEAL,8)+path('M 40 55 L 40 72 M 57 55 L 57 72 M 75 55 L 75 72 M 93 55 L 93 72 M 111 55 L 111 72','none','#1c7778',3)+path('M 43 91 L 43 112','none','#ffffff',7)
    else:
        b=path('M 14 89 L 29 211 Q 83 242 139 210 L 153 89 Z','#9eb0b3')+ellipse(83,89,70,30,'#d7e2df')+ellipse(83,89,59,20,color,INK,3)+path('M 29 113 L 40 189','none','#f4f7e8',7)
    badge=symbol(kind)
    if typ=='bottle':
        badge=ellipse(50,50,44,44,CREAM,INK,4)+path('M 44 20 C 16 43 81 42 54 60 C 31 73 48 81 65 77','none',INK,14)+path('M 44 20 C 16 43 81 42 54 60 C 31 73 48 81 65 77','none',color,9)
    b+=place(badge,48,128,.7)
    return b

def draw_food():
    for dough in ['classic','cocoa']:
        for fill in ['cinnamon','chocolate-cinnamon']:
            for state in ['raw','underbaked','golden','burnt']:
                save(f'roll-{dough}-{fill}-{state}','food',300,280,roll(dough,fill,state),family=f'roll-{dough}-{fill}',state=state,anchor=[150,160])
        c='#f7d79a' if dough=='classic' else '#b47b50'
        for fill in ['cinnamon','chocolate-cinnamon']:
            for stage in ['ball','sheet','buttered','filled','log','sliced']:
                b=shadow(150,233,125,18)
                if stage=='ball': b+=path('M 54 177 Q 44 120 78 82 Q 122 44 171 67 Q 213 61 242 118 Q 268 183 218 219 Q 122 258 64 211 Z',c)+path('M 82 126 Q 98 88 137 90','none','#ffe9c3',10)
                elif stage in ['sheet','buttered','filled']:
                    b+=path('M 38 84 Q 39 68 61 70 L 239 74 Q 263 73 263 97 L 253 219 Q 249 235 224 230 L 45 226 Q 24 226 28 203 Z',c)
                    if stage in ['buttered','filled']: b+=path('M 51 93 L 239 95 L 232 207 L 48 205 Z','#f3bd55' if stage=='buttered' else ('#a76534' if fill=='cinnamon' else '#613929'),'none',0)
                    if stage=='filled':
                        rng=random.Random(3)
                        b+=''.join(ellipse(rng.randint(53,229),rng.randint(100,201),2,2,'#e3ab66','none',0) for _ in range(70))
                    b+=path('M 44 85 L 237 87','none','#fff0c8',5)
                else:
                    b+=path('M 56 108 Q 117 85 226 108 Q 260 125 251 180 Q 244 210 213 214 L 63 211 Z',c)+ellipse(62,160,35,51,c)+path('M 64 122 C 22 118 26 195 65 197 C 95 195 90 142 63 143 C 45 144 44 176 62 178','none','#75402a' if fill=='cinnamon' else '#482b25',7)
                    if stage=='sliced':
                        b+=path('M 121 105 Q 143 147 123 213 M 178 107 Q 199 152 181 212','none',INK,5)
                    b+=path('M 99 119 Q 160 110 215 121','none','#ffe4ae',6)
                save(f'dough-{dough}-{fill}-{stage}','dough',300,280,group('dough-'+stage,b),family=f'dough-{dough}-{fill}',state=stage,anchor=[150,160])
    for k in ICINGS:
        save('icing-'+k,'decorations',300,280,icing(k),anchor=[150,160])
        save('tub-'+k,'ingredients',166,250,container(k,'tub',ICINGS[k]))
        save('symbol-icing-'+k,'symbols',100,100,symbol(k))
    for k in DRIZZLES:
        save('drizzle-'+k,'decorations',300,280,drizzle(k),anchor=[150,160])
        save('bottle-'+k,'ingredients',166,250,container(k,'bottle',DRIZZLES[k]))
        # vanilla is shared by name, but its drizzle symbol must be a ribbon.
        ribbon=ellipse(50,50,44,44,CREAM,INK,4)+path('M 44 20 C 16 43 81 42 54 60 C 31 73 48 81 65 77','none',INK,14)+path('M 44 20 C 16 43 81 42 54 60 C 31 73 48 81 65 77','none',DRIZZLES[k],9)
        save('symbol-drizzle-'+k,'symbols',100,100,ribbon)
    for k in TOPPINGS:
        save('topping-'+k,'decorations',300,280,topping_scatter(k),anchor=[150,160])
        save('piece-'+k,'decorations',40,40,topping_piece(k))
        save('jar-'+k,'ingredients',166,250,container(k,'jar',TOPPINGS[k]))
        save('symbol-topping-'+k,'symbols',100,100,symbol(k))
    for k,c in [('classic','#f7d79a'),('cocoa','#b47b50'),('cinnamon','#a76534'),('chocolate-cinnamon','#613929')]:
        save('bin-'+k,'ingredients',166,250,container(k,'tub',c))
        save('symbol-'+k,'symbols',100,100,symbol(k))
    recipes=[('classic','cinnamon','cream-cheese','caramel','pecans'),('cocoa','chocolate-cinnamon','chocolate','vanilla','chocolate-chips'),('classic','cinnamon','vanilla','strawberry','rainbow-sprinkles')]
    for i,(d,f,ic,dr,t) in enumerate(recipes,1):
        save(f'finished-roll-{i}','food',300,280,roll(d,f)+icing(ic)+drizzle(dr)+topping_scatter(t),anchor=[150,160])
    return recipes

def character(name,skin,hair,shirt,pants,style,expression,crop=False):
    b=shadow(150,556,102,18)
    # Full silhouettes have deliberately oversized heads, hands, and shoes.
    b+=group('legs',path('M 97 373 L 96 501 L 135 510 L 151 418 L 167 510 L 206 501 L 201 371 Z',pants)+path('M 148 399 L 151 418','none',INK,5))
    b+=group('shoes',path('M 94 491 Q 67 506 64 534 Q 66 553 128 546 L 138 511 Z','#484950')+path('M 168 508 L 175 545 Q 242 557 243 535 Q 235 507 205 493 Z','#484950')+path('M 69 536 Q 96 543 127 536 M 179 536 Q 209 546 237 536','none','#b8c6c3',5))
    b+=group('arms',path('M 98 274 Q 71 272 61 309 L 45 391 L 69 402 L 99 330 Z',shirt)+path('M 202 274 Q 227 272 239 308 L 254 392 L 231 404 L 204 327 Z',shirt)+path('M 49 375 L 40 412 Q 25 425 29 445 Q 33 451 40 438 Q 35 460 45 463 Q 53 463 55 447 Q 55 467 64 463 Q 74 459 74 440 L 68 380 Z',skin)+path('M 234 378 L 232 430 Q 222 448 233 455 Q 241 458 246 444 Q 250 468 260 462 Q 265 459 260 445 Q 269 455 275 447 Q 279 434 261 414 L 256 377 Z',skin))
    b+=group('torso',path('M 105 263 Q 150 248 195 263 L 215 378 Q 155 405 86 378 Z',shirt)+path('M 96 369 Q 146 389 206 369','none',INK,4))
    b+=group('neck',path('M 126 222 L 126 266 Q 148 290 174 266 L 174 219 Z',skin))
    if style=='worker':
        b+=group('apron',path('M 112 277 L 127 270 L 134 294 L 171 294 L 177 270 L 191 279 L 187 316 L 203 381 Q 145 403 99 379 L 114 312 Z','#ed9064')+rect(124,331,54,37,CREAM,8,INK,3)+place(spiral(),117,328,.19))
    elif style=='curly':
        b+=path('M 111 289 L 187 359 M 105 319 L 174 381','none','#ffe1a6',13)+ellipse(153,298,7,7,CREAM,INK,2)
    elif style=='bob': b+=path('M 112 275 L 149 312 L 184 276 M 151 312 L 151 379','none','#fff2d2',7)+rect(171,324,27,22,'#fff2d2',5,INK,2)
    elif style=='cap': b+=text(151,345,'R',54,CREAM)
    else: b+=path('M 103 284 L 125 307 L 116 379 M 193 284 L 174 308 L 185 379','none','#247a7d',7)+ellipse(150,332,5,5,CREAM,INK,1)
    if style in ['curly','bob']:
        b+=group('hair-back',path('M 72 119 Q 52 40 134 30 Q 231 12 236 109 L 239 258 Q 211 275 184 247 L 92 261 Q 55 253 62 220 Z',hair))
    b+=group('head',path('M 76 114 Q 79 62 143 58 Q 212 54 226 116 L 223 187 Q 211 238 159 248 Q 110 245 85 207 Q 65 196 64 174 Q 61 157 77 157 Z',skin)+path('M 205 173 Q 220 155 230 172 Q 235 188 216 197',skin,INK,4))
    b+=path('M 89 187 Q 99 219 128 228','none','#fff1d2',5,'opacity=".35"')
    if style=='curly':
        hairbody=''.join(ellipse(x,y,r,r,hair,INK,4) for x,y,r in [(77,106,28),(77,73,28),(101,49,28),(137,43,29),(171,45,31),(205,62,29),(218,94,26)])
    elif style=='bob': hairbody=path('M 68 138 Q 51 55 125 39 Q 221 19 238 108 L 220 160 L 200 112 Q 164 124 126 91 Q 111 121 68 138 Z',hair)+path('M 176 55 Q 209 65 217 91','none','#ba6443',6)
    else: hairbody=path('M 72 143 L 58 95 L 78 92 L 65 66 L 102 71 L 93 43 L 129 55 L 149 29 L 160 54 L 194 42 L 195 65 L 225 67 L 218 95 L 231 112 L 212 155 L 198 116 Q 151 130 113 99 L 87 139 Z',hair)+path('M 89 89 Q 123 93 141 76','none','#ac7852',6)
    b+=group('hair-front',hairbody)
    eyeY=160
    eyes=ellipse(119,eyeY,10,15,INK,'none',0)+ellipse(168,eyeY-3,10,15,INK,'none',0)+ellipse(122,eyeY-4,3,5,CREAM,'none',0)+ellipse(171,eyeY-7,3,5,CREAM,'none',0)
    if expression=='happy': eyes=path('M 109 160 Q 119 143 130 157 M 158 157 Q 167 142 178 155','none',INK,5)
    if expression=='impatient': eyes+=path('M 107 150 L 130 150 M 158 147 L 181 147','none',skin,10)+path('M 105 139 L 130 144 M 158 141 L 181 134','none',INK,4)
    mouth={'neutral':path('M 126 200 Q 148 217 172 195','none',INK,4),'ordering':ellipse(150,203,11,15,'#69372c',INK,3),'happy':path('M 121 193 Q 147 209 180 188 Q 177 224 150 225 Q 132 220 121 193 Z','#673a2e',INK,4)+path('M 139 221 Q 151 208 165 219','#f38d86','none',0),'impatient':path('M 133 206 L 171 201','none',INK,4),'disappointed':path('M 128 210 Q 147 191 172 205','none',INK,4)}[expression]
    b+=group('expression-'+expression,eyes+path('M 143 172 L 137 183 L 147 186','none','#9c623f',3)+mouth)
    if style=='bob': b+=group('glasses',ellipse(117,159,23,23,'none',INK,4)+ellipse(173,155,23,23,'none',INK,4)+path('M 140 157 L 150 156','none',INK,4))
    if style in ['worker','cap']:
        b+=group('hat',path('M 74 79 L 78 39 Q 138 10 207 42 L 214 83 Q 148 101 74 79 Z',TEAL if style=='worker' else '#ed9064')+path('M 79 79 Q 139 74 214 83 L 242 103 Q 188 115 140 99 Z','#f0b04d')+ellipse(145,56,24,23,CREAM,INK,3)+place(spiral(),123,32,.15))
    return f'<g transform="translate(0 {-20 if crop else 0})">{b}</g>'

def draw_characters():
    people=[('pip','#f1bd85','#68452f',TEAL,'#655050','worker'),('juniper','#b97950','#49302b','#efaa48','#55757a','curly'),('milo','#e7ac7e','#754b31','#e17664','#465568','cap'),('bea','#f0c09b','#9a4936','#819a5b','#4c5d60','bob'),('nico','#ce916b','#322d31','#60b8b2','#6a6175','spiky')]
    for name,skin,hair,shirt,pants,style in people:
        for expression in ['neutral','ordering','happy','impatient','disappointed']:
            for view in ['full','counter']:
                save(f'{name}-{view}-{expression}','characters',300,580 if view=='full' else 390,character(name,skin,hair,shirt,pants,style,expression,view=='counter'),family=f'{name}-{view}',state=expression,anchor=[150,550 if view=='full' else 380])

def draw_tools():
    save('tray','equipment',490,150,tray())
    save('rolling-pin','equipment',380,130,group('handles',rect(10,49,359,32,'#b16d3e',16))+group('barrel',rect(75,21,230,88,'#e7ac61',26)+path('M 101 40 L 279 40','none','#ffe1a4',8)+path('M 94 88 L 285 88','none','#c38847',5)))
    save('spatula','equipment',110,300,group('handle',rect(45,146,25,145,'#dc7657',12))+group('blade',path('M 23 15 Q 54 2 88 15 L 85 158 Q 57 178 26 158 Z','#c9dcda')+path('M 39 27 L 39 141','none','#faffef',6)))
    save('scraper','equipment',180,160,rect(21,15,138,38,'#a5663d',12)+path('M 27 53 L 153 53 L 164 143 L 15 143 Z','#d7e2df')+path('M 34 67 L 25 130','none','#ffffff',6))
    save('slicing-tool','equipment',260,120,group('handle',rect(161,43,86,31,'#e8805e',13))+group('blade',path('M 159 43 L 27 43 L 12 86 Q 88 104 162 74 Z','#d7e2df')+path('M 30 82 L 145 70','none','#ffffff',5)))
    save('butter-dish','equipment',240,150,ellipse(120,110,110,26,'#e2efdc')+path('M 51 104 L 51 54 L 173 54 L 188 106 Z','#f3c756')+path('M 51 54 L 72 31 L 191 35 L 173 54 Z','#ffe18d')+path('M 173 54 L 191 35 L 204 90 L 188 106 Z','#dba83b'))
    save('filling-shaker','equipment',166,250,container('cinnamon','jar','#a76534'))
    save('oven-mitt','equipment',190,230,path('M 43 202 L 32 137 Q 1 92 23 77 Q 39 67 57 100 L 55 51 Q 50 17 76 20 Q 89 -2 106 17 Q 129 4 140 28 Q 157 24 160 49 L 169 135 L 153 203 Z','#ef9264')+rect(38,188,120,29,CREAM,8)+path('M 78 45 L 145 157 M 59 101 L 111 185 M 61 151 L 143 67 M 80 182 L 155 106','none','#c46849',3))
    rack=rect(8,8,474,135,'#9cacae',12)+rect(21,21,448,108,'#e5e9db',8)
    rack+=''.join(path(f'M {x} 25 L {x} 126','none','#73898b',5) for x in range(35,465,24))
    save('cooling-rack','equipment',490,150,rack)
    save('oven-rack','equipment',490,150,rack)
    save('plate','equipment',320,180,ellipse(160,96,148,70,'#e7ede0')+ellipse(160,86,131,55,CREAM,INK,3)+ellipse(160,87,102,39,'#f9e5bd','#d7be8b',3))
    save('serving-tray','equipment',490,150,tray())
    for state in ['open','closed']:
        b=path('M 22 139 L 268 139 L 288 224 L 8 224 Z','#dcaa75')+path('M 8 224 L 288 224 L 273 267 L 25 267 Z','#b77b4f')+path('M 31 154 L 260 154 L 274 213 L 20 213 Z',CREAM,INK,3)
        if state=='open': b=path('M 22 139 L 29 25 L 263 25 L 268 139 Z','#e9be85')+path('M 40 122 L 45 42 L 246 42 L 251 123 Z',CREAM,INK,3)+b
        else: b+=path('M 22 139 L 268 139 L 286 225 L 9 225 Z','#e9be85')+ellipse(147,181,53,30,CREAM,INK,3)+place(spiral(),105,143,.28)
        save('pastry-box-'+state,'equipment',300,285,group('box-'+state,b),family='pastry-box',state=state)
    save('steam','effects',220,180,group('steam',path('M 49 157 Q 17 125 54 94 Q 81 67 50 33 M 111 155 Q 78 118 115 83 Q 140 57 115 15 M 174 158 Q 145 128 177 99 Q 202 76 179 45','none','#fff4d7',12,'opacity=".8"')))
    save('heat-indicator','interface',160,70,rect(5,5,150,60,'#613b2d',20)+path('M 35 51 Q 18 35 39 17 Q 35 33 46 35 Q 59 41 48 53 Z','#ffaf45',INK,2)+path('M 74 46 L 74 24 M 99 46 L 99 24 M 124 46 L 124 24','none','#ffb94b',8))

def draw_oven():
    interior=rect(10,10,690,420,'#5c3d34',28)+rect(31,32,648,376,'#2f2929',18)+rect(57,58,596,315,'#85583c',12)+path('M 75 340 L 636 340 M 75 245 L 636 245 M 75 149 L 636 149','none','#c0874e',7)
    save('oven-interior','equipment',710,440,group('oven-interior',interior))
    for state in ['closed','open']:
        body=shadow(360,611,330,22)+rect(5,5,710,580,'#afc2c2',32)+rect(24,20,672,88,'#dce6de',20)+path('M 38 31 L 677 31','none','#faffef',7)
        body+=ellipse(75,64,25,25,'#667d7e')+path('M 75 64 L 83 48','none',CREAM,5)+ellipse(640,64,25,25,'#667d7e')+path('M 640 64 L 649 49','none',CREAM,5)
        body+=rect(260,36,201,53,'#463b32',9)+text(360,71,'CINNABONERIA',17,'#ffc373')
        body+=place(interior,25,130,.94)
        if state=='closed':
            door=rect(32,133,656,410,'#879f9f',20)+rect(64,158,592,294,'#433931',18)+rect(85,177,551,253,'#ae7343',12)+path('M 95 190 L 623 190 L 389 425 L 96 425 Z','#fff1cb','none',0,'opacity=".12"')+rect(129,477,466,29,'#dce5d9',14)
        else: door=path('M 31 533 L 688 533 L 716 638 L 5 638 Z','#879f9f')+path('M 73 550 L 647 550 L 669 609 L 50 609 Z','#566e71')+rect(148,619,431,21,'#dce5d9',10)
        body+=group('oven-door',door)
        save('oven-'+state,'equipment',730,660,body,family='oven',state=state)

def draw_interface():
    colors={'order':'#65bd50','dough':'#ac72d4','bake':'#ef9a41','build':'#49a9d6'}
    icons={'order':rect(15,10,37,47,CREAM,5,INK,3)+path('M 24 23 L 44 23 M 24 33 L 44 33 M 24 43 L 38 43','none',INK,3),'dough':place(bodies['rolling-pin'],0,20,.17),'bake':path('M 31 6 Q 38 24 47 30 Q 67 48 43 61 Q 14 69 8 49 Q 2 34 21 19 Q 16 41 28 37 Q 40 31 31 6 Z',CREAM,INK,3),'build':place(roll(),0,-5,.23)}
    for station,c in colors.items():
        for state in ['normal','selected','pressed','disabled']:
            color='#a0a5a1' if state=='disabled' else c
            off=5 if state=='pressed' else 0
            b=rect(7,13,256,76,'#3b3030',33,INK,5)+rect(7,6+off,256,75,color,33,INK,5)+path(f'M 33 {22+off} Q 120 {5+off} 236 {22+off}','none','#ffffff',6,'opacity=".38"')
            b+=place(icons[station],21,16+off,.8)+text(163,41+off,station.upper(),25,CREAM)+text(163,62+off,'STATION',13,CREAM)
            if state=='selected': b+=rect(2,1,266,94,'none',39,CREAM,3,'stroke-dasharray="7 7"')
            save(f'button-{station}-{state}','interface',270,100,b,family='button-'+station,state=state)
    for key,label,col in [('menu','Ⅱ', '#819693'),('audio','♪','#819693'),('back','←','#e8a152'),('cancel','×','#e56f59'),('confirm','✓','#71bc52'),('start','LET’S ROLL!','#71bc52')]:
        w=300 if key=='start' else 110
        b=rect(5,12,w-10,69,'#674835',23)+rect(5,5,w-10,69,col,23)+path(f'M 24 20 L {w-24} 20','none','#fff6de',5,'opacity=".4"')+text(w/2,52,label,29 if key=='start' else 40,CREAM)
        save('button-'+key,'interface',w,90,b)
    save('ticket-rail','interface',1400,60,path('M 15 33 L 1385 33','none',INK,18)+path('M 15 29 L 1385 29','none','#acb5b1',10)+''.join(path(f'M {x} 25 L {x+12} 34','none','#e6e8d8',3) for x in range(20,1380,30)))
    save('ticket-clip','interface',80,75,rect(18,15,44,46,'#809491',12)+ellipse(40,23,21,19,'#dbe5db')+ellipse(40,22,9,8,'#f9f8e7',INK,2))
    save('order-ticket','interface',280,650,path('M 7 7 L 273 7 L 273 632 L 257 641 L 241 632 L 225 641 L 209 632 L 193 641 L 177 632 L 161 641 L 145 632 L 129 641 L 113 632 L 97 641 L 81 632 L 65 641 L 49 632 L 33 641 L 17 632 L 7 637 Z','#fffbed')+''.join(path(f'M 22 {y} L 258 {y}','none','#dcac94',2,'stroke-dasharray="7 7"') for y in [80,250,420,590]))
    save('tutorial-bubble','interface',800,220,path('M 68 9 Q 12 10 10 66 L 12 142 Q 13 187 66 187 L 335 187 L 365 213 L 388 187 L 733 187 Q 791 187 789 134 L 790 66 Q 788 9 731 9 Z',CREAM,INK,6)+path('M 69 23 L 731 23','none','#ffffff',6))
    save('take-order-bubble','interface',230,150,path('M 38 9 L 191 9 Q 224 9 223 49 L 222 85 Q 221 118 183 119 L 131 119 L 110 144 L 99 119 L 39 119 Q 8 118 8 86 L 8 46 Q 8 9 38 9 Z','#75c754')+text(115,55,'TAKE',30,CREAM)+text(115,88,'ORDER',30,CREAM))
    save('pointer','interface',150,100,path('M 10 30 L 91 30 L 91 7 L 143 50 L 91 93 L 91 70 L 10 70 Z',CREAM))
    save('drag-cue','interface',130,160,path('M 41 140 L 31 104 Q 5 80 18 68 Q 28 63 43 81 L 43 25 Q 44 9 57 17 L 65 63 Q 77 47 88 67 Q 103 55 111 78 L 113 111 L 96 142 Z',CREAM)+path('M 6 30 L 23 30 M 18 7 L 30 16 M 77 5 L 68 17','none','#e89541',5))
    save('timer','interface',180,180,ellipse(90,94,76,76,'#7f9997')+ellipse(90,91,63,63,CREAM)+path('M 90 34 A 57 57 0 0 1 144 109 L 90 91 Z','#a9d87e','none',0)+''.join(path(f'M {90+49*math.sin(a):.1f} {91-49*math.cos(a):.1f} L {90+56*math.sin(a):.1f} {91-56*math.cos(a):.1f}','none',INK,3) for a in [i*math.pi/6 for i in range(12)])+group('timer-needle',path('M 90 91 L 126 55','none',INK,6)+ellipse(90,91,8,8,'#dc7657',INK,3))+rect(68,3,44,16,'#d3ded4',7))
    star=path('M 50 6 L 63 35 L 95 39 L 71 60 L 77 92 L 50 76 L 22 92 L 28 60 L 5 39 L 37 35 Z','#f5c75e',INK,4)+path('M 49 24 L 43 44 L 25 47','none','#fff0b4',5)
    save('star','interface',100,100,star)
    save('coin','interface',100,100,ellipse(50,53,43,43,'#c5863f')+ellipse(50,46,43,40,'#f3c464')+ellipse(50,46,32,29,'none','#b8813f',3)+text(50,59,'$',37,'#a76a31'))
    save('progress-meter','interface',300,60,rect(5,5,290,48,'#51483c',22)+rect(13,13,209,32,'#9bd46b',15,'none',0)+path('M 30 20 L 202 20','none','#d9f3ad',5))
    save('ticket-hand-in','interface',270,180,rect(7,7,256,165,'#75bd59',18)+rect(24,24,222,131,'none',12,CREAM,3,'stroke-dasharray="8 8"')+path('M 99 63 L 124 87 L 174 39','none',CREAM,12)+text(135,133,'SERVE ORDER',22,CREAM))
    for rank,c in [('gold','#efc060'),('silver','#a9c2c3'),('bronze','#c28b59')]:
        save('badge-'+rank,'interface',150,180,path('M 36 105 L 23 174 L 73 149 L 126 174 L 112 107 Z','#de7557')+ellipse(75,71,62,62,c)+place(star,35,29,.8),family='score-badge',state=rank)
    for name in ['pause','results']:
        b=rect(9,17,682,467,'#6a4840',35)+rect(9,7,682,467,CREAM,35)+rect(28,26,644,75,TEAL,24)+text(350,77,'TAKE A BREAK' if name=='pause' else 'SWEET WORK!',37,CREAM)
        if name=='results': b+=''.join(place(star,215+i*95,125,.8) for i in range(3))+''.join(rect(55,235+i*57,590,42,'#efdbb7',12,'none',0) for i in range(3))
        save(name+'-panel','interface',700,500,b)

def logo():
    b=path('M 26 98 Q 13 57 60 34 Q 204 -2 359 34 Q 409 50 386 98 L 374 179 Q 205 220 39 179 Z',CREAM,INK,7)
    b+=path('M 41 105 Q 203 65 373 106 L 368 170 Q 210 206 46 170 Z','#d97752',INK,4)
    b+=text(205,67,'PAPA’S',33,INK)+text(204,148,'CINNABONERIA',40,CREAM,extra='letter-spacing="-2"')
    return b

def draw_shop():
    save('logo','branding',420,230,logo())
    save('title-art','branding',900,550,ellipse(450,276,392,238,'#d8f0d5',INK,6)+place(logo(),108,50,1.65)+place(roll(),80,291,.75)+place(roll('cocoa').replace('id="', 'id="cocoa-'),587,302,.72)+path('M 301 442 Q 455 476 607 441','none','#59aaa0',5))
    save('favicon','branding',100,100,rect(3,3,94,94,TEAL,25,INK,5)+place(roll(),0,1,.33))
    # Separate shop furniture and signage.
    save('shop-window','scenery',420,410,rect(8,8,404,394,TEAL,17)+rect(27,26,366,365,'#e0f1d4',8)+path('M 31 292 Q 103 210 172 268 Q 251 185 388 261 L 388 382 L 31 382 Z','#9eccac','none',0)+path('M 51 46 L 190 46 L 51 225 M 97 358 L 366 59 L 366 130 L 158 358 Z','#ffffff','none',0,'opacity=".48"')+path('M 210 29 L 210 382 M 29 210 L 391 210','none',TEAL,13))
    save('doorway','scenery',270,500,rect(5,5,260,490,TEAL,15)+rect(22,23,226,464,'#e8d3ae',7)+rect(41,40,188,307,'#c9e5d1',7)+path('M 55 53 L 214 53 L 55 258 Z','#ffffff','none',0,'opacity=".5"')+rect(42,372,185,83,'#d4aa77',5)+rect(204,313,15,49,'#78614c',7))
    save('order-counter','scenery',1440,320,path('M 5 10 L 1435 10 L 1435 95 L 5 95 Z',TEAL)+path('M 7 22 L 1433 22','none','#94e0ce',10)+rect(5,94,1430,220,'#bb7448',0)+''.join(path(f'M {x} 98 L {x} 310','none','#995b38',4) for x in range(42,1440,93))+rect(355,140,730,124,'#f6dfb2',28)+text(720,221,'FRESH FROM THE OVEN',43,'#855033'))
    save('register','equipment',280,250,rect(15,190,250,47,'#5b8181',12)+path('M 32 189 L 63 78 L 206 78 L 246 189 Z',TEAL)+rect(84,8,133,82,'#496564',12)+rect(96,21,108,53,'#d5e9b0',4)+text(150,57,'HELLO!',23,'#55714d')+''.join(rect(74+(i%4)*35,118+(i//4)*29,25,17,CREAM,4,INK,2) for i in range(8)))
    save('order-pad','equipment',170,230,rect(14,10,143,205,'#cb9d69',9)+rect(23,17,126,185,CREAM,4)+''.join(path(f'M 38 {y} L 133 {y}','none','#b0c6bb',3) for y in range(58,190,27))+''.join(ellipse(x,28,5,8,'#658c85',INK,2) for x in range(40,140,22)))
    save('pencil','equipment',50,240,path('M 10 40 L 37 40 L 37 195 L 23 229 L 10 195 Z','#efba50')+path('M 10 195 L 23 229 L 37 195 Z','#e5bf8f',INK,3)+path('M 19 219 L 23 229 L 28 219 Z',INK,INK,2)+rect(10,7,27,34,'#df7c7c',7)+path('M 24 52 L 24 188','none','#ffe09a',4))
    for state in ['open','closed']:
        save('shop-sign-'+state,'scenery',240,150,rect(8,8,224,133,'#5c8e58' if state=='open' else '#8e7970',18)+rect(18,18,204,113,'none',12,CREAM,3)+text(120,83,state.upper(),43,CREAM)+text(120,115,'COME FOR A SWIRL',12,CREAM),family='shop-sign',state=state)

def draw_backgrounds():
    rng=random.Random(12)
    for station,col in [('order','#e7efd9'),('dough','#ac72d4'),('bake','#e7a354'),('build','#75b8d8')]:
        b=rect(0,0,1440,1000,col,0,'none',0)
        if station=='order':
            b+=''.join(place(spiral('#c9ddc7'),x,y,.33) for y in range(20,620,110) for x in range(0,1440,130))
            b+=rect(0,620,1440,380,'#a66c47',0,'none',0)
            for row in range(5):
                for column in range(10):
                    if (row+column)%2==0: b+=path(f'M {column*170-150+row*15} {620+row*90} L {column*170+20+row*15} {620+row*90} L {column*170+35+row*15} {710+row*90} L {column*170-135+row*15} {710+row*90} Z','#945e3e','none',0)
            b+=rect(0,602,1440,26,TEAL,0,INK,4)
        else:
            b+=''.join(path(f'M {x} 0 L {x} 800','none','#3c2726',2,'opacity=".12"') for x in range(0,1440,110))
            b+=rect(0,94,1440,49,'#fff0ce',0,INK,4)
            b+=''.join(rect(x,98,24,40,col,0,'none',0) for x in range(0,1440,48))
            b+=rect(20,213,1100,588,'#becbc4' if station=='dough' else ('#ddc29b' if station=='bake' else '#d9e7d7'),24)+rect(34,227,1072,560,'#d9ded0' if station=='dough' else ('#efcc98' if station=='bake' else '#e9f0df'),18,INK,2)
            if station=='dough':
                b+=''.join(ellipse(rng.randint(60,1080),rng.randint(255,760),rng.randint(1,4),rng.randint(1,3),'#fffbed','none',0,'opacity=".58"') for _ in range(550))
            b+=rect(0,825,1440,175,'#78523d',0,INK,4)+path('M 0 843 L 1440 843','none','#c9945b',9)
        save('background-'+station,'scenery',1440,1000,group('background',b))
    save('worktop','scenery',1100,590,rect(7,7,1086,576,'#b3c4c0',24)+rect(22,22,1056,546,'#d9ded0',16,INK,2))
    save('decorating-counter','scenery',1100,590,rect(7,7,1086,576,'#6c9ca8',24)+rect(22,22,1056,546,'#e9f0df',16,INK,2))

def main():
    recipes=draw_food()
    draw_characters()
    draw_tools()
    draw_oven()
    draw_interface()
    draw_shop()
    draw_backgrounds()
    for a in manifest:
        a['availableStates']=[v['state'] for v in manifest if v['family']==a['family']]
    data={'version':1,'title':'Papa’s Cinnaboneria','canvas':{'width':1440,'height':1000},'foodAnchor':[150,160],'assets':manifest,'sampleOrder':[dict(dough=d,filling=f,icing=i,drizzle=dr,topping=t) for d,f,i,dr,t in recipes],'characters':[{'id':'pip','name':'Pip','role':'worker'},{'id':'juniper','name':'Juniper','role':'customer'},{'id':'milo','name':'Milo','role':'customer'},{'id':'bea','name':'Bea','role':'customer'},{'id':'nico','name':'Nico','role':'customer'}]}
    (ASSETS/'manifest.json').write_text(json.dumps(data,indent=2)+'\n')
    (ROOT/'public').mkdir(exist_ok=True)
    (ROOT/'public'/'favicon.svg').write_text((ASSETS/'branding'/'favicon.svg').read_text())
    print(f'Drew {len(manifest)} SVG assets in {ASSETS}')

if __name__=='__main__': main()
