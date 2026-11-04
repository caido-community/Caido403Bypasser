import type { Template } from "shared";
import { computed, ref } from "vue";

import type { GeneratedTemplate } from "@/ai/generate";
import { createDraftTemplate } from "@/constants";
import { useTemplatesStore } from "@/stores/templates";

export const useTemplateEditor = () => {
  const store = useTemplatesStore();
  const original = store.selected;
  const draft = ref<Template>({ ...(original ?? createDraftTemplate()) });

  const isDirty = computed(
    () =>
      original === undefined ||
      draft.value.id !== original.id ||
      draft.value.description !== original.description ||
      draft.value.modificationScript !== original.modificationScript,
  );

  const isSaving = ref(false);
  const save = async () => {
    isSaving.value = true;
    await store.save(original?.id, {
      ...draft.value,
      enabled: original?.enabled ?? true,
    });
    isSaving.value = false;
  };

  const applyGenerated = (generated: GeneratedTemplate) => {
    draft.value = { ...draft.value, ...generated };
  };

  return {
    draft,
    isNew: original === undefined,
    isDirty,
    isSaving,
    save,
    applyGenerated,
  };
};
