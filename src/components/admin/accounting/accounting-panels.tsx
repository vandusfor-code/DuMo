"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  DollarSign,
  MoreVertical,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AccountingSummary, Expense, ExpenseCategory } from "@/types/accounting";
import { EXPENSE_CATEGORY_LABELS } from "@/types/accounting";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const INCOME_COLOR = "#2563eb";
const EXPENSE_COLOR = "#ef4444";
const PROFIT_COLOR = "#6D28D9";

function formatChartAxis(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function progressPct(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

function KpiCard({
  icon,
  iconTint,
  label,
  value,
  hint,
  progress,
  progressTint = "brand",
}: {
  icon: React.ReactNode;
  iconTint: string;
  label: string;
  value: string;
  hint: string;
  progress?: number;
  progressTint?: "brand" | "success";
}) {
  const barClass = progressTint === "success" ? "bg-success-ink" : "bg-brand";
  return (
    <Card className="p-5">
      <span
        className={cn(
          "grid size-11 place-items-center rounded-xl [&_svg]:size-[22px]",
          iconTint,
        )}
      >
        {icon}
      </span>
      <p className="mt-4 text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-ink">{value}</p>
      {progress !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", barClass)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}
      <p className="mt-2 text-[12px] text-muted">{hint}</p>
    </Card>
  );
}

export function AccountingKpis({ summary }: { summary: AccountingSummary }) {
  const economicPct = progressPct(summary.currentIncome, summary.economicGoal);
  const incomePct = progressPct(summary.currentIncome, summary.economicGoal);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Wallet />}
          iconTint="bg-brand-soft text-brand"
          label="Presupuesto mensual"
          value={money.format(summary.monthlyBudget)}
          hint="Asignado"
        />
        <KpiCard
          icon={<DollarSign />}
          iconTint="bg-danger-soft text-danger-ink"
          label="Gastos del mes"
          value={money.format(summary.monthlyExpenses)}
          hint="Ejecutado"
        />
        <KpiCard
          icon={<PiggyBank />}
          iconTint="bg-success-soft text-success-ink"
          label="Disponible"
          value={money.format(summary.available)}
          hint="Restante"
        />
        <KpiCard
          icon={<TrendingUp />}
          iconTint="bg-[#e8f0fe] text-[#2563eb]"
          label="Utilidad estimada"
          value={money.format(summary.estimatedProfit)}
          hint="Proyección"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={<Target />}
          iconTint="bg-warning-soft text-warning-ink"
          label="Meta ventas (equipo)"
          value={`${summary.monthlyGoal} ventas`}
          hint="Este mes"
        />
        <KpiCard
          icon={<Target />}
          iconTint="bg-[#f1f1f6] text-[#6b7280]"
          label="Ventas del mes"
          value={String(summary.currentSales)}
          hint="Registradas"
        />
        <KpiCard
          icon={<Target />}
          iconTint="bg-brand-soft text-brand"
          label="Faltan para meta ventas"
          value={String(summary.salesNeededForGoal)}
          hint="Por alcanzar"
        />
        <KpiCard
          icon={<DollarSign />}
          iconTint="bg-success-soft text-success-ink"
          label="Meta económica"
          value={money.format(summary.economicGoal)}
          hint="Este mes"
          progress={economicPct}
          progressTint="success"
        />
        <KpiCard
          icon={<DollarSign />}
          iconTint="bg-brand-soft text-brand"
          label="Ingreso DuMo (mes)"
          value={money.format(summary.currentIncome)}
          hint="Proyección"
          progress={incomePct}
          progressTint="brand"
        />
      </div>
    </div>
  );
}

function ChartPeriodSelect() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-canvas"
    >
      Este año
      <ChevronDown className="size-4" />
    </button>
  );
}

export function AccountingCharts({
  chart,
}: {
  chart: { label: string; income: number; expenses: number; profit: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Ingresos vs Gastos</h3>
          <ChartPeriodSelect />
        </div>
        <div className="mt-4 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatChartAxis}
              />
              <Tooltip formatter={(v: number) => money.format(v)} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Ingresos"
                stroke={INCOME_COLOR}
                strokeWidth={2.5}
                dot={{ r: 4, fill: INCOME_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Gastos"
                stroke={EXPENSE_COLOR}
                strokeWidth={2.5}
                dot={{ r: 4, fill: EXPENSE_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Utilidad mensual</h3>
          <ChartPeriodSelect />
        </div>
        <div className="mt-4 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatChartAxis}
              />
              <Tooltip formatter={(v: number) => money.format(v)} />
              <Line
                type="monotone"
                dataKey="profit"
                name="Utilidad"
                stroke={PROFIT_COLOR}
                strokeWidth={2.5}
                dot={{ r: 4, fill: PROFIT_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function ExpensesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative mb-6 grid size-28 place-items-center">
        <div className="absolute inset-0 rounded-3xl bg-brand-soft/60" />
        <div className="relative grid size-20 place-items-center rounded-2xl bg-brand-soft">
          <Wallet className="size-9 text-brand" />
        </div>
        <span className="absolute -right-1 top-2 grid size-7 place-items-center rounded-lg bg-white shadow-sm">
          <DollarSign className="size-4 text-brand" />
        </span>
        <span className="absolute -left-2 bottom-3 grid size-6 place-items-center rounded-md bg-white shadow-sm">
          <Plus className="size-3.5 text-muted" />
        </span>
      </div>
      <p className="text-[16px] font-semibold text-ink">Aún no hay gastos registrados</p>
      <p className="mt-1.5 max-w-sm text-[14px] text-muted">
        Agrega tu primer gasto para comenzar.
      </p>
    </div>
  );
}

export function ExpensesTable({
  expenses,
  onDelete,
  onAdd,
}: {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div>
          <h3 className="text-[16px] font-semibold text-ink">Gastos</h3>
          <div className="mt-2 h-0.5 w-10 rounded-full bg-brand" />
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          className="h-10 rounded-xl bg-ink px-4 text-white shadow-none hover:bg-ink/90"
        >
          <Plus className="size-4" />
          Agregar gasto
        </Button>
      </div>

      {expenses.length === 0 ? (
        <ExpensesEmptyState />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.date}</TableCell>
                <TableCell>{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell className="font-semibold">{money.format(e.amount)}</TableCell>
                <TableCell>{e.user}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="grid size-8 place-items-center rounded-lg hover:bg-canvas"
                      >
                        <MoreVertical className="size-4 text-muted" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDelete(e.id)}
                        className="text-danger-ink"
                      >
                        <Trash2 className="size-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export function AddExpenseDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (values: {
    date: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
  }) => Promise<void>;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>("otros");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("otros");
    setDescription("");
    setAmount(0);
    setError(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-[17px] font-semibold text-ink">Agregar gasto</h3>
        <div className="mt-4 space-y-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          >
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          />
          <input
            type="number"
            placeholder="Valor"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          />
          {error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger-ink">
              {error}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!amount || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onSave({ date, category, description, amount });
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo guardar el gasto.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
