import { readFileSync } from "node:fs"
import solidPlugin from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"

const preload = fileURLToPath(new URL("./public/theme-preload.js", import.meta.url))

/**
 * @type {import("vite").PluginOption}
 */
export default [
  {
    name: "castclaw-web:config",
    config() {
      return {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
          },
        },
        worker: {
          format: "es",
        },
      }
    },
  },
  {
    name: "castclaw-web:theme-preload",
    transformIndexHtml(html) {
      return html.replace(
        '<script id="castclaw-theme-preload-script" src="/theme-preload.js"></script>',
        `<script id="castclaw-theme-preload-script">${readFileSync(preload, "utf8")}</script>`,
      )
    },
  },
  tailwindcss(),
  solidPlugin(),
]
