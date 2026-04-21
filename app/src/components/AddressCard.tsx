import { Check, Copy, Droplets, Globe, Loader2, RefreshCw, Shield, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWallet } from "@/contexts/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { cn, copyToClipboard, truncateAddress } from "@/lib/utils";
import type { WalletConnectionResult } from "@/lib/wallet";

function ConnectedCard({ connection }: { connection: WalletConnectionResult }) {
  const { disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const { address } = connection.state;
  const { balanceState, refresh } = useBalance(connection.wallet);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = async () => {
    await copyToClipboard(address);
    setCopied(true);
    toast.success("アドレスをコピーしました");
  };

  const isRefreshing = balanceState.status === "loading";

  return (
    <Card className="w-full max-w-lg border-border bg-card shadow-[0_0_40px_0_rgba(168,85,247,0.15)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 border-cyan/30 bg-cyan/10 text-cyan"
        >
          <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
          Connected
        </Badge>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs text-primary">
          PreProd Testnet
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">シールドアドレス</p>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-4 py-3">
            <code className="flex-1 truncate font-mono text-sm text-foreground">
              {truncateAddress(address)}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              aria-label="アドレスをコピー"
            >
              {copied ? (
                <Check className="h-4 w-4 text-cyan" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              残高
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={refresh}
              disabled={isRefreshing}
              aria-label="残高を更新"
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              更新
            </Button>
          </div>

          {isRefreshing ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              残高を取得中...
            </div>
          ) : balanceState.status === "error" ? (
            <p className="py-2 text-xs text-destructive">残高の取得に失敗しました</p>
          ) : (
            <div className="divide-y divide-border rounded-lg bg-muted overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Shielded
                </div>
                <span className="font-mono text-sm font-semibold text-primary">
                  {balanceState.status === "loaded" ? balanceState.shielded : "--"} tDUST
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Unshielded
                </div>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {balanceState.status === "loaded" ? balanceState.unshielded : "--"} tDUST
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5" />
                  Dust
                </div>
                <span className="font-mono text-sm font-semibold text-cyan">
                  {balanceState.status === "loaded" ? balanceState.dust : "--"} tDUST
                </span>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={disconnect}
        >
          <Unlink className="mr-2 h-4 w-4" />
          切断する
        </Button>
      </CardContent>
    </Card>
  );
}

export function AddressCard() {
  const { state } = useWallet();
  if (state.status !== "connected") return null;
  return <ConnectedCard connection={state.connection} />;
}
