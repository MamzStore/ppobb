import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle, Search, Calendar, RefreshCw, Copy, Wallet, ShoppingBag, QrCode } from "lucide-react";
import { useTransactions, useCheckTransactionStatus } from "@/hooks/use-transactions";
import { useTopups } from "@/hooks/use-topup";
import { formatRupiah } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Topup } from "@shared/schema";

type MainTab = "pembelian" | "topup";

function useCountdown(expiredAt: string | Date | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiredAt) return;
    const end = new Date(expiredAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiredAt]);
  return remaining;
}

function TopupCard({ topup, onResumeQR }: { topup: Topup; onResumeQR: (id: number) => void }) {
  const remaining = useCountdown(topup.expiredAt);
  const isStillActive = topup.status === "pending" && remaining > 0;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div data-testid={`topup-card-${topup.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {topup.status === "paid" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {topup.status === "pending" && <Clock className="w-5 h-5 text-orange-500" />}
          {topup.status === "expired" && <XCircle className="w-5 h-5 text-gray-400" />}
          <span className="text-sm font-bold text-gray-900">
            {topup.status === "paid" ? "Berhasil" : topup.status === "pending" ? "Menunggu Bayar" : "Kadaluarsa"}
          </span>
        </div>
        <div className="flex items-center text-gray-400 text-xs font-medium gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(topup.createdAt!), "dd MMM yyyy, HH:mm")}
        </div>
      </div>

      <div className={`rounded-xl p-3 mb-3 border space-y-1 ${
        topup.status === "paid" ? "bg-green-50 border-green-100" :
        topup.status === "pending" ? "bg-orange-50 border-orange-100" :
        "bg-gray-50 border-gray-100"
      }`}>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 font-medium">Nominal Top Up</p>
          <p className={`font-bold text-base ${topup.status === "paid" ? "text-green-700" : "text-gray-900"}`}>
            {topup.status === "paid" ? "+" : ""}{formatRupiah(topup.amount)}
          </p>
        </div>
        {topup.amountUnique && topup.amountUnique !== topup.amount && (
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">Dibayar (unik)</p>
            <p className="text-xs font-semibold text-gray-600">{formatRupiah(topup.amountUnique)}</p>
          </div>
        )}
        <div className="flex justify-between items-center pt-1">
          <p className="text-xs text-gray-400 font-mono truncate max-w-[160px]">{topup.refId}</p>
        </div>
      </div>

      {isStillActive && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
          <button
            data-testid={`resume-qr-${topup.id}`}
            onClick={() => onResumeQR(topup.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold active:scale-95 transition-all"
          >
            <QrCode className="w-3.5 h-3.5" />
            Buka QR
          </button>
        </div>
      )}
    </div>
  );
}

export default function History() {
  const [mainTab, setMainTab] = useState<MainTab>("pembelian");
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const checkStatus = useCheckTransactionStatus();

  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: topups, isLoading: topupLoading } = useTopups();

  const filteredTransactions = transactions?.filter(tx => {
    if (filter === "all") return true;
    return tx.status === filter;
  }).sort((a: any, b: any) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()) || [];

  const sortedTopups = [...(topups || [])].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} disalin!`, duration: 2000 });
    });
  };

  const handleCheckStatus = async (txId: number) => {
    try {
      const updated = await checkStatus.mutateAsync(txId);
      if (updated.status === "success") {
        toast({ title: "Transaksi Berhasil!", description: updated.serialNumber ? `SN: ${updated.serialNumber}` : undefined });
      } else if (updated.status === "failed") {
        toast({ title: "Transaksi Gagal", description: "Saldo telah dikembalikan.", variant: "destructive" });
      } else {
        toast({ title: "Masih Diproses", description: "Transaksi masih pending di provider." });
      }
    } catch (err: any) {
      toast({ title: "Gagal cek status", description: err.message, variant: "destructive" });
    }
  };

  const handleResumeQR = (topupId: number) => {
    navigate(`/topup?resume=${topupId}`);
  };

  const pendingTopupCount = sortedTopups.filter(t => {
    if (t.status !== "pending") return false;
    if (!t.expiredAt) return false;
    return new Date(t.expiredAt) > new Date();
  }).length;

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <header className="bg-white px-6 pt-10 pb-0 shadow-sm z-10 relative">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Riwayat</h1>

        {/* Main tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setMainTab("pembelian")}
            data-testid="tab-pembelian"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              mainTab === "pembelian"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Pembelian
          </button>
          <button
            onClick={() => setMainTab("topup")}
            data-testid="tab-topup"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors relative ${
              mainTab === "topup"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Top Up
            {pendingTopupCount > 0 && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* ===== PEMBELIAN TAB ===== */}
      {mainTab === "pembelian" && (
        <>
          <div className="bg-white px-4 pt-3 pb-3 border-b border-gray-100">
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {["all", "success", "pending", "failed"].map(f => (
                <button
                  key={f}
                  data-testid={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                    filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {f === "all" ? "Semua" : f === "success" ? "Berhasil" : f === "pending" ? "Menunggu" : "Gagal"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex-1">
            {txLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredTransactions.map((tx: any) => (
                  <div key={tx.id} data-testid={`tx-card-${tx.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {tx.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {tx.status === "pending" && <Clock className="w-5 h-5 text-orange-500" />}
                        {tx.status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
                        <span className="text-sm font-bold text-gray-900">
                          {tx.status === "success" ? "Transaksi Berhasil" : tx.status === "pending" ? "Sedang Diproses" : "Transaksi Gagal"}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-400 text-xs font-medium gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(tx.createdAt!), "dd MMM yyyy, HH:mm")}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100 space-y-1">
                      <p className="font-bold text-gray-900 text-sm">{tx.product?.name || `Produk ID: ${tx.productId}`}</p>
                      <p className="text-xs text-gray-500 font-medium">No. Tujuan: {tx.targetNumber}</p>
                      {tx.refId && (
                        <div className="flex items-center gap-1 pt-1">
                          <p className="text-xs text-gray-400 font-mono truncate">Ref: {tx.refId}</p>
                          <button data-testid={`copy-refid-${tx.id}`} onClick={() => handleCopy(tx.refId, "Ref ID")} className="flex-shrink-0 p-0.5 text-gray-400">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {tx.serialNumber && (
                        <div className="flex items-center gap-1 pt-1 border-t border-gray-200 mt-1">
                          <p className="text-xs font-semibold text-green-700">SN: <span className="font-mono">{tx.serialNumber}</span></p>
                          <button data-testid={`copy-sn-${tx.id}`} onClick={() => handleCopy(tx.serialNumber, "Serial Number")} className="flex-shrink-0 p-0.5 text-green-600">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Total Pembayaran</p>
                        <p className="font-bold text-gray-900">{formatRupiah(tx.amount)}</p>
                      </div>
                      {tx.status === "pending" && tx.refId && (
                        <button
                          data-testid={`check-status-${tx.id}`}
                          onClick={() => handleCheckStatus(tx.id)}
                          disabled={checkStatus.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-semibold disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3 h-3 ${checkStatus.isPending ? "animate-spin" : ""}`} />
                          Cek Status
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4 text-gray-300">
                  <Search className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada transaksi</h3>
                <p className="text-gray-500 text-sm max-w-[250px]">
                  {filter === "all" ? "Anda belum pernah melakukan transaksi apapun." : "Tidak ada transaksi dengan status tersebut."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== TOP UP TAB ===== */}
      {mainTab === "topup" && (
        <div className="p-4 flex-1">
          {topupLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : sortedTopups.length > 0 ? (
            <div className="space-y-4">
              {sortedTopups.map(topup => (
                <TopupCard key={topup.id} topup={topup} onResumeQR={handleResumeQR} />
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4 text-gray-300">
                <Wallet className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Belum ada riwayat top up</h3>
              <p className="text-gray-500 text-sm max-w-[240px]">
                Top up saldo untuk mulai bertransaksi.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
