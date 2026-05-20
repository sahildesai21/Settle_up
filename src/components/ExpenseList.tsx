import { useState } from "react";
import { Receipt, Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { Member, Expense } from "@/lib/expenses";

interface ExpenseListProps {
  members: Member[];
  expenses: Expense[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, title: string, amount: number, paidBy: string, splitAmong: string[]) => void;
}

export function ExpenseList({ members, expenses, onDelete, onEdit }: ExpenseListProps) {
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaidBy, setEditPaidBy] = useState("");
  const [editSplitAmong, setEditSplitAmong] = useState<string[]>([]);

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setEditTitle(exp.title);
    setEditAmount(exp.amount.toString());
    setEditPaidBy(exp.paidBy);
    setEditSplitAmong([...exp.splitAmong]);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = () => {
    if (!editingId || !onEdit) return;
    const amt = parseFloat(editAmount);
    if (!editTitle.trim() || isNaN(amt) || amt <= 0 || !editPaidBy || editSplitAmong.length === 0) return;
    onEdit(editingId, editTitle.trim(), Math.round(amt * 100) / 100, editPaidBy, editSplitAmong);
    setEditingId(null);
  };

  if (expenses.length === 0) return null;

  return (
    <div className="rounded-2xl glass shadow-soft overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display font-bold text-sm">Expenses</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{expenses.length} total</span>
      </div>
      <div className="px-5 pb-5 space-y-2">
        {expenses.map((exp, i) => (
          <div
            key={exp.id}
            className="rounded-xl bg-background border animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {editingId === exp.id ? (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="rounded-lg h-9 text-sm" />
                  <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Amount" className="rounded-lg h-9 text-sm" />
                </div>
                <Select value={editPaidBy} onValueChange={setEditPaidBy}>
                  <SelectTrigger className="rounded-lg h-9 text-sm">
                    <SelectValue placeholder="Paid by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const checked = editSplitAmong.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEditSplitAmong((prev) => checked ? prev.filter((x) => x !== m.id) : [...prev, m.id])}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          checked ? "border-primary/40 bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={cancelEdit} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                  <button onClick={saveEdit} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-3 px-3">
                <MemberAvatar name={getName(exp.paidBy)} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{exp.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Paid by <span className="font-semibold text-foreground">{getName(exp.paidBy)}</span>
                    {" · "}split {exp.splitAmong.length} way{exp.splitAmong.length > 1 ? "s" : ""}
                  </p>
                </div>
                <span className="font-display font-extrabold text-sm shrink-0">₹{exp.amount.toFixed(2)}</span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button onClick={() => startEdit(exp)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete?.(exp.id)} className="p-1.5 rounded-lg hover:bg-negative/10 text-muted-foreground hover:text-negative transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}