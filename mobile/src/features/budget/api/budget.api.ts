import { queryFirst } from '@/services/storage/local-db';
import type { LocalProfile } from '@/types/local-storage';

export interface AnnualBudget {
  /** Ngân sách năm (VND), null nếu chưa đặt. */
  amount: number | null;
  /** Đã chi thực tế trong năm (VND). */
  spent: number;
}

/** Đọc ngân sách năm và số đã chi (VND) cho Trang chủ. */
export async function getAnnualBudget(profile: LocalProfile, year: number): Promise<AnnualBudget> {
  const budget = await queryFirst<{ amountX100: number }>(
    profile,
    `SELECT amount_x100 AS amountX100 FROM budgets
     WHERE scope_type = 'ANNUAL' AND scope_year = ? AND currency = 'VND' AND deleted_at IS NULL`,
    [year],
  );
  const spend = await queryFirst<{ spentX100: number }>(
    profile,
    `SELECT actual_spend_x100 AS spentX100 FROM v_annual_spend
     WHERE scope_year = ? AND currency = 'VND'`,
    [year],
  );
  return {
    amount: budget ? budget.amountX100 / 100 : null,
    spent: spend ? spend.spentX100 / 100 : 0,
  };
}
