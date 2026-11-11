import { defineStore } from "pinia";
import type { Template } from "shared";
import { computed, ref } from "vue";

import { defaultTestRequest } from "@/constants";
import { useSDK } from "@/plugins/sdk";
import { showResult } from "@/utils/result";

type Selection =
  { kind: "None" } | { kind: "New" } | { kind: "Existing"; id: string };

export const useTemplatesStore = defineStore("templates", () => {
  const sdk = useSDK();
  const templates = ref<Template[]>([]);
  const selection = ref<Selection>({ kind: "None" });
  const testRequest = ref(defaultTestRequest);

  const selected = computed(() => {
    const current = selection.value;
    return current.kind === "Existing"
      ? templates.value.find((t) => t.id === current.id)
      : undefined;
  });

  const setTemplates = (list: Template[]) => {
    templates.value = list;
    const current = selection.value;
    if (current.kind === "Existing" && !list.some((t) => t.id === current.id)) {
      selection.value = { kind: "None" };
    }
  };

  // The RPC response can arrive before its `templates:changed` event.
  const select = (template: Template) => {
    if (!templates.value.some((t) => t.id === template.id)) {
      templates.value = [...templates.value, template];
    }
    selection.value = { kind: "Existing", id: template.id };
  };

  const initialize = async () => {
    sdk.backend.onEvent("templates:changed", setTemplates);
    const result = await sdk.backend.getTemplates();
    if (showResult(sdk, result)) {
      setTemplates(result.value);
    }
  };

  const save = async (previousId: string | undefined, template: Template) => {
    const result = await sdk.backend.saveTemplate(previousId, template);
    if (showResult(sdk, result, `Saved ${template.id}`)) {
      select(result.value);
    }
  };

  const toggle = async (template: Template) => {
    showResult(
      sdk,
      await sdk.backend.saveTemplate(template.id, {
        ...template,
        enabled: !template.enabled,
      }),
    );
  };

  const remove = async (id: string) => {
    showResult(sdk, await sdk.backend.deleteTemplate(id), `Deleted ${id}`);
  };

  const importFiles = async (files: File[]) => {
    for (const file of files) {
      const result = await sdk.backend.importTemplate(await file.text());
      if (showResult(sdk, result, `Imported ${file.name}`)) {
        select(result.value);
      }
    }
  };

  const exportTemplate = async (id: string) => {
    const result = await sdk.backend.exportTemplate(id);
    if (!showResult(sdk, result)) {
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([result.value], { type: "text/yaml" }),
    );
    link.download = `${id}.yaml`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const reset = async () => {
    showResult(
      sdk,
      await sdk.backend.resetTemplates(),
      "Restored default templates",
    );
  };

  const clear = async () => {
    showResult(
      sdk,
      await sdk.backend.deleteAllTemplates(),
      "Deleted all templates",
    );
  };

  return {
    templates,
    selection,
    selected,
    testRequest,
    initialize,
    save,
    toggle,
    remove,
    importFiles,
    exportTemplate,
    reset,
    clear,
  };
});
