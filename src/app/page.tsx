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
  Treemap,
  Sector,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format,
  differenceInMonths,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";

const COLORS = [
  "#2563eb", // Blue (Total Assets)
  "#10b981", // Green (Dividends / Profit)
  "#f59e0b", // Yellow (Return Rate)
  "#8b5cf6", // Purple (Portfolio)
  "#ef4444", // Red
  "#06b6d4", // Cyan
];

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, index, name, ticker, returnRate, value } = props;

  // Color mapping based on return rate
  // Green for positive, Red for negative
  let color = "#334155"; // Neutral
  if (returnRate > 3)
    color = "#065f46"; // Dark green
  else if (returnRate > 1)
    color = "#059669"; // Green
  else if (returnRate > 0)
    color = "#34d399"; // Light green
  else if (returnRate < -3)
    color = "#991b1b"; // Dark red
  else if (returnRate < -1)
    color = "#dc2626"; // Red
  else if (returnRate < 0) color = "#ef4444"; // Light red

  if (width < 30 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color,
          stroke: "hsl(var(--background))",
          strokeWidth: 2,
        }}
        rx={4}
        ry={4}
      />
      {width > 60 && height > 60 && (
        <>
          {/* 종목명 (Name) */}
          <text
            x={x + width / 2}
            y={y + height / 2 - 25}
            textAnchor="middle"
            fill="#fff"
            fontSize={Math.min(width / 10, 14)}
            fontWeight="bold"
          >
            {name === ticker ? ticker : name}
          </text>
          {/* 티커 (Ticker) - 종목명과 티커가 같으면 생략 */}
          {name !== ticker && (
            <text
              x={x + width / 2}
              y={y + height / 2 - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize={Math.min(width / 12, 12)}
            >
              {ticker}
            </text>
          )}
          {/* 수익률 (Return Rate) */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 15}
            textAnchor="middle"
            fill="#fff"
            fontSize={Math.min(width / 10, 14)}
            fontWeight="bold"
          >
            {returnRate > 0 ? "+" : ""}
            {returnRate}%
          </text>
          {/* 평가금액 (Value - exact amount) */}
          <text
            x={x + width / 2}
            y={y + height / 2 + 35}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={Math.min(width / 14, 11)}
          >
            ₩{Math.round(value).toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
};

export default function HomeDashboard() {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [dividendRatioData, setDividendRatioData] = useState<any[]>([]);
  const [dividendData, setDividendData] = useState<any[]>([]);
  const [yearlyAvgDividendData, setYearlyAvgDividendData] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
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
        const monthStr = String(s.month);
        const monthEnd = endOfMonth(new Date(monthStr + "-01"));

        const assetVal = Number(s.asset || 0);
        const cumDeposit =
          deposits?.reduce((acc, tx) => {
            const txDate = new Date(tx.date);
            if (txDate <= monthEnd) {
              return acc + Number(tx.amount || 0);
            }
            return acc;
          }, 0) || 0;

        const profit = assetVal - cumDeposit;
        const returnRate = cumDeposit > 0 ? (profit / cumDeposit) * 100 : 0;

        return {
          name: monthStr,
          totalAsset: assetVal,
          deposit: cumDeposit,
          profit: Math.round(profit),
          rate: Number(returnRate.toFixed(2)),
        };
      });
      setTrendData(trend);
    }

    const stocks = await dataService.getStocks();
    const categories = await dataService.getCategories();

    // Fetch current prices for all stocks
    let priceMap: Record<string, number> = {};
    if (stocks && stocks.length > 0) {
      try {
        const tickers = Array.from(new Set(stocks.map((s) => s.ticker))).join(
          ",",
        );
        const pRes = await fetch(`/api/stock-price?tickers=${tickers}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData)) {
            pData.forEach((item: any) => {
              if (item.price) priceMap[item.ticker] = item.price;
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch stock prices:", err);
      }
    }

    if (stocks) {
      const tickerInfo: Record<string, { value: number; name: string }> = {};
      stocks.forEach((s) => {
        const currentPrice = priceMap[s.ticker] || s.avgPrice;
        const value = Number(s.quantity) * Number(currentPrice);
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

      const pie = Object.keys(tickerInfo)
        .map((ticker) => {
          const info = tickerInfo[ticker];
          const displayName = info.name ? `${ticker} (${info.name})` : ticker;
          return {
            name: displayName,
            value: Math.round(info.value),
          };
        })
        .sort((a, b) => b.value - a.value);
      setPortfolioData(pie);
    }

    const dividends = await dataService.getDividends();
    if (dividends) {
      // 1. Unified Monthly Dividends (Including missing months)
      const monthlyDiv: Record<string, number> = {};
      if (dividends.length > 0) {
        const sortedDates = dividends
          .map((d) => new Date(d.date))
          .sort((a, b) => a.getTime() - b.getTime());
        const start = startOfMonth(sortedDates[0]);
        const end = startOfMonth(new Date());

        let current = start;
        while (current <= end) {
          const m = format(current, "yyyy-MM");
          monthlyDiv[m] = 0;
          current = addMonths(current, 1);
        }

        dividends.forEach((d) => {
          const m = format(new Date(d.date), "yyyy-MM");
          const krwAmount =
            d.currency === "USD" ? Number(d.amount) * rate : Number(d.amount);
          monthlyDiv[m] = (monthlyDiv[m] || 0) + krwAmount;
        });
      }

      const bar = Object.keys(monthlyDiv)
        .sort()
        .map((m) => ({ name: m, amount: Math.round(monthlyDiv[m]) }));
      setDividendData(bar);

      // 3. Dividend Ratio by Ticker (Pie Chart)
      const ratioByTicker = dividends.reduce((acc: any, d) => {
        const krwAmount =
          d.currency === "USD" ? Number(d.amount) * rate : Number(d.amount);
        acc[d.ticker] = (acc[d.ticker] || 0) + krwAmount;
        return acc;
      }, {});

      const ratioPie = Object.keys(ratioByTicker)
        .map((ticker) => {
          const officialStock = categories?.stocks.find(
            (cs) => cs.ticker === ticker,
          );
          return {
            name: officialStock?.name || ticker,
            value: Math.round(ratioByTicker[ticker]),
          };
        })
        .sort((a, b) => b.value - a.value);
      setDividendRatioData(ratioPie);

      // 4. Yearly Average Dividends (Monthly Mean per Year)
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

    if (stocks) {
      const tree = stocks
        .map((s) => {
          const officialStock = categories?.stocks.find(
            (cs) => cs.ticker === s.ticker,
          );
          const name = officialStock?.name || s.name || s.ticker;
          const currentPrice = priceMap[s.ticker] || s.avgPrice;
          const value = Number(s.quantity) * Number(currentPrice);
          const unifiedValue = s.currency === "USD" ? value * rate : value;

          const profit =
            (Number(currentPrice) - Number(s.avgPrice)) * Number(s.quantity);
          const costBasis = Number(s.avgPrice) * Number(s.quantity);
          const rateOfReturn = costBasis > 0 ? (profit / costBasis) * 100 : 0;

          return {
            name,
            ticker: s.ticker,
            size: Math.max(0, unifiedValue),
            returnRate: Number(rateOfReturn.toFixed(2)),
            value: unifiedValue,
          };
        })
        .sort((a, b) => b.size - a.size);
      setTreeData(tree);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        className="fill-foreground"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center text-3xl font-extrabold tracking-tight">
        대시보드
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
          <TabsTrigger value="account" className="text-lg">
            계좌 종합
          </TabsTrigger>
          <TabsTrigger value="dividend" className="text-lg">
            배당금 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
              <CardHeader>
                <CardTitle>포트폴리오 비중 (티커별)</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
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
                      formatter={(value: any) =>
                        `${Number(value || 0).toLocaleString()}원`
                      }
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
              <CardHeader>
                <CardTitle>계좌 추세 (누적 입금액 vs 총자산)</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tickFormatter={(val) =>
                        `${(val / 10000).toLocaleString()}만`
                      }
                      width={80}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      width={60}
                      tick={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(val: any, name: any) => {
                        const label =
                          name === "totalAsset" ? "총자산" : "누적입금";
                        return [
                          `${Number(val || 0).toLocaleString()}원`,
                          label,
                        ];
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "totalAsset" ? "총자산" : "누적입금"
                      }
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalAsset"
                      name="totalAsset"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="deposit"
                      name="deposit"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
              <CardHeader>
                <CardTitle>누적 수익금 및 수익률 추세</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      tickFormatter={(val) =>
                        `${(val / 10000).toLocaleString()}만`
                      }
                      width={80}
                      stroke="#10b981"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(val) => `${val}%`}
                      width={60}
                      stroke="#f59e0b"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(val: any, name: any) => {
                        if (name === "rate")
                          return [
                            `${Number(val || 0).toLocaleString()}%`,
                            "수익률",
                          ];
                        return [
                          `${Number(val || 0).toLocaleString()}원`,
                          "수익금",
                        ];
                      }}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "profit" ? "수익금" : "수익률"
                      }
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="profit"
                      name="profit"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#10b981" }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rate"
                      name="rate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#f59e0b" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
              <CardHeader>
                <CardTitle>포트폴리오 히트맵 (평단가 대비 수익률)</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treeData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomTreemapContent />}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border border-border p-2 rounded-lg shadow-lg">
                              <p className="font-bold">
                                {data.name} ({data.ticker})
                              </p>
                              <p className="text-sm">
                                평가금: {data.value.toLocaleString()}원
                              </p>
                              <p
                                className={`text-sm font-semibold ${data.returnRate >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                              >
                                수익률: {data.returnRate > 0 ? "+" : ""}
                                {data.returnRate}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dividend">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
              <CardHeader>
                <CardTitle>종목별 배당금 비중</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dividendRatioData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderPieLabel}
                      outerRadius={120}
                      fill="#10b981"
                      dataKey="value"
                    >
                      {dividendRatioData.map((entry, index) => (
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
                      formatter={(value: any) =>
                        `${Number(value || 0).toLocaleString()}원`
                      }
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      {...({
                        payload: dividendRatioData.map((item, index) => ({
                          id: item.name,
                          type: "rect",
                          value: item.name,
                          color: COLORS[index % COLORS.length],
                        })),
                      } as any)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
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
                      formatter={(value: any) => [
                        `${Number(value || 0).toLocaleString()}원`,
                        "",
                      ]}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border shadow-xl shadow-muted/20">
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
                      formatter={(value: any) => [
                        `${Number(value || 0).toLocaleString()}원`,
                        "",
                      ]}
                    />
                    <Bar
                      dataKey="avgAmount"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
