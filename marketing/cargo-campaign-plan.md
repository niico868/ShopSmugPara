# "Board the Cargo": 12-frame campaign build plan

We knock this down like the app: one step at a time, each ends with something you approve.
**Me** = Claude does it. **You** = you do it. Tick boxes as we go.

Output per frame: a vertical video clip (1080x1920) for the Reel/Stories, and a still (1080x1350) for the carousel.
Tools: Playwright (site recordings), Remotion (motion graphics), ffmpeg + MoviePy (editing), ImageMagick/Pillow (slides).

---

**Mobile-first:** every site recording is made on an emulated phone (iPhone-size screen), shown inside a phone frame. Desktop only appears if a frame needs contrast.

## Phase 0: Setup (blocks everything)
- [x] **You** brand kit: use what's in the repo
- [x] **You** voiceover: no, text-only
- [x] **You** frame-12 offer, both, earned: create an account → points; create an account **and** complete a custom → discount code for that product only. (The product-locked code doesn't exist on the site yet, see Phase 6.)
- [x] **You** recording: local copy with sample data. I design the custom tees myself in the designer.
- [x] **Me** install Remotion + MoviePy (done)
- [x] **Me** build the brand motion kit: type styles, coral flash, scan-line glitch, stamp, callout label, end card. Render a 5s style reel.
- [x] **You** approve the style reel. **Gate: nothing else gets made until this looks right.**

## Phase 1: Capability test (2 frames)
- [x] **Me** frame 1 HOOK: record the X-ray hero, add glitch + logo stamp
- [x] **Me** frame 4 SCARCITY: record the product countdown, add flip clock + "LEAVES THE DOCK" stamp
- [ ] **You** review both on your phone. Notes on speed, text size, vibe.
- [ ] **Me** revise. This sets the template for the other 10.

## Phase 2: Site frames (me, recordings + motion)
- [x] **Me** 2 THE WORLD: home scroll, typed brand codes, T&T route-line map
- [x] **Me** 3 THE DROP: X-ray front/back cycle, freeze-frames with garment labels
- [x] **Me** 5 THE TWIST: tap "Design your own", split screen drop vs blank
- [ ] **Me** 6 CREATE: designer, name typed, colour change, front/back flip (phone-sized)
- [ ] **Me** 7 AI WOW: "Create with AI" prompt → art on tee
- [ ] **Me** 8 SQUAD: team panel rows, tees multiplying into a grid
- [ ] **Me** 9 TRUST: order tracking timeline lighting up, "5 work days" badge
- [ ] **Me** 10 PLAY: pirogue crossing + catch, points pop, Contraband coin spin
- [ ] **Me** 11 BELONG: badge ladder Lookout → Navigator → Smuggler's World
- [ ] **Me** 12 CTA: end card, countdown, smugpara.com, offer
- [ ] **You** review in batches of 3. I revise.

## Phase 3: Human touch (you, optional but recommended)
- [ ] **You** 1-2 phone clips: hand holding phone on the X-ray hero (for the hook), thumb tapping in the designer. 5-10s each, vertical, good light.
- [ ] **Me** cut them into frames 1 and 6.

## Phase 4: Assembly
- [ ] **Me** Reel (~35s): all 12 frames, cuts, burned captions, end card held 3s. No music (you add it).
- [ ] **Me** carousel: 12 stills at 1080x1350 (video slides for 3, 6, 7, 10).
- [ ] **Me** Story set: 4-5 countdown Stories for Fri-Sun.
- [ ] **Me** cover image + 3 thumbnail options.
- [ ] **You** final approval.

## Phase 5: Words
- [ ] **Me** carousel caption, Reel caption, hashtags, alt text.
- [ ] **Me** comment-to-DM reply text ("Comment CARGO / your name").
- [ ] **You** set up the DM auto-reply (Instagram automations or ManyChat).

## Phase 6: Site code
- [x] **Me** "Make a custom → get a code": after a custom order completes, the account gets a one-time discount code locked to that product. Shown on the order page + account. Test, open a PR. **Needed before posting**, since frame 12 promises it.

### Name link (optional)
- [ ] **Me** build `smugpara.com/name/<Name>` + `/name` box, opens designer with the name on the drop tee. Test, open a PR.
- [ ] **You** review + merge. Then frames 10/12 and the DM can use it.

## Phase 7: Post
- [ ] **You** carousel Mon/Tue, Reel Wed 12pm (cargo lands), Stories Fri-Sun. Add trending audio in the Instagram app.
- [ ] **Me** after 3-4 days, you paste the numbers (reach, saves, link taps, site orders), I write what worked and what to change for next cargo.

---

## What I need from you, all in one place
1. Brand kit OK (or "use what's in the repo")
2. Voiceover yes/no
3. Frame-12 offer + code
4. Demo account login **or** OK to record a local copy
5. Your phone clips (Phase 3, optional)
6. Review on your phone at each gate

## Claude in Chrome: where it helps
Claude in Chrome is a browser extension that lets Claude act in *your* browser, logged in as you. Useful for:
- Recording flows that need **your** real account (designer, rewards, order tracking with a real code).
- Setting up the **Instagram DM automation** and scheduling posts in Meta Business Suite.
- Checking the posted carousel looks right on the live feed.
Not needed for Phases 0-5: I can record the public site and a local copy here. Install it at claude.ai/chrome (Chrome or Edge) when we reach Phase 5-7.

## Limits, honestly
- I can't add Instagram trending audio or post for you from here.
- My recordings are browser-made, so a mouse cursor or synthetic taps rather than a real thumb. That's why Phase 3 exists.
- Rendering is quick; the cost is your Claude usage on revisions. Approving at the gates keeps that down.
- This workspace is temporary: finished videos get saved into the repo's `marketing/` folder (or sent to you) at every phase so nothing is lost.
