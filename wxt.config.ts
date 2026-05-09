import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Pinmark",
    short_name: "Pinmark",
    version: "0.1.0",
    permissions: ["bookmarks", "tabs"],
    action: {},
    icons: {
      "16": "/icon/icon.svg",
      "48": "/icon/icon.svg",
      "128": "/icon/icon.svg",
    },
  },
});
