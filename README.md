# Visa Prime Backend

Confidential backend API built with [NestJS](https://nestjs.com/).

## Tech Stack

- **Runtime:** Node.js
- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** JWT (access + refresh tokens) with session tracking
- **Storage:** S3-compatible (MinIO / Cloudflare R2 / AWS S3)
- **Email:** Nodemailer (SMTP)

## Prerequisites

- Node.js >= 22
- PostgreSQL
- S3-compatible storage
- SMTP server (MailHog for development)

## Setup

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Push database schema
npx prisma db push

# Seed database
npm run seed

# Start development server
npm run start:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run lint` | Lint and fix |
| `npm run seed` | Seed database |
| `prisma db push` | Sync schema to DB |
| `prisma migrate dev` | Create and apply migration |
| `prisma studio` | Open DB browser |

## Environment Variables

Key variables — see `.env.example` for all options.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing tokens |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `FRONTEND_URL` | Frontend URL for reset password links |

## Project Structure

```
src/
├── config/          # Environment configuration
├── lib/             # Shared services (prisma, auth, s3, mail, etc.)
├── modules/         # Feature modules (auth, user, rbac, etc.)
├── guards/          # Auth & RBAC guards
├── decorators/      # Custom decorators
├── interceptors/    # Response formatting
└── middleware/      # Logging middleware
```

## License

UNLICENSED — Confidential.
