"""Tiles screenshots into one contact sheet: python3 tools/sheet.py out.png a.png b.png ..."""
import sys
from PIL import Image

out, files = sys.argv[1], sys.argv[2:]
cols = min(5, len(files))
ims = [Image.open(f).resize((340, 480)) for f in files]
sheet = Image.new('RGB', (340 * cols, 480 * ((len(ims) + cols - 1) // cols)))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * 340, (i // cols) * 480))
sheet.save(out)
