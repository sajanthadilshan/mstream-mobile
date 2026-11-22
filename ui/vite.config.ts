import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => {
  const single = mode === "single";

  return {
    plugins: [tailwindcss(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? "dist-single" : "dist",
      emptyOutDir: true,
      ...(single && {
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
        chunkSizeWarningLimit: 100000000,
      }),
    },
  };
});