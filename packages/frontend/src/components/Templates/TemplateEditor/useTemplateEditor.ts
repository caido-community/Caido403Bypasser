import type { Template } from "shared";
import { computed, ref } from "vue";

import type { GeneratedTemplate } from "@/ai/generate";
import { createDraftTemplate } from "@/constants";
import { useTemplatesStore } from "@/stores/templates";

export const useTemplateEditor = () => {
  const store = useTemplatesStore();
  const isNew = store.selected === undefined;
  const draft = ref<Template>({ ...(store.selected ?? createDraftTemplate()) });

  const isDirty = computed(() => {
    const saved = store.selected;
    return (
      saved === undefined ||
      draft.value.id !== saved.id ||
      draft.value.description !== saved.description ||
      draft.value.modificationScript !== saved.modificationScript
    );
  });

  const isSaving = ref(false);
  const save = async () => {
    const saved = store.selected;
    isSaving.value = true;
    try {
      await store.save(saved?.id, {
        ...draft.value,
        enabled: saved?.enabled ?? true,
      });
    } finally {
      isSaving.value = false;
    }
  };

  const applyGenerated = (generated: GeneratedTemplate) => {
    draft.value = { ...draft.value, ...generated };
  };

  return {
    draft,
    isNew,
    isDirty,
    isSaving,
    save,
    applyGenerated,
  };
};
