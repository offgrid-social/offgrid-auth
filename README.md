# OFFGRID-AUTH

<p align="center">
  <em>Production-ready authentication for the OFFGRID ecosystem.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/offgrid-social/offgrid-auth?style=flat-square" />
  <img src="https://img.shields.io/github/languages/top/offgrid-social/offgrid-auth?style=flat-square" />
  <img src="https://img.shields.io/github/languages/count/offgrid-social/offgrid-auth?style=flat-square" />
  <img src="https://img.shields.io/github/license/offgrid-social/offgrid-auth?style=flat-square" />
  <img src="https://img.shields.io/badge/Ecosystem-OFFGRID-black?style=flat-square" />
</p>

<p align="center">
  Built with
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql" />
</p>

---

## Overview

**offgrid-auth** is the authentication service for OFFGRID.

It provides:
- secure user authentication
- anonymous and account-based sessions
- access & refresh JWT with rotation
- audit logging and metrics
- OpenAPI documentation

This service is designed to be **stateless, auditable, and production-ready**.

---

## Core features

- Access & refresh JWT
- Refresh token rotation (hash stored, old tokens revoked)
- Rate-limited login endpoints
- Device-aware sessions
- Audit logging
- Prometheus metrics
- OpenAPI / Swagger documentation
- PostgreSQL-backed persistence

---

## Getting started (local)

### Requirements

- Node.js (LTS)
- npm
- PostgreSQL
- Docker (optional)

---

### Installation

Install dependencies:

`npm ci`

Create environment file:

`cp .env.example .env`

Fill in required secrets and database connection.

Generate Prisma client and apply migrations:

`npx prisma generate`  
`npx prisma migrate deploy`

Optional: seed an admin user (requires `ADMIN_*` env vars):

`npm run seed`

Start the service:

- Development: `npm run dev`
- Production: `npm run build` → `npm start`

---

## Docker

Build and run locally with Docker Compose:

`docker-compose up --build`

The container:
- runs database migrations on startup
- starts the compiled server via `node dist/index.js`

Ensure `.env` includes database credentials and JWT keys.

---

## Environment variables

Important variables (see `.env.example` for full list):

- `PORT`, `LOG_LEVEL`, `REQUEST_BODY_LIMIT`
- `DATABASE_URL`, `TEST_DATABASE_URL`
- `CORS_ORIGINS`
- `RATE_LIMIT_MAX`, `RATE_LIMIT_TIME_WINDOW`
- `ACCESS_TOKEN_EXPIRES_IN` (default: 15m)
- `REFRESH_TOKEN_EXPIRES_IN` (default: 30d)
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`
- `JWT_ISSUER`, `JWT_AUDIENCE`
- `BCRYPT_SALT_ROUNDS`
- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (seed only)

---

## API overview

Authentication endpoints:

- `POST /auth/register`  
  Create a user and return access + refresh tokens.

- `POST /auth/login`  
  Login with username/email and password (rate limited).

- `POST /auth/refresh`  
  Rotate refresh token and issue new access token.

- `POST /auth/logout`  
  Revoke refresh token (optionally all devices).

- `GET /auth/me`  
  Return current user profile (access token required).

- `POST /auth/verify-token`  
  Validate an access token.

System endpoints:

- `GET /health` — liveness check  
- `GET /ready` — database readiness  
- `GET /metrics` — Prometheus metrics  
- `GET /docs` — Swagger UI  
- `GET /openapi.json` — OpenAPI specification

---

## Testing

- Unit and integration tests: `npm test`
- Uses **Vitest**
- Integration tests require `TEST_DATABASE_URL`
- Database is truncated between test runs

Additional checks:

- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

---

## Production notes

- Use a strong RSA keypair for JWT signing
- Rotate refresh tokens on every refresh
- Store refresh tokens as bcrypt hashes
- Run behind a reverse proxy that terminates TLS
- Forward request IDs and limit request body size
- Scrape `/metrics` and wire `/ready` into readiness probes
- Run Prisma migrations before or on startup
- Keep regular database backups

---

## OFFGRID Ecosystem

- **offgrid-core**  
  https://github.com/offgrid-social/offgrid-core

- **offgrid-auth**  
  https://github.com/offgrid-social/offgrid-auth

- **offgrid-api**  
  https://github.com/offgrid-social/offgrid-api

- **offgrid-node**  
  https://github.com/offgrid-social/offgrid-node

- **offgrid-frontend**  
  https://github.com/offgrid-social/offgrid-frontend

- **offgrid-cli**  
  https://github.com/offgrid-social/offgrid-cli

- **offgrid-registry**  
  https://github.com/offgrid-social/offgrid-registry

- **offgrid-docs**  
  https://github.com/offgrid-social/offgrid-docs

- **offgrid-manifest**  
  https://github.com/offgrid-social/offgrid-manifest

- **offgrid-governance**  
  https://github.com/offgrid-social/offgrid-governance

---

## Privacy

OFFGRID intentionally avoids:
- analytics SDKs
- fingerprinting
- user profiling
- algorithmic ranking

If something exists, it is visible in the code.

---

## License

Licensed under **AGPL-3.0**.  
See `LICENSE` for details.

---

*Calm over clicks · Humans over metrics · Chronology over control*
