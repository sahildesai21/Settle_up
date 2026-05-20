export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string; // member id
  splitAmong: string[]; // member ids
  createdAt: Date;
}

export interface Settlement {
  from: string; // member id
  to: string; // member id
  amount: number;
}

/** Compute net balance for each member (positive = owed money, negative = owes money) */
export function computeBalances(members: Member[], expenses: Expense[]): Map<string, number> {
  const balances = new Map<string, number>();
  members.forEach((m) => balances.set(m.id, 0));

  for (const expense of expenses) {
    const share = Math.round((expense.amount * 100) / expense.splitAmong.length) / 100;
    const totalShares = share * expense.splitAmong.length;
    const remainder = Math.round((expense.amount - totalShares) * 100) / 100;

    // Payer gets credited the full amount
    balances.set(expense.paidBy, (balances.get(expense.paidBy) ?? 0) + expense.amount);

    // Each participant gets debited their share
    expense.splitAmong.forEach((id, idx) => {
      const amt = idx === 0 ? share + remainder : share;
      balances.set(id, (balances.get(id) ?? 0) - amt);
    });
  }

  // Round all balances
  balances.forEach((val, key) => balances.set(key, Math.round(val * 100) / 100));
  return balances;
}

/** Greedy algorithm to simplify debts into minimum transactions */
export function simplifyDebts(members: Member[], expenses: Expense[]): Settlement[] {
  const balances = computeBalances(members, expenses);
  
  // Filter out zero balances and separate into creditors/debtors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  balances.forEach((balance, id) => {
    if (balance < -0.01) debtors.push({ id, amount: -balance });
    else if (balance > 0.01) creditors.push({ id, amount: balance });
  });

  // Sort descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(amount * 100) / 100;
    
    if (rounded > 0) {
      settlements.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: rounded,
      });
    }

    debtors[i].amount -= amount;
    creditors[j].amount -= amount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}
