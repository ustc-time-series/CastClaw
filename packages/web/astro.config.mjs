import { defineConfig } from "astro/config"
import cfg from "./config.mjs"

export default defineConfig({
  site: cfg.github,
  server: {
    host: "0.0.0.0",
  },
  devToolbar: {
    enabled: false,
  },
})
