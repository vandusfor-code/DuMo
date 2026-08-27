import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ScriptBlockFieldState,
  ScriptFlowCatalog,
  ScriptFlowKey,
  ScriptTemplateValidationIssue,
  ScriptTemplateVersion,
} from "@/lib/sales-script/cms/types";

type FlowSummary = {
  flowKey: ScriptFlowKey;
  title: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Error de red.");
  }
  return response.json() as Promise<T>;
}

export function useScriptFlows() {
  return useQuery({
    queryKey: ["admin-scripts", "flows"],
    queryFn: () => fetchJson<FlowSummary[]>("/api/admin/scripts?section=flows"),
  });
}

export function useScriptCatalog(flowKey: ScriptFlowKey | null) {
  return useQuery({
    queryKey: ["admin-scripts", "catalog", flowKey],
    enabled: Boolean(flowKey),
    queryFn: () => fetchJson<ScriptFlowCatalog>(`/api/admin/scripts?section=catalog&flowKey=${flowKey}`),
  });
}

export function useScriptField(input: {
  flowKey: ScriptFlowKey | null;
  blockId: string | null;
  fieldKey: string | null;
  carrier: string;
}) {
  return useQuery({
    queryKey: ["admin-scripts", "field", input.flowKey, input.blockId, input.fieldKey, input.carrier],
    enabled: Boolean(input.flowKey && input.blockId && input.fieldKey),
    queryFn: () =>
      fetchJson<ScriptBlockFieldState>(
        `/api/admin/scripts?section=field&flowKey=${input.flowKey}&blockId=${input.blockId}&fieldKey=${encodeURIComponent(input.fieldKey ?? "")}&carrier=${input.carrier}`,
      ),
  });
}

export function useScriptHistory(overrideId: string | null) {
  return useQuery({
    queryKey: ["admin-scripts", "history", overrideId],
    enabled: Boolean(overrideId),
    queryFn: () =>
      fetchJson<ScriptTemplateVersion[]>(
        `/api/admin/scripts?section=history&overrideId=${overrideId}`,
      ),
  });
}

export function useSaveScriptField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      flowKey: ScriptFlowKey;
      blockId: string;
      fieldKey: string;
      carrier: string;
      templateText: string;
    }) => {
      const response = await fetch("/api/admin/scripts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(payload.error ?? "No se pudo guardar.") as Error & {
          issues?: ScriptTemplateValidationIssue[];
        };
        error.issues = payload.issues;
        throw error;
      }
      return payload;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin-scripts",
          "field",
          variables.flowKey,
          variables.blockId,
          variables.fieldKey,
          variables.carrier,
        ],
      });
    },
  });
}

export function useRestoreScriptField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      flowKey: ScriptFlowKey;
      blockId: string;
      fieldKey: string;
      carrier: string;
    }) =>
      fetchJson<ScriptBlockFieldState>("/api/admin/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", ...input }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin-scripts",
          "field",
          variables.flowKey,
          variables.blockId,
          variables.fieldKey,
          variables.carrier,
        ],
      });
    },
  });
}

export function usePreviewScriptTemplate() {
  return useMutation({
    mutationFn: (input: { templateText: string; flowKey: ScriptFlowKey }) =>
      fetchJson<{ preview: string }>("/api/admin/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", ...input }),
      }),
  });
}
