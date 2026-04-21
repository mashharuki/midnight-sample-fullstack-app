import { Check, Copy, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWallet } from "@/contexts/useWallet";
import { copyToClipboard, truncateAddress } from "@/lib/utils";

export function AddressCard() {
  const { state, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (state.status !== "connected") return null;

  const { address } = state.connection.state;

  const handleCopy = async () => {
    await copyToClipboard(address);
    setCopied(true);
    toast.success("アドレスをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

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
