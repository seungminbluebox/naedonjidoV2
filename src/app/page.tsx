"use client";

import { useState, useEffect } from "react";
import { dataService } from "@/services/dataService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, differenceInMonths, startOfMonth } from "date-fns";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

export default function HomeDashboard() {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [dividendData, setDividendData] = useState<any[]>([]);
  const [yearlyAvgDividendData, setYearlyAvgDividendData] = useState<any[]>([]);
  const [avgDividend, setAvgDividend] = useState(0);

  const fetchData = async () => {
    const monthlyAssets = await dataService.getMonthlyAssets();
    const deposits = await dataService.getDeposits();

    // Fetch exchange rate first
    let rate = 1400; // Default fallback
    try {
      const exRes = await fetch("/api/stock-price?tickers=USDKRW=X");
      if (exRes.ok) {
        const exData = await exRes.json();
        if (Array.isArray(exData) && exData[0]?.price) {
          rate = exData[0].price;
        }
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate:", err);
    }

    if (monthlyAssets?.assets) {
      const trend = monthlyAssets.assets.map((s) => {
        // month is "YYYY-MM"
        const monthEnd = new Date(s.month + "-31");
        const cumDeposit =
          deposits
            ?.filter((tx) => new Date(tx.date) <= monthEnd)
            .reduce((acc, tx) => acc + tx.amount, 0) || 0;

        return {
          name: s.month,
          총자산: s.asset,
          누적입금: cumDeposit,
        };
      });
      setTrendData(trend);
    }

    const stocks = await dataService.getStocks();
    const categories = await dataService.getCategories();

    if (stocks) {
      const tickerInfo: Record<string, { value: number; name: string }> = {};
      stocks.forEach((s) => {
        const value = Number(s.quantity) * Number(s.avgPrice);
        const unifiedValue = s.currency === "USD" ? value * rate : value;

        // Find official name from categories (Managed Stocks)
        const officialStock = categories?.stocks.find(
          (cs) => cs.ticker === s.ticker,
        );
        const officialName = officialStock?.name || s.name || "";

        if (!tickerInfo[s.ticker]) {
          tickerInfo[s.ticker] = { value: unifiedValue, name: officialName };
        } else {
          tickerInfo[s.ticker].value += unifiedValue;
        }
      });

      const pie = Object.keys(tickerInfo).map((ticker) => {
        const info = tickerInfo[ticker];
        const displayName = info.name ? `${ticker} (${info.name})` : ticker;
        return {
          name: displayName,
          value: Math.round(info.value),
        };
      });
      setPortfolioData(pie);
    }

    const dividends = await dataService.getDividends();
    if (dividends) {
      // 1. Unified Monthly Dividends
      const monthlyDiv = dividends.reduce((acc: any, d) => {
        const m = format(new Date(d.date), "yyyy-MM");
        const krwAmount =
          d.currency === "USD" ? Number(d.amount) * rate : Number(d.amount);
        acc[m] = (acc[m] || 0) + krwAmount;
        return acc;
      }, {});

      const bar = Object.keys(monthlyDiv)
        .sort()
        .map((m) => ({ name: m, amount: Math.round(monthlyDiv[m]) }));
      setDividendData(bar);

      // 2. Yearly Average Dividends (Monthly Mean per Year)
      const yearlyDiv = dividends.reduce((acc: any, d) => {
        const y = format(new Date(d.date), "yyyy");
        const krwAmount =
          d.currency === "USD" ? Number(d.amount) * rate : Number(d.amount);
        acc[y] = (acc[y] || 0) + krwAmount;
        return acc;
      }, {});

      const yearlyAvg = Object.keys(yearlyDiv)
        .sort()
        .map((y) => ({
          name: y + "년",
          avgAmount: Math.round(yearlyDiv[y] / 12),
        }));
      setYearlyAvgDividendData(yearlyAvg);

      const totalUnified = dividends.reduce((sum, d) => {
        const krwAmount =
          d.currency === "USD" ? Number(d.amount) * rate : Number(d.amount);
        return sum + krwAmount;
      }, 0);

      // Get count of months from the first dividend until now (inclusive)
      let totalMonths = 0;
      if (dividends.length > 0) {
        const sortedDates = dividends
          .map((d) => new Date(d.date))
          .sort((a, b) => a.getTime() - b.getTime());
        const firstMonth = startOfMonth(sortedDates[0]);
        const currentMonth = startOfMonth(new Date());
        totalMonths = differenceInMonths(currentMonth, firstMonth) + 1;
      }

      setAvgDividend(totalMonths > 0 ? totalUnified / totalMonths : 0);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
          <CardHeader>
            <CardTitle>계좌 추세 (누적 입금액 vs 총자산)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) =>
                    `${(value / 10000).toLocaleString()}만`
                  }
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => `${value.toLocaleString()}원`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="총자산"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="누적입금"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xl shadow-muted/20">
          <CardHeader>
            <CardTitle>포트폴리오 비중 (티커별)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {portfolioData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => `${value.toLocaleString()}원`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xl shadow-muted/20">
          <CardHeader>
            <CardTitle>월별 배당금 (전체)</CardTitle>
            <p className="text-sm text-muted-foreground">
              평균: {Math.round(avgDividend).toLocaleString()}원
            </p>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) =>
                    `${(value / 10000).toLocaleString()}만`
                  }
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [
                    value.toLocaleString() + "원",
                    "",
                  ]}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xl shadow-muted/20">
          <CardHeader>
            <CardTitle>연도별 월평균 배당금</CardTitle>
            <p className="text-sm text-muted-foreground">
              연도별 총액을 12개월로 나눈 평균
            </p>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyAvgDividendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) =>
                    `${(value / 10000).toLocaleString()}만`
                  }
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [
                    value.toLocaleString() + "원",
                    "",
                  ]}
                />
                <Bar dataKey="avgAmount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
