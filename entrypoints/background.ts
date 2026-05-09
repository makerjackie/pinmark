import { logger } from "../src/lib/logger";

export default defineBackground(() => {
  const { version } = chrome.runtime.getManifest();
  logger.info(`Pinmark v${version} background started`);

  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
      url: "/manager.html",
    });
  });
});
