# Community Exchange Hub

Build a production-ready full-stack app called BarterGrid: an AI-powered barter marketplace for resilience and emergency community exchange during financial collapse. Use Supabase Auth, PostgreSQL, and a clean mobile-first UI with Tailwind + shadcn/ui.

Core experience:
- Landing page that explains the app as a barter and mutual-aid exchange network for items, tools, skills, food, services, and equipment.
- Authenticated marketplace where users can create listings with title, description, category, condition, photos, estimated value, location, and whether they are offering, seeking, or both.
- Search and filters for category, distance, condition, and availability.
- AI matching panel that suggests possible fair trades based on estimated value, category compatibility, and user preferences.
- Trade proposal flow where one user can propose a barter, counteroffer, accept, reject, or mark as completed.
- Reputation system with ratings, verified trades, and trust badges.
- Messaging thread for trade negotiation.
- Safety and resilience features: emergency-mode banner, scam warnings, prohibited-item reporting, and a clear disclaimer that the app supports lawful barter and community exchange only.
- Admin dashboard for flagged listings, user reports, and moderation.

Data model should include users, profiles, listings, listing_photos, trade_proposals, messages, ratings, reports, and saved_matches.

Use thoughtful empty states, loading states, and responsive design. Seed the app with believable demo data so the experience feels complete immediately. Prioritize a polished consumer marketplace feel with a trustworthy, resilient identity.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://barter-grid.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b250665a-5700-471a-bb42-2037c4f5096d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
