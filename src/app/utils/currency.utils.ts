export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'RON', symbol: 'Lei', name: 'Romanian Leu' },
];

export const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: '$',
  RON: 'Lei',
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}
