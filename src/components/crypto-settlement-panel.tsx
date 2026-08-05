import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bitcoin, Copy, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  db,
  fetchCryptoPayments,
  type CryptoPayment,
  type CryptoPaymentStatus,
} from "@/lib/db";

const CHAINS = ["Bitcoin", "Lightning", "Ethereum", "Base", "Polygon", "Solana"] as const;
const ASSETS = ["BTC", "ETH", "USDC", "USDT", "SOL", "DAI"] as const;

const STATUS_STYLE: Record<CryptoPaymentStatus, string> = {
  requested: "border-warning/40 text-warning",
  sent: "border-accent/40 text-accent",
  confirmed: "border-success/40 text-success",
  cancelled: "border-border text-muted-foreground",
};

const EXPLORERS: Record<string, (tx: string) => string> = {
  Bitcoin: (tx) => `https://mempool.space/tx/${tx}`,
  Ethereum: (tx) => `https://etherscan.io/tx/${tx}`,
  Base: (tx) => `https://basescan.org/tx/${tx}`,
  Polygon: (tx) => `https://polygonscan.com/tx/${tx}`,
  Solana: (tx) => `https://solscan.io/tx/${tx}`,
};

export function CryptoSettlementPanel({
  proposalId,
  userId,
  counterpartId,
  counterpartName,
}: {
  proposalId: string;
  userId: string;
  counterpartId: string;
  counterpartName: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState<string>("Bitcoin");
  const [asset, setAsset] = useState<string>("BTC");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [txDrafts, setTxDrafts] = useState<Record<string, string>>({});

  const { data: payments } = useQuery({
    queryKey: ["crypto-payments", proposalId],
    queryFn: () => fetchCryptoPayments(proposalId),
  });

  const request = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount greater than 0.");
      const wallet = address.trim();
      if (!/^[a-zA-Z0-9:._-]{12,120}$/.test(wallet))
        throw new Error("Enter a valid receiving wallet address.");
      const { error } = await db.from("crypto_payments").insert({
        proposal_id: proposalId,
        requested_by: userId,
        payer_id: counterpartId,
        payee_id: userId,
        chain,
        asset,
        amount: value,
        wallet_address: wallet,
        memo: memo.trim() ? memo.trim().slice(0, 200) : null,
      });
      if (error) throw error;
      await db.from("messages").insert({
        proposal_id: proposalId,
        sender_id: userId,
        body: `₿ Crypto top-up requested: ${value} ${asset} on ${chain}`,
      });
    },
    onSuccess: () => {
      setOpen(false);
      setAmount("");
      setAddress("");
      setMemo("");
      queryClient.invalidateQueries({ queryKey: ["crypto-payments", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["messages", proposalId] });
      toast.success("Payment request sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      payment,
      status,
      txHash,
    }: {
      payment: CryptoPayment;
      status: CryptoPaymentStatus;
      txHash?: string;
    }) => {
      if (status === "sent") {
        const tx = (txHash ?? "").trim();
        if (!/^[a-zA-Z0-9:_-]{16,128}$/.test(tx))
          throw new Error("Paste the transaction hash from your wallet.");
        const { error } = await db
          .from("crypto_payments")
          .update({ status, tx_hash: tx })
          .eq("id", payment.id);
        if (error) throw error;
        await db.from("messages").insert({
          proposal_id: proposalId,
          sender_id: userId,
          body: `₿ Sent ${payment.amount} ${payment.asset} on ${payment.chain} — tx ${tx}`,
        });
        return status;
      }
      const { error } = await db.from("crypto_payments").update({ status }).eq("id", payment.id);
      if (error) throw error;
      await db.from("messages").insert({
        proposal_id: proposalId,
        sender_id: userId,
        body: `₿ Payment ${status}: ${payment.amount} ${payment.asset} on ${payment.chain}`,
      });
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["crypto-payments", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["messages", proposalId] });
      toast.success(`Payment ${status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="surface-panel mt-6 border-border/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Bitcoin className="size-4 text-primary" /> Crypto settlement
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Settle a value difference wallet-to-wallet. BarterGrid never holds your funds.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Request payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a crypto top-up</DialogTitle>
              <DialogDescription>
                {counterpartName} sends directly to your wallet, then you confirm receipt here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Select value={chain} onValueChange={setChain}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAINS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select value={asset} onValueChange={setAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSETS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={0}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-address">Your receiving wallet address</Label>
                <Input
                  id="pay-address"
                  value={address}
                  maxLength={120}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="bc1q…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-memo">Memo / tag (optional)</Label>
                <Input
                  id="pay-memo"
                  value={memo}
                  maxLength={200}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Difference on the generator swap"
                />
              </div>
              <p className="flex items-start gap-1.5 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                Crypto transfers are irreversible. Verify the address character-by-character and
                prefer paying at the meetup, once you have the goods in hand.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => request.mutate()} disabled={request.isPending}>
                {request.isPending ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 space-y-3">
        {payments?.length ? (
          payments.map((p) => {
            const isPayer = p.payer_id === userId;
            const explorer = p.tx_hash ? EXPLORERS[p.chain]?.(p.tx_hash) : undefined;
            return (
              <div key={p.id} className="rounded-lg border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.amount} {p.asset}{" "}
                      <span className="text-muted-foreground">on {p.chain}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isPayer ? "You pay" : "You receive"} · {p.memo ?? "no memo"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="block max-w-full truncate rounded bg-muted/50 px-2 py-1 text-xs">
                        {p.wallet_address}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        onClick={() => {
                          void navigator.clipboard.writeText(p.wallet_address);
                          toast.success("Address copied");
                        }}
                      >
                        <Copy className="size-3.5" />
                        <span className="sr-only">Copy address</span>
                      </Button>
                    </div>
                    {p.tx_hash && (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        tx:{" "}
                        {explorer ? (
                          <a
                            href={explorer}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline underline-offset-2"
                          >
                            {p.tx_hash}
                          </a>
                        ) : (
                          p.tx_hash
                        )}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={`capitalize ${STATUS_STYLE[p.status]}`}>
                    {p.status}
                  </Badge>
                </div>

                {p.status === "requested" && isPayer && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1 space-y-1.5">
                      <Label htmlFor={`tx-${p.id}`} className="text-xs">
                        Transaction hash
                      </Label>
                      <Input
                        id={`tx-${p.id}`}
                        value={txDrafts[p.id] ?? ""}
                        maxLength={128}
                        onChange={(e) =>
                          setTxDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                        }
                        placeholder="Paste after you send"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        update.mutate({ payment: p, status: "sent", txHash: txDrafts[p.id] })
                      }
                      disabled={update.isPending}
                    >
                      Mark sent
                    </Button>
                  </div>
                )}
                {p.status === "requested" && !isPayer && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3"
                    onClick={() => update.mutate({ payment: p, status: "cancelled" })}
                    disabled={update.isPending}
                  >
                    Cancel request
                  </Button>
                )}
                {p.status === "sent" && !isPayer && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => update.mutate({ payment: p, status: "confirmed" })}
                    disabled={update.isPending}
                  >
                    Confirm received
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No crypto settlement on this trade. Pure barter is always an option.
          </p>
        )}
      </div>
    </Card>
  );
}
