const MAX_VND_DIGITS = 13;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1000000 -> "1.000.000đ" */
export function formatVnd(vnd: number): string {
  const rounded = Math.round(Math.abs(vnd));
  const sign = vnd < 0 && rounded > 0 ? '-' : '';
  return `${sign}${groupThousands(String(rounded))}đ`;
}

/** Số tiền lưu dạng x100 -> "1.000.000đ". */
export function formatVndFromX100(amountX100: number): string {
  return formatVnd(amountX100 / 100);
}

/** Giá ước tính: "~750.000đ". */
export function formatEstimateFromX100(amountX100: number): string {
  return `~${formatVndFromX100(amountX100)}`;
}

/** Chỉ giữ chữ số rồi nhóm theo hàng nghìn khi người dùng đang gõ. */
export function formatVndInput(text: string): string {
  const digits = text
    .replace(/\D/g, '')
    .slice(0, MAX_VND_DIGITS)
    .replace(/^0+(?=\d)/, '');
  return groupThousands(digits);
}

/** "1.000.000" -> 1000000; chuỗi rỗng hoặc quá lớn -> null. */
export function parseVndInput(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '' || digits.length > MAX_VND_DIGITS) return null;
  return Number(digits);
}
