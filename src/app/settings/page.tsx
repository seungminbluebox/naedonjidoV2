"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import { UserCategories } from "@/types";
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
  Trash2,
  Plus,
  Building2,
  Landmark,
  Settings,
  ListPlus,
  TrendingUp,
  Tag,
} from "lucide-react";

export default function SettingsPage() {
  const [categories, setCategories] = useState<UserCategories | null>(null);
  const [newBroker, setNewBroker] = useState("");
  const [newType, setNewType] = useState("");
  const [newTicker, setNewTicker] = useState("");
  const [newStockName, setNewStockName] = useState("");

  const fetchSettings = async () => {
    const data = await dataService.getCategories();
    setCategories(data);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const addBroker = async () => {
    if (!newBroker) return;
    const current = categories || {
      securities: [],
      accountTypes: [],
      stocks: [],
    };
    if (current.securities.includes(newBroker)) return;
    const updated = {
      ...current,
      securities: [...current.securities, newBroker],
    };
    await dataService.updateCategories(updated);
    setNewBroker("");
    fetchSettings();
  };

  const addAccountType = async () => {
    if (!newType) return;
    const current = categories || {
      securities: [],
      accountTypes: [],
      stocks: [],
    };
    if (current.accountTypes.includes(newType)) return;
    const updated = {
      ...current,
      accountTypes: [...current.accountTypes, newType],
    };
    await dataService.updateCategories(updated);
    setNewType("");
    fetchSettings();
  };

  const addStockTicker = async () => {
    if (!newTicker) return;
    const current = categories || {
      securities: [],
      accountTypes: [],
      stocks: [],
    };
    const tickerUpper = newTicker.toUpperCase();
    if (current.stocks.some((s) => s.ticker === tickerUpper)) return;
    const updated = {
      ...current,
      stocks: [
        ...current.stocks,
        { ticker: tickerUpper, name: newStockName.trim() },
      ],
    };
    await dataService.updateCategories(updated);
    setNewTicker("");
    setNewStockName("");
    fetchSettings();
  };

  const updateStockName = async (ticker: string, newName: string) => {
    if (!categories) return;
    const updated = {
      ...categories,
      stocks: categories.stocks.map((s) =>
        s.ticker === ticker ? { ...s, name: newName.trim() } : s,
      ),
    };
    await dataService.updateCategories(updated);
    fetchSettings();
  };

  const deleteBroker = async (index: number) => {
    if (!categories) return;
    const updated = {
      ...categories,
      securities: categories.securities.filter((_, i) => i !== index),
    };
    await dataService.updateCategories(updated);
    fetchSettings();
  };

  const deleteAccountType = async (index: number) => {
    if (!categories) return;
    const updated = {
      ...categories,
      accountTypes: categories.accountTypes.filter((_, i) => i !== index),
    };
    await dataService.updateCategories(updated);
    fetchSettings();
  };

  const deleteStockTicker = async (ticker: string) => {
    if (!categories) return;
    const updated = {
      ...categories,
      stocks: categories.stocks.filter((s) => s.ticker !== ticker),
    };
    await dataService.updateCategories(updated);
    fetchSettings();
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-500" /> 설정 및 카테고리
        </h1>
        <p className="text-muted-foreground mt-1 font-medium italic">
          자산 관리에 필요한 증권사, 계좌 종류, 관심 종목 등을 설정합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 증권사 관리 */}
        <Card className="border-border shadow-xl shadow-muted/5 rounded-2xl overflow-hidden bg-card transition-all">
          <CardHeader className="bg-muted/50 border-b border-border py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> 증권사 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1 group">
                <ListPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  className="pl-9 h-11 rounded-xl border-border bg-muted/30 focus:bg-background focus-visible:ring-indigo-500/30 transition-all font-bold"
                  placeholder="예: 미래에셋, 키움증권"
                  value={newBroker}
                  onChange={(e) => setNewBroker(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBroker()}
                />
              </div>
              <Button
                onClick={addBroker}
                className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white"
              >
                추가
              </Button>
            </div>
            <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30 font-bold">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4">
                      증권사명
                    </TableHead>
                    <TableHead className="w-16 px-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.securities.map((b, i) => (
                    <TableRow
                      key={i}
                      className="hover:bg-muted/30 transition-colors group border-b border-border/50"
                    >
                      <TableCell className="font-bold text-foreground px-4 py-4">
                        {b}
                      </TableCell>
                      <TableCell className="px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                          onClick={() => deleteBroker(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!categories || categories.securities.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center py-10 text-muted-foreground text-sm font-medium italic"
                      >
                        등록된 증권사가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 계좌 종류 관리 */}
        <Card className="border-border shadow-xl shadow-muted/5 rounded-2xl overflow-hidden bg-card transition-all">
          <CardHeader className="bg-muted/50 border-b border-border py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-500" /> 계좌 종류 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1 group">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  className="pl-9 h-11 rounded-xl border-border bg-muted/30 focus:bg-background focus-visible:ring-blue-500/30 transition-all font-bold"
                  placeholder="예: 일반지갑, ISA, 연금저축"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAccountType()}
                />
              </div>
              <Button
                onClick={addAccountType}
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 text-white"
              >
                추가
              </Button>
            </div>
            <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30 font-bold">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4">
                      종류명
                    </TableHead>
                    <TableHead className="w-16 px-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.accountTypes.map((t, i) => (
                    <TableRow
                      key={i}
                      className="hover:bg-muted/30 transition-colors group border-b border-border/50"
                    >
                      <TableCell className="font-bold text-foreground px-4 py-4">
                        {t}
                      </TableCell>
                      <TableCell className="px-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                          onClick={() => deleteAccountType(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!categories || categories.accountTypes.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center py-10 text-muted-foreground text-sm font-medium italic"
                      >
                        등록된 계좌 종류가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 종목 관리 */}
      <Card className="border-border shadow-xl shadow-muted/5 rounded-2xl overflow-hidden mt-8 bg-card transition-all">
        <CardHeader className="bg-muted/50 border-b border-border py-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> 관리할 종목/티커
            설정
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-2 mb-6">
            <div className="relative flex-1 group">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                className="pl-9 h-11 rounded-xl border-border bg-muted/30 focus:bg-background focus-visible:ring-indigo-500/30 transition-all font-bold"
                placeholder="티커 (예: AAPL)"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              />
            </div>
            <div className="relative flex-1 group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/30 uppercase tracking-tighter">
                NAME
              </span>
              <Input
                className="pl-14 h-11 rounded-xl border-border bg-muted/30 focus:bg-background focus-visible:ring-indigo-500/30 transition-all font-bold"
                placeholder="종목명 (예: 애플)"
                value={newStockName}
                onChange={(e) => setNewStockName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStockTicker()}
              />
            </div>
            <Button
              onClick={addStockTicker}
              className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white"
            >
              종목 등록
            </Button>
          </div>

          <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30 font-bold">
                <TableRow>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4">
                    티커
                  </TableHead>
                  <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4">
                    종목명
                  </TableHead>
                  <TableHead className="w-16 px-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.stocks.map((s, i) => (
                  <TableRow
                    key={i}
                    className="hover:bg-muted/30 transition-colors group border-b border-border/50"
                  >
                    <TableCell className="font-mono font-bold text-indigo-500 px-4 py-4">
                      {s.ticker}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <input
                        type="text"
                        className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1 text-sm font-bold text-foreground"
                        defaultValue={s.name}
                        onBlur={(e) => {
                          if (e.target.value !== s.name) {
                            updateStockName(s.ticker, e.target.value);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                        onClick={() => deleteStockTicker(s.ticker)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!categories || categories.stocks.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-10 text-muted-foreground text-sm font-medium italic"
                    >
                      등록된 종목이 없습니다. (티커와 이름을 등록하면
                      배당금/종목 실적 입력에서 편하게 선택할 수 있습니다.)
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
