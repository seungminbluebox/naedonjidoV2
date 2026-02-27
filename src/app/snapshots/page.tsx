"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import { Deposit, MonthlyAssetItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Calendar,
  CircleDollarSign,
  Coins,
  TrendingUp,
  ArrowLeftRight,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parse,
} from "date-fns";
import { formatWithCommas, parseNumber } from "@/lib/utils";

interface SnapshotWithLogic extends MonthlyAssetItem {
  monthly_in_out: number;
  monthly_pnl: number;
  monthly_return: number;
  cum_deposit: number;
  cum_pnl: number;
  cum_return: number;
}

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotWithLogic[]>([]);
  const [newYM, setNewYM] = useState(format(new Date(), "yyyy-MM"));
  const [newAssets, setNewAssets] = useState("");
  const [newInOut, setNewInOut] = useState("");

  const fetchSnapshots = async () => {
    // 1. Fetch all deposits (fallback logic)
    const deposits = await dataService.getDeposits();
    // 2. Fetch all monthly snapshots
    const monthlyAssetsDoc = await dataService.getMonthlyAssets();
    const assets = monthlyAssetsDoc?.assets || [];

    // Sort assets by month ascending for calculations
    const sortedAssets = [...assets].sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    let previousMonthAssets = 0;
    const computed = sortedAssets.map((s) => {
      const monthDate = parse(s.month, "yyyy-MM", new Date());
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Monthly In/Out (If s.inOut exists use it, otherwise fall back to deposits calculation)
      let inOut: number;
      if (s.inOut !== undefined) {
        inOut = s.inOut;
      } else {
        inOut = deposits
          .filter((d) => {
            const date = new Date(d.date);
            return isWithinInterval(date, { start: monthStart, end: monthEnd });
          })
          .reduce((acc, d) => acc + d.amount, 0);
      }

      // Cumulative Deposit (all deposits up to monthEnd)
      // Actually here, we might need cumulative inOut for return calculation.
      // If we are using manual inOut, it should probably be used for cumulative too.
      // Let's stick with the s.inOut values up to this month if they exist, else deposits.
      const previousAssetsList = sortedAssets.filter(
        (prevS) => prevS.month <= s.month,
      );
      const cumDeposit = previousAssetsList.reduce((acc, currentS) => {
        if (currentS.inOut !== undefined) return acc + currentS.inOut;

        // Fallback to deposits for months with no manual inOut recorded
        const currentSDate = parse(currentS.month, "yyyy-MM", new Date());
        const currentMStart = startOfMonth(currentSDate);
        const currentMEnd = endOfMonth(currentSDate);
        const depositsThisMonth = deposits
          .filter((d) => {
            const date = new Date(d.date);
            return isWithinInterval(date, {
              start: currentMStart,
              end: currentMEnd,
            });
          })
          .reduce((acc, d) => acc + d.amount, 0);
        return acc + depositsThisMonth;
      }, 0);

      // Monthly P&L
      const pnl = s.asset - previousMonthAssets - inOut;
      const monthlyReturn =
        previousMonthAssets + inOut !== 0
          ? (pnl / (previousMonthAssets + inOut)) * 100
          : 0;

      // Cumulative P&L
      const cumPnl = s.asset - cumDeposit;
      const cumReturn = cumDeposit !== 0 ? (cumPnl / cumDeposit) * 100 : 0;

      const result = {
        ...s,
        monthly_in_out: inOut,
        monthly_pnl: pnl,
        monthly_return: monthlyReturn,
        cum_deposit: cumDeposit,
        cum_pnl: cumPnl,
        cum_return: cumReturn,
      };

      previousMonthAssets = s.asset;
      return result;
    });

    setSnapshots([...computed].reverse()); // Show newest first
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const addSnapshot = async () => {
    if (!newYM || !newAssets) return;

    const monthlyAssetsDoc = await dataService.getMonthlyAssets();
    const currentAssets = monthlyAssetsDoc?.assets || [];

    // Check if month already exists
    const existingIndex = currentAssets.findIndex((a) => a.month === newYM);
    const updatedAssets = [...currentAssets];

    const assetVal = parseNumber(newAssets);
    const inOutVal = newInOut ? parseNumber(newInOut) : undefined;

    if (existingIndex > -1) {
      updatedAssets[existingIndex].asset = assetVal;
      if (inOutVal !== undefined) updatedAssets[existingIndex].inOut = inOutVal;
    } else {
      updatedAssets.push({
        month: newYM,
        asset: assetVal,
        ...(inOutVal !== undefined ? { inOut: inOutVal } : {}),
      });
    }

    // Sort assets by month
    updatedAssets.sort((a, b) => a.month.localeCompare(b.month));

    await dataService.updateMonthlyAssets(updatedAssets);
    setNewAssets("");
    setNewInOut("");
    fetchSnapshots();
  };

  const updateSnapshot = async (
    month: string,
    field: "asset" | "inOut",
    value: number,
  ) => {
    const monthlyAssetsDoc = await dataService.getMonthlyAssets();
    const currentAssets = monthlyAssetsDoc?.assets || [];
    const updatedAssets = currentAssets.map((s) => {
      if (s.month === month) {
        return { ...s, [field]: value };
      }
      return s;
    });
    await dataService.updateMonthlyAssets(updatedAssets);
    fetchSnapshots();
  };

  const deleteSnapshot = async (month: string) => {
    const monthlyAssetsDoc = await dataService.getMonthlyAssets();
    const currentAssets = monthlyAssetsDoc?.assets || [];
    const updatedAssets = currentAssets.filter((a) => a.month !== month);
    await dataService.updateMonthlyAssets(updatedAssets);
    fetchSnapshots();
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Coins className="w-8 h-8 text-indigo-500" /> 계좌총액 관리
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">
            월말 총자산과 입출금을 기록하여 전체 투자 성과와 수익률을
            추적합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 items-end bg-card p-5 border rounded-2xl shadow-lg border-border shadow-muted/5">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider ml-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> 년/월
            </label>
            <Input
              type="month"
              value={newYM}
              className="w-40 h-10 bg-muted/30 border-border focus:bg-background transition-all font-mono"
              onChange={(e) => setNewYM(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider ml-1">
              <CircleDollarSign className="w-3.5 h-3.5 text-emerald-500" /> 월말
              총자산
            </label>
            <Input
              type="text"
              placeholder="0"
              className="w-44 h-10 text-right font-mono font-bold border-border bg-muted/30 focus:bg-background h-10"
              value={newAssets}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setNewAssets(formatWithCommas(raw));
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider ml-1">
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" /> 월간
              입출금
            </label>
            <Input
              type="text"
              placeholder="0"
              className="w-44 h-10 text-right font-mono border-border bg-muted/30 focus:bg-background"
              value={newInOut}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9-]/g, "");
                setNewInOut(formatWithCommas(raw));
              }}
            />
          </div>
          <Button
            onClick={addSnapshot}
            className="h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 text-white"
          >
            <Plus className="w-4 h-4" /> 기록 추가
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xl shadow-muted/5">
        <Table className="table-fixed w-full border-collapse">
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px] border-r border-border/50 h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                년/월
              </TableHead>
              <TableHead className="w-[160px] text-right border-r border-border/50 h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                월말 총자산
              </TableHead>
              <TableHead className="w-[140px] text-right border-r border-border/50 h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                월간 입출금
              </TableHead>
              <TableHead className="w-[140px] text-right border-r border-border/50 h-11 text-[11px] font-bold px-4 text-indigo-500 uppercase tracking-widest">
                월간 손익
              </TableHead>
              <TableHead className="w-[110px] text-right border-r border-border/50 h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                월간 수익률
              </TableHead>
              <TableHead className="w-[155px] text-right border-r border-border/50 h-11 text-[11px] font-bold px-4 text-muted-foreground uppercase tracking-widest">
                누적 입출금
              </TableHead>
              <TableHead className="w-[140px] text-right border-r border-border/50 h-11 text-[11px] font-bold px-4 text-blue-500 uppercase tracking-widest">
                누적 수익금
              </TableHead>
              <TableHead className="w-[120px] text-right h-11 text-[11px] font-bold px-4 text-indigo-400 uppercase tracking-widest bg-indigo-500/5">
                누적 수익률
              </TableHead>
              <TableHead className="w-14 h-11 px-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((s) => (
              <TableRow
                key={s.month}
                className="hover:bg-muted/30 transition-colors group border-b border-border/50 h-14"
              >
                <TableCell className="font-black text-indigo-500 border-r border-border/50 px-4 bg-indigo-50/5 dark:bg-indigo-900/10">
                  {s.month}
                </TableCell>
                {/* 월말 총자산 - 수정 가능 */}
                <TableCell className="text-right py-2 border-r border-border/50 px-4 bg-indigo-50/10 dark:bg-indigo-900/10 relative">
                  <div className="flex items-center gap-1 justify-end w-full group/input">
                    <CircleDollarSign className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover/input:opacity-100 transition-all" />
                    <input
                      type="text"
                      className="bg-transparent border-none text-right outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1 font-mono text-sm font-bold h-8 flex-1"
                      defaultValue={formatWithCommas(s.asset)}
                      onBlur={async (e) => {
                        const val = parseNumber(e.target.value);
                        if (!isNaN(val) && val !== s.asset) {
                          await updateSnapshot(s.month, "asset", val);
                        }
                        e.target.value = formatWithCommas(val);
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        const raw = target.value.replace(/[^0-9]/g, "");
                        target.value = formatWithCommas(raw);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </div>
                </TableCell>
                {/* 월간 입출금 - 수정 가능 */}
                <TableCell className="text-right py-2 border-r border-border/50 px-4 bg-indigo-50/10 dark:bg-indigo-900/10 relative">
                  <div className="flex items-center gap-1 justify-end w-full group/input">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover/input:opacity-100 transition-all" />
                    <input
                      type="text"
                      className={`bg-transparent border-none text-right outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1 font-mono text-sm h-8 flex-1 font-medium ${
                        s.monthly_in_out >= 0
                          ? "text-foreground/70"
                          : "text-red-500"
                      }`}
                      defaultValue={formatWithCommas(s.monthly_in_out)}
                      onBlur={async (e) => {
                        const val = parseNumber(e.target.value);
                        if (!isNaN(val) && val !== s.monthly_in_out) {
                          await updateSnapshot(s.month, "inOut", val);
                        }
                        e.target.value = formatWithCommas(val);
                      }}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        const raw = target.value.replace(/[^0-9-]/g, "");
                        target.value = formatWithCommas(raw);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell
                  className={`text-right border-r border-border/50 px-4 font-mono text-sm font-bold ${
                    s.monthly_pnl >= 0 ? "text-red-500" : "text-blue-500"
                  }`}
                >
                  {s.monthly_pnl >= 0 ? "+" : ""}
                  {s.monthly_pnl.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right border-r border-border/50 px-4 font-mono text-sm font-bold ${
                    s.monthly_return >= 0 ? "text-red-500" : "text-blue-500"
                  }`}
                >
                  {s.monthly_return >= 0 ? "+" : ""}
                  {s.monthly_return.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right border-r border-border/50 px-4 font-mono text-sm text-muted-foreground font-medium">
                  {s.cum_deposit.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right border-r border-border/50 px-4 font-mono text-sm font-bold ${
                    s.cum_pnl >= 0 ? "text-red-500" : "text-blue-500"
                  }`}
                >
                  {s.cum_pnl >= 0 ? "+" : ""}
                  {s.cum_pnl.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right border-r border-border/50 px-4 font-mono text-sm font-black bg-indigo-500/5 ${
                    s.cum_return >= 0 ? "text-red-500" : "text-blue-500"
                  }`}
                >
                  {s.cum_return >= 0 ? "+" : ""}
                  {s.cum_return.toFixed(2)}%
                </TableCell>
                <TableCell className="px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                    onClick={() => {
                      if (confirm(`${s.month} 기록을 정말 삭제하시겠습니까?`)) {
                        deleteSnapshot(s.month);
                      }
                    }}
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
