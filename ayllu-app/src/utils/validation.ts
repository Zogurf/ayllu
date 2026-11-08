export const normalizePeruMobilePhone = (value: string): string | null => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('51') && digits.length === 11) digits = digits.slice(2);
  if (digits.length !== 9 || digits[0] !== '9') return null;
  return `+51${digits}`;
};

export const parseOptionalAge = (value: string): number | undefined | null => {
  if (!value.trim()) return undefined;
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const age = Number(value.trim());
  return age >= 0 && age <= 125 ? age : null;
};

export const isPositiveQuantity = (value: string): boolean => {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)(?:\s|$)/);
  if (!match) return false;
  return Number(match[1].replace(',', '.')) > 0;
};

export const isReasonableText = (value: string, maxLength: number): boolean =>
  value.trim().length > 0 && value.trim().length <= maxLength;
