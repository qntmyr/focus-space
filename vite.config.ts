import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        landing: new URL("index.html", import.meta.url).pathname,
        app: new URL("app/index.html", import.meta.url).pathname,
      },
    },
  },
});
