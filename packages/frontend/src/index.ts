import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";

import { getScanSources } from "./commands/scan";
import { SDKPlugin } from "./plugins/sdk";
import { useScansStore } from "./stores/scans";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

const PATH = "/403bypasser";
const SCAN_COMMAND = "bypasser:scan";

export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);
  app.use(createPinia());
  app.use(PrimeVue, { unstyled: true, pt: Classic });
  app.use(ConfirmationService);
  app.directive("tooltip", Tooltip);
  app.use(SDKPlugin, sdk);

  const root = document.createElement("div");
  Object.assign(root.style, { height: "100%", width: "100%" });
  root.id = "plugin--bypasser";
  app.mount(root);

  let unseenScans = 0;
  const sidebarItem = sdk.sidebar.registerItem("403 Bypasser", PATH, {
    icon: "fas fa-unlock",
  });
  sdk.navigation.addPage(PATH, {
    body: root,
    onEnter: () => {
      unseenScans = 0;
      sidebarItem.setCount(0);
    },
  });

  const scansStore = useScansStore();
  sdk.commands.register(SCAN_COMMAND, {
    name: "403Bypasser: Scan",
    group: "403Bypasser",
    run: async (context) => {
      const sources = getScanSources(context, () => sdk.window.getContext());
      if (sources.length === 0) {
        sdk.window.showToast("Select a request to scan", {
          variant: "warning",
        });
        return;
      }

      let started = 0;
      for (const source of sources) {
        if (await scansStore.start(source)) {
          started += 1;
        }
      }
      if (started === 0) {
        return;
      }

      sdk.window.showToast(
        `Started ${started} scan${started === 1 ? "" : "s"}`,
        { variant: "success" },
      );
      if (location.hash !== `#${PATH}`) {
        unseenScans += started;
        sidebarItem.setCount(unseenScans);
      }
    },
  });
  sdk.commandPalette.register(SCAN_COMMAND);
  for (const type of ["Request", "RequestRow", "Response"] as const) {
    sdk.menu.registerItem({
      type,
      commandId: SCAN_COMMAND,
      leadingIcon: "fas fa-unlock",
    });
  }
};
