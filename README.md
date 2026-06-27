# SideQuest App

SideQuest is a Next.js app deployed on Vercel with PostgreSQL hosted on Railway.

## Architecture

- App hosting: Vercel
- Database: Railway PostgreSQL
- Auth: Clerk
- ORM: Prisma
- Images: Unsplash API

## Local Setup

Create `.env.local` from `.env.local.example` and fill the values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `UNSPLASH_ACCESS_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-2.0-flash-lite`)
- `ADMIN_EMAILS` (optional, defaults to `hernanamaizp@gmail.com`)

Install and run:

```bash
npm install
npm run dev
```

## Database

Prisma uses `DATABASE_URL`. Because the app is hosted on Vercel and the database is on Railway, use Railway's public database URL in Vercel.

Create/apply migrations locally:

```bash
npm run prisma:migrate:dev
```

Apply migrations to production:

```bash
npm run prisma:migrate:deploy
```

## Vercel

Set these environment variables in Vercel:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `UNSPLASH_ACCESS_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

Build command:

```bash
npm run build
```

The build runs `prisma generate` before `next build`.

## Railway

Create a PostgreSQL service in Railway and copy its public `DATABASE_URL`.

Use that value in:

- local `.env.local`
- Vercel project environment variables
- any machine or CI job that runs `npm run prisma:migrate:deploy`

## Launch Checklist

- Create the Railway PostgreSQL service.
- Copy Railway public `DATABASE_URL` into Vercel.
- Create/configure the Clerk production app.
- Add the Vercel production domain in Clerk.
- Add all env vars in Vercel.
- Run `npm run prisma:migrate:deploy` against Railway.
- Deploy on Vercel.
- Test login, complete mission, dashboard, and Unsplash images.
- Visit `/admin`, generate sidequest suggestions, approve one, and confirm it appears in the daily pool.

## Scripts

- `npm run dev` - start local development.
- `npm run build` - generate Prisma client and build Next.js.
- `npm run start` - serve the production build.
- `npm run lint` - run ESLint.
- `npm run prisma:generate` - generate Prisma client.
- `npm run prisma:migrate:dev` - create and apply migrations.
- `npm run prisma:migrate:deploy` - apply migrations in production.
- `npm run prisma:studio` - open Prisma Studio.
