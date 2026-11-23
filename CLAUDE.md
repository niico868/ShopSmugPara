# Project rules

## Start here: what is connected to what
Read this first in every new chat so the owner doesn't have to explain the setup again.

| Piece | Where | Notes |
|---|---|---|
| Code | GitHub `niico868/shopsmugpara`, branch `main` | Work on a branch and open a pull request. Merging to `main` deploys the live site. |
| Live site | https://smugpara.com | `www.`, `http://` and the old `shop-smug-para.neikoliaugustine.workers.dev` all redirect here (`worker/index.ts`). |
| Hosting | Cloudflare Workers, project `shop-smug-para` (`wrangler.jsonc`) | Workers Builds: build `npm run build`, deploy `npx wrangler deploy`. Build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` live in Cloudflare. Each branch gets a preview at `https://<branch-with-dashes>-shop-smug-para.neikoliaugustine.workers.dev`. |
| Database, login, photos | Supabase project ref `lagtnvbimfbllcivwyxy` | Schema in `supabase/schema.sql`. Storage bucket `media`. Google sign-in is on. The Supabase connector in Claude may be signed in to a different account (on 23 Nov 2026 it only saw an empty project, "Neikoli Devs"), so check with `list_projects` before assuming you can query the live data. |
| Demo mode | Local runs with no `VITE_SUPABASE_*` | Sample data from `src/lib/seed.ts`, admin PIN `smugpara`. Previews and screenshots use this. |

### Database changes (go-live SQL)
- Never change the live database yourself. Write a re-runnable SQL file in `supabase/YYYY-MM-DD-<topic>.sql` with a plain-English header (what it does, "Safe to re-run", ends with a `select` that shows the result).
- Also copy it to the project folder `/mnt/project-files/go-live/` with the next number (e.g. `16-wednesday-cutoff.sql`). The owner pastes it into Supabase > SQL Editor > Run after the pull request merges.
- Text that lives in the database (top banner `settings.announcement`, product names and descriptions) needs SQL; text in `src/` changes with the deploy.

### Shop facts (owner-confirmed)
- Currency TTD. Delivery 40 TTD. Every order needs a deposit or full payment by bank transfer (no cash on collection). Ready 2 to 5 work days after payment.
- Custom tee pricing by total print length: 350 up to 15in, 400 at 21in, 450 at 30in, straight line between, +5 per inch beyond, rounded to the nearest 5. Customer copy talks in print length per side (e.g. "full print 22in long"), never square inches.
- Weekly drops ("cargo"): a new cargo lands every Wednesday at noon; each drop leaves the dock Wednesday 11:59pm; the run ends Christmas Eve (`src/lib/dropSchedule.ts`). Times are Trinidad time (UTC-4).
- Archived drops (sale ended Nov to Dec 2026) get caution tape across their photos (`src/components/CautionTape.tsx`).
- Character Tees (nav label "SPxGTA", page `/character`): hoodies are switched off with `HOODIES_ON` in `src/lib/character.ts` (owner plans to re-add them). Apart from the nav label the owner chose, page copy never says GTA, "game" or Vice City.
- Contacts: WhatsApp https://wa.me/message/AOEKBZDXW2VOE1, phone 1-868-338-1386, community group https://chat.whatsapp.com/JtNEjq0gi4WHlFLU5mePNP. Tagline "Faith Rewards The Brave".

### How the owner likes to work
- Show previews: screenshots at phone and desktop width saved in `/mnt/project-files/<topic>-preview/`.
- Simple explanations with clickable links, and the next steps list described below.

## Reading live websites
- To read any live web page (including the live site at https://smugpara.com), use the Firecrawl tools first (`firecrawl_scrape` for a known URL, `firecrawl_search` to find pages). Only fall back to curl or a web-fetch agent if Firecrawl fails.
- Actually try before saying a site can't be loaded. If it fails, report the real error.
- The main address is `https://smugpara.com`; `www.smugpara.com` redirects to it.

## Campaign videos
- Follow `marketing/MOTION-GRAPHICS.md` for every motion graphic: slow eased luxury motion, no bounce, shake or flashes.

## Replies
- Whenever the owner has something to click, run or open, follow `.claude/skills/next-steps-links/SKILL.md`: a numbered **Your next steps** list of clickable links at the very top of the reply. Never say "sent earlier".

## Product mockups
- When the owner attaches a garment photo and asks for a mockup, follow `marketing/MOCKUP-RECIPE.md` (white studio flat-lay, pixel-faithful, Instagram 4:5).
