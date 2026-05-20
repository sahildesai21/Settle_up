import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AddMemberForm } from "@/components/AddMemberForm";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { BalanceSummary } from "@/components/BalanceSummary";
import { SettlementList } from "@/components/SettlementList";
import { ExpenseList } from "@/components/ExpenseList";
import { MemberAvatar } from "@/components/MemberAvatar";
import { computeBalances, simplifyDebts } from "@/lib/expenses";
import { toast } from "@/hooks/use-toast";
import { Trash2, X, Wallet, Plus, ChevronLeft, Users, IndianRupee, Receipt, ArrowRight, Download, LogOut, Moon, Sun, Pencil, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { exportGroupPdf, exportAllGroupsPdf } from "@/lib/exportPdf";
import type { Member, Expense } from "@/lib/expenses";
import { useTheme } from "next-themes";
import { sendGroupInviteEmail } from "@/lib/inviteEmail";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

interface SettledPayment {
  from: string;
  to: string;
  amount: number;
  settledAt: Date;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  settledPayments: SettledPayment[];
}

interface PersistedExpense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  createdAt: string;
}

interface PersistedSettledPayment {
  from: string;
  to: string;
  amount: number;
  settledAt: string;
}

interface PersistedGroup {
  id: string;
  name: string;
  members: Member[];
  expenses: PersistedExpense[];
  settledPayments: PersistedSettledPayment[];
}

const GROUPS_DOC_ID = "groups_data";

const coerceDate = (value: unknown): Date => {
  if (value && typeof value === "object" && "toDate" in (value as Record<string, unknown>)) {
    const maybeTimestamp = value as { toDate?: () => Date | null | undefined };
    if (typeof maybeTimestamp.toDate === "function") {
      const dateResult = maybeTimestamp.toDate();
      if (dateResult instanceof Date && !Number.isNaN(dateResult.getTime())) {
        return dateResult;
      }
    }
  }

  if (!value) return new Date();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
};

const serializeGroup = (group: Group): PersistedGroup => ({
  id: group.id,
  name: group.name,
  members: group.members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email ?? "",
  })),
  expenses: group.expenses.map((expense) => ({
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    paidBy: expense.paidBy,
    splitAmong: expense.splitAmong,
    createdAt: expense.createdAt.toISOString(),
  })),
  settledPayments: group.settledPayments.map((payment) => ({
    from: payment.from,
    to: payment.to,
    amount: payment.amount,
    settledAt: payment.settledAt.toISOString(),
  })),
});

const deserializeGroup = (group: PersistedGroup): Group => ({
  id: group.id,
  name: group.name,
  members: (group.members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email ?? "",
  })),
  expenses: (group.expenses ?? []).map((expense) => ({
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    paidBy: expense.paidBy,
    splitAmong: expense.splitAmong ?? [],
    createdAt: coerceDate(expense.createdAt),
  })),
  settledPayments: (group.settledPayments ?? []).map((payment) => ({
    from: payment.from,
    to: payment.to,
    amount: payment.amount,
    settledAt: coerceDate(payment.settledAt),
  })),
});

const createGroup = (name: string): Group => ({
  id: crypto.randomUUID(),
  name,
  members: [],
  expenses: [],
  settledPayments: [],
});

