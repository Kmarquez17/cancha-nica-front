import { defineConfig } from 'orval';

export default defineConfig({
  canchaNica: {
    input: './docs/contrato/openapi.snapshot.json', // snapshot del backend
    output: {
      target: './src/shared/api/generated/endpoints.ts',
      schemas: './src/shared/api/generated/models',
      client: 'react-query',
      mode: 'tags-split',
      override: {
        mutator: { path: './src/shared/api/mutator.ts', name: 'apiFetch' },
        // El mutator devuelve el cuerpo JSON directo (no el envelope {data,status,headers}).
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});
