import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Deposit,
  DividendRecord,
  StockHolding,
  UserCategories,
  AccountAssetsDoc,
  MonthlyAssetsDoc,
  MonthlyAssetItem,
} from "@/types";

const getUserId = () => {
  return (
    auth.currentUser?.uid ||
    process.env.NEXT_PUBLIC_FIREBASE_USER_ID ||
    "default_user"
  );
};

export const dataService = {
  // 1. Categories
  async getCategories(): Promise<UserCategories | null> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/categories/user_categories`);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.warn(
        `Categories not found at users/${userId}/categories/user_categories`,
      );
    }
    return docSnap.exists() ? (docSnap.data() as UserCategories) : null;
  },

  // 2. Deposits
  async getDeposits(): Promise<Deposit[]> {
    const userId = getUserId();
    const colRef = collection(db, `users/${userId}/deposits`);
    const q = query(colRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Deposit);
  },

  // 3. Dividends
  async getDividends(): Promise<DividendRecord[]> {
    const userId = getUserId();
    const colRef = collection(db, `users/${userId}/dividends`);
    const q = query(colRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // 기존 stockName 필드가 있으면 ticker로 매핑
        ticker: data.ticker || data.stockName || "",
      } as DividendRecord;
    });
  },

  // 4. Stocks
  async getStocks(): Promise<StockHolding[]> {
    const userId = getUserId();
    const colRef = collection(db, `users/${userId}/stocks`);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as StockHolding,
    );
  },

  // 5. Manual Data
  async getAccountAssets(): Promise<AccountAssetsDoc | null> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/manualData/accountAssets`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as AccountAssetsDoc) : null;
  },

  async getMonthlyAssets(): Promise<MonthlyAssetsDoc | null> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/manualData/monthlyAssets`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as MonthlyAssetsDoc) : null;
  },

  // 6. Update Functions
  async addStock(stock: Omit<StockHolding, "id">): Promise<void> {
    const userId = getUserId();
    const colRef = collection(db, `users/${userId}/stocks`);
    await addDoc(colRef, stock);
  },

  async deleteStock(id: string): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/stocks/${id}`);
    await deleteDoc(docRef);
  },

  async updateStock(id: string, stock: Partial<StockHolding>): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/stocks/${id}`);
    await updateDoc(docRef, stock);
  },

  async addDeposit(deposit: Omit<Deposit, "id">): Promise<void> {
    const userId = getUserId();
    const colRef = collection(db, `users/${userId}/deposits`);
    await addDoc(colRef, deposit);
  },

  async deleteDeposit(id: string): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/deposits/${id}`);
    await deleteDoc(docRef);
  },

  async updateDeposit(id: string, deposit: Partial<Deposit>): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/deposits/${id}`);
    await updateDoc(docRef, deposit);
  },

  async addDividend(dividend: Omit<DividendRecord, "id">): Promise<void> {
    const userId = getUserId();
    const colRef = collection(db, `users/${userId}/dividends`);
    await addDoc(colRef, dividend);
  },

  async deleteDividend(id: string): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/dividends/${id}`);
    await deleteDoc(docRef);
  },

  async updateDividend(
    id: string,
    dividend: Partial<DividendRecord>,
  ): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/dividends/${id}`);
    await updateDoc(docRef, dividend);
  },

  async updateAccountAssets(data: AccountAssetsDoc): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/manualData/accountAssets`);
    await setDoc(docRef, data);
  },

  async updateMonthlyAssets(assets: MonthlyAssetItem[]): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/manualData/monthlyAssets`);
    await setDoc(docRef, { assets });
  },

  async updateCategories(categories: UserCategories): Promise<void> {
    const userId = getUserId();
    const docRef = doc(db, `users/${userId}/categories/user_categories`);
    await setDoc(docRef, categories);
  },
};
