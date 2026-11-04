import { runScript } from "shared";
import { computed, ref } from "vue";

import { useTemplatesStore } from "@/stores/templates";
import { toCrlf } from "@/utils/request";

type Output =
  | { kind: "Idle" }
  | { kind: "Ok"; requests: string[] }
  | { kind: "Error"; error: string };

export const useTestPanel = (script: () => string) => {
  const store = useTemplatesStore();
  const output = ref<Output>({ kind: "Idle" });
  const index = ref(0);

  const run = () => {
    const result = runScript(toCrlf(store.testRequest), script());
    output.value =
      result.kind === "Ok"
        ? { kind: "Ok", requests: result.value }
        : { kind: "Error", error: result.error };
    index.value = 0;
  };

  const requests = computed(() =>
    output.value.kind === "Ok" ? output.value.requests : [],
  );
  const current = computed(() => requests.value[index.value]);

  return { output, index, requests, current, run };
};
