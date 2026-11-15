---
name: next-steps-links
description: Use at the end of every reply that leaves the owner something to do (run SQL in Supabase, merge a pull request, change a setting in admin, review a video, open a page). Puts every step they must click on at the very top of the reply as a clickable link, in order.
---

# Next steps as links, first

The owner works from their phone. Anything they must click, open or run goes at the **top** of the reply,
before any explanation, as a numbered list of **clickable links**. Never write "sent earlier", "see above"
or a bare file name: always give the link again.

## Format

Start the reply with:

```
**Your next steps**
1. [Run the promo SQL in Supabase](https://supabase.com/dashboard/project/lagtnvbimfbllcivwyxy/sql/new): paste [2026-11-16-promo-auto-offer.sql](<GitHub link to the file>), then Run
2. [Merge pull request #52](https://github.com/niico868/ShopSmugPara/pull/52)
3. [Admin → Rewards → Promo codes](https://smugpara.com/admin/rewards): tap "Offer to next buyer" on FIRST1
```

Then the explanation.

## Links to use

| Step | Link |
|---|---|
| Supabase SQL editor (new query) | https://supabase.com/dashboard/project/lagtnvbimfbllcivwyxy/sql/new |
| A SQL or other repo file | `https://github.com/niico868/ShopSmugPara/blob/<branch>/<path>` (branch where it lives now; `main` once merged). Also attach the file itself with SendUserFile. |
| A pull request | `https://github.com/niico868/ShopSmugPara/pull/<number>` |
| Admin pages | https://smugpara.com/admin, `/admin/orders`, `/admin/products`, `/admin/rewards`, `/admin/settings`, `/admin/contraband` |
| Live site pages | `https://smugpara.com/<path>` |
| Cloudflare Worker (domains, deploys) | https://dash.cloudflare.com → Workers & Pages → shop-smug-para |
| Claude connectors | https://claude.ai/settings/connectors |

## Rules
- **Check before you link a pull request.** Run `git fetch origin main && git log --oneline origin/main..HEAD`.
  If the PR you were going to link is already merged and there are commits after it, they are NOT live:
  open a new PR for them and link that one. Never point to a merged or closed PR as a step.
- Check SQL steps the same way when you can (e.g. call the new function through the site's public API) and drop them once done.
- Order the steps exactly as they must be done, and say when order matters (e.g. SQL before merge).
- Repeat still-pending steps from earlier replies until the owner says they're done.
- One action per line; the link text says what it does ("Merge pull request #52", not "here").
- If there is nothing for the owner to do, leave the section out.
