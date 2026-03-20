const PROCESSOR_PREFIXES = [
  'paypal',
  'sq',
  'stripe',
  'card purchase',
  'debit card purchase',
  'credit card purchase',
  'pos',
  'tst',
  'checkcard',
  'purchase authorized on',
  'visa checkout',
];

const COMMON_SUFFIXES = [
  'inc',
  'llc',
  'corp',
  'corporation',
  'company',
  'co',
  'ltd',
];

// Pre-compiled at module load — not rebuilt on every call.
const COMPILED_PREFIX_RES = PROCESSOR_PREFIXES.map(
  (p) => new RegExp(`^${p}\\s*[*\\s]*`, 'i')
);
const COMPILED_SUFFIX_RES = COMMON_SUFFIXES.map(
  (s) => new RegExp(`\\s+${s}$`, 'i')
);

export function normalizeTransaction(description: string): string {
  let normalized = description.toLowerCase().trim();

  normalized = normalized.replace(/[*#]/g, ' ');

  for (const re of COMPILED_PREFIX_RES) {
    normalized = normalized.replace(re, '');
  }

  normalized = normalized.replace(/[^\w\s]/g, ' ');
  normalized = normalized.replace(/\b\d{4,}\b/g, '');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  const words = normalized
    .split(' ')
    .filter((word) => !(word.length <= 2 && /^\d+$/.test(word)));

  normalized = words.join(' ');

  for (const re of COMPILED_SUFFIX_RES) {
    normalized = normalized.replace(re, '');
  }

  return normalized.replace(/\s+/g, ' ').trim();
}
