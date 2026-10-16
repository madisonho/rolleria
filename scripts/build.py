"""Build a portable static gallery; no package install or network required."""
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile
ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(ROOT/'scripts/validate.py')],check=True)
out=ROOT/'dist'
out.mkdir(exist_ok=True)
for name in ['index.html','game.css','game.js','game-engine.js','dough-board.js','studio.html','styles.css','app.js']:
    shutil.copy2(ROOT/name,out/name)
for name in ['assets','public']:
    shutil.copytree(ROOT/name,out/name,dirs_exist_ok=True)
subprocess.run([sys.executable,str(ROOT/'scripts/validate.py'),str(out)],check=True)
print(f'Built static gallery: {out}')
bundle=ROOT/'output'/'papas-cinnaboneria-starter-kit.zip'
bundle.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as archive:
    for name in ['index.html','game.css','game.js','game-engine.js','dough-board.js','studio.html','styles.css','app.js','package.json','README.md','ART-DIRECTION.md']:
        archive.write(ROOT/name,name)
    for folder in ['assets','public','scripts','tests']:
        for source in sorted((ROOT/folder).rglob('*')):
            if source.is_file() and '__pycache__' not in source.parts:
                archive.write(source,source.relative_to(ROOT))
print(f'Packaged complete editable kit: {bundle}')
