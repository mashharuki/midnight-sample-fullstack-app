import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/useWallet";

export function ConnectSection() {
  const { state, connect } = useWallet();
  const isConnecting = state.status === "connecting";

  return (
    <div className="flex flex-col items-center gap-8 px-4 text-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        <span className="relative text-7xl" role="img" aria-label="Midnight">
          🌑
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Midnight dApp
        </h1>
        <p className="max-w-sm text-base text-muted-foreground">
          Lace Wallet を接続して Midnight Network (PreProd)
          にアクセスしてください
        </p>
      </div>

      <Button
        size="lg"
        onClick={connect}
        disabled={isConnecting}
        className="min-w-52 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            接続中...
          </>
        ) : (
          "Connect Lace Wallet"
        )}
      </Button>

      {state.status === "error" && (
        <p className="text-sm text-destructive">
          接続に失敗しました。上のボタンで再試行してください。
        </p>
      )}
    </div>
  );
}
