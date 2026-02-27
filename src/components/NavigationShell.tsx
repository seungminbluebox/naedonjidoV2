"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard,
  TrendingUp,
  ArrowLeftRight,
  Wallet,
  CalendarDays,
  BadgeDollarSign,
  Settings,
  LogOut,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { ModeToggle } from "./ModeToggle";

export default function NavigationShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchExchangeRate = async () => {
    setLoadingRate(true);
    try {
      const res = await fetch("/api/stock-price?tickers=USDKRW=X");
      const data = await res.json();
      if (data && data[0] && !data[0].error) {
        setExchangeRate(data[0].price);
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate", err);
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
    // 1분마다 환율 업데이트 (60,000ms)
    const interval = setInterval(fetchExchangeRate, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser && pathname !== "/login") {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const menuItems = [
    { name: "홈", href: "/", icon: LayoutDashboard },
    { name: "종목 실적", href: "/stocks", icon: TrendingUp },
    { name: "입출금", href: "/transactions", icon: ArrowLeftRight },
    { name: "계좌 현황", href: "/accounts", icon: Wallet },
    { name: "계좌총액", href: "/snapshots", icon: CalendarDays },
    { name: "배당금", href: "/dividends", icon: BadgeDollarSign },
    { name: "설정", href: "/settings", icon: Settings },
  ];

  if (pathname === "/login") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col fixed inset-y-0 left-0">
        <div className="p-6 border-b flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">내돈지도 v2</h1>
          <ModeToggle />
        </div>

        {/* Exchange Rate Card */}
        <div className="mx-4 mt-4 p-3 bg-accent/30 rounded-lg border border-accent/50 group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              USD/KRW Exchange Rate
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                fetchExchangeRate();
              }}
              disabled={loadingRate}
              className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${loadingRate ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold">
              {exchangeRate ? Math.round(exchangeRate).toLocaleString() : "---"}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              KRW
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors ${
                pathname === item.href ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-2">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
            >
              <LogIn className="w-4 h-4" />
              로그인
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
