"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border">
        <CardHeader className="text-center pt-10 pb-6">
          <CardTitle className="text-3xl font-black tracking-tight text-primary">
            내돈지도 v2
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            자산 관리의 시작, 구글 계정으로 간편하게 로그인하세요.
          </p>
        </CardHeader>
        <CardContent className="px-6 md:px-10 pb-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold mb-6 border border-red-100 italic">
              오류: {error}
            </div>
          )}
          <Button
            className="w-full h-14 text-lg font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
            onClick={handleGoogleLogin}
          >
            <LogIn className="w-5 h-5" /> Google로 시작하기
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-8 leading-relaxed">
            로그인 시 서비스 이용약관 및 <br />
            개인정보 처리방침에 동의하게 됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
