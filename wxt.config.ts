import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Pinmark",
    short_name: "Pinmark",
    version: "1.0.0",
    description: "A minimal yet powerful bookmark manager for Chrome — organize, browse, search, and clean up your bookmarks with ease.",
    permissions: ["bookmarks", "tabs"],
    action: {},
    icons: {
      "16": "/icon/icon16.png",
      "48": "/icon/icon48.png",
      "128": "/icon/icon128.png",
    },
    homepage_url: "https://pinmark.01mvp.com",
  },
});
