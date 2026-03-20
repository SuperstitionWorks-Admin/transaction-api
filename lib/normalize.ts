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

export function normalizeTransaction(description: string): string {
  let normalized = description.toLowerCase().trim();

  normalized = normalized.replace(/[*#]/g, ' ');

  for (const prefix of PROCESSOR_PREFIXES) {
    const regex = new RegExp(`^${prefix}\\s*[*\\s]*`, 'i');
    normalized = normalized.replace(regex, '');
  }

  normalized = normalized.replace(/[^\w\s]/g, ' ');

  normalized = normalized.replace(/\b\d{4,}\b/g, '');

  normalized = normalized.replace(/\s+/g, ' ').trim();

  const words = normalized.split(' ');
  const filteredWords = words.filter(word => {
    if (word.length <= 2 && /^\d+$/.test(word)) {
      return false;
    }
    return true;
  });

  normalized = filteredWords.join(' ');

  for (const suffix of COMMON_SUFFIXES) {
    const regex = new RegExp(`\\s+${suffix}$`, 'i');
    normalized = normalized.replace(regex, '');
  }

  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
