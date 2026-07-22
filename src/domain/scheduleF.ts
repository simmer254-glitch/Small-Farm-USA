// Exact Schedule F line strings — single source of truth for the Add Transaction dropdown.

export const EXPENSE_LINES = [
  'Line 10 · Car & truck',
  'Line 13 · Custom hire',
  'Line 16 · Feed',
  'Line 17 · Fertilizers & lime',
  'Line 19 · Gasoline, fuel & oil',
  'Line 20 · Insurance',
  'Line 22 · Labor hired',
  'Line 24 · Rent/lease',
  'Line 25 · Repairs & maintenance',
  'Line 26 · Seeds & plants',
  'Line 28 · Supplies',
  'Line 29 · Taxes',
  'Line 30 · Utilities',
  'Line 31 · Vet, breeding & medicine',
  'Line 32 · Other expenses',
] as const;

export const INCOME_LINES = [
  'Line 1a · Sales of purchased livestock',
  'Line 2 · Sales of raised livestock/produce',
  'Line 4a · Ag program payments',
  'Line 8 · Other income',
] as const;

export const SALE_INCOME_LINE = 'Line 2 · Sales of raised livestock/produce';
