import { create } from "zustand";

import { type FrontendSDK } from "@/types/types";
import { getModelGroups, type ModelGroup } from "@/utils/ai";

export const useModelsStore = create<{ modelGroups: ModelGroup[] }>(() => ({
  modelGroups: [],
}));

export const initializeModels = (sdk: FrontendSDK) => {
  const refresh = () =>
    useModelsStore.setState({ modelGroups: getModelGroups(sdk) });
  refresh();
  sdk.ai.onUpstreamModelsChange(refresh);
};
