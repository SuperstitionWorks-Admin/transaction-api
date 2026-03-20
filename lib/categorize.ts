import { CategorizedTransaction, TransactionCategory } from '@/types/transaction';
import { normalizeTransaction } from './normalize';

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchType = 'exact' | 'partial' | 'keyword' | 'uncategorized';

interface MerchantRule {
  name: string;
  patterns: string[];
  category: TransactionCategory;
  /**
   * 'exact'   — the pattern must match as a whole word (or the entire string).
   *             Use for short, collision-prone names like "uber", "shell", "target".
   * 'partial' — the pattern just needs to appear anywhere in the normalised text.
   *             Use for longer, distinctive names like "chipotle", "walgreens".
   */
  matchType: 'exact' | 'partial';
}

interface KeywordRule {
  keywords: string[];
  category: TransactionCategory;
}

// ─── Merchant rules ───────────────────────────────────────────────────────────
//
// Keep one flat list.  matchType controls how the pattern is tested —
// no need for two separate arrays that have to stay in sync.

const MERCHANTS: MerchantRule[] = [
  // Groceries
  { name: 'Walmart',      patterns: ['walmart'],                    category: 'groceries',      matchType: 'exact'   },
  { name: 'Aldi',         patterns: ['aldi'],                       category: 'groceries',      matchType: 'exact'   },
  { name: 'Kroger',       patterns: ['kroger'],                     category: 'groceries',      matchType: 'partial' },
  { name: 'Safeway',      patterns: ['safeway'],                    category: 'groceries',      matchType: 'partial' },
  { name: 'Whole Foods',  patterns: ['whole foods', 'wholefoods'],  category: 'groceries',      matchType: 'partial' },
  { name: 'Trader Joes',  patterns: ['trader joe', 'traderjoe'],    category: 'groceries',      matchType: 'partial' },
  { name: 'Publix',       patterns: ['publix'],                     category: 'groceries',      matchType: 'partial' },
  // Gas
  { name: 'Chevron',      patterns: ['chevron'],                    category: 'gas',            matchType: 'exact'   },
  { name: 'Shell',        patterns: ['shell'],                      category: 'gas',            matchType: 'exact'   },
  { name: 'Circle K',     patterns: ['circle k', 'circlek'],        category: 'gas',            matchType: 'exact'   },
  { name: 'BP',           patterns: ['bp'],                         category: 'gas',            matchType: 'exact'   },
  { name: 'Exxon',        patterns: ['exxon'],                      category: 'gas',            matchType: 'partial' },
  { name: 'Mobil',        patterns: ['mobil'],                      category: 'gas',            matchType: 'partial' },
  { name: 'Arco',         patterns: ['arco'],                       category: 'gas',            matchType: 'partial' },
  { name: '76',           patterns: ['76'],                         category: 'gas',            matchType: 'exact'   },
  // Food
  { name: 'McDonalds',    patterns: ['mcdonalds', 'mcdonald'],      category: 'food',           matchType: 'exact'   },
  { name: 'Starbucks',    patterns: ['starbucks'],                  category: 'food',           matchType: 'exact'   },
  { name: 'Subway',       patterns: ['subway'],                     category: 'food',           matchType: 'partial' },
  { name: 'Chipotle',     patterns: ['chipotle'],                   category: 'food',           matchType: 'partial' },
  { name: 'Taco Bell',    patterns: ['taco bell', 'tacobell'],      category: 'food',           matchType: 'partial' },
  { name: 'Burger King',  patterns: ['burger king', 'burgerking'],  category: 'food',           matchType: 'partial' },
  { name: 'Wendys',       patterns: ['wendys', 'wendy'],            category: 'food',           matchType: 'partial' },
  { name: 'Pizza Hut',    patterns: ['pizza hut', 'pizzahut'],      category: 'food',           matchType: 'partial' },
  { name: 'Dominos',      patterns: ['dominos', 'domino'],          category: 'food',           matchType: 'partial' },
  { name: 'Panera',       patterns: ['panera'],                     category: 'food',           matchType: 'partial' },
  { name: 'Dunkin',       patterns: ['dunkin'],                     category: 'food',           matchType: 'partial' },
  // Transportation
  { name: 'Uber',         patterns: ['uber'],                       category: 'transportation', matchType: 'exact'   },
  { name: 'Lyft',         patterns: ['lyft'],                       category: 'transportation', matchType: 'exact'   },
  // Shopping
  { name: 'Target',       patterns: ['target'],                     category: 'shopping',       matchType: 'exact'   },
  { name: 'Amazon',       patterns: ['amazon', 'amzn'],             category: 'shopping',       matchType: 'exact'   },
  { name: 'Best Buy',     patterns: ['best buy', 'bestbuy'],        category: 'shopping',       matchType: 'partial' },
  { name: 'Costco',       patterns: ['costco'],                     category: 'shopping',       matchType: 'partial' },
  { name: 'Apple',        patterns: ['apple store', 'apple com'],   category: 'shopping',       matchType: 'partial' },
  { name: 'eBay',         patterns: ['ebay'],                       category: 'shopping',       matchType: 'partial' },
  // Entertainment
  { name: 'Netflix',      patterns: ['netflix'],                    category: 'entertainment',  matchType: 'exact'   },
  { name: 'Spotify',      patterns: ['spotify'],                    category: 'entertainment',  matchType: 'exact'   },
  { name: 'Hulu',         patterns: ['hulu'],                       category: 'entertainment',  matchType: 'partial' },
  { name: 'Disney Plus',  patterns: ['disney', 'disneyplus'],       category: 'entertainment',  matchType: 'partial' },
  { name: 'HBO',          patterns: ['hbo'],                        category: 'entertainment',  matchType: 'partial' },
  { name: 'YouTube',      patterns: ['youtube'],                    category: 'entertainment',  matchType: 'partial' },
  { name: 'AMC',          patterns: ['amc'],                        category: 'entertainment',  matchType: 'exact'   },
  // Utilities
  { name: 'Verizon',      patterns: ['verizon'],                    category: 'utilities',      matchType: 'partial' },
  { name: 'AT&T',         patterns: ['at t', 'att'],                category: 'utilities',      matchType: 'exact'   },
  { name: 'T-Mobile',     patterns: ['t mobile', 'tmobile'],        category: 'utilities',      matchType: 'partial' },
  { name: 'Comcast',      patterns: ['comcast'],                    category: 'utilities',      matchType: 'partial' },
  // Health
  { name: 'CVS',          patterns: ['cvs'],                        category: 'health',         matchType: 'exact'   },
  { name: 'Walgreens',    patterns: ['walgreens'],                  category: 'health',         matchType: 'partial' },
  // Travel
  { name: 'Airbnb',       patterns: ['airbnb'],                     category: 'travel',         matchType: 'partial' },
  { name: 'Hotel',        patterns: ['hotel', 'marriott', 'hilton', 'hyatt'], category: 'travel', matchType: 'partial' },
  { name: 'Southwest',    patterns: ['southwest'],                  category: 'travel',         matchType: 'partial' },
  { name: 'Delta',        patterns: ['delta'],                      category: 'travel',         matchType: 'partial' },
  { name: 'United',       patterns: ['united'],                     category: 'travel',         matchType: 'partial' },
];

