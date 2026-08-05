"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
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
  DollarSign,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/admin/chart-card";
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
import { MoreVertical, Plus, Trash2 } from "lucide-react";
import type { AccountingSummary, Expense, ExpenseCategory } from "@/types/accounting";
import { EXPENSE_CATEGORY_LABELS } from "@/types/accounting";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const BRAND = "#6D28D9";

export function AccountingKpis({ summary }: { summary: AccountingSummary }) {
  const cards = [
    { icon: <Wallet />, tint: "bg-brand-soft text-brand", label: "Presupuesto mensual", value: money.format(summary.monthlyBudget) },
    { icon: <DollarSign />, tint: "bg-danger-soft text-danger-ink", label: "Gastos del mes", value: money.format(summary.monthlyExpenses) },
    { icon: <PiggyBank />, tint: "bg-success-soft text-success-ink", label: "Disponible", value: money.format(summary.available) },
    { icon: <TrendingUp />, tint: "bg-[#e8f0fe] text-[#2563eb]", label: "Utilidad estimada", value: money.format(summary.estimatedProfit) },
    { icon: <Target />, tint: "bg-warning-soft text-warning-ink", label: "Meta mensual", value: money.format(summary.monthlyGoal) },
    { icon: <Target />, tint: "bg-[#f1f1f6] text-[#6b7280]", label: "Ventas necesarias", value: String(summary.salesNeededForGoal) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <span className={`grid size-10 place-items-center rounded-xl [&_svg]:size-5 ${c.tint}`}>
            {c.icon}
          </span>
          <p className="mt-3 text-[12px] text-muted">{c.label}</p>
          <p className="text-[20px] font-bold leading-tight text-ink">{c.value}</p>
        </Card>
      ))}
    </div>
  );
}

export function AccountingCharts({ chart }: { chart: { label: string; income: number; expenses: number; profit: number }[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Ingresos vs Gastos">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f6" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => money.format(v)} />
              <Legend />
              <Bar dataKey="income" name="Ingresos" fill={BRAND} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <ChartCard title="Utilidad mensual">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f6" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => money.format(v)} />
              <Line type="monotone" dataKey="profit" name="Utilidad" stroke={BRAND} strokeWidth={2.5} dot={{ r: 4, fill: BRAND }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
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
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-semibold text-ink">Gastos</h3>
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Agregar gasto
        </Button>
      </div>
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
                    <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                      <MoreVertical className="size-4 text-muted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDelete(e.id)} className="text-danger-ink">
                      <Trash2 className="size-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  onSave: (values: { date: string; category: ExpenseCategory; description: string; amount: number }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>("otros");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-[17px] font-semibold text-ink">Agregar gasto</h3>
        <div className="mt-4 space-y-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]">
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input type="number" placeholder="Valor" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave({ date, category, description, amount }); onClose(); }}>Guardar</Button>
        </div>
      </Card>
    </div>
  );
}
