"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import { DividendRecord, UserCategories } from "@/types";
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
import { Trash2, BadgeDollarSign, Plus } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { formatWithCommas, parseNumber } from "@/lib/utils";

export default function DividendsPage() {
  const [dividends, setDividends] = useState<DividendRecord[]>([]);
  const [categories, setCategories] = useState<UserCategories | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    ticker: "",
    amount: "",
    currency: "USD" as "USD" | "KRW",
    securities: "",
  });

  const fetchData = async () => {
    const [dData, cData] = await Promise.all([
      dataService.getDividends(),
      dataService.getCategories(),
    ]);
    setDividends(dData.sort((a, b) => b.date.localeCompare(a.date)));
    setCategories(cData);
    if (cData && cData.securities.length > 0 && !formData.securities) {
      setFormData((p) => ({ ...p, securities: cData.securities[0] }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addDividend = async () => {
    const amountNum = parseNumber(formData.amount);
    if (isNaN(amountNum) || !formData.securities) return;

    await dataService.addDividend({
      date: formData.date,
      ticker: formData.ticker.toUpperCase(),
      amount: amountNum,
      currency: formData.currency,
      securities: formData.securities,
      createdAt: Timestamp.now(),
    });

    setFormData((p) => ({ ...p, ticker: "", amount: "" }));
    fetchData();
  };

  const updateDividend = async (id: string, field: string, value: any) => {
    await dataService.updateDividend(id, { [field]: value });
    fetchData();
  };

  const deleteDividend = async (id: string) => {
    await dataService.deleteDividend(id);
    fetchData();
  };

  const currentMonth = format(new Date(), "yyyy-MM");
  const monthUSD = dividends
    .filter((d) => d.date.startsWith(currentMonth) && d.currency === "USD")
    .reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <BadgeDollarSign className="w-8 h-8 text-emerald-600" /> 배당금 관리
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">
            수령한 배당 내역을 기록하고 월별/종목별 통계를 확인합니다.
          </p>
        </div>
      </div>

      <Card className="border-border shadow-xl shadow-muted/50 rounded-2xl overflow-hidden mb-8 bg-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                입금일자
              </label>
              <Input
                type="date"
                className="h-10 rounded-lg border-border focus:ring-emerald-500 font-mono"
                value={formData.date}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                티커
              </label>
              <Select
                value={formData.ticker}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, ticker: val }))
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-border font-bold text-indigo-500">
                  <SelectValue placeholder="티커" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.stocks.map((s) => (
                    <SelectItem key={s.ticker} value={s.ticker}>
                      {s.ticker}
                      {s.name ? ` (${s.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                증권사
              </label>
              <Select
                value={formData.securities}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, securities: val }))
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-border">
                  <SelectValue placeholder="증권사" />
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
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                배당금
              </label>
              <Input
                className="h-10 rounded-lg border-border text-right font-mono font-bold"
                value={formData.amount}
                onInput={(e) => {
                  const raw = e.currentTarget.value.replace(/[^0-9.]/g, "");
                  e.currentTarget.value = formatWithCommas(raw);
                }}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                통화
              </label>
              <Select
                value={formData.currency}
                onValueChange={(val: any) =>
                  setFormData((p) => ({ ...p, currency: val }))
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="KRW">KRW ()</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={addDividend}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
            >
              <Plus className="w-4 h-4" /> 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xl shadow-muted/50">
        <Table className="table-fixed">
          <TableHeader className="bg-muted/80 border-b border-border">
            <TableRow>
              <TableHead className="w-[140px] px-4 font-bold text-muted-foreground uppercase text-[11px] border-r border-border">
                수령일
              </TableHead>
              <TableHead className="w-[150px] px-4 font-bold text-muted-foreground uppercase text-[11px] border-r border-border">
                티커
              </TableHead>
              <TableHead className="w-[150px] px-4 font-bold text-muted-foreground uppercase text-[11px] text-right border-r border-border">
                배당금
              </TableHead>
              <TableHead className="w-[100px] px-4 font-bold text-muted-foreground uppercase text-[11px] border-r border-border text-center">
                통화
              </TableHead>
              <TableHead className="w-[150px] px-4 font-bold text-muted-foreground uppercase text-[11px] border-r border-border">
                증권사
              </TableHead>
              <TableHead className="w-14"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dividends.map((d) => (
              <TableRow
                key={d.id}
                className="hover:bg-muted/50 border-b border-border h-14 group transition-colors"
              >
                <TableCell className="p-0 border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                  <input
                    type="date"
                    className="bg-transparent border-none outline-none w-full h-14 px-4 font-mono text-xs text-foreground hover:bg-muted/50 transition-colors"
                    defaultValue={d.date}
                    onBlur={(e) => updateDividend(d.id, "date", e.target.value)}
                  />
                </TableCell>
                <TableCell className="p-0 border-r border-border bg-indigo-50/5 dark:bg-indigo-900/10">
                  <select
                    className="bg-transparent border-none outline-none w-full h-14 px-4 font-bold text-indigo-500 text-sm appearance-none cursor-pointer hover:bg-muted/50 transition-colors"
                    defaultValue={d.ticker}
                    onChange={(e) =>
                      updateDividend(d.id, "ticker", e.target.value)
                    }
                  >
                    {categories?.stocks.map((s) => (
                      <option
                        key={s.ticker}
                        value={s.ticker}
                        className="bg-background text-foreground"
                      >
                        {s.ticker}
                        {s.name ? ` (${s.name})` : ""}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="p-0 border-r border-border bg-indigo-50/10 dark:bg-indigo-900/20">
                  <input
                    type="text"
                    className="bg-transparent border-none outline-none text-right font-mono font-bold text-emerald-600 w-full h-14 px-4 hover:bg-muted/50 transition-colors"
                    defaultValue={formatWithCommas(d.amount)}
                    onBlur={(e) => {
                      const val = parseNumber(e.target.value);
                      if (!isNaN(val)) updateDividend(d.id, "amount", val);
                    }}
                  />
                </TableCell>
                <TableCell className="p-0 border-r border-border bg-indigo-50/10 dark:bg-indigo-900/20">
                  <select
                    className="bg-transparent border-none outline-none text-xs font-bold w-full h-14 text-center appearance-none cursor-pointer hover:bg-muted/50 transition-colors"
                    defaultValue={d.currency}
                    onChange={(e) =>
                      updateDividend(d.id, "currency", e.target.value)
                    }
                  >
                    <option
                      value="USD"
                      className="bg-background text-foreground"
                    >
                      USD
                    </option>
                    <option
                      value="KRW"
                      className="bg-background text-foreground"
                    >
                      KRW
                    </option>
                  </select>
                </TableCell>
                <TableCell className="p-0 border-r border-border">
                  <select
                    className="bg-transparent border-none outline-none text-xs w-full h-14 px-4 appearance-none cursor-pointer hover:bg-muted/50 transition-colors text-foreground"
                    defaultValue={d.securities}
                    onChange={(e) =>
                      updateDividend(d.id, "securities", e.target.value)
                    }
                  >
                    {categories?.securities.map((s) => (
                      <option
                        key={s}
                        value={s}
                        className="bg-background text-foreground"
                      >
                        {s}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-600"
                    onClick={() => deleteDividend(d.id)}
                  >
                    <Trash2 className="w-4 h-4" />
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
