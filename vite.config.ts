import { defineConfig } from "vite";

// Relative base so the built site works under a subpath
// (e.g. GitHub Pages project site: https://<user>.github.io/<repo>/).
export default defineConfig({
  base: "./",
});
