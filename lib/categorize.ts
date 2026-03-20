import { CategorizedTransaction, TransactionCategory } from '@/types/transaction';
import { normalizeTransaction } from './normalize';

interface MerchantRule {
  name: string;
  patterns: string[];
  category: TransactionCategory;
  exactMatch?: boolean;
}

type MatchType = 'exact' | 'partial' | 'keyword' | 'uncategorized';

const EXACT_MERCHANTS: MerchantRule[] = [
  { name: 'Walmart', patterns: ['walmart'], category: 'groceries', exactMatch: true },
  { name: 'Aldi', patterns: ['aldi'], category: 'groceries', exactMatch: true },
  { name: 'Target', patterns: ['target'], category: 'shopping', exactMatch: true },
  { name: 'Chevron', patterns: ['chevron'], category: 'gas', exactMatch: true },
  { name: 'Shell', patterns: ['shell'], category: 'gas', exactMatch: true },
  { name: 'Circle K', patterns: ['circle k', 'circlek'], category: 'gas', exactMatch: true },
  { name: 'McDonalds', patterns: ['mcdonalds', 'mcdonald'], category: 'food', exactMatch: true },
  { name: 'Starbucks', patterns: ['starbucks'], category: 'food', exactMatch: true },
  { name: 'Uber', patterns: ['uber'], category: 'transportation', exactMatch: true },
  { name: 'Lyft', patterns: ['lyft'], category: 'transportation', exactMatch: true },
  { name: 'Netflix', patterns: ['netflix'], category: 'entertainment', exactMatch: true },
  { name: 'Spotify', patterns: ['spotify'], category: 'entertainment', exactMatch: true },
  { name: 'Amazon', patterns: ['amazon', 'amzn'], category: 'shopping', exactMatch: true },
];

const PARTIAL_MERCHANTS: MerchantRule[] = [
  { name: 'Kroger', patterns: ['kroger'], category: 'groceries' },
  { name: 'Safeway', patterns: ['safeway'], category: 'groceries' },
  { name: 'Whole Foods', patterns: ['whole foods', 'wholefoods'], category: 'groceries' },
  { name: 'Trader Joes', patterns: ['trader joe', 'traderjoe'], category: 'groceries' },
  { name: 'Publix', patterns: ['publix'], category: 'groceries' },
  { name: 'BP', patterns: ['bp'], category: 'gas' },
  { name: 'Exxon', patterns: ['exxon'], category: 'gas' },
  { name: 'Mobil', patterns: ['mobil'], category: 'gas' },
  { name: 'Arco', patterns: ['arco'], category: 'gas' },
  { name: '76', patterns: ['76'], category: 'gas' },
  { name: 'Subway', patterns: ['subway'], category: 'food' },
  { name: 'Chipotle', patterns: ['chipotle'], category: 'food' },
  { name: 'Taco Bell', patterns: ['taco bell', 'tacobell'], category: 'food' },
  { name: 'Burger King', patterns: ['burger king', 'burgerking'], category: 'food' },
  { name: 'Wendys', patterns: ['wendys', 'wendy'], category: 'food' },
  { name: 'Pizza Hut', patterns: ['pizza hut', 'pizzahut'], category: 'food' },
  { name: 'Dominos', patterns: ['dominos', 'domino'], category: 'food' },
  { name: 'Panera', patterns: ['panera'], category: 'food' },
  { name: 'Dunkin', patterns: ['dunkin'], category: 'food' },
  { name: 'Best Buy', patterns: ['best buy', 'bestbuy'], category: 'shopping' },
  { name: 'Costco', patterns: ['costco'], category: 'shopping' },
  { name: 'Apple', patterns: ['apple store', 'apple com'], category: 'shopping' },
  { name: 'eBay', patterns: ['ebay'], category: 'shopping' },
  { name: 'Hulu', patterns: ['hulu'], category: 'entertainment' },
  { name: 'Disney Plus', patterns: ['disney', 'disneyplus'], category: 'entertainment' },
  { name: 'HBO', patterns: ['hbo'], category: 'entertainment' },
  { name: 'YouTube', patterns: ['youtube'], category: 'entertainment' },
  { name: 'AMC', patterns: ['amc'], category: 'entertainment' },
  { name: 'Verizon', patterns: ['verizon'], category: 'utilities' },
  { name: 'AT&T', patterns: ['at t', 'att'], category: 'utilities' },
  { name: 'T-Mobile', patterns: ['t mobile', 'tmobile'], category: 'utilities' },
  { name: 'Comcast', patterns: ['comcast'], category: 'utilities' },
  { name: 'CVS', patterns: ['cvs'], category: 'health' },
  { name: 'Walgreens', patterns: ['walgreens'], category: 'health' },
  { name: 'Airbnb', patterns: ['airbnb'], category: 'travel' },
  { name: 'Hotel', patterns: ['hotel', 'marriott', 'hilton', 'hyatt'], category: 'travel' },
  { name: 'Southwest', patterns: ['southwest'], category: 'travel' },
  { name: 'Delta', patterns: ['delta'], category: 'travel' },
  { name: 'United', patterns: ['united'], category: 'travel' },
];

