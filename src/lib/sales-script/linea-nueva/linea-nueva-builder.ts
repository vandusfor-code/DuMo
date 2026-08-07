import type {
  LineaNuevaRuleFlags,
  LineaNuevaScriptContext,
  LineaNuevaScriptSection,
  LineaNuevaSectionId,
} from "./linea-nueva-types";
import type { SalesScriptBranch } from "@/types/sales-script";

export type LineaNuevaContentBlock = string | ((ctx: LineaNuevaScriptContext) => string);

type BuilderSectionState = {
  id: LineaNuevaSectionId;
  label: string;
  blocks: string[];
  skipped: boolean;
  skipReason?: string;
  branch?: SalesScriptBranch;
};

/**
 * Construye el script por secciones.
 * No concatena strings fuera de este módulo.
 */
export class LineaNuevaScriptBuilder {
  private readonly ctx: LineaNuevaScriptContext;
  private readonly flags: LineaNuevaRuleFlags;
  private sections: BuilderSectionState[] = [];
  private current: BuilderSectionState | null = null;
  private finished = false;

  constructor(ctx: LineaNuevaScriptContext, flags: LineaNuevaRuleFlags) {
    this.ctx = ctx;
    this.flags = flags;
  }

  /** Abre una sección del script. */
  section(id: LineaNuevaSectionId, label: string): this {
    this.flushCurrent();
    this.current = { id, label, blocks: [], skipped: false };
    return this;
  }

  /** Agrega contenido a la sección activa. */
  add(block: LineaNuevaContentBlock): this {
    if (!this.current || this.current.skipped) return this;
    const text = typeof block === "function" ? block(this.ctx) : block;
    if (text.trim()) this.current.blocks.push(text.trim());
    return this;
  }

  /** Ejecuta callback condicionalmente sobre el builder. */
  when(condition: boolean, fn: (builder: LineaNuevaScriptBuilder) => void): this {
    if (condition) fn(this);
    return this;
  }

  /** Agrega contenido y ramas interactivas del teleprompter. */
  addStep(input: { content: string; branch?: SalesScriptBranch }): this {
    if (!this.current || this.current.skipped) return this;
    if (input.content.trim()) this.current.blocks.push(input.content.trim());
    if (input.branch) this.current.branch = input.branch;
    return this;
  }

  /** Marca la sección activa como omitida. */
  skip(reason?: string): this {
    if (!this.current) return this;
    this.current.skipped = true;
    this.current.skipReason = reason;
    this.current.blocks = [];
    return this;
  }

  /** Cierra la sección activa sin finalizar el script completo. */
  endSection(): this {
    this.flushCurrent();
    return this;
  }

  /** Finaliza la construcción y devuelve secciones ordenadas. */
  finish(): LineaNuevaScriptSection[] {
    if (this.finished) return this.toOutput();
    this.flushCurrent();
    this.finished = true;
    return this.toOutput();
  }

  getContext(): LineaNuevaScriptContext {
    return this.ctx;
  }

  getFlags(): LineaNuevaRuleFlags {
    return this.flags;
  }

  private flushCurrent(): void {
    if (!this.current) return;
    this.sections.push(this.current);
    this.current = null;
  }

  private toOutput(): LineaNuevaScriptSection[] {
    return this.sections.map((section, index) => ({
      id: section.id,
      label: section.label,
      content: section.skipped ? "" : section.blocks.join("\n\n"),
      order: index + 1,
      skipped: section.skipped,
      skipReason: section.skipReason,
      branch: section.branch,
    }));
  }
}
