# Project rules

## Reading live websites
- To read any live web page (including the live site at https://smugpara.com), use the Firecrawl tools first (`firecrawl_scrape` for a known URL, `firecrawl_search` to find pages). Only fall back to curl or a web-fetch agent if Firecrawl fails.
- Actually try before saying a site can't be loaded. If it fails, report the real error.
- Use `https://smugpara.com` (no www). `www.smugpara.com` does not resolve until its DNS record is added.
