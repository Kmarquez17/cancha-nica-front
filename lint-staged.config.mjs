const config = {
  '*.{ts,tsx,js,jsx,mjs,mts}': ['eslint --max-warnings=0 --no-warn-ignored', 'prettier --check'],
  '*.{json,css,yml,yaml}': ['prettier --check'],
};

export default config;
