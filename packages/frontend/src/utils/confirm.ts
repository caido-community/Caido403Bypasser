import { useConfirm } from "primevue/useconfirm";

export const useDangerConfirm = () => {
  const confirm = useConfirm();
  return (message: string, accept: () => void, acceptLabel = "Confirm") =>
    confirm.require({
      header: "Are you sure?",
      message,
      acceptProps: { label: acceptLabel, severity: "danger" },
      rejectProps: { label: "Cancel", severity: "secondary", outlined: true },
      accept,
    });
};
