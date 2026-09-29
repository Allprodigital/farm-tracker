# Before/after composite: python compare.py out.png before.png after.png "Title"
import sys
from PIL import Image, ImageDraw, ImageFont
out, a, b, title = sys.argv[1:5]
A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
w = 600; A = A.resize((w, int(A.height * w / A.width))); B = B.resize((w, int(B.height * w / B.width)))
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; f1, f2 = ImageFont.truetype(F, 34), ImageFont.truetype(F, 28)
pad, top = 30, 130; H = top + max(A.height, B.height) + pad
S = Image.new('RGB', (w * 2 + pad * 3, H), '#f5f1e6'); d = ImageDraw.Draw(S)
d.text((pad, 24), title, font=f1, fill='#1f3a24')
d.text((pad, 80), 'Before (1.3.1)', font=f2, fill='#6b6657'); d.text((pad * 2 + w, 80), 'After (1.4.0)', font=f2, fill='#2d6a31')
S.paste(A, (pad, top)); S.paste(B, (pad * 2 + w, top))
d.rectangle([pad - 2, top - 2, pad + w + 1, top + A.height + 1], outline='#cfc6ae', width=2); d.rectangle([pad * 2 + w - 2, top - 2, pad * 2 + 2 * w + 1, top + B.height + 1], outline='#2d6a31', width=3)
S.save(out)
