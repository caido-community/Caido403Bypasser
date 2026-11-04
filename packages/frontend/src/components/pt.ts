export const fullHeightCardPt = {
  root: { style: "display: flex; flex-direction: column; height: 100%;" },
  body: { class: "flex-1 p-0 flex flex-col min-h-0" },
  content: { class: "flex-1 flex flex-col overflow-hidden min-h-0" },
};

export const splitterPt = {
  root: { class: "flex-1 min-h-0 overflow-hidden border-0 bg-transparent" },
};

export const splitterPanelPt = {
  root: {
    class: "min-w-0 min-h-0 overflow-hidden flex flex-col",
    style: "flex-grow: 1;",
  },
};
