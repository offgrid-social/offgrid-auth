# Offgrid Auth

Production-ready authentication service (Fastify + Prisma + PostgreSQL) with access/refresh JWT, refresh rotation, audit logging, metrics, and OpenAPI docs.

## Quickstart (local)
1. `npm ci`
2. Create `.env` from `.env.example` and fill secrets/keys.
3. `npx prisma generate && npx prisma migrate deploy`
4. (Optional) `npm run seed` to create an admin user when `ADMIN_*` vars are set.
5. `npm run dev` (dev) or `npm start` after `npm run build`.

## Docker
- Build + run locally: `docker-compose up --build`
- Container uses `npm run prisma:migrate && node dist/index.js`; ensure `.env` includes DB + JWT keys.

## Environment
Key variables (see `.env.example` for defaults):
- `PORT`, `LOG_LEVEL`, `REQUEST_BODY_LIMIT`
- `DATABASE_URL`, `TEST_DATABASE_URL`
- `CORS_ORIGINS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_TIME_WINDOW`
- `ACCESS_TOKEN_EXPIRES_IN=15m`, `REFRESH_TOKEN_EXPIRES_IN=30d`
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`
- `BCRYPT_SALT_ROUNDS`
- `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (seed only)

## API
- POST `/auth/register` — create user; returns access+refresh JWT (rotation-ready).
- POST `/auth/login` — username/email + password; rate limited; returns tokens.
- POST `/auth/refresh` — rotate refresh token (hash stored, previous revoked).
- POST `/auth/logout` — revoke current refresh token; `allDevices` optional.
- GET `/auth/me` — access token required; returns profile.
- POST `/auth/verify-token` — validate access token.
- GET `/health` — liveness.
- GET `/ready` — DB readiness.
- GET `/metrics` — Prometheus metrics.
- GET `/docs` — Swagger UI; `/openapi.json` for spec.
- Example register call:
  ```bash
  curl -X POST http://localhost:3000/auth/register \
    -H 'Content-Type: application/json' \
    -d '{"username":"alice","email":"alice@example.com","password":"Password123!","deviceType":"web"}'
  ```
- Example refresh call:
  ```bash
  curl -X POST http://localhost:3000/auth/refresh \
    -H 'Content-Type: application/json' \
    -d '{"refreshToken":"<refresh JWT>","deviceType":"web"}'
  ```

## Migrations & seed
- Apply migrations: `npm run prisma:migrate`
- Generate client: `npm run prisma:generate`
- Seed admin user: `npm run seed` with `ADMIN_*` vars set.

## Testing
- Unit + integration: `npm test` (uses Vitest). Integration expects `TEST_DATABASE_URL` (default points to local Postgres). DB is truncated between runs.
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`

## Production notes
- Use strong RSA keypair for `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`; rotate keys and refresh tokens on rotation.
- Keep `REFRESH_TOKEN_EXPIRES_IN` long-lived but enforce rotation (stored as bcrypt hash with revoke/replaced markers).
- Run behind a reverse proxy/ingress that terminates TLS, forwards `X-Request-Id`, and limits request size; ensure `CORS_ORIGINS` allowlist matches clients.
- Configure structured logs to ship to your log pipeline; scrape `/metrics`; wire readiness probe to `/ready`.
- Run `prisma migrate deploy` on startup or in CI before deployment; keep DB backups; set `BCRYPT_SALT_ROUNDS` to 12+ in production.
