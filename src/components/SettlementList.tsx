import { ArrowRight, Sparkles, PartyPopper, Check, Undo2 } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Button } from "@/components/ui/button";
import type { Member, Settlement } from "@/lib/expenses";

interface SettledPayment {
  from: string;
  to: string;
  amount: number;
  settledAt: Date;
}

interface SettlementListProps {
  members: Member[];
  settlements: Settlement[];
  settledPayments: SettledPayment[];
  onMarkSettled: (from: string, to: string, amount: number) => void;
  onUndoSettled: (from: string, to: string, amount: number) => void;
}

export function SettlementList({ members, settlements, settledPayments, onMarkSettled, onUndoSettled }: SettlementListProps) {
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  const isSettled = (s: Settlement) =>
    (settledPayments ?? []).some((p) => p.from === s.from && p.to === s.to && p.amount === s.amount);

  const allSettled = settlements.length > 0 && settlements.every(isSettled);
  const settledCount = settlements.filter(isSettled).length;

  return (
    <div className="rounded-2xl glass shadow-soft overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-display font-bold text-sm">Simplified Settlements</h3>
            <p className="text-[11px] text-muted-foreground">Minimum transactions to settle all debts</p>
          </div>
        </div>
        {settlements.length > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {settledCount}/{settlements.length} paid
          </span>
        )}
      </div>
      <div className="px-5 pb-5">
        {settlements.length === 0 ? (
          <div className="text-center py-6">
            <PartyPopper className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium text-foreground">All settled up!</p>
            <p className="text-xs text-muted-foreground">No debts to settle — everyone is even 🎉</p>
          </div>
        ) : allSettled ? (
          <div className="text-center py-6">
            <PartyPopper className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm font-medium text-foreground">All payments completed! 🎉</p>
            <p className="text-xs text-muted-foreground">Everyone has settled their debts</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {settlements.map((s, i) => {
              const settled = isSettled(s);
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between py-3 px-4 rounded-xl border animate-fade-in transition-all ${
                    settled ? "bg-positive/5 border-positive/20 opacity-70" : "bg-background"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={getName(s.from)} size="sm" />
                    <span className={`font-semibold text-sm ${settled ? "line-through text-muted-foreground" : "text-negative"}`}>
                      {getName(s.from)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />
                    <MemberAvatar name={getName(s.to)} size="sm" />
                    <span className={`font-semibold text-sm ${settled ? "line-through text-muted-foreground" : "text-positive"}`}>
                      {getName(s.to)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-display font-extrabold text-sm ${settled ? "line-through text-muted-foreground" : ""}`}>
                      ₹{s.amount.toFixed(2)}
                    </span>
                    {settled ? (
                      <div className="flex items-center gap-1 ml-2">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-positive">
                          <Check className="h-3.5 w-3.5" />
                          Paid
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUndoSettled(s.from, s.to, s.amount)}
                          className="h-7 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-negative gap-1 ml-1"
                        >
                          <Undo2 className="h-3 w-3" />
                          Undo
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onMarkSettled(s.from, s.to, s.amount)}
                        className="h-7 px-3 rounded-lg text-[11px] font-medium ml-2"
                      >
                        Mark as paid
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground text-center pt-1 font-medium">
              Only {settlements.length} transaction{settlements.length !== 1 ? "s" : ""} needed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
