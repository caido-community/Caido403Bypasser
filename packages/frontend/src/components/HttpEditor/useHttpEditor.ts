import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useIntersectionObserver } from "@vueuse/core";
import { type Ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";

type Options = {
  root: Ref<HTMLElement | undefined>;
  kind: () => "request" | "response";
  content: () => string;
  onChange: (content: string) => void;
};

export const useHttpEditor = ({ root, kind, content, onChange }: Options) => {
  const sdk = useSDK();
  let view: EditorView | undefined;

  const setContent = (value: string) => {
    if (view === undefined || view.state.doc.toString() === value) {
      return;
    }
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  };

  const mount = () => {
    const el = root.value;
    if (el === undefined) {
      return;
    }

    const editor =
      kind() === "request"
        ? sdk.ui.httpRequestEditor()
        : sdk.ui.httpResponseEditor();
    el.replaceChildren(editor.getElement());
    view = editor.getEditorView();
    setContent(content());
    view.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ),
    });
  };

  // Caido's editor loses its view while the page is detached, so rebuild it once visible again.
  useIntersectionObserver(root, ([entry]) => {
    if (entry?.isIntersecting === true && view?.dom.isConnected !== true) {
      mount();
    }
  });

  watch(content, setContent);
};
