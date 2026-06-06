# AVForge — AV Engineer Toolkit

All-in-one engineering toolkit for AV professionals. Built with Next.js 14 and Tailwind CSS.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
avforge-next/
├── app/
│   ├── layout.tsx          # Root layout (fonts, header, AI widget)
│   ├── page.tsx            # Home page
│   ├── globals.css         # Tailwind + custom styles
│   ├── calculators/
│   │   └── page.tsx        # Calculator listing
│   ├── tools/
│   │   └── page.tsx        # Design tools listing
│   └── reference/
│       └── page.tsx        # Reference library listing
├── components/
│   ├── Header.tsx          # Top navigation bar
│   ├── AIChatWidget.tsx    # Floating AI chat button + panel
│   ├── AIAssistant.tsx     # Chat placeholder (coming soon)
│   └── Icons.tsx           # SVG icon components
├── public/
│   ├── hero-room.png       # Room Designer screenshot
│   └── hero-signal.png     # Signal Flow screenshot
├── tailwind.config.ts      # Custom AVForge color palette
├── package.json
└── tsconfig.json
```

## Migration Status

### Phase 1 — Scaffold & Layout ✅
- [x] Next.js 14 App Router setup
- [x] Tailwind config with exact AVForge color palette
- [x] Header component (logo left, nav right)
- [x] Floating AI chat widget (icon + panel, coming soon placeholder)
- [x] Home page with hero, stats, section cards, signal flow preview, quick start
- [x] Placeholder pages for Calculators, Design Tools, Reference

### Phase 2 — Calculators (TODO)
- [ ] CalcSection shared component (two-column input/results layout)
- [ ] Display Sizing (DISCAS)
- [ ] Screen Size, Camera FOV, Throw Ratio, LED Pixel Pitch
- [ ] Speaker Coverage (EPR), PAG / NAG, 70V Tap
- [ ] Conduit Fill, PoE Budget, Dante Bandwidth, Rack Heat Load
- [ ] Unit Converter

### Phase 3 — Design Tools (TODO)
- [ ] Rack Unit Planner, Signal Flow Builder, Room Designer
- [ ] EDID & HDCP Strategy, Cable Pull Sheet, RFI Management

### Phase 4 — Reference & AI (TODO)
- [ ] Standards Library, Platform Comparison, PoE Device Database
- [ ] AI Assistant with Anthropic API (server-side route)

## Deploy

```bash
npx vercel
```
