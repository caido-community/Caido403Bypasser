import React, { useEffect, useRef, useState } from "react";

import { useSDKStore } from "../../stores/sdkStore";
import { HTTPRequestEditor, HTTPResponseEditor } from "@caido/sdk-frontend/src/types/types/editor";

type HTTPEditorProps = {
  value: string;
  type: "request" | "response";
  style?: React.CSSProperties;
  removeFooter?: boolean;
  removeHeader?: boolean;
  onChange?: (value: string) => void;
}

type EditorType = HTTPRequestEditor | HTTPResponseEditor;

export const HTTPEditor: React.FC<HTTPEditorProps> = ({
  value,
  type,
  style,
  removeFooter = false,
  removeHeader = false,
  onChange,
}) => {
  const sdk = useSDKStore.getState().getSDK();
  const editorRef = useRef<EditorType | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const [hash, setHash] = useState(window.location.hash);

  onChangeRef.current = onChange;

  const setValue = (value: string) => {
    const view = editorRef.current?.getEditorView();
    if (!view) {return;}
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  };

  const initializeEditor = () => {
    if (!containerRef.current) {return;}
    const newEditor =
      type === "request"
        ? sdk.ui.httpRequestEditor()
        : sdk.ui.httpResponseEditor();

    editorRef.current = newEditor;
    containerRef.current.appendChild(newEditor.getElement());
    setValue(value);

    const card = newEditor.getEditorView()?.dom?.closest(".c-card");
    if (card) {
      if (removeFooter) {card.querySelector(".c-card__footer")?.remove();}
      if (removeHeader) {card.querySelector(".c-card__header")?.remove();}
    }
    return newEditor;
  };

  useEffect(() => {
    const newEditor = initializeEditor();

    return () => {
      if (containerRef.current && newEditor) {
        containerRef.current.removeChild(newEditor.getElement());
      }
    };
  }, [sdk, type, hash]);

  useEffect(() => {
    if (editorRef.current) {setValue(value);}
  }, [value]);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return <div style={{ height: "100%", ...style }} ref={containerRef} />;
};
