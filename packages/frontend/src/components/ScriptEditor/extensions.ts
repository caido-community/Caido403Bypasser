import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

// Caido 0.60 exposes design tokens for its own JS editor; the fallbacks match earlier releases.
const syntax = (token: string, fallback: string) =>
  `var(--color-syntax-js-${token}, ${fallback})`;

const highlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: syntax("comment", "#969896") },
  { tag: tags.keyword, color: syntax("keyword", "#cc6666") },
  { tag: tags.string, color: syntax("string", "#b5bd68") },
  { tag: tags.literal, color: syntax("literal", "#de935f") },
  { tag: tags.variableName, color: syntax("variable", "#c5c8c6") },
  { tag: tags.propertyName, color: syntax("property", "#81a2be") },
  {
    tag: tags.function(tags.variableName),
    color: syntax("property", "#81a2be"),
  },
  { tag: tags.operator, color: syntax("label", "#8abeb7") },
  { tag: tags.typeName, color: syntax("type", "#f0c674") },
  { tag: tags.className, color: syntax("type", "#f0c674") },
]);

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "var(--c-editor-font-size, 0.875rem)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono, monospace)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--color-fg-subtle, var(--c-fg-subtle))",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--color-surface-hover, rgba(255, 255, 255, 0.04))",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-fg-default, var(--c-fg-default))",
  },
});

export const scriptExtensions = (onChange: (value: string) => void) => [
  lineNumbers(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  drawSelection(),
  history(),
  indentOnInput(),
  bracketMatching(),
  javascript(),
  syntaxHighlighting(highlightStyle),
  keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
  EditorView.lineWrapping,
  theme,
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  }),
];
