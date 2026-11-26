/** 1500000 -> "1.500.000đ". */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

/** "1.500.000" hoặc "1500000" -> 1500000; rỗng hoặc không hợp lệ -> null. */
export function parseMoneyInput(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  if (digits.length === 0) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

export function formatMoneyInput(value: number | null): string {
  if (value === null) return '';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
