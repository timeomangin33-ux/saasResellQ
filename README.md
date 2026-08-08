# ResellQ — Local setup & deployment

This repository contains the ResellQ Next.js app. Below are the minimal steps to get the project running locally and prepare it for deployment (Vercel recommended).

## Quick local run
1. Copy `env.example` to `.env.local` and fill required values (see list below).
2. Install dependencies:

```bash
npm install
```

3. Start dev server (safe option that clears Next cache first):

```bash
npm run dev:clean
# or standard dev
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Required environment variables
Set these in `.env.local` before running in production:

- `DATABASE_URL` (SQLite or Postgres connection string)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

Optional but recommended:
- `OPENAI_API_KEY` (for AI features)

## Deployment (Vercel)
- Link the repository in Vercel and set the environment variables in the Vercel dashboard (production and preview).
- Build command: `npm run build`
- Output directory: (leave default)

## Notes about this repo
- `.next/`, `node_modules/`, and local `.env` files are ignored via `.gitignore`.
- If you see runtime chunk errors in dev on Windows + OneDrive, use `npm run dev:clean` which removes `.next` before starting.

If you want, I can also:
- Remove the nested `vinted scrapper` duplicate folder (I excluded it from TypeScript but it remains on disk).
- Prepare a `Dockerfile` and `docker-compose` for hosting.
- Add a small CI workflow (GitHub Actions) for lint/build checks.

