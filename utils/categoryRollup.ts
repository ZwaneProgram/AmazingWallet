import { Category } from "../interfaces/Category";
import { Expense } from "../interfaces/Expense";

export interface RollupSub {
  id: number;
  name: string;
  color?: string;
  icon?: any;
  total: number;
}

export interface RollupParent {
  id: number;
  name: string;
  color?: string;
  icon?: any;
  directTotal: number;
  subTotals: RollupSub[];
  effectiveTotal: number;
}

// Rolls a list of expenses up the 2-level category tree: each parent gets its own
// direct spend plus the spend of all its sub-categories. Pure + reusable so both the
// redux selector (Home month) and the Graph screen (its own month) share one implementation.
export const computeCategoryRollup = (
  expenses: Expense[],
  categories: Category[]
): RollupParent[] => {
  const cats = categories || [];
  const byId = new Map<number, Category>();
  cats.forEach((c: Category) => {
    if (c.id != null) byId.set(c.id, c);
  });

  interface Parent {
    id: number;
    name: string;
    color?: string;
    icon?: any;
    directTotal: number;
    subTotals: Map<number, RollupSub>;
    effectiveTotal: number;
  }
  const parents = new Map<number, Parent>();

  const ensure = (pid: number): Parent => {
    let p = parents.get(pid);
    if (!p) {
      const pc = byId.get(pid);
      p = {
        id: pid,
        name: pc?.name ?? "Other",
        color: pc?.color,
        icon: pc?.icon,
        directTotal: 0,
        subTotals: new Map(),
        effectiveTotal: 0,
      };
      parents.set(pid, p);
    }
    return p;
  };

  (expenses || []).forEach((e: Expense) => {
    let catId = e.categoryId;
    if (catId == null && e.name) {
      catId = cats.find((c: Category) => c.name === e.name)?.id;
    }
    if (catId == null) return;
    const cat = byId.get(catId);
    const isSub = !!cat?.parentId;
    const pid = (isSub ? cat!.parentId! : cat?.id ?? catId) as number;
    const p = ensure(pid);
    p.effectiveTotal += e.amount;
    if (isSub && cat) {
      const sub = p.subTotals.get(cat.id!) ?? {
        id: cat.id!,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        total: 0,
      };
      sub.total += e.amount;
      p.subTotals.set(cat.id!, sub);
    } else {
      p.directTotal += e.amount;
    }
  });

  return Array.from(parents.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      icon: p.icon,
      directTotal: p.directTotal,
      subTotals: Array.from(p.subTotals.values()).sort((a, b) => b.total - a.total),
      effectiveTotal: p.effectiveTotal,
    }))
    .sort((a, b) => b.effectiveTotal - a.effectiveTotal);
};
