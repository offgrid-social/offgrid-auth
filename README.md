# Offgrid Auth

Standalone authentication microservice built with Fastify. It exposes a small HTTP API and reads all runtime configuration from environment variables.

## Quickstart (local)
1. `npm ci`
2. Create `.env` from `.env.example` and fill required secrets/keys.
3. `npm run build`
4. `npm start`

## Docker
- Build: `docker build -t offgrid-auth .`
- Run:
  ```bash
  docker run --rm -p 4000:4000 \
    -e PORT=4000 \
    -e DATABASE_URL=postgresql://user:pass@host:5432/db \
    -e JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" \
    -e JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----" \
    offgrid-auth
  ```

## Environment
Required variables (the service fails fast if they are missing or invalid):
- `PORT` (defaults to `4000` if unset)
- `DATABASE_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`

## API
- GET `/health` - liveness.
- GET `/challenge` - returns a signed challenge.
- POST `/verify` - verifies a signed challenge.

Example:
```bash
curl -X POST http://localhost:4000/verify \
  -H 'Content-Type: application/json' \
  -d '{"publicKey":"...","signature":"...","challenge":"..."}'
```
