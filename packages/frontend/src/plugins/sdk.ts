import { inject, type InjectionKey, type Plugin } from "vue";

import { type FrontendSDK } from "@/types";

const KEY: InjectionKey<FrontendSDK> = Symbol("FrontendSDK");

export const SDKPlugin: Plugin<FrontendSDK> = (app, sdk) => {
  app.provide(KEY, sdk);
};

export const useSDK = () => {
  const sdk = inject(KEY);
  if (sdk === undefined) {
    throw new Error("SDKPlugin is not installed");
  }
  return sdk;
};
