# Binaai Static Site

Two static pages using Tailwind CDN.

## Structure
- `index.html` — Landing page (Hero → Problem → Benefits → CTA). The **Join Waitlist** button links to `/intake.html`.
- `intake.html` — Waitlist intake form (idea, name, email). Netlify-compatible out of the box; swap to any backend later.
- `assets/Binaai-Concept.png` — Logo.

## Local Preview
Just open `index.html` in your browser. No build step required. If using VS Code, run `Live Server`.

## Deploy
- **Netlify**: drag-and-drop, or `netlify deploy`. Form works via `data-netlify="true"`.
- **Vercel/Render**: static hosting; you may need to connect the form to your own endpoint.

## Hooking up a custom backend later
- Point the form to `/api/waitlist` and handle POST `{ idea, name, email }`.
- Or connect to ConvertKit/HubSpot/Tally using their action URLs.
