"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import { AccountAssetsDoc, Deposit, UserCategories } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatWithCommas, parseNumber } from "@/lib/utils";
import {
  Trash2,
  Building2,
  Wallet2,
  TrendingUp,
  TrendingDown,
  Landmark,
  Plus,
} from "lucide-react";

interface AccountRow {
  key: string; // "Broker|Type"
  broker: string;
  type: string;
  currentAsset: number;
  cumulativeDeposit: number;
}

export default function AccountsPage() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<UserCategories | null>(null);
  const [open, setOpen] = useState(false);

  // For new account
  const [newBroker, setNewBroker] = useState("");
  const [newType, setNewType] = useState("");

  const fetchAccounts = async () => {
    const assets = await dataService.getAccountAssets();
    const deposits = await dataService.getDeposits();
    const cats = await dataService.getCategories();
    setCategories(cats);

    // Group deposits by "Broker|Type"
    const depositMap: Record<string, number> = {};
    deposits.forEach((d) => {
      const key = `${d.securities}|${d.accountType}`;
      depositMap[key] = (depositMap[key] || 0) + d.amount;
    });

    const accountKeys = Array.from(
      new Set([...Object.keys(assets || {}), ...Object.keys(depositMap)]),
    );

    const computedRows: AccountRow[] = accountKeys.map((k) => {
      const parts = k.split("|");
      return {
        key: k,
        broker: parts[0] || "Unknown",
        type: parts[1] || "Unknown",
        currentAsset: assets?.[k] || 0,
        cumulativeDeposit: depositMap[k] || 0,
      };
    });

    setRows(computedRows);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const updateAsset = async (key: string, amount: number) => {
    const assets = (await dataService.getAccountAssets()) || {};
    const updated = { ...assets, [key]: amount };
    await dataService.updateAccountAssets(updated);
    fetchAccounts();
  };

  const deleteAccount = async (key: string) => {
    if (
      !confirm(
        "이 계좌 정보를 삭제하시겠습니까? (누적 입출금 데이터는 삭제되지 않습니다)",
      )
    )
      return;
    const assets = (await dataService.getAccountAssets()) || {};
    const { [key]: _, ...remaining } = assets;
    await dataService.updateAccountAssets(remaining);
    fetchAccounts();
  };

  const addAccount = async () => {
    if (!newBroker || !newType) return;
    const key = `${newBroker}|${newType}`;
    await updateAsset(key, 0);
    setOpen(false);
    setNewBroker("");
    setNewType("");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">계좌 현황</h1>
          <p className="text-muted-foreground mt-1">
            각 증권사별 보유 자산과 수익 현황을 관리합니다.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold flex gap-2">
              <Plus className="w-4 h-4" /> 신규 계좌 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새로운 계좌 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>증권사 선택</Label>
                <Select onValueChange={setNewBroker}>
                  <SelectTrigger>
                    <SelectValue placeholder="증권사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.securities.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>계좌 종류 선택</Label>
                <Select onValueChange={setNewType}>
                  <SelectTrigger>
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
            </div>
            <DialogFooter>
              <Button onClick={addAccount} className="w-full font-bold">
                계좌 저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {rows.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl border-border text-muted-foreground">
            등록된 계좌가 없습니다. 상단의 버튼을 통해 계좌를 추가해 주세요.
          </div>
        )}
        {rows.map((row) => {
          const total = row.currentAsset;
          const deposit = row.cumulativeDeposit;
          const profit = total - deposit;
          const returnRate = deposit !== 0 ? (profit / deposit) * 100 : 0;

          return (
            <Card
              key={row.key}
              className="overflow-hidden shadow-md border-border bg-card transition-all hover:shadow-xl hover:shadow-muted/20"
            >
              <CardHeader className="bg-muted/50 py-4 border-b border-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background rounded-lg border border-border flex items-center justify-center shadow-sm">
                    <Landmark className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">
                      {row.broker}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                      {row.type}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50/10 transition-colors"
                  onClick={() => deleteAccount(row.key)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground ml-1 font-bold uppercase tracking-wider">
                    현재 총자산 (원)
                  </Label>
                  <div className="relative group">
                    <Input
                      className="text-lg font-black bg-muted/30 border-border h-12 text-foreground focus-visible:ring-indigo-500/30 transition-all font-mono pl-4 pr-10"
                      defaultValue={formatWithCommas(total)}
                      onBlur={(e) => {
                        const val = parseNumber(e.target.value);
                        updateAsset(row.key, val);
                        e.target.value = formatWithCommas(val);
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        const raw = target.value.replace(/[^0-9-]/g, "");
                        target.value = formatWithCommas(raw);
                      }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-hover:text-primary/40 transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase font-bold tracking-tight">
                      누적 입출금
                    </p>
                    <p className="font-mono font-bold text-sm">
                      ₩{deposit.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-4 border transition-colors ${
                      profit >= 0
                        ? "bg-red-50/10 border-red-500/20"
                        : "bg-blue-50/10 border-blue-500/20"
                    }`}
                  >
                    <p
                      className={`text-[10px] mb-1.5 uppercase font-bold tracking-tight ${
                        profit >= 0 ? "text-red-500" : "text-blue-500"
                      }`}
                    >
                      누적 수익금
                    </p>
                    <div className="flex flex-col">
                      <p
                        className={`font-mono font-black text-sm ${
                          profit >= 0 ? "text-red-500" : "text-blue-500"
                        }`}
                      >
                        {profit >= 0 ? "+" : ""}
                        {profit.toLocaleString()}
                      </p>
                      <div
                        className={`text-[11px] font-bold leading-none mt-1.5 flex items-center ${
                          profit >= 0 ? "text-red-600" : "text-blue-600"
                        }`}
                      >
                        {profit >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 mr-1" />
                        )}
                        {profit >= 0 ? "+" : ""}
                        {returnRate.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
