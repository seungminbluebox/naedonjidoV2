import { Timestamp } from "firebase/firestore";

/**
 * 1. categories (users/{userId}/categories/user_categories)
 */
export interface UserCategories {
  securities: string[];
  accountTypes: string[];
  stocks: {
    name: string;
    ticker: string;
  }[];
}

/**
 * 2. deposits (users/{userId}/deposits/{docId})
 */
export interface Deposit {
  id: string; // docId
  date: string; // YYYY-MM-DD
  securities: string;
  accountType: string;
  amount: number;
  note: string;
  createdAt: Timestamp;
}

/**
 * 3. dividends (users/{userId}/dividends/{docId})
 */
export interface DividendRecord {
  id: string;
  date: string; // YYYY-MM-DD
  ticker: string;
  amount: number;
  currency: "KRW" | "USD";
  securities: string;
  createdAt: Timestamp;
}

/**
 * 4. stocks (users/{userId}/stocks/{docId})
 */
export interface StockHolding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currency: "KRW" | "USD";
  createdAt: Timestamp;
}

/**
 * 5. manualData (users/{userId}/manualData/{docId})
 */

// docId: accountAssets
export interface AccountAssetsDoc {
  [key: string]: number; // "증권사|계좌종류": 금액
}

// docId: monthlyAssets
export interface MonthlyAssetItem {
  month: string; // "YYYY-MM"
  asset: number;
  inOut?: number; // 월간 입출금액 (선택 사항, 수동 입력 시)
}

export interface MonthlyAssetsDoc {
  assets: MonthlyAssetItem[];
}
