"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import { Deposit, UserCategories } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { formatWithCommas, parseNumber } from "@/lib/utils";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Deposit[]>([]);
  const [categories, setCategories] = useState<UserCategories | null>(null);

  // New transaction form
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    securities: "",
    accountType: "",
    amount: "",
    note: "",
  });

  const fetchTransactions = async () => {
    const tData = await dataService.getDeposits();
    setTransactions(tData);

    const cData = await dataService.getCategories();
    setCategories(cData);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalDeposit = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawal = Math.abs(
    transactions
      .filter((t) => t.amount < 0)
      .reduce((acc, t) => acc + t.amount, 0),
  );
  const netTotal = totalDeposit - totalWithdrawal;

  const addTransaction = async () => {
    if (!formData.securities || !formData.amount) return;
    const finalAmount = parseNumber(formData.amount);

    await dataService.addDeposit({
      date: formData.date,
      securities: formData.securities,
      accountType: formData.accountType,
      amount: finalAmount,
      note: formData.note,
      createdAt: Timestamp.now(),
    });
    setFormData((p) => ({ ...p, amount: "", note: "" }));
    fetchTransactions();
  };

  const deleteTransaction = async (id: string) => {
    await dataService.deleteDeposit(id);
    fetchTransactions();
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">입출금 관리</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-red-500 dark:text-red-400">
              총 입금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500">
              ₩{totalDeposit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-blue-500 dark:text-blue-400">
              총 출금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              ₩{totalWithdrawal.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              순 입출금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${netTotal >= 0 ? "text-red-600 dark:text-red-500" : "text-blue-600 dark:text-blue-500"}`}
            >
              ₩{netTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30 border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px] space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">
                날짜
              </label>
              <Input
                type="date"
                value={formData.date}
                className="bg-background border-border"
                onChange={(e) =>
                  setFormData((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">
                증권사
              </label>
              <Select
                value={formData.securities}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, securities: val }))
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="증권사 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.securities.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">
                계좌 종류
              </label>
              <Select
                value={formData.accountType}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, accountType: val }))
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.accountTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px] space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">
                금액 (원)
              </label>
              <Input
                type="text"
                placeholder="0"
                value={formData.amount}
                className="bg-background border-border text-right font-mono"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.-]/g, "");
                  setFormData((p) => ({ ...p, amount: raw }));
                }}
              />
            </div>
            <div className="flex-[2] min-w-[200px] space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">
                비고
              </label>
              <Input
                placeholder="입금/출금 사유"
                value={formData.note}
                className="bg-background border-border"
                onChange={(e) =>
                  setFormData((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>
            <Button
              onClick={addTransaction}
              className="px-8 font-bold"
              disabled={!formData.securities || !formData.amount}
            >
              기록 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xl shadow-muted/50">
        <Table className="table-fixed w-full border-collapse">
          <TableHeader className="bg-muted/80 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[130px] border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                날짜
              </TableHead>
              <TableHead className="w-[160px] border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                증권사
              </TableHead>
              <TableHead className="w-[130px] border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                계좌 종류
              </TableHead>
              <TableHead className="w-[140px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                금액 (원)
              </TableHead>
              <TableHead className="w-[300px] border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                비고
              </TableHead>
              <TableHead className="w-12 h-11 px-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow
                key={t.id}
                className="hover:bg-muted/20 transition-colors group border-b border-border h-14"
              >
                {/* 날짜 수정 가능 셀 */}
                <TableCell className="p-0 border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                  <input
                    type="date"
                    className="w-full h-14 bg-transparent border-none outline-none focus:ring-1 focus:ring-primary px-3 text-sm font-mono text-foreground hover:bg-muted/50 transition-colors"
                    defaultValue={t.date}
                    onBlur={async (e) => {
                      if (e.target.value !== t.date) {
                        await dataService.updateDeposit(t.id, {
                          date: e.target.value,
                        });
                        fetchTransactions();
                      }
                    }}
                  />
                </TableCell>

                {/* 증권사 수정 가능 셀 */}
                <TableCell className="p-0 border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                  <Select
                    value={t.securities}
                    onValueChange={async (val) => {
                      if (val !== t.securities) {
                        await dataService.updateDeposit(t.id, {
                          securities: val,
                        });
                        fetchTransactions();
                      }
                    }}
                  >
                    <SelectTrigger className="h-14 w-full bg-transparent border-none focus:ring-1 focus:ring-primary shadow-none px-3 text-sm text-foreground hover:bg-muted/50 transition-colors rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.securities.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* 계좌 종류 수정 가능 셀 */}
                <TableCell className="p-0 border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                  <Select
                    value={t.accountType}
                    onValueChange={async (val) => {
                      if (val !== t.accountType) {
                        await dataService.updateDeposit(t.id, {
                          accountType: val,
                        });
                        fetchTransactions();
                      }
                    }}
                  >
                    <SelectTrigger className="h-14 w-full bg-transparent border-none focus:ring-1 focus:ring-primary shadow-none px-3 text-sm text-foreground hover:bg-muted/50 transition-colors rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.accountTypes.map((act) => (
                        <SelectItem key={act} value={act}>
                          {act}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* 금액 수정 가능 셀 */}
                <TableCell className="p-0 text-right border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                  <input
                    type="text"
                    className={`w-full h-14 bg-transparent border-none text-right outline-none focus:ring-1 focus:ring-primary px-3 font-mono text-sm font-bold hover:bg-muted/50 transition-colors ${
                      t.amount >= 0
                        ? "text-red-600 dark:text-red-500"
                        : "text-blue-600 dark:text-blue-500"
                    }`}
                    defaultValue={formatWithCommas(t.amount)}
                    onBlur={async (e) => {
                      const val = parseNumber(e.target.value);
                      if (!isNaN(val) && val !== t.amount) {
                        await dataService.updateDeposit(t.id, {
                          amount: val,
                        });
                        fetchTransactions();
                      }
                      e.target.value = formatWithCommas(t.amount);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      const raw = target.value.replace(/[^0-9-]/g, "");
                      target.value = formatWithCommas(raw);
                    }}
                  />
                </TableCell>

                {/* 비고 수정 가능 셀 */}
                <TableCell className="p-0 border-r border-border">
                  <input
                    type="text"
                    className="w-full h-14 bg-transparent border-none outline-none focus:ring-1 focus:ring-primary px-3 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    defaultValue={t.note}
                    onBlur={async (e) => {
                      if (e.target.value !== t.note) {
                        await dataService.updateDeposit(t.id, {
                          note: e.target.value,
                        });
                        fetchTransactions();
                      }
                    }}
                  />
                </TableCell>

                <TableCell className="text-right px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteTransaction(t.id)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
