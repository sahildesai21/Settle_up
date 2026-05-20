import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Receipt, Sparkles } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { Member } from "@/lib/expenses";

interface AddExpenseFormProps {
  members: Member[];
  onAdd: (title: string, amount: number, paidBy: string, splitAmong: string[]) => void;
}

export function AddExpenseForm({ members, onAdd }: AddExpenseFormProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (splitAmong.length === members.length) {
      setSplitAmong([]);
    } else {
      setSplitAmong(members.map((m) => m.id));
    }
  };

  const isValid = title.trim().length > 0 && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && paidBy.length > 0 && splitAmong.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const parsedAmount = parseFloat(amount);
    onAdd(title.trim(), Math.round(parsedAmount * 100) / 100, paidBy, splitAmong);
    setTitle("");
    setAmount("");
    setPaidBy("");
    setSplitAmong([]);
  };

  if (members.length < 2) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/60 p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-3">
          <Receipt className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-sm">Add at least 2 members to start adding expenses.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass shadow-soft overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <h3 className="font-display font-bold text-sm">Add Expense</h3>
      </div>
      <div className="px-5 pb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">Description</Label>
              <Input id="title" placeholder="e.g. Dinner 🍕" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl h-10 shadow-soft bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium text-muted-foreground">Amount (₹)</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl h-10 shadow-soft bg-background" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Who paid?</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="rounded-xl h-10 shadow-soft bg-background">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Split among</Label>
              <button type="button" onClick={selectAll} className="text-[11px] font-medium text-primary hover:underline">
                {splitAmong.length === members.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const checked = splitAmong.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all border ${
                      checked
                        ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    <MemberAvatar name={m.name} size="sm" />
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" disabled={!isValid} className="w-full h-11 rounded-xl gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity font-display font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
            Add Expense
          </Button>
        </form>
      </div>
    </div>
  );
}