interface KeywordRule {
  keywords: string[];
  category: TransactionCategory;
}

const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ['grocery', 'supermarket', 'market', 'food mart'], category: 'groceries' },
  { keywords: ['gas station', 'fuel', 'petrol', 'gasoline'], category: 'gas' },
  { keywords: ['restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'grill', 'bar', 'pub'], category: 'food' },
  { keywords: ['airline', 'airways', 'flight'], category: 'travel' },
  { keywords: ['pharmacy', 'drug', 'medical', 'clinic', 'hospital'], category: 'health' },
  { keywords: ['electric', 'power', 'water', 'internet', 'cable', 'phone'], category: 'utilities' },
  { keywords: ['movie', 'cinema', 'theater', 'theatre'], category: 'entertainment' },
  { keywords: ['store', 'shop', 'retail', 'mart'], category: 'shopping' },
];

export function categorizeTransaction(description: string): CategorizedTransaction {
  const normalized = normalizeTransaction(description);

  const exactMatch = findExactMatch(normalized);
  if (exactMatch) {
    return {
      original: description,
      normalized,
      merchant: exactMatch.name,
      category: exactMatch.category,
      confidence: calculateConfidence('exact', exactMatch.name, normalized),
    };
  }

  const partialMatch = findPartialMatch(normalized);
  if (partialMatch) {
    return {
      original: description,
      normalized,
      merchant: partialMatch.name,
      category: partialMatch.category,
      confidence: calculateConfidence('partial', partialMatch.name, normalized),
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

function findExactMatch(normalized: string): MerchantRule | null {
  for (const merchant of EXACT_MERCHANTS) {
    for (const pattern of merchant.patterns) {
      if (normalized === pattern || normalized.startsWith(pattern + ' ') || normalized.endsWith(' ' + pattern)) {
        return merchant;
      }
    }
  }
  return null;
}

function findPartialMatch(normalized: string): MerchantRule | null {
  for (const merchant of PARTIAL_MERCHANTS) {
    for (const pattern of merchant.patterns) {
      if (normalized.includes(pattern)) {
        return merchant;
      }
    }
  }
  return null;
}

function findKeywordMatch(normalized: string): KeywordRule | null {
  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return rule;
      }
    }
  }
  return null;
}

function calculateConfidence(matchType: MatchType, merchantOrText?: string, normalized?: string): number {
  switch (matchType) {
    case 'exact': {
      const merchantName = merchantOrText || '';
      const normalizedText = normalized || '';

      if (normalizedText === merchantName.toLowerCase()) {
        return 0.99;
      }
      if (normalizedText.split(' ').length <= 2) {
        return 0.97;
      }
      return 0.95;
    }
    case 'partial': {
      const words = normalized?.split(' ') || [];
      if (words.length <= 3) {
        return 0.90;
      }
      if (words.length <= 5) {
        return 0.85;
      }
      return 0.80;
    }
    case 'keyword': {
      const words = merchantOrText?.split(' ') || [];
      if (words.length <= 2) {
        return 0.75;
      }
      if (words.length <= 4) {
        return 0.68;
      }
      return 0.60;
    }
    case 'uncategorized': {
      const words = merchantOrText?.split(' ') || [];
      if (words.length === 0) {
        return 0.40;
      }
      if (words.length <= 2) {
        return 0.55;
      }
      return 0.50;
    }
    default:
      return 0.50;
  }
}

function extractMerchantName(normalized: string): string {
  const words = normalized.split(' ').filter(w => w.length > 2);

  if (words.length > 0) {
    const firstWord = words[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  const allWords = normalized.split(' ').filter(w => w.length > 0);
  if (allWords.length > 0) {
    const firstWord = allWords[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  return 'Unknown';
}
