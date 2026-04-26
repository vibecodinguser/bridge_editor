import { defineConfig } from "wxt"

export default defineConfig({
  manifest: {
    name: "Bridge Editor",
    description:
      "Syncs navigation, zoom and cursor between Яндекс.НК and Nakarte.me",
    version: "1.0.0",
    permissions: [
      "tabs",
      "storage",
      "system.display",
      "declarativeNetRequest",
      "webNavigation",
    ],
    host_permissions: [
      "https://n.maps.yandex.ru/*",
      "https://nakarte.me/*",
      "https://www.nakarte.me/*",
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: "ruleset_frames",
          enabled: true,
          path: "rules.json",
        },
      ],
    },
    action: {
      default_title: "Bridge Editor: open split view",
      default_icon: {
        "16": "icons/icon16.png",
        "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      },
    },
    icons: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
  },
})
