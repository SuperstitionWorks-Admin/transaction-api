export interface CategorizedTransaction {
  original: string;
  normalized: string;
  merchant: string;
  category: string;
  confidence: number;
}

export type TransactionCategory =
  | 'groceries'
  | 'gas'
  | 'food'
  | 'transportation'
  | 'entertainment'
  | 'shopping'
  | 'utilities'
  | 'health'
  | 'travel'
  | 'uncategorized';
