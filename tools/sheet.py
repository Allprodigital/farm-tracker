# Contact sheet: python sheet.py out.png img1 img2 ... (scales each to 360px wide, 4 per row)
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); w = 360; ims.append(im.resize((w, int(im.height * w / im.width))))
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
rh = [max(i.height for i in ims[r*cols:(r+1)*cols]) for r in range(rows)]
S = Image.new('RGB', (cols * 370, sum(rh) + 10 * rows), 'white'); y = 0
for r in range(rows):
    for c, im in enumerate(ims[r*cols:(r+1)*cols]): S.paste(im, (c * 370, y))
    y += rh[r] + 10
S.save(out)
