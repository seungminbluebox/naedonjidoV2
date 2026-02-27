import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavigationShell from "@/components/NavigationShell";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "내돈지도 v2",
  description: "실시간 주가 대시보드 리뉴얼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationShell>{children}</NavigationShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