const Index = () => {
  const { signOut, profile, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [editingMemberEmail, setEditingMemberEmail] = useState("");
  const [mounted, setMounted] = useState(false);
  const [groupsHydrated, setGroupsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced" | "error">("syncing");
  const lastSyncedHashRef = useRef("");
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && (theme === "dark" || resolvedTheme === "dark");

  useEffect(() => {
    if (!user?.id) {
      setGroups([]);
      setActiveGroupId(null);
      setGroupsHydrated(false);
      setSyncStatus("synced");
      lastSyncedHashRef.current = "";
      skipNextSaveRef.current = false;
      return;
    }

    setSyncStatus("syncing");
    const groupsRef = doc(db, "users", user.id, "app", GROUPS_DOC_ID);
    const unsubscribe = onSnapshot(
      groupsRef,
      (snapshot) => {
        const persisted = snapshot.exists() ? (snapshot.data().groups as PersistedGroup[] | undefined) : undefined;
        const safePersisted = Array.isArray(persisted) ? persisted : [];
        const nextHash = JSON.stringify(safePersisted);

        if (nextHash !== lastSyncedHashRef.current) {
          lastSyncedHashRef.current = nextHash;
          skipNextSaveRef.current = true;

          const loadedGroups = safePersisted.map(deserializeGroup);
          setGroups(loadedGroups);
          setActiveGroupId((currentActive) =>
            currentActive && loadedGroups.some((group) => group.id === currentActive) ? currentActive : null
          );
        }

        setSyncStatus("synced");
        setGroupsHydrated(true);
      },
      () => {
        setSyncStatus("error");
        toast({ title: "⚠️ Sync failed", description: "Could not sync group data from database.", variant: "destructive" });
        setGroupsHydrated(true);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !groupsHydrated) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const serializedGroups = groups.map(serializeGroup);
    const nextHash = JSON.stringify(serializedGroups);
    if (nextHash === lastSyncedHashRef.current) return;

    const persistGroups = async () => {
      try {
        setSyncStatus("syncing");
        const groupsRef = doc(db, "users", user.id, "app", GROUPS_DOC_ID);
        await setDoc(
          groupsRef,
          {
            groups: serializedGroups,
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
        lastSyncedHashRef.current = nextHash;
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
        toast({ title: "⚠️ Save failed", description: "Could not save group data to database.", variant: "destructive" });
      }
    };

    persistGroups();
  }, [groups, user?.id, groupsHydrated]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  const updateGroup = (updated: Partial<Group>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroupId ? { ...g, ...updated } : g))
    );
  };

  const balances = useMemo(
    () => (activeGroup ? computeBalances(activeGroup.members, activeGroup.expenses) : new Map()),
    [activeGroup]
  );
  const settlements = useMemo(
    () => (activeGroup ? simplifyDebts(activeGroup.members, activeGroup.expenses) : []),
    [activeGroup]
  );
  const totalSpent = useMemo(
    () => (activeGroup?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0),
    [activeGroup]
  );

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim() || "New Group";
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "⚠️ Duplicate group", description: `A group named "${name}" already exists.`, variant: "destructive" });
      return;
    }
    const group = createGroup(name);
    
    // Automatically add the logged-in user as the first member
    if (user?.email) {
      const displayName = profile?.display_name || user.email.split("@")[0] || "You";
      group.members.push({
        id: crypto.randomUUID(),
        name: displayName,
        email: user.email,
      });
    }
    
    setGroups((prev) => [...prev, group]);
    setActiveGroupId(group.id);
    setNewGroupName("");
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (activeGroupId === id) setActiveGroupId(null);
  };

  const addMember = async (name: string, email: string) => {
    try {
      console.log("[DEBUG] addMember: Start - name:", name, "email:", email);
      
      if (!activeGroup) {
        console.error("[DEBUG] addMember: activeGroup is null");
        return;
      }
      
      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();
      console.log("[DEBUG] addMember: Normalized - name:", normalizedName, "email:", normalizedEmail);
  
      if (!normalizedName || !normalizedEmail) {
        console.warn("[DEBUG] addMember: Empty normalized values");
        return;
      }
  
      if (activeGroup.members.some((m) => m.name.toLowerCase() === normalizedName.toLowerCase())) {
        console.warn("[DEBUG] addMember: Duplicate name found");
        toast({ title: "⚠️ Duplicate member", description: `A member named \"${normalizedName}\" already exists.`, variant: "destructive" });
        return;
      }
  
      if (activeGroup.members.some((m) => m.email.toLowerCase() === normalizedEmail)) {
        console.warn("[DEBUG] addMember: Duplicate email found");
        toast({ title: "⚠️ Duplicate email", description: `\"${normalizedEmail}\" is already added in this group.`, variant: "destructive" });
        return;
      }
  
      const member: Member = { id: crypto.randomUUID(), name: normalizedName, email: normalizedEmail };
      const groupNameSnapshot = activeGroup.name;
      console.log("[DEBUG] addMember: Member created -", member);
      updateGroup({ members: [...activeGroup.members, member] });
      console.log("[DEBUG] addMember: Group updated with new member");
  
      const inviterName = profile?.display_name || user?.email?.split("@")[0] || "A group admin";
      console.log("[DEBUG] addMember: Inviter name -", inviterName, "profile:", profile, "user.email:", user?.email);
      
      const inviteStatus = await sendGroupInviteEmail({
        memberName: member.name,
        memberEmail: member.email,
        groupName: groupNameSnapshot,
        inviterName,
        inviterEmail: user?.email,
      });
      console.log("[DEBUG] addMember: Invite status -", inviteStatus);
  
      if (!activeGroup) {
        console.warn("[DEBUG] addMember: activeGroup became null after async operation");
        return;
      }
  
      if (inviteStatus.sent) {
        console.log("[DEBUG] addMember: Invite sent successfully");
        toast({ title: "📩 Invite sent", description: `Invitation email sent to ${member.email}.` });
        return;
      }
  
      if (inviteStatus.reason === "not_configured") {
        console.warn("[DEBUG] addMember: Email service not configured");
        toast({
          title: "⚠️ Invite not sent",
          description: "Email service is not configured. Add EmailJS keys in .env.",
          variant: "destructive",
        });
        return;
      }
  
      console.warn("[DEBUG] addMember: Invite failed with reason:", inviteStatus.reason);
      toast({
        title: "⚠️ Invite failed",
        description: `Could not send invite email to ${member.email}.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("[DEBUG] addMember: Caught exception -", error);
      toast({
        title: "❌ Error adding member",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const removeMember = (id: string) => {
    if (!activeGroup) return;
    if (activeGroup.expenses.some((e) => e.paidBy === id || e.splitAmong.includes(id))) return;
    updateGroup({ members: activeGroup.members.filter((m) => m.id !== id) });
  };

  const startEditingMember = (member: Member) => {
    setEditingMemberId(member.id);
    setEditingMemberName(member.name);
    setEditingMemberEmail(member.email);
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    setEditingMemberName("");
    setEditingMemberEmail("");
  };

  const saveMemberEdit = () => {
    if (!activeGroup || !editingMemberId) return;

    const nextName = editingMemberName.trim();
    const nextEmail = editingMemberEmail.trim().toLowerCase();

    if (!nextName || !nextEmail) {
      toast({ title: "⚠️ Missing fields", description: "Member name and email are required.", variant: "destructive" });
      return;
    }

    const hasDuplicateName = activeGroup.members.some(
      (member) => member.id !== editingMemberId && member.name.toLowerCase() === nextName.toLowerCase()
    );
    if (hasDuplicateName) {
      toast({ title: "⚠️ Duplicate member", description: `A member named \"${nextName}\" already exists.`, variant: "destructive" });
      return;
    }

    const hasDuplicateEmail = activeGroup.members.some(
      (member) => member.id !== editingMemberId && member.email.toLowerCase() === nextEmail
    );
    if (hasDuplicateEmail) {
      toast({ title: "⚠️ Duplicate email", description: `\"${nextEmail}\" is already added in this group.`, variant: "destructive" });
      return;
    }

    updateGroup({
      members: activeGroup.members.map((member) =>
        member.id === editingMemberId ? { ...member, name: nextName, email: nextEmail } : member
      ),
    });

    toast({ title: "✏️ Member updated", description: `${nextName}'s details were updated.` });
    cancelEditingMember();
  };

  const addExpense = (title: string, amount: number, paidBy: string, splitAmong: string[]) => {
    if (!activeGroup) return;
    const isDuplicate = activeGroup.expenses.some(
      (e) => e.title.toLowerCase() === title.toLowerCase() && e.amount === amount && e.paidBy === paidBy
    );
    if (isDuplicate) {
      toast({ title: "⚠️ Duplicate expense", description: `"${title}" for ₹${amount.toFixed(2)} already exists.`, variant: "destructive" });
      return;
    }
    updateGroup({
      expenses: [
        { id: crypto.randomUUID(), title, amount, paidBy, splitAmong, createdAt: new Date() },
        ...activeGroup.expenses,
      ],
    });
    toast({
      title: "✅ Expense added",
      description: `₹${amount.toFixed(2)} for "${title}" added successfully.`,
    });
  };

  const deleteExpense = (id: string) => {
    if (!activeGroup) return;
    updateGroup({ expenses: activeGroup.expenses.filter((e) => e.id !== id) });
    toast({ title: "🗑️ Expense deleted", description: "The expense has been removed." });
  };

  const editExpense = (id: string, title: string, amount: number, paidBy: string, splitAmong: string[]) => {
    if (!activeGroup) return;
    updateGroup({
      expenses: activeGroup.expenses.map((e) =>
        e.id === id ? { ...e, title, amount, paidBy, splitAmong } : e
      ),
    });
    toast({ title: "✏️ Expense updated", description: `"${title}" has been updated.` });
  };

  const clearGroup = () => {
    if (!activeGroup) return;
    updateGroup({ members: [], expenses: [], settledPayments: [] });
  };

  const markSettled = (from: string, to: string, amount: number) => {
    if (!activeGroup) return;
    updateGroup({
      settledPayments: [
        ...activeGroup.settledPayments,
        { from, to, amount, settledAt: new Date() },
      ],
    });
    const fromName = activeGroup.members.find((m) => m.id === from)?.name ?? from;
    const toName = activeGroup.members.find((m) => m.id === to)?.name ?? to;
    toast({ title: "✅ Marked as settled", description: `${fromName} paid ₹${amount.toFixed(2)} to ${toName}.` });
  };

  const undoSettled = (from: string, to: string, amount: number) => {
    if (!activeGroup) return;
    const idx = activeGroup.settledPayments.findIndex(
      (p) => p.from === from && p.to === to && p.amount === amount
    );
    if (idx === -1) return;
    const updated = [...activeGroup.settledPayments];
    updated.splice(idx, 1);
    updateGroup({ settledPayments: updated });
    toast({ title: "↩️ Settlement undone", description: "Marked as unsettled." });
  };

  const userMenu = (
    <div className="fixed top-2 right-4 z-40 user-menu">
      <div className="relative">
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-80"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full ring-2 ring-border" />
          ) : (
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm ring-2 ring-border">
              {(profile?.display_name || user?.email || "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
            {profile?.display_name || user?.email?.split("@")[0] || "User"}
          </span>
        </button>
        {isUserMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsUserMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 animate-fade-in rounded-xl shadow-soft glass min-w-[130px] p-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTheme(isDarkMode ? "light" : "dark");
                  setIsUserMenuOpen(false);
                }}
                className="w-full justify-start gap-1.5 rounded-lg text-xs"
              >
                {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  signOut();
                }}
                className="w-full justify-start text-muted-foreground hover:text-negative gap-1.5 rounded-lg text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (user?.id && !groupsHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Group List View ───
  if (!activeGroup) {
    return (
      <div className="min-h-screen bg-background">
        {userMenu}
        {/* Hero Header */}
        <div className="gradient-hero">
          <div className="container max-w-2xl pt-12 pb-8 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                  <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="font-display font-extrabold text-2xl tracking-tight">SettleUp</h1>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mt-3 max-w-md">
              Split expenses effortlessly. Create a group, add members, and let us figure out who owes what.
            </p>
          </div>
        </div>

        <main className="container max-w-2xl py-6 px-5 space-y-6">
          {/* Export All */}
          {groups.some((g) => g.expenses.length > 0) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportAllGroupsPdf(groups)}
                className="text-muted-foreground hover:text-primary gap-1.5 rounded-xl text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export All Groups
              </Button>
            </div>
          )}
          {/* Create Group */}
          <form onSubmit={handleCreateGroup} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                className="w-full h-11 rounded-xl border border-input bg-card px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-soft transition-shadow focus-visible:shadow-glow"
                placeholder="Group name (e.g. Goa Trip 🏖️)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!newGroupName.trim()} className="h-11 rounded-xl gap-1.5 gradient-primary border-0 shadow-glow hover:opacity-90 transition-opacity px-5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </form>

          {groups.length === 0 ? (
            <div className="text-center py-20 space-y-4 animate-fade-in">
              <div className="h-20 w-20 rounded-3xl gradient-hero mx-auto flex items-center justify-center">
                <Users className="h-9 w-9 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-display font-semibold text-foreground">No groups yet</p>
                <p className="text-muted-foreground text-sm mt-1">Create your first group to start splitting expenses.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g, i) => {
                const groupTotal = g.expenses.reduce((s, e) => s + e.amount, 0);
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className="w-full text-left rounded-2xl glass shadow-soft p-4 hover:shadow-glow hover:border-primary/30 transition-all group animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-[15px] truncate">{g.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.members.length} member{g.members.length !== 1 ? "s" : ""} · {g.expenses.length} expense{g.expenses.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {groupTotal > 0 && (
                          <span className="text-sm font-display font-bold text-foreground">₹{groupTotal.toFixed(0)}</span>
                        )}
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}
                          className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-negative/10 text-muted-foreground hover:text-negative transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    {/* Member avatars preview */}
                    {g.members.length > 0 && (
                      <div className="flex items-center gap-1 mt-3 -space-x-1.5">
                        {g.members.slice(0, 5).map((m) => (
                          <MemberAvatar key={m.id} name={m.name} size="sm" className="ring-2 ring-card" />
                        ))}
                        {g.members.length > 5 && (
                          <span className="text-[10px] text-muted-foreground ml-2">+{g.members.length - 5}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── Active Group View ───
  const handleBack = () => {
    if (activeGroup.members.length === 0) {
      deleteGroup(activeGroup.id);
    } else {
      setActiveGroupId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {userMenu}
      {/* Header */}
      <header className="border-b glass-strong sticky top-0 z-10">
        <div className="container max-w-2xl py-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="group-name-section">
              {isEditingName ? (
                <input
                  autoFocus
                  className="font-display font-bold text-sm bg-transparent border-b-2 border-primary outline-none"
                  value={activeGroup.name}
                  onChange={(e) => updateGroup({ name: e.target.value })}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                />
              ) : (
                <button onClick={() => setIsEditingName(true)} className="font-display font-bold text-sm hover:text-primary transition-colors">
                  {activeGroup.name}
                </button>
              )}
              <p className="text-[11px] text-muted-foreground">
                {activeGroup.members.length} member{activeGroup.members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeGroup.expenses.length === 0}
              onClick={() => exportGroupPdf(activeGroup.name, activeGroup.members, activeGroup.expenses, balances, settlements)}
              className="text-muted-foreground hover:text-primary gap-1.5 rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            {(activeGroup.members.length > 0 || activeGroup.expenses.length > 0) && (
              <Button variant="ghost" size="sm" onClick={clearGroup} className="text-muted-foreground hover:text-negative gap-1.5 rounded-xl text-xs">
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-6 px-5 space-y-6">
        {/* Stats Cards */}
        {activeGroup.members.length > 0 && (
          <div className="grid grid-cols-3 gap-3 animate-fade-in">
            <div className="rounded-2xl glass shadow-soft p-4 text-center">
              <div className="h-8 w-8 rounded-xl bg-primary/10 mx-auto flex items-center justify-center mb-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-display font-extrabold">{activeGroup.members.length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Members</p>
            </div>
            <div className="rounded-2xl glass shadow-soft p-4 text-center">
              <div className="h-8 w-8 rounded-xl bg-accent/10 mx-auto flex items-center justify-center mb-2">
                <Receipt className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-display font-extrabold">{activeGroup.expenses.length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Expenses</p>
            </div>
            <div className="rounded-2xl glass shadow-soft p-4 text-center">
              <div className="h-8 w-8 rounded-xl bg-positive/10 mx-auto flex items-center justify-center mb-2">
                <IndianRupee className="h-4 w-4 text-positive" />
              </div>
              <p className="text-2xl font-display font-extrabold">₹{totalSpent.toFixed(0)}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total</p>
            </div>
          </div>
        )}

        {/* Members */}
        <section className="space-y-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="font-display font-bold text-xs text-muted-foreground uppercase tracking-widest">Members</h2>
          <AddMemberForm onAdd={addMember} />
          {activeGroup.members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeGroup.members.map((m) => {
                const isEditing = editingMemberId === m.id;
                const hasExpenses = activeGroup.expenses.some((e) => e.paidBy === m.id || e.splitAmong.includes(m.id));

                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-xl glass shadow-soft pl-1.5 pr-2 py-1.5 animate-fade-in-scale">
                    <MemberAvatar name={isEditing ? editingMemberName || m.name : m.name} size="sm" />

                    {isEditing ? (
                      <>
                        <input
                          value={editingMemberName}
                          onChange={(e) => setEditingMemberName(e.target.value)}
                          placeholder="Name"
                          className="h-8 w-28 rounded-lg border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <input
                          type="email"
                          value={editingMemberEmail}
                          onChange={(e) => setEditingMemberEmail(e.target.value)}
                          placeholder="Email"
                          className="h-8 w-44 rounded-lg border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <button
                          onClick={saveMemberEdit}
                          className="rounded-full p-1 hover:bg-positive/10 text-muted-foreground hover:text-positive transition-all"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelEditingMember}
                          className="rounded-full p-1 hover:bg-negative/10 text-muted-foreground hover:text-negative transition-all"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[140px]">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{m.email}</p>
                        </div>
                        <button
                          onClick={() => startEditingMember(m)}
                          className="ml-0.5 rounded-full p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                          title="Edit member"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeMember(m.id)}
                          className="ml-0.5 rounded-full p-1 hover:bg-negative/10 text-muted-foreground hover:text-negative transition-all"
                          title={hasExpenses ? "Can't remove — part of expenses" : "Remove"}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Expense Form */}
        <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <AddExpenseForm members={activeGroup.members} onAdd={addExpense} />
        </div>

        {/* Results */}
        {activeGroup.expenses.length > 0 && (
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
            <SettlementList
              members={activeGroup.members}
              settlements={settlements}
              settledPayments={activeGroup.settledPayments}
              onMarkSettled={markSettled}
              onUndoSettled={undoSettled}
            />
            <BalanceSummary members={activeGroup.members} balances={balances} />
            <ExpenseList members={activeGroup.members} expenses={activeGroup.expenses} onDelete={deleteExpense} onEdit={editExpense} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
