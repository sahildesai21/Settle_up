import { TrendingUp, TrendingDown, Scale, CheckCircle2 } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { Member } from "@/lib/expenses";

interface BalanceSummaryProps {
  members: Member[];
  balances: Map<string, number>;
}

export function BalanceSummary({ members, balances }: BalanceSummaryProps) {
  if (members.length === 0) return null;

  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const sorted = [...balances.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl glass shadow-soft overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
          <Scale className="h-4 w-4 text-accent" />
        </div>
        <h3 className="font-display font-bold text-sm">Balances</h3>
      </div>
      <div className="px-5 pb-5 space-y-2">
        {sorted.map(([id, balance]) => (
          <div
            key={id}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-background border"
          >
            <div className="flex items-center gap-2.5">
              <MemberAvatar name={getName(id)} size="sm" />
              <span className="font-medium text-sm">{getName(id)}</span>
            </div>
            <span className={`flex items-center gap-1.5 text-sm font-bold ${
              balance > 0.01
                ? "text-positive"
                : balance < -0.01
                ? "text-negative"
                : "text-muted-foreground"
            }`}>
              {balance > 0.01 && <TrendingUp className="h-3.5 w-3.5" />}
              {balance < -0.01 && <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(balance) < 0.01 && <CheckCircle2 className="h-3.5 w-3.5" />}
              {balance > 0.01
                ? `+₹${balance.toFixed(2)}`
                : balance < -0.01
                ? `-₹${(-balance).toFixed(2)}`
                : "settled"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
