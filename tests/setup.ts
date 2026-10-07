import '@testing-library/jest-dom/vitest';

// env.ts valida process.env al importarse; los tests parten de un entorno válido.
process.env.API_URL ??= 'http://localhost:3000';
