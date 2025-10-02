### The Midnight Coven — Interactive Bar Menu

Halloween-themed, interactive nightclub menu built with Next.js 15 (App Router) and Tailwind CSS 4. Features category tabs, search and filters, Strong/Medium/Light strength sorting, favorites with localStorage, neon primary CTA, and subtle spooky ambience.

### Features

- Neon primary call-to-action only (Order at the Bar)
- Category tabs (All, Signature Cocktails, Classics, Shots, Zero Proof, Seasonal Bites)
- Search potions, bites, spirits by name/description/tags
- Strength filter (All, Light, Medium, Strong)
- Alcoholic-only and Favorites-only toggles
- Local favorites persistence (localStorage)
- Static SVG icons (pumpkin, skull) — no external image APIs required

### Tech

- Next.js 15 (App Router, React 19)
- Tailwind CSS 4 (@tailwindcss/postcss)
- TypeScript

### Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

### Project Structure

- `src/app/page.tsx` — main interactive menu page
- `src/components/*` — UI components (NeonButton, FilterBar, MenuItemCard)
- `src/data/menu.ts` — seed menu data
- `src/types/menu.ts` — types
- `src/hooks/useLocalStorage.ts` — favorites persistence
- `src/app/globals.css` — global Halloween theme and effects

### Deploy to Vercel (Git Integration — Recommended)

1. Repo: `https://github.com/huntrbrooks/halloween-bar-menu` is ready.
2. In Vercel Dashboard, click New Project → Import Git Repository → select `halloween-bar-menu`.
3. Framework preset: Next.js. Build and output defaults are auto-detected.
4. Deploy. Every commit to `main` will auto-deploy.

### Deploy to Vercel (CLI — Optional)

If you prefer CLI and have a Vercel token:

```bash
# Create a token in Vercel Account Settings → Tokens
export VERCEL_TOKEN=YOUR_TOKEN
vercel link --yes --token "$VERCEL_TOKEN"
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

If a device login prompt appears, visit the shown URL, complete auth, then rerun deploy.

### Accessibility & Notes

- Interactive controls have accessible labels and clear focus styles
- Favorites are local to the device (no accounts or servers)
- No API keys stored or required

### License

Apache-2.0 (or update as desired)
