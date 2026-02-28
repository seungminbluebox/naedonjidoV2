"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import { StockHolding, UserCategories } from "@/types";
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
import {
  Trash2,
  Plus,
  Edit2,
  Check,
  X,
  TrendingUp,
  Wallet,
  Settings,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { formatWithCommas, parseNumber } from "@/lib/utils";

interface StockWithCurrentPrice extends StockHolding {
  currentPrice: number | null;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockWithCurrentPrice[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [categories, setCategories] = useState<UserCategories | null>(null);

  // New stock form
  const [formData, setFormData] = useState({
    ticker: "",
    name: "",
    quantity: "",
    avgPrice: "",
    currency: "USD" as "USD" | "KRW",
  });

  const fetchStocks = async () => {
    const sData = await dataService.getStocks();
    const cData = await dataService.getCategories();
    setCategories(cData);

    if (!sData) return;

    // Fetch exchange rate
    try {
      const exRes = await fetch("/api/stock-price?tickers=USDKRW=X");
      if (exRes.ok) {
        const exData = await exRes.json();
        if (Array.isArray(exData) && exData[0]?.price) {
          setExchangeRate(exData[0].price);
        }
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate:", err);
    }

    // Fetch current prices for all tickers
    const tickers = Array.from(
      new Set(sData.map((s) => s.ticker.trim().toUpperCase())),
    );
    let pricesMap: Record<string, number> = {};
    if (tickers.length > 0) {
      try {
        const res = await fetch(
          `/api/stock-price?tickers=${encodeURIComponent(tickers.join(","))}`,
        );
        if (!res.ok) throw new Error("API responded with error status");

        const prices = await res.json();
        if (Array.isArray(prices)) {
          prices.forEach((p: any) => {
            if (p && p.ticker && !p.error) {
              pricesMap[p.ticker.toUpperCase()] = p.price;
            }
          });
        }
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    }

    const stocksWithPrices = sData.map((s) => ({
      ...s,
      currentPrice: pricesMap[s.ticker.trim().toUpperCase()] || null,
    }));
    setStocks(stocksWithPrices);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const addStock = async () => {
    if (!formData.ticker || !formData.quantity) return;
    await dataService.addStock({
      ticker: formData.ticker.trim().toUpperCase(),
      name: formData.name.trim(),
      quantity: parseNumber(formData.quantity.toString()),
      avgPrice: parseNumber(formData.avgPrice.toString()),
      currency: formData.currency,
      createdAt: Timestamp.now(),
    });
    setFormData((prev) => ({
      ticker: "",
      name: "",
      quantity: "",
      avgPrice: "",
      currency: prev.currency, // Keep the selected currency
    }));
    fetchStocks();
  };

  const deleteStock = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await dataService.deleteStock(id);
    fetchStocks();
  };

  const updateField = async (
    id: string,
    field: string,
    value: string | number,
  ) => {
    if (value === "") return;
    const updateData: any = {};
    updateData[field] =
      typeof value === "string" && !isNaN(parseFloat(value))
        ? parseFloat(value)
        : value;
    await dataService.updateStock(id, updateData);
    fetchStocks();
  };

  // Summary calculations
  const totalCostBasisUSD = stocks
    .filter((s) => s.currency === "USD")
    .reduce((acc, s) => acc + s.quantity * s.avgPrice, 0);
  const totalEvalAmountUSD = stocks
    .filter((s) => s.currency === "USD")
    .reduce((acc, s) => acc + s.quantity * (s.currentPrice || 0), 0);
  const totalReturnUSD =
    totalCostBasisUSD !== 0
      ? ((totalEvalAmountUSD - totalCostBasisUSD) / totalCostBasisUSD) * 100
      : 0;

  const totalCostBasisKRW = stocks
    .filter((s) => s.currency === "KRW")
    .reduce((acc, s) => acc + s.quantity * s.avgPrice, 0);
  const totalEvalAmountKRW = stocks
    .filter((s) => s.currency === "KRW")
    .reduce((acc, s) => acc + s.quantity * (s.currentPrice || 0), 0);
  const totalReturnKRW =
    totalCostBasisKRW !== 0
      ? ((totalEvalAmountKRW - totalCostBasisKRW) / totalCostBasisKRW) * 100
      : 0;

  // Final Unified Summary (Converted to KRW)
  const totalUnifiedCostKRW =
    totalCostBasisKRW + totalCostBasisUSD * (exchangeRate || 0);
  const totalUnifiedEvalKRW =
    totalEvalAmountKRW + totalEvalAmountUSD * (exchangeRate || 0);
  const totalUnifiedReturnKRW =
    totalUnifiedCostKRW !== 0
      ? ((totalUnifiedEvalKRW - totalUnifiedCostKRW) / totalUnifiedCostKRW) *
        100
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">종목 실적 관리</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-3 bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              최종 자산 요약 (모든 자산 원화 합산)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  총 매수액
                </p>
                <p className="text-2xl font-black">
                  ₩
                  {totalUnifiedCostKRW.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  총 평가 금액
                  {exchangeRate && (
                    <span className="text-[10px] font-normal opacity-70">
                      (실시간 환율: ₩{Math.round(exchangeRate).toLocaleString()}{" "}
                      적용)
                    </span>
                  )}
                </p>
                <p className="text-2xl font-black text-primary">
                  ₩
                  {totalUnifiedEvalKRW.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  전체 수익률
                </p>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-2xl font-black ${totalUnifiedReturnKRW >= 0 ? "text-red-500" : "text-blue-500"}`}
                  >
                    {totalUnifiedReturnKRW >= 0 ? "+" : ""}
                    {totalUnifiedReturnKRW.toFixed(2)}%
                  </p>
                  <TrendingUp
                    className={`w-5 h-5 ${totalUnifiedReturnKRW >= 0 ? "text-red-500" : "text-blue-500"}`}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              달러 자산 요약 (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">총 매수</p>
                <p className="text-lg font-bold">
                  $
                  {totalCostBasisUSD.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 평가</p>
                <p className="text-lg font-bold">
                  $
                  {totalEvalAmountUSD.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">수익률</p>
                <p
                  className={`text-lg font-bold ${totalReturnUSD >= 0 ? "text-red-500" : "text-blue-500"}`}
                >
                  {totalReturnUSD.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              원화 자산 요약 (KRW)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">총 매수</p>
                <p className="text-lg font-bold">
                  ₩{totalCostBasisKRW.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 평가</p>
                <p className="text-lg font-bold">
                  ₩{totalEvalAmountKRW.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">수익률</p>
                <p
                  className={`text-lg font-bold ${totalReturnKRW >= 0 ? "text-red-500" : "text-blue-500"}`}
                >
                  {totalReturnKRW.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-xl shadow-muted/50 rounded-2xl overflow-hidden mb-8 bg-card">
        <CardHeader className="bg-muted/50 border-b border-border py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
            <Plus className="w-4 h-4 text-primary" /> 종목 추가
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">
                종목 선택
              </label>
              <Select
                value={formData.ticker}
                onValueChange={(val) => {
                  const selected = categories?.stocks.find(
                    (s) => s.ticker === val,
                  );
                  setFormData((p) => ({
                    ...p,
                    ticker: val,
                    name: selected?.name || val,
                  }));
                }}
              >
                <SelectTrigger className="h-10 rounded-lg border-border font-bold text-primary">
                  <SelectValue placeholder="종목 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.stocks.map((s) => (
                    <SelectItem
                      key={s.ticker}
                      value={s.ticker}
                      className="font-bold"
                    >
                      <div className="flex justify-between w-full min-w-[120px]">
                        <span className="text-primary mr-2">{s.ticker}</span>
                        {s.name && (
                          <span className="text-muted-foreground text-[10px] uppercase">
                            {s.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="manual" className="opacity-50 text-[10px]">
                    설정으로 이동하여 관리 가능...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">
                수량
              </label>
              <Input
                type="text"
                value={formData.quantity}
                className="font-mono border-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStock();
                }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  // Allow multiple dots but let formatWithCommas handle it if possible,
                  // or just keep it as raw if we want to allow typing "1.2"
                  setFormData((p) => ({
                    ...p,
                    quantity: raw === "." ? "0." : raw,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">
                평단가
              </label>
              <Input
                type="text"
                className="font-mono border-border"
                value={formData.avgPrice}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStock();
                }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  setFormData((p) => ({
                    ...p,
                    avgPrice: raw === "." ? "0." : raw,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-muted-foreground">
                통화
              </label>
              <Select
                value={formData.currency}
                onValueChange={(val: "USD" | "KRW") =>
                  setFormData((p) => ({ ...p, currency: val }))
                }
              >
                <SelectTrigger className="border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KRW">KRW</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={addStock}
              className="h-10 rounded-lg bg-primary hover:bg-primary/90 font-bold"
            >
              종목 등록
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xl shadow-muted/50">
        <Table className="table-fixed w-full border-collapse">
          <TableHeader className="bg-muted/80 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px] border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                티커
              </TableHead>
              <TableHead className="w-[110px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                수량
              </TableHead>
              <TableHead className="w-[140px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                평단가
              </TableHead>
              <TableHead className="w-[85px] border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest text-center">
                통화
              </TableHead>
              <TableHead className="w-[120px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                현재가
              </TableHead>
              <TableHead className="w-[150px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                투자금 (매수액)
              </TableHead>
              <TableHead className="w-[150px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                평가액
              </TableHead>
              <TableHead className="w-[120px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                수익금
              </TableHead>
              <TableHead className="w-[100px] text-right border-r border-border h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                수익률
              </TableHead>
              <TableHead className="w-12 h-11 px-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map((s) => {
              const currentPrice = s.currentPrice;
              const hasPrice = currentPrice !== null && currentPrice !== 0;
              const evalAmount = hasPrice ? s.quantity * currentPrice : 0;
              const costBasis = s.quantity * s.avgPrice;
              const returnRate =
                hasPrice && costBasis !== 0
                  ? ((evalAmount - costBasis) / costBasis) * 100
                  : 0;
              const symbol = s.currency === "USD" ? "$" : "₩";

              return (
                <TableRow
                  key={s.id}
                  className="hover:bg-muted/50 transition-colors group border-b border-border h-14"
                >
                  {/* 수정 가능 셀 (파란색 계열 은은한 배경 - 다크모드 대응) */}
                  <TableCell className="p-0 border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                    <select
                      className="bg-transparent border-none outline-none focus:ring-1 focus:ring-primary h-14 w-full px-4 text-sm font-bold truncate text-foreground appearance-none cursor-pointer hover:bg-muted/50 transition-colors"
                      defaultValue={s.ticker}
                      onChange={async (e) => {
                        const newTicker = e.target.value;
                        const selected = categories?.stocks.find(
                          (sc) => sc.ticker === newTicker,
                        );
                        await dataService.updateStock(s.id, {
                          ticker: newTicker,
                          name: selected?.name || newTicker,
                        });
                        fetchStocks();
                      }}
                    >
                      {categories?.stocks.map((cs) => (
                        <option
                          key={cs.ticker}
                          value={cs.ticker}
                          className="bg-background text-foreground"
                        >
                          {cs.name ? `${cs.ticker} (${cs.name})` : cs.ticker}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="p-0 text-right border-r border-border bg-indigo-50/10 dark:bg-indigo-900/20">
                    <input
                      type="text"
                      className="w-full h-14 bg-transparent border-none text-right outline-none focus:ring-1 focus:ring-primary px-3 font-mono text-sm text-foreground hover:bg-muted/50 transition-colors"
                      defaultValue={formatWithCommas(s.quantity)}
                      onBlur={async (e) => {
                        const val = parseNumber(e.target.value);
                        if (!isNaN(val) && val !== s.quantity) {
                          await dataService.updateStock(s.id, {
                            quantity: val,
                          });
                          fetchStocks();
                        }
                        e.target.value = formatWithCommas(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        const raw = target.value.replace(/[^0-9.]/g, "");
                        target.value = raw;
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-0 text-right border-r border-border bg-indigo-50/10 dark:bg-indigo-900/20">
                    <input
                      type="text"
                      className="w-full h-14 bg-transparent border-none text-right outline-none focus:ring-1 focus:ring-primary px-3 font-mono text-sm text-foreground hover:bg-muted/50 transition-colors"
                      defaultValue={formatWithCommas(s.avgPrice)}
                      onBlur={async (e) => {
                        const val = parseNumber(e.target.value);
                        if (!isNaN(val) && val !== s.avgPrice) {
                          await dataService.updateStock(s.id, {
                            avgPrice: val,
                          });
                          fetchStocks();
                        }
                        e.target.value = formatWithCommas(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        const raw = target.value.replace(/[^0-9.]/g, "");
                        target.value = raw;
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-0 border-r border-border text-center bg-indigo-50/10 dark:bg-indigo-900/20">
                    <Select
                      value={s.currency}
                      onValueChange={async (val: "USD" | "KRW") => {
                        if (val !== s.currency) {
                          await dataService.updateStock(s.id, {
                            currency: val,
                          });
                          fetchStocks();
                        }
                      }}
                    >
                      <SelectTrigger className="h-14 w-full bg-transparent border-none focus:ring-1 focus:ring-primary shadow-none text-xs font-bold justify-center hover:bg-muted/50 transition-colors rounded-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="KRW">KRW</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* 수정 불가능 셀 */}
                  <TableCell className="text-right font-mono text-sm border-r border-border px-3">
                    {hasPrice
                      ? `${symbol}${currentPrice.toLocaleString()}`
                      : "---"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm border-r border-border px-3 text-muted-foreground bg-muted/5">
                    {symbol}
                    {Math.round(costBasis).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm border-r border-border px-3 font-medium">
                    {hasPrice
                      ? `${symbol}${Math.round(evalAmount).toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono text-sm border-r border-border px-3 font-bold ${
                      hasPrice
                        ? evalAmount - costBasis >= 0
                          ? "text-red-500"
                          : "text-blue-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {hasPrice
                      ? `${evalAmount - costBasis >= 0 ? "+" : ""}${symbol}${Math.round(
                          evalAmount - costBasis,
                        ).toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold font-mono text-sm border-r border-border px-3 ${
                      hasPrice
                        ? returnRate >= 0
                          ? "text-red-500"
                          : "text-blue-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {hasPrice
                      ? `${returnRate >= 0 ? "+" : ""}${returnRate.toFixed(2)}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteStock(s.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
