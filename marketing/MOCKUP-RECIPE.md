# Mockup Recipe: Clean Flat-Lay

How to call it: attach a garment photo and say **"mockup this, follow `marketing/MOCKUP-RECIPE.md`"**.
Claude follows every rule below without asking about style again.

---

## 1. Input (what Nico sends)
- **One real photo of the actual garment** (tee, vest, hoodie...). Phone photo is fine.
- Optional extras in the message: the garment name/colour (e.g. "red tee") and anything special ("show the back print").
- If the photo is blurry, cropped or the print is unreadable, **stop and ask for a better photo**. Don't guess.

## 2. The look (fixed, do not change unless asked)
| Rule | Setting |
|---|---|
| Mockup type | Flat-lay product shot |
| Presentation | Neatly laid flat, shot **straight top-down** |
| Background | **Pure white seamless studio backdrop** |
| Lighting | **Soft, even studio light**, only a faint natural shadow under the garment |
| Props | **None.** Garment only |
| Text/logo overlay | **None.** Clean image; the caption carries the message |

## 3. Accuracy (the most important rule)
**Pixel-faithful.** The garment must stay exactly as in the photo:
- Same colour (no shifting red to orange, white to cream)
- Same print, logo, text and placement, letter for letter
- Same cut, collar, sleeves, stitching, tags
- Only the **background, lighting and layout** change

If the AI changes the design, the image fails. Regenerate or fix with an edit (background removal plus compositing) instead.

## 4. How it gets made
1. Upload the photo to the AI tool (Higgsfield, preferred).
2. Prefer an **edit / product-shot** route that uses the photo as reference (or remove the background and composite on white) over a fresh text-to-image generation, so the garment stays real.
3. Prompt template:

   > Professional e-commerce flat-lay product photo of the exact garment in the reference image, laid neatly flat and shot straight from above, centred on a pure white seamless studio background, soft even diffused studio lighting, subtle natural shadow beneath the fabric, no props, no text, no people. Preserve the garment's exact colour, print, logo and details unchanged. Sharp, high detail, 4:5 portrait.

4. Generate **1 shot** (one best image, saves credits).
5. Upscale only if the result is soft.

## 5. Output specs (Instagram feed)
- Aspect ratio **4:5 portrait**, **1080 × 1350 px** (or a larger 4:5, like 2160 × 2700)
- Garment centred, filling about **75–85%** of the frame, even white margin all round
- JPG or PNG, sRGB
- Save to `shots/final-<garment>-<colour>.png` (e.g. `shots/final-tee-red.png`)

## 6. "Ready to post" checklist
Before handing it over, check:
- [ ] Colour matches the original photo
- [ ] Print/logo is identical and readable, no warped letters
- [ ] No extra sleeves, fingers, hangers, tags or AI artefacts
- [ ] Background is clean white, no grey patches or seams
- [ ] Exactly 4:5, garment centred
- [ ] No text, watermark or props

Then deliver: the image, its file path, and a one-line note of anything off.

## 7. Learn from the examples first
Before making anything, **open and look at the example pairs** in `marketing/mockup-examples/<style>/`.
They show what a good result looks like better than any description.

Naming: `NN-<garment>-<colour>-before.jpg` (Nico's raw photo) and `NN-<garment>-<colour>-after.png` (the approved result).
Each pair can have `NN-notes.md` saying what made it good (or, for `-rejected` files, why it failed).

How to use them:
- Match the **after** images' framing, margins, light and shadow strength.
- Study before → after: notice what changed (background, light) and what **didn't** (the garment).
- If a new result looks clearly worse than the examples, redo it before delivering.
- When Nico approves a new mockup, offer to save it as the next example pair.

## 8. Style 2: Campaign frame ("Scanning" drop card)
Use **only when Nico asks for a campaign frame / drop card**. Otherwise default to the clean flat-lay above.
Examples: `marketing/mockup-examples/campaign-frame/`.

- Starts from the clean flat-lay cutout of the garment (sections 1–6), so the garment stays pixel-faithful.
- White card, thin black border, grey corner brackets
- Top left: black pill with a blue dot + `SCANNING`. Top right: counter `NN/12`
- Lower third: blue X-ray "scan" band with a glowing scan line across the garment
- Label under the garment: `GARMENT TYPE · COLOUR / COLOUR · FRONT|BACK` (spaced caps, grey)
- Footer: blue `LIMITED DROP · <time> LEFT` left, black-letter drop mark (e.g. `11/11 FRTB`) right
- Ask Nico for: counter number, drop name and time left, if not given.
- Any motion version follows `marketing/MOTION-GRAPHICS.md`.

## 9. Changing the recipe
To use a different look one time, just say so in the message ("this time on concrete"). To change it permanently, edit this file.
