import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { type Product } from "@shared/schema";
import { formatRupiah, cn } from "@/lib/utils";
import { useCreateTransaction } from "@/hooks/use-transactions";

interface CheckoutDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const checkoutSchema = z.object({
  targetNumber: z.string().min(4, "Nomor tujuan minimal 4 karakter"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutDrawer({ product, isOpen, onClose }: CheckoutDrawerProps) {
  const [successStatus, setSuccessStatus] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const createMutation = useCreateTransaction();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

  const onSubmit = (data: CheckoutForm) => {
    if (!product) return;
    setErrorMessage("");

    createMutation.mutate(
      {
        productId: product.id,
        targetNumber: data.targetNumber,
        userId: 1,
      },
      {
        onSuccess: () => {
          setSuccessStatus(true);
          setTimeout(() => {
            handleClose();
          }, 2500);
        },
        onError: (err: any) => {
          setSuccessStatus(false);
          setErrorMessage(err.message || "Terjadi kesalahan saat memproses transaksi.");
        },
      }
    );
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      reset();
      setSuccessStatus(null);
      setErrorMessage("");
      createMutation.reset();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Konfirmasi Pembayaran</h2>
                <button
                  onClick={handleClose}
                  data-testid="button-close-checkout"
                  className="p-2 bg-gray-100 rounded-full text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {successStatus === true ? (
                <div className="py-8 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Dikirim!</h3>
                  <p className="text-gray-500">Transaksi <span className="font-semibold">{product.name}</span> sedang diproses oleh provider.</p>
                  <p className="text-sm text-gray-400 mt-2">Cek status di Riwayat Transaksi.</p>
                </div>
              ) : successStatus === false ? (
                <div className="py-8 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <AlertCircle className="w-20 h-20 text-red-500 mb-4" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Gagal</h3>
                  <p className="text-gray-500 mb-6">{errorMessage || "Pastikan saldo Anda mencukupi atau coba lagi nanti."}</p>
                  <button
                    onClick={() => { setSuccessStatus(null); setErrorMessage(""); createMutation.reset(); }}
                    data-testid="button-retry-checkout"
                    className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-xl w-full"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">Produk</p>
                      <p className="font-bold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-medium mb-1">Harga</p>
                      <p className="font-bold text-primary text-lg">{formatRupiah(product.price)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nomor Tujuan / ID Pelanggan
                    </label>
                    <input
                      {...register("targetNumber")}
                      data-testid="input-target-number"
                      placeholder="Contoh: 081234567890"
                      inputMode="numeric"
                      className={cn(
                        "w-full px-4 py-4 bg-gray-50 border-2 rounded-xl text-lg font-medium transition-all outline-none",
                        errors.targetNumber
                          ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                          : "border-gray-200 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                      )}
                    />
                    {errors.targetNumber && (
                      <p className="mt-2 text-sm text-red-500">{errors.targetNumber.message}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      data-testid="button-pay"
                      disabled={createMutation.isPending}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all duration-300",
                        createMutation.isPending
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-primary to-blue-600 shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
                      )}
                    >
                      {createMutation.isPending ? "Memproses..." : `Bayar ${formatRupiah(product.price)}`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
