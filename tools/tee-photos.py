# Builds the designer's shirt photos (src/assets/tees/*.webp) from the owner's 2x2 photo grids.
#
#   python3 tools/tee-photos.py <folder with the grids> src/assets/tees
#
# Each shirt grid is front | back for two colours (top row, bottom row); each neckline grid is
# white | cream over charcoal | black. Shirts are cut out of the white background, stretched onto the same
# box per fit (so one set of coordinates in TeeMockup.tsx fits every colour), and the maker's tag inside
# the front neck is painted out. Needs Pillow and numpy.
import os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SHIRTS = {  # name: (grid file, row)
  'regular-black': ('Regular-Fit T-Shirt Catalog Grid.png', 0),
  'regular-white': ('Regular-Fit T-Shirt Catalog Grid.png', 1),
  'regular-charcoal': ('regular fit tees front n back.png', 0),
  'regular-cream': ('regular fit tees front n back.png', 1),
  'oversized-white': ('oversized tees white n black.png', 0),
  'oversized-black': ('oversized tees white n black.png', 1),
  'oversized-cream': ('oversized tees grey and cream.png', 0),
  'oversized-charcoal': ('oversized tees grey and cream.png', 1),
}
NECKS = {'regular': 'regular fit tees neckline.png', 'oversized': 'oversize tee nackline.png'}
FIT_W = {'regular': 377, 'oversized': 431}  # canvas units, as in TeeMockup.tsx
PPU = 1.55  # pixels per canvas unit
CELL = 630  # grid cell pitch in pixels


def cell(grid, row, col):
  y, x = row * CELL, col * CELL
  return np.array(grid.crop((x + 4, y + 4, x + 621, y + 621)))


def cut_out(a, white_shirt):
  """Shirt mask: everything not connected to the border through near-white background."""
  bg = a.min(2) >= (252 if white_shirt else 247)
  seen = np.zeros_like(bg)
  seen[0, :] = seen[-1, :] = seen[:, 0] = seen[:, -1] = True
  seen &= bg
  while True:
    grown = seen.copy()
    grown[1:] |= seen[:-1]; grown[:-1] |= seen[1:]; grown[:, 1:] |= seen[:, :-1]; grown[:, :-1] |= seen[:, 1:]
    grown &= bg
    if (grown == seen).all(): break
    seen = grown
  m = ~seen
  m[:3, :] = m[-3:, :] = m[:, :3] = m[:, -3:] = False
  return m


def bbox(m):
  cols = np.where(m.sum(0) > 8)[0]; rows = np.where(m.sum(1) > 8)[0]
  return cols.min(), rows.min(), cols.max() + 1, rows.max() + 1


def paint_out_tag(a, white_shirt):
  """Blend the inside-back fabric across the tag, row by row, so the neck seam carries straight through."""
  rgb = a[..., :3].astype(float)
  cx = a.shape[1] // 2
  if white_shirt:  # a white tag on a white shirt: only its print stands out, so use the tag's known spot
    x0, x1, y0, y1 = cx - 23, cx + 21, 30, 71
  else:
    wx0, wy0 = cx - 28, 28
    win = rgb[wy0:76, wx0:cx + 28].mean(2)
    dev = np.abs(win - np.median(win)) > 30
    rows = np.where(dev.sum(1) > 4)[0]; cols = np.where(dev.sum(0) > 4)[0]
    if not len(rows) or not len(cols): return a
    y0, y1 = wy0 + rows.min() - 3, min(71, wy0 + rows.max() + 4)
    x0, x1 = wx0 + cols.min() - 3, wx0 + cols.max() + 4
  left = rgb[y0:y1, x0 - 3:x0].mean(1); right = rgb[y0:y1, x1:x1 + 3].mean(1)
  t = np.linspace(0, 1, x1 - x0)[None, :, None]
  grain = np.random.default_rng(1).normal(0, 1.0, (y1 - y0, x1 - x0))[..., None]
  rgb[y0:y1, x0:x1] = left[:, None] * (1 - t) + right[:, None] * t + grain
  a[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
  return a


os.makedirs(OUT, exist_ok=True)
for fit in FIT_W:
  black = Image.open(os.path.join(SRC, SHIRTS[f'{fit}-black'][0])).convert('RGB')
  rx0, ry0, rx1, ry1 = bbox(cut_out(cell(black, SHIRTS[f'{fit}-black'][1], 0), False))
  W = round(FIT_W[fit] * PPU); H = round(W * (ry1 - ry0) / (rx1 - rx0))
  for name, (file, row) in SHIRTS.items():
    if not name.startswith(fit): continue
    grid = Image.open(os.path.join(SRC, file)).convert('RGB')
    for col, side in enumerate(('front', 'back')):
      a = cell(grid, row, col)
      m = cut_out(a, 'white' in name)
      x0, y0, x1, y1 = bbox(m)
      shirt = Image.fromarray(a).crop((x0, y0, x1, y1)).resize((W, H), Image.LANCZOS)
      alpha = Image.fromarray((m * 255).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((W, H), Image.LANCZOS)
      shirt.putalpha(alpha)
      out = np.array(shirt)
      if side == 'front': out = paint_out_tag(out, 'white' in name)
      Image.fromarray(out).save(os.path.join(OUT, f'{name}-{side}.webp'), 'WEBP', quality=80, method=6)
  grid = Image.open(os.path.join(SRC, NECKS[fit])).convert('RGB')
  for colour, (r, c) in {'white': (0, 0), 'cream': (0, 1), 'charcoal': (1, 0), 'black': (1, 1)}.items():
    x, y = c * 629, r * 629
    grid.crop((x + 2, y + 2, x + 623, y + 623)).resize((520, 520), Image.LANCZOS) \
      .save(os.path.join(OUT, f'{fit}-{colour}-neck.webp'), 'WEBP', quality=80, method=6)
