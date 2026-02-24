import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, QrCode, CheckCircle2, Clock, AlertCircle, RefreshCw, Copy, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useCreateTopup, useTopupStatus, useTopups } from "@/hooks/use-topup";
import { useQueryClient } from "@tanstack/react-query";
import { formatRupiah } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Topup } from "@shared/schema";

const PRESET_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

type Step = "select" | "qris" | "done";

function CountdownTimer({ expiredAt }: { expiredAt: string | Date | null }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiredAt) return;
    const end = new Date(expiredAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiredAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 60;

  return (
    <div className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${isUrgent ? "text-red-500" : "text-orange-500"}`}>
      <Clock className="w-4 h-4" />
      <span>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
    </div>
  );
}

export default function Topup() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const resumeId = params.get("resume") ? parseInt(params.get("resume")!) : null;

  const [step, setStep] = useState<Step>("select");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [topupId, setTopupId] = useState<number | null>(resumeId);
  const [finalTopup, setFinalTopup] = useState<Topup | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTopup = useCreateTopup();
  const { data: allTopups } = useTopups();

  // Active pending topup (other than the one being resumed)
  const activePendingTopup = allTopups?.find(t => {
    if (t.status !== "pending") return false;
    if (!t.expiredAt) return false;
    if (new Date(t.expiredAt) <= new Date()) return false;
    if (resumeId && t.id === resumeId) return false;
    return true;
  });

  const isPollingActive = step === "qris";
  const { data: topupStatus } = useTopupStatus(topupId, isPollingActive);

  // If resuming an existing topup, jump straight to QRIS step
  useEffect(() => {
    if (resumeId && topupStatus) {
      if (topupStatus.status === "paid") {
        setFinalTopup(topupStatus);
        setStep("done");
      } else if (topupStatus.status === "pending" && topupStatus.expiredAt && new Date(topupStatus.expiredAt) > new Date()) {
        setStep("qris");
      } else {
        // Expired or invalid — show select
        setTopupId(null);
        setStep("select");
      }
    }
  }, [resumeId, topupStatus]);

  // React to status changes from polling
  useEffect(() => {
    if (!topupStatus) return;
    if (topupStatus.status === "paid" && step === "qris") {
      setFinalTopup(topupStatus);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/topup"] });
    } else if (
      topupStatus.status === "pending" &&
      topupStatus.expiredAt &&
      new Date(topupStatus.expiredAt) < new Date() &&
      step === "qris"
    ) {
      setFinalTopup(topupStatus);
      setStep("done");
    }
  }, [topupStatus, step, queryClient]);

  const effectiveAmount = selectedAmount ?? (customAmount ? parseInt(customAmount.replace(/\D/g, "")) : null);

  const handleCreateQRIS = async () => {
    if (!effectiveAmount || effectiveAmount < 10000) {
      toast({ title: "Nominal minimal Rp 10.000", variant: "destructive" });
      return;
    }
    if (effectiveAmount > 5000000) {
      toast({ title: "Nominal maksimal Rp 5.000.000", variant: "destructive" });
      return;
    }
    try {
      const result = await createTopup.mutateAsync({ amount: effectiveAmount, userId: 1 });
      setTopupId(result.id);
      setStep("qris");
    } catch (err: any) {
      toast({ title: "Gagal Membuat QRIS", description: err.message, variant: "destructive" });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Disalin!", duration: 2000 });
  };

  const handleReset = () => {
    setStep("select");
    setSelectedAmount(null);
    setCustomAmount("");
    setTopupId(null);
    setFinalTopup(null);
    // Clear resume param from URL without navigation
    window.history.replaceState(null, "", "/topup");
  };

  const activeTopup = topupStatus ?? finalTopup;
  const isPaid = activeTopup?.status === "paid";

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-100 z-30 px-4 py-4 flex items-center gap-3">
        {step === "select" || step === "done" ? (
          <Link href="/">
            <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
        ) : (
          <button onClick={handleReset} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900">Top Up Saldo</h1>
      </header>

      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">

          {/* ===== STEP 1: PILIH NOMINAL ===== */}
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Banner: ada topup pending yang masih aktif */}
              {activePendingTopup && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
                >
                  <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-orange-800">Ada Pembayaran Tertunda</p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {formatRupiah(activePendingTopup.amount)} • {activePendingTopup.refId}
                    </p>
                  </div>
                  <Link href={`/topup?resume=${activePendingTopup.id}`}>
                    <button className="text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0">
                      Lanjutkan
                    </button>
                  </Link>
                </motion.div>
              )}

              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pilih Nominal</h2>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                      data-testid={`amount-${amount}`}
                      className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 ${
                        selectedAmount === amount
                          ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/10"
                          : "border-gray-100 bg-white text-gray-700"
                      }`}
                    >
                      {formatRupiah(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Atau Masukkan Nominal Lain</h2>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    data-testid="input-custom-amount"
                    value={customAmount}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setCustomAmount(raw);
                      if (raw) setSelectedAmount(null);
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 focus:border-primary rounded-2xl text-lg font-bold text-gray-900 outline-none transition-all"
                  />
                </div>
                {customAmount && parseInt(customAmount) < 10000 && (
                  <p className="text-xs text-red-500 mt-1 font-medium">Minimal Rp 10.000</p>
                )}
              </div>

              <button
                onClick={handleCreateQRIS}
                disabled={!effectiveAmount || effectiveAmount < 10000 || createTopup.isPending}
                data-testid="button-create-qris"
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {createTopup.isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Membuat QRIS...</>
                ) : (
                  <><QrCode className="w-4 h-4" /> Buat QRIS</>
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                Pembayaran via QRIS (GoPay, OVO, Dana, BRIVA, dll). QR berlaku 10 menit.
              </p>
            </motion.div>
          )}

          {/* ===== STEP 2: SCAN QRIS ===== */}
          {step === "qris" && activeTopup && (
            <motion.div
              key="qris"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Status badge + timer */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-sm font-semibold text-orange-700">Menunggu Pembayaran</span>
                </div>
                <CountdownTimer expiredAt={activeTopup.expiredAt} />
              </div>

              {/* QR Code card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Scan QRIS Ini</p>
                {activeTopup.qrString ? (
                  <div className="p-3 bg-white border-4 border-gray-100 rounded-2xl">
                    <QRCodeSVG value={activeTopup.qrString} size={220} level="M" data-testid="qr-code" />
                  </div>
                ) : (
                  <div className="w-[220px] h-[220px] bg-gray-100 rounded-2xl flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <div className="mt-5 text-center space-y-1">
                  <p className="text-xs text-gray-400">Nominal yang harus dibayar</p>
                  <p className="text-2xl font-display font-bold text-gray-900">
                    {formatRupiah(activeTopup.amountUnique ?? activeTopup.amount)}
                  </p>
                  {activeTopup.amountUnique && activeTopup.amountUnique !== activeTopup.amount && (
                    <p className="text-xs text-gray-400">
                      (termasuk kode unik +{activeTopup.amountUnique - activeTopup.amount})
                    </p>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-bold text-blue-800">Cara Bayar:</p>
                <p className="text-xs text-blue-700">1. Buka aplikasi e-wallet atau m-banking</p>
                <p className="text-xs text-blue-700">2. Pilih menu Scan QR / QRIS</p>
                <p className="text-xs text-blue-700">3. Scan QR di atas dan bayar sesuai nominal</p>
                <p className="text-xs text-blue-700">4. Saldo otomatis masuk setelah pembayaran terdeteksi</p>
              </div>

              {/* Ref ID */}
              {activeTopup.refId && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                  <span className="text-xs text-gray-400 font-medium">ID: <span className="font-mono text-gray-600">{activeTopup.refId}</span></span>
                  <button onClick={() => handleCopy(activeTopup.refId)} className="text-gray-400">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all"
              >
                Ganti Nominal
              </button>
            </motion.div>
          )}

          {/* ===== STEP 3: DONE ===== */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4"
            >
              {isPaid ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-14 h-14 text-green-500" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h2>
                    <p className="text-gray-500 text-sm mb-1">Saldo berhasil ditambahkan</p>
                    <p className="text-3xl font-display font-bold text-green-600">
                      +{formatRupiah(finalTopup?.amount ?? activeTopup?.amount ?? 0)}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4 w-full text-left space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">ID Transaksi</span>
                      <span className="font-mono text-gray-700 text-xs">{finalTopup?.refId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Nominal Top Up</span>
                      <span className="font-semibold text-gray-800">{formatRupiah(finalTopup?.amount ?? 0)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-14 h-14 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">QRIS Kadaluarsa</h2>
                    <p className="text-gray-500 text-sm">Waktu pembayaran telah habis. Silakan buat QRIS baru.</p>
                  </div>
                </>
              )}

              <div className="space-y-3 w-full">
                <button
                  onClick={handleReset}
                  data-testid="button-topup-again"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                >
                  Top Up Lagi
                </button>
                <Link href="/">
                  <button className="w-full py-3 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">
                    Kembali ke Beranda
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
