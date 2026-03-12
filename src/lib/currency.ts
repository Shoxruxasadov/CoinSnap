export type CurrencyCode = 'USD' | 'RUB' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'CNY' | 'INR' | 'TRY' | 'CHF' | 'SEK';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  rate: number; // Rate relative to USD
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', rate: 1 },
  RUB: { code: 'RUB', symbol: '₽', rate: 92 },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.79 },
  JPY: { code: 'JPY', symbol: '¥', rate: 149 },
  CAD: { code: 'CAD', symbol: 'C$', rate: 1.36 },
  CNY: { code: 'CNY', symbol: '元', rate: 7.24 },
  INR: { code: 'INR', symbol: '₹', rate: 83 },
  TRY: { code: 'TRY', symbol: '₺', rate: 32 },
  CHF: { code: 'CHF', symbol: 'CHF ', rate: 0.88 },
  SEK: { code: 'SEK', symbol: 'kr ', rate: 10.5 },
};

export function convertFromUSD(amountUSD: number, toCurrency: CurrencyCode): number {
  const currency = CURRENCIES[toCurrency] || CURRENCIES.USD;
  return amountUSD * currency.rate;
}

export function formatPrice(
  amountUSD: number | null,
  currencyCode: string,
  options?: { decimals?: number }
): string {
  if (amountUSD == null) return '-';
  
  const code = (currencyCode as CurrencyCode) || 'USD';
  const currency = CURRENCIES[code] || CURRENCIES.USD;
  const converted = amountUSD * currency.rate;
  const decimals = options?.decimals ?? (currency.rate >= 10 ? 0 : 2);
  
  return `${currency.symbol}${converted.toFixed(decimals)}`;
}

export function formatPriceRange(
  minUSD: number | null,
  maxUSD: number | null,
  currencyCode: string
): string {
  if (minUSD == null && maxUSD == null) return '-';
  
  const code = (currencyCode as CurrencyCode) || 'USD';
  const currency = CURRENCIES[code] || CURRENCIES.USD;
  const decimals = currency.rate >= 10 ? 0 : 2;
  
  if (minUSD != null && maxUSD != null) {
    const minConverted = minUSD * currency.rate;
    const maxConverted = maxUSD * currency.rate;
    return `${currency.symbol}${minConverted.toFixed(decimals)} - ${currency.symbol}${maxConverted.toFixed(decimals)}`;
  }
  
  if (minUSD != null) {
    const converted = minUSD * currency.rate;
    return `${currency.symbol}${converted.toFixed(decimals)}`;
  }
  
  if (maxUSD != null) {
    const converted = maxUSD * currency.rate;
    return `${currency.symbol}${converted.toFixed(decimals)}`;
  }
  
  return '-';
}

export function getCurrencySymbol(currencyCode: string): string {
  const code = (currencyCode as CurrencyCode) || 'USD';
  return CURRENCIES[code]?.symbol || '$';
}
