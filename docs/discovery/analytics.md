# Discovery: analytics for the site

**Date:** 2026-10-20
**Status:** Deferred by the owner's representative ("go without analytics for now"). Revisit once the site is live and the Instagram bio link points at it.

## Goal

Answer two questions for the owner without any technical work on their side:

1. How many people visit, and where do they come from (Instagram bio link, Google search, direct)?
2. How many of those visits turn into a WhatsApp conversation, and from which button: the floating button, the per-product "Pedir orçamento", or the cart checkout?

Nothing else. No funnels, no heatmaps, no user identification. The audience is Brazilian consumers on phones; the site must not need a cookie banner.

## Candidates evaluated

| Option | Cost | Setup | Custom events (WhatsApp clicks) | Privacy / banner | Upkeep |
|---|---|---|---|---|---|
| **Umami Cloud, free tier** (cloud.umami.is) | Free up to ~10k events/month (fits a one-person studio for a long time) | Owner creates an account, adds the site, copies a website id; one `<script>` tag | Yes: `data-umami-event="whatsapp-click" data-umami-event-source="fab|product|cart"` attributes on the three `<a>`/buttons, no JS needed | Cookieless, GDPR/LGPD-friendly, no banner | None |
| **Plausible** (plausible.io) | Paid, from about €9/month | Same shape as Umami | Yes (`plausible('WhatsApp', {props})` or `class="plausible-event-name=..."`) | Cookieless, no banner | None |
| **Self-hosted Umami on the VPS** | Free, but needs PostgreSQL or MySQL on the same 4 GB box | Docker or a second Node process + database, reverse-proxied by Caddy | Yes | Cookieless | Owner's VPS now runs a database and must be updated; backup scope grows |
| **Cloudflare Web Analytics** | Free (we plan to put the domain behind Cloudflare anyway) | One toggle in the dashboard, or a `<script>` tag | No custom events worth the name; only page views and Core Web Vitals | Cookieless | None |
| Google Analytics 4 | Free | Account + tag | Yes | Cookies, consent banner expected under LGPD, heavier script | None |

## Recommendation (when the time comes)

**Umami Cloud free tier.** Reasons: free, no cookie banner, custom events through plain HTML attributes, and the referrer report already separates `instagram.com` / `l.instagram.com` from Google. If the free tier is ever outgrown, Plausible is the drop-in paid equivalent.

### How it would be wired (not done)

- `client/index.html`: a `<script defer src="https://cloud.umami.is/script.js" data-website-id="%VITE_UMAMI_WEBSITE_ID%">` emitted **only** when `VITE_UMAMI_WEBSITE_ID` is set at build time (Vite `import.meta.env` + a tiny conditional in `main.tsx`, or an `index.html` transform), so the site works with no analytics configured.
- Events: add `data-umami-event="whatsapp-click"` and `data-umami-event-source` to the floating button (`WhatsAppFab`), the per-product button (`QuoteButton`) and the cart checkout button (`CartWidget`). For the two buttons that call `window.open`, the attribute still fires because Umami listens to clicks on the element.
- Product detail pages (Batch 2) give page-view counts per piece for free once they exist.
- `.env.example` documents `VITE_UMAMI_WEBSITE_ID=` as optional; `DEPLOY.md` gets a one-paragraph step 10 "Analytics (optional)".

### What the owner has to do

1. Create a free account at cloud.umami.is with their email.
2. "Add website" with the domain; copy the **Website ID**.
3. Give the id to whoever deploys; it goes into `.env` before `npm run build`.
4. Read the dashboard: *Referrers* for where visitors come from, *Events* for WhatsApp clicks by source.

## Why it was deferred

The site is not live yet and the owner has not created any third-party accounts; the representative preferred to launch first. Nothing in the codebase depends on this decision, so it can be added in an afternoon later.
