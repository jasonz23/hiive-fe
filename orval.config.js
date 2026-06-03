require('dotenv').config({ path: '.env.local' });

/**
 * Generates a typed client + SWR hooks from the backend OpenAPI contract.
 * Workflow: `npm run gen` (exports the spec from the running backend, then generates).
 *
 * Hiive's NestJS app mounts every route under the `/api` global prefix, so the
 * generated paths already contain `/api` — we strip it from the baseUrl to avoid
 * a `/api/api` double prefix.
 */
module.exports = {
  hiive_backend: {
    input: './src/swagger/api-spec.json',
    output: {
      mode: 'tags-split',
      workspace: 'src/swagger/generated/hiive-backend',
      target: './',
      schemas: './models',
      client: 'swr',
      mock: false,
      baseUrl: (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, ''),
      override: {
        swr: {
          useInfinite: false,
        },
        useNativeEnums: true,
      },
      hooks: {
        afterAllFilesWrite: 'prettier --write',
      },
    },
  },
};
