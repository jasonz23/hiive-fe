@AGENTS.md

# Hiive Frontend

Next.js 16 + SWR + Tailwind 4. Talks to the NestJS backend at `NEXT_PUBLIC_API_URL`
(default `http://localhost:3001/api`).

## API hooks are generated from the backend OpenAPI contract

**After ANY backend change to a controller, DTO, or enum, regenerate the API layer
so the new/changed endpoints and types are available on the frontend:**

```bash
# backend must be running on :3001
npm run gen        # = swagger (export openapi.json) + gen:api (orval)
```

- `npm run swagger` — exports the live OpenAPI spec to `src/swagger/api-spec.json`.
- `npm run gen:api` — runs Orval (`orval.config.js`, CommonJS + dotenv `.env.local`) to
  regenerate the typed SWR client into `src/swagger/generated/hiive-backend/` (per-tag
  hook files + `models/`). No mutator — the generated client uses native `fetch` with
  `baseUrl` baked from `NEXT_PUBLIC_API_URL` (the `/api` suffix is stripped in the config
  because the OpenAPI paths already include `/api`).

Do **not** hand-edit anything under `src/swagger/generated/` — it is overwritten on every
`gen`. Every data hook in `src/lib/hooks.ts` is a thin typed alias that delegates to the
generated SWR hook and lifts `.data.data` to a hand-written domain type (the OpenAPI
contract has no response DTOs, so the generated body type is `void`). Add new query hooks
the same way; mutations go through `apiPost/apiPatch/apiUpload` in `src/lib/api.ts`.

If you add a nested route, declare every path parameter on the handler (e.g. both
`@Param('postId')` and `@Param('commentId')`), otherwise Orval validation fails.

## Conventions
- Pages are client components using the aliased SWR hooks from `src/lib/hooks.ts`.
- UI primitives live in `src/components/ui.tsx`; shared pieces in `src/components/`.
- Use the `@/` path alias for `src/`.