const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ['grocery', 'supermarket', 'market', 'food mart'], category: 'groceries'     },
  { keywords: ['gas station', 'fuel', 'petrol', 'gasoline'],     category: 'gas'           },
  { keywords: ['restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'grill', 'bar', 'pub'], category: 'food' },
  { keywords: ['airline', 'airways', 'flight'],                   category: 'travel'        },
  { keywords: ['pharmacy', 'drug', 'medical', 'clinic', 'hospital'], category: 'health'    },
  { keywords: ['electric', 'power', 'water', 'internet', 'cable', 'phone'], category: 'utilities' },
  { keywords: ['movie', 'cinema', 'theater', 'theatre'],         category: 'entertainment' },
  { keywords: ['store', 'shop', 'retail', 'mart'],               category: 'shopping'      },
];

// ─── Pre-compiled pattern cache ───────────────────────────────────────────────
//
// For exact-match rules, build a word-boundary regex once per pattern so we
// don't recompile on every request.  Partial-match rules use String.includes
// which needs no regex.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CompiledMerchant {
  rule: MerchantRule;
  regexes: RegExp[] | null; // null means use includes() instead
}

const COMPILED_MERCHANTS: CompiledMerchant[] = MERCHANTS.map((rule) => ({
  rule,
  regexes:
    rule.matchType === 'exact'
      ? rule.patterns.map(
          (p) => new RegExp(`(^|\\s)${escapeRegex(p)}(\\s|$)`, 'i')
        )
      : null,
}));

