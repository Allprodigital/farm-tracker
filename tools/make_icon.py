# Generates the original Farm Tracker sorghum icon (grain head on a stalk) as SVG.
import math
def head_grains(cx, top, bottom, maxw):
    g = []
    rows = 11
    for r in range(rows):
        t = r / (rows - 1)
        y = top + t * (bottom - top)
        # teardrop profile: narrow top, widest ~60%, rounded bottom
        w = maxw * (math.sin(math.pi * min(1, t * 0.85 + 0.08)) ** 0.8)
        n = max(1, round(w / 34))
        for i in range(n):
            x = cx if n == 1 else cx - w / 2 + 17 + i * (w - 34) / (n - 1)
            if r % 2 and n > 1: x += 6
            g.append((round(x, 1), round(y, 1)))
    return g
def svg(scale=1.0, bg_rx=104, label=True):
    grains = head_grains(256, 88, 292, 176)
    s = []
    s.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Farm Tracker">')
    s.append(f'<rect width="512" height="512" rx="{bg_rx}" fill="#1F3A24"/>')
    s.append(f'<g transform="translate(256 256) scale({scale}) translate(-256 -256)">')
    # ground arc
    s.append('<path d="M96 452 Q256 404 416 452" fill="none" stroke="#3E6B3A" stroke-width="14" stroke-linecap="round"/>')
    # stalk
    s.append('<path d="M256 292 C258 350 252 400 256 446" fill="none" stroke="#A7CF5E" stroke-width="16" stroke-linecap="round"/>')
    # leaves
    s.append('<path d="M255 392 C300 350 350 336 404 330 C360 360 312 384 258 414 Z" fill="#7DB346"/>')
    s.append('<path d="M257 352 C210 316 164 306 112 306 C152 334 200 356 255 378 Z" fill="#8FC24F"/>')
    # small neck (peduncle) under the head
    s.append('<path d="M256 270 L256 300" stroke="#A7CF5E" stroke-width="12" stroke-linecap="round"/>')
    # grain head
    s.append('<g>')
    for (x, y) in grains:
        s.append(f'<ellipse cx="{x}" cy="{y}" rx="17" ry="20" fill="#C4561F" stroke="#7E2F0E" stroke-width="3.5"/>')
    for (x, y) in grains:
        s.append(f'<ellipse cx="{x-4}" cy="{y-6}" rx="7" ry="8" fill="#E8894A"/>')
    s.append('</g>')
    s.append('</g></svg>')
    return '\n'.join(s)
open('icons/icon.svg', 'w').write(svg())
open('icons/icon-maskable.svg', 'w').write(svg(scale=0.78, bg_rx=0))
print('ok')
