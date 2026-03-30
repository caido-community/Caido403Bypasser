import { useCallback, useEffect, useMemo, useState } from "react";
import { handleBackendCall } from "@/utils/utils";
import {
  generateTemplate,
  getAvailableModelGroups,
  type Model,
  type ModelGroup,
} from "@/utils/ai";
import { useSDKStore } from "@/stores/sdkStore";
import { runScript, Template } from "shared";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-chaos";
import { StyledBox } from "caido-material-ui";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  ListSubheader,
  MenuItem,
  Select,
  TextareaAutosize,
} from "@mui/material";
import { useTemplates, useTemplatesLocalStore } from "@/stores/templatesStore";
import useTestStore from "@/stores/testsStore";

const EditorPanel = () => {
  const sdk = useSDKStore.getState().getSDK();
  const { selectedTemplateID } = useTemplatesLocalStore();
  const { templates } = useTemplates();

  const testContent = useTestStore((state) => state.testContent);
  const setTestResults = useTestStore((state) => state.setTestResults);

  const [aiDialogVisible, setAIDialogVisible] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | undefined>();
  const [availableModelGroups, setAvailableModelGroups] = useState<
    ModelGroup[]
  >([]);

  const [draftId, setDraftId] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftScript, setDraftScript] = useState("");

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === selectedTemplateID),
    [templates, selectedTemplateID],
  );

  useEffect(() => {
    const groups = getAvailableModelGroups(sdk);
    setAvailableModelGroups(groups);
    const firstModel = groups[0]?.models[0];
    if (firstModel) {
      setSelectedModel(firstModel);
    }
  }, [sdk]);

  useEffect(() => {
    if (selectedTemplate) {
      setDraftId(selectedTemplate.id);
      setDraftDescription(selectedTemplate.description ?? "");
      setDraftScript(selectedTemplate.modificationScript ?? "");
    }
  }, [selectedTemplate]);

  const onTestClick = useCallback(() => {
    const results = runScript(testContent, draftScript);
    if (results.success) {
      setTestResults(results.requests);
    } else {
      setTestResults([]);
      sdk.window.showToast("Error running script. Check console for details", {
        variant: "error",
      });
      console.error(results.error);
    }
  }, [testContent, draftScript, setTestResults, sdk]);

  const onSaveClick = useCallback(async () => {
    if (!selectedTemplate) {return;}

    if (!draftId || !draftDescription || !draftScript) {
      sdk.window.showToast("Please fill all fields", { variant: "error" });
      return;
    }

    const updatedTemplate: Template = {
      ...selectedTemplate,
      id: draftId,
      description: draftDescription,
      modificationScript: draftScript,
    };

    await handleBackendCall(
      sdk.backend.saveTemplate(selectedTemplate.id, updatedTemplate),
      sdk,
    );

    sdk.window.showToast("Template saved", { variant: "success" });
  }, [draftId, draftDescription, draftScript, selectedTemplate, sdk]);

  const onAIGenerateClick = useCallback(async () => {
    const model = selectedModel;
    if (!model) {
      sdk.window.showToast("Please select a model", { variant: "error" });
      return;
    }
    if (!aiPrompt.trim()) {
      sdk.window.showToast("Please enter a prompt", { variant: "error" });
      return;
    }

    setAIDialogVisible(false);
    setIsProcessing(true);

    try {
      const result = await generateTemplate(sdk, model, aiPrompt);
      setDraftId(result.id);
      setDraftDescription(result.description);
      setDraftScript(result.script);
      sdk.window.showToast("Template generated successfully", {
        variant: "success",
      });
    } catch (error) {
      console.error("Template generation failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate template";
      sdk.window.showToast(message, { variant: "error" });
    } finally {
      setIsProcessing(false);
    }
  }, [aiPrompt, selectedModel, sdk]);

  const hasProviders = availableModelGroups.length > 0;
  const hasUnsavedChanges =
    selectedTemplate &&
    (draftId !== selectedTemplate.id ||
      draftDescription !== selectedTemplate.description ||
      draftScript !== selectedTemplate.modificationScript);

  if (!selectedTemplate) {
    return (
      <StyledBox className="h-full w-full">
        <div className="flex justify-center items-center h-full text-center text-zinc-500">
          <p>Select a template to edit</p>
        </div>
      </StyledBox>
    );
  }

  return (
    <StyledBox className="p-5">
      <div className="flex flex-col justify-around h-full">
        <h2 className="m-0 text-xl">Template Editor: {selectedTemplate.id}</h2>
        <div className="h-full w-full flex flex-col gap-4 mt-4 overflow-y-auto">
          <Input
            placeholder="ID"
            id="id"
            value={draftId}
            onChange={(event) => setDraftId(event.target.value)}
          />
          <Input
            placeholder="Description"
            id="description"
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="modificationScript">Modification Script</label>
            <AceEditor
              mode="javascript"
              theme="chaos"
              wrapEnabled={true}
              showPrintMargin={false}
              value={draftScript}
              onChange={(value) => setDraftScript(value)}
              style={{ width: "100%", height: "220px" }}
              fontSize="100%"
              name="modificationScript"
              setOptions={{ useWorker: false }}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            color={hasUnsavedChanges ? "success" : "secondary"}
            variant="outlined"
            disabled={!hasUnsavedChanges}
            onClick={onSaveClick}
          >
            Save
          </Button>
          <Button variant="outlined" onClick={onTestClick}>
            Test
          </Button>
          <Button
            disabled={!hasProviders || isProcessing}
            variant="outlined"
            color="info"
            onClick={() => setAIDialogVisible(true)}
            startIcon={
              isProcessing ? <CircularProgress size={16} /> : undefined
            }
          >
            {isProcessing ? "Generating..." : "AI Generate"}
          </Button>
          <Dialog
            open={aiDialogVisible}
            onClose={() => setAIDialogVisible(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Generate script with AI</DialogTitle>
            <DialogContent>
              {hasProviders ? (
                <div className="flex flex-col gap-4 mt-2">
                  <Select
                    value={
                      selectedModel
                        ? `${selectedModel.provider}/${selectedModel.id}`
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      for (const group of availableModelGroups) {
                        const model = group.models.find(
                          (m) => `${m.provider}/${m.id}` === value,
                        );
                        if (model) {
                          setSelectedModel(model);
                          break;
                        }
                      }
                    }}
                    size="small"
                    fullWidth
                  >
                    {availableModelGroups.flatMap((group) => [
                      <ListSubheader key={group.label}>
                        {group.label}
                      </ListSubheader>,
                      ...group.models.map((model) => (
                        <MenuItem
                          key={`${model.provider}/${model.id}`}
                          value={`${model.provider}/${model.id}`}
                        >
                          {model.name}
                        </MenuItem>
                      )),
                    ])}
                  </Select>
                  <TextareaAutosize
                    placeholder="Describe the bypass template you want to generate..."
                    minRows={10}
                    value={aiPrompt}
                    onChange={(e) => setAIPrompt(e.target.value)}
                    style={{
                      width: "100%",
                      fontSize: "14px",
                      background: "var(--c-gray-800)",
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={onAIGenerateClick}
                    disabled={!selectedModel || !aiPrompt.trim()}
                  >
                    Generate
                  </Button>
                </div>
              ) : (
                <p className="text-zinc-400">
                  No AI providers configured. Configure providers in Caido
                  Settings &gt; AI.
                </p>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </StyledBox>
  );
};

export default EditorPanel;