// ─── Matching helpers ─────────────────────────────────────────────────────────

function findMerchantMatch(normalized: string): MerchantRule | null {
  for (const { rule, regexes } of COMPILED_MERCHANTS) {
    if (regexes) {
      // Exact: pattern must appear as a whole word (or the entire string)
      if (regexes.some((re) => re.test(normalized))) return rule;
    } else {
      // Partial: pattern appears anywhere in the string
      if (rule.patterns.some((p) => normalized.includes(p))) return rule;
    }
  }
  return null;
}

function findKeywordMatch(normalized: string): KeywordRule | null {
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) return rule;
  }
  return null;
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

function calculateConfidence(
  matchType: MatchType,
  merchantOrText?: string,
  normalized?: string
): number {
  switch (matchType) {
    case 'exact': {
      const name = (merchantOrText ?? '').toLowerCase();
      const text = normalized ?? '';
      if (text === name) return 0.99;
      if (text.split(' ').length <= 2) return 0.97;
      return 0.95;
    }
    case 'partial': {
      const wordCount = (normalized ?? '').split(' ').length;
      if (wordCount <= 3) return 0.90;
      if (wordCount <= 5) return 0.85;
      return 0.80;
    }
    case 'keyword': {
      const wordCount = (merchantOrText ?? '').split(' ').length;
      if (wordCount <= 2) return 0.75;
      if (wordCount <= 4) return 0.68;
      return 0.60;
    }
    case 'uncategorized': {
      const wordCount = (merchantOrText ?? '').split(' ').length;
      if (wordCount === 0) return 0.40;
      if (wordCount <= 2) return 0.55;
      return 0.50;
    }
    default:
      return 0.50;
  }
}

// ─── Merchant name extraction ─────────────────────────────────────────────────

function extractMerchantName(normalized: string): string {
  const words = normalized.split(' ').filter((w) => w.length > 2);
  const first = words[0] ?? normalized.split(' ').find((w) => w.length > 0);
  if (!first) return 'Unknown';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function categorizeTransaction(description: string): CategorizedTransaction {
  const normalized = normalizeTransaction(description);

  const merchantMatch = findMerchantMatch(normalized);
  if (merchantMatch) {
    const matchType: MatchType = merchantMatch.matchType; // 'exact' | 'partial'
    return {
      original: description,
      normalized,
      merchant: merchantMatch.name,
      category: merchantMatch.category,
      confidence: calculateConfidence(matchType, merchantMatch.name, normalized),
    };
  }

  const keywordMatch = findKeywordMatch(normalized);
  if (keywordMatch) {
    return {
      original: description,
      normalized,
      merchant: extractMerchantName(normalized),
      category: keywordMatch.category,
      confidence: calculateConfidence('keyword', normalized),
    };
  }

  return {
    original: description,
    normalized,
    merchant: extractMerchantName(normalized),
    category: 'uncategorized',
    confidence: calculateConfidence('uncategorized', normalized),
  };
}
