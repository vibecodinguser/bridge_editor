import { defineConfig } from "wxt"

const icons = {
  "16": "icons/icon16.png",
  "32": "icons/icon32.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png",
}

export default defineConfig({
  manifest: {
    name: "Bridge Editor",
    description:
      "Bridge Editor for Яндекс.НК and Nakarte.me",
    version: "1.0.1",
    permissions: [
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
      default_icon: icons,
    },
    icons,
  },
})
