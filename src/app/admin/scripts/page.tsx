"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, History, RotateCcw, Save } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TokenTemplateEditor } from "@/components/admin/scripts/token-template-editor";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePreviewScriptTemplate,
  useRestoreScriptField,
  useSaveScriptField,
  useScriptCatalog,
  useScriptField,
  useScriptFlows,
  useScriptHistory,
} from "@/hooks/use-teleprompter-scripts";
import type { ScriptFlowKey } from "@/lib/sales-script/cms/types";
import { cn } from "@/lib/utils";

export default function AdminScriptsPage() {
  const { data: flows = [], isLoading: loadingFlows, isError, refetch } = useScriptFlows();
  const [flowKey, setFlowKey] = useState<ScriptFlowKey | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [fieldKey, setFieldKey] = useState<string | null>("content");
  const [draft, setDraft] = useState("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!flowKey && flows[0]) setFlowKey(flows[0].flowKey);
  }, [flows, flowKey]);

  const { data: catalog, isLoading: loadingCatalog } = useScriptCatalog(flowKey);
  const selectedBlock = useMemo(
    () => catalog?.blocks.find((block) => block.blockId === blockId) ?? null,
    [catalog, blockId],
  );

  useEffect(() => {
    if (!catalog?.blocks.length) return;
    if (!blockId || !catalog.blocks.some((block) => block.blockId === blockId)) {
      setBlockId(catalog.blocks[0]?.blockId ?? null);
      setFieldKey(catalog.blocks[0]?.fields[0]?.fieldKey ?? "content");
    }
  }, [catalog, blockId]);

  useEffect(() => {
    if (!selectedBlock) return;
    if (!fieldKey || !selectedBlock.fields.some((field) => field.fieldKey === fieldKey)) {
      setFieldKey(selectedBlock.fields[0]?.fieldKey ?? "content");
    }
  }, [selectedBlock, fieldKey]);

  const { data: fieldState, isLoading: loadingField } = useScriptField({
    flowKey,
    blockId,
    fieldKey,
  });

  useEffect(() => {
    if (fieldState) {
      setDraft(fieldState.currentTemplate);
      setValidationIssues([]);
      setPreviewText(null);
    }
  }, [fieldState]);

  const saveField = useSaveScriptField();
  const restoreField = useRestoreScriptField();
  const previewTemplate = usePreviewScriptTemplate();
  const { data: history = [] } = useScriptHistory(showHistory ? fieldState?.overrideId ?? null : null);

  const dirty = fieldState ? draft !== fieldState.currentTemplate : false;

  if (isError) {
    return <ErrorState title="No se pudo cargar Scripts" onRetry={() => refetch()} />;
  }

  if (loadingFlows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[640px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Scripts"
        subtitle="Edita el copy del teleprompter sin modificar código — los builders siguen siendo la fuente de verdad."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="p-3">
          <div className="space-y-4">
            {flows.map((flow) => (
              <div key={flow.flowKey}>
                <button
                  type="button"
                  onClick={() => {
                    setFlowKey(flow.flowKey);
                    setBlockId(null);
                  }}
                  className={cn(
                    "mb-2 w-full rounded-xl px-3 py-2 text-left text-[14px] font-semibold",
                    flowKey === flow.flowKey ? "bg-brand/10 text-brand" : "text-ink hover:bg-muted/40",
                  )}
                >
                  {flow.title}
                </button>

                {flowKey === flow.flowKey ? (
                  loadingCatalog ? (
                    <div className="space-y-2 px-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {catalog?.blocks.map((block, index) => (
                        <button
                          key={block.blockId}
                          type="button"
                          onClick={() => {
                            setBlockId(block.blockId);
                            setFieldKey(block.fields[0]?.fieldKey ?? "content");
                          }}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left text-[13px]",
                            blockId === block.blockId
                              ? "bg-surface-muted font-medium text-ink"
                              : "text-muted hover:bg-muted/30 hover:text-ink",
                          )}
                        >
                          Bloque {index + 1}
                          <span className="block text-[12px] text-muted">{block.label}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[640px] flex-col p-5">
          {!selectedBlock || !fieldKey ? (
            <div className="flex flex-1 items-center justify-center text-muted">
              Selecciona un bloque para editar su discurso.
            </div>
          ) : loadingField || !fieldState ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-[360px] w-full" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold text-ink">{selectedBlock.label}</h2>
                  <p className="text-[13px] text-muted">
                    {fieldState.label}
                    {fieldState.isCustom ? " · Personalizado" : " · Texto original del builder"}
                  </p>
                </div>
                {selectedBlock.fields.length > 1 ? (
                  <select
                    value={fieldKey}
                    onChange={(event) => setFieldKey(event.target.value)}
                    className="h-10 rounded-xl border border-line px-3 text-[13px]"
                  >
                    {selectedBlock.fields.map((field) => (
                      <option key={field.fieldKey} value={field.fieldKey}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <TokenTemplateEditor value={draft} onChange={setDraft} />

              {validationIssues.length > 0 ? (
                <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
                  {validationIssues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              ) : null}

              {previewText ? (
                <div className="mt-4 rounded-xl border border-line bg-muted/20 p-4">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Vista previa
                  </p>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{previewText}</p>
                </div>
              ) : null}

              {showHistory && history.length > 0 ? (
                <div className="mt-4 rounded-xl border border-line p-4">
                  <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Historial
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {history.map((version) => (
                      <div key={version.id} className="rounded-lg bg-muted/20 px-3 py-2 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">v{version.versionNumber}</span>
                          <span className="text-muted">
                            {new Date(version.createdAt).toLocaleString("es-CL")}
                          </span>
                        </div>
                        <p className="mt-1 text-muted">{version.changeNote}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Button
                  onClick={async () => {
                    if (!flowKey || !blockId || !fieldKey) return;
                    setValidationIssues([]);
                    try {
                      await saveField.mutateAsync({
                        flowKey,
                        blockId,
                        fieldKey,
                        templateText: draft,
                      });
                    } catch (error) {
                      const issues = (error as Error & { issues?: Array<{ message: string }> }).issues;
                      if (issues?.length) {
                        setValidationIssues(issues.map((item) => item.message));
                      }
                    }
                  }}
                  disabled={!dirty || saveField.isPending}
                >
                  <Save className="size-4" />
                  Guardar
                </Button>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!flowKey || !blockId || !fieldKey) return;
                    await restoreField.mutateAsync({ flowKey, blockId, fieldKey });
                  }}
                  disabled={restoreField.isPending || !fieldState.isCustom}
                >
                  <RotateCcw className="size-4" />
                  Restaurar original
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setShowHistory((value) => !value)}
                  disabled={!fieldState.overrideId}
                >
                  <History className="size-4" />
                  Ver historial
                </Button>

                <Button
                  variant="secondary"
                  onClick={async () => {
                    const result = await previewTemplate.mutateAsync(draft);
                    setPreviewText(result.preview);
                  }}
                  disabled={previewTemplate.isPending}
                >
                  <Eye className="size-4" />
                  Vista previa
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
