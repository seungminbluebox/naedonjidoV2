import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Next.js API route 캐싱 방지
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");

  if (!tickersParam) {
    return NextResponse.json(
      { error: "Tickers are required" },
      { status: 400 },
    );
  }

  const tickerList = tickersParam.split(",").map((t) => t.trim().toUpperCase());

  // 한국 주식(6자리 숫자)의 경우 자동으로 .KS를 붙여주는 헬퍼
  const transformTicker = (t: string) => {
    // 6자리 숫자로만 이루어진 경우 한국 주식으로 판단
    if (/^\d{6}$/.test(t)) {
      return `${t}.KS`;
    }
    return t;
  };

  const fetchTickers = tickerList.map(transformTicker);

  // v3 가이드에 따라 라이브러리 인스턴스를 요청마다 생성하여 격리합니다.
  const yf = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
  });

  try {
    // v3 Batch quote 시도
    let quoteArray: any[] = [];
    try {
      const quotes = await yf.quote(fetchTickers);
      quoteArray = Array.isArray(quotes) ? quotes : [quotes];
    } catch (batchError: any) {
      console.warn(
        `[API] Batch failed, trying individual calls: ${batchError.message}`,
      );
      // 개별 시도 (병렬)
      quoteArray = await Promise.all(
        fetchTickers.map(async (ticker) => {
          try {
            return await yf.quote(ticker);
          } catch {
            return null;
          }
        }),
      );
    }

    const results = tickerList.map((originalTicker) => {
      const targetTicker = transformTicker(originalTicker);

      // Yahoo의 티커 정규화 대응 (find logic)
      const quote = quoteArray.find(
        (q) =>
          q &&
          q.symbol &&
          (q.symbol.toUpperCase() === targetTicker.toUpperCase() ||
            targetTicker.toUpperCase().includes(q.symbol.toUpperCase()) ||
            q.symbol
              .toUpperCase()
              .includes(targetTicker.toUpperCase().replace("USD", ""))),
      );

      if (!quote) {
        return { ticker: originalTicker, error: "Not found" };
      }

      // 가용한 가격 필드 모두 확인
      const price =
        quote.regularMarketPrice ||
        quote.bid ||
        quote.ask ||
        quote.postMarketPrice ||
        quote.preMarketPrice ||
        quote.regularMarketPreviousClose;

      return {
        ticker: originalTicker,
        price: price || 0,
        currency: quote.currency,
        name: originalTicker.includes("=X")
          ? "원/달러 환율"
          : quote.shortName || quote.longName || originalTicker,
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Yahoo Finance fatal error:", error.message);
    return NextResponse.json([], { status: 200 }); // 크래시 방지용 빈 배열
  }
}
