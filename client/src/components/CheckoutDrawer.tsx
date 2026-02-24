import { useState } from "react";
import { useForm } from "react-form"; // Not standard react-hook-form syntax, using standard below
import { useForm as useRHForm } from "react-hook-form";
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
  targetNumber: z.string().min(4, "Nomor tujuan tidak valid"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutDrawer({ product, isOpen, onClose }: CheckoutDrawerProps) {
  const [successStatus, setSuccessStatus] = useState<boolean | null>(null);
  const createMutation = useCreateTransaction();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useRHForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

  const onSubmit = (data: CheckoutForm) => {
    if (!product) return;
    
    createMutation.mutate(
      {
        productId: product.id,
        targetNumber: data.targetNumber,
        userId: 1, // Mocked user
      },
      {
        onSuccess: () => {
          setSuccessStatus(true);
          setTimeout(() => {
            handleClose();
          }, 2000);
        },
        onError: () => {
          setSuccessStatus(false);
        }
      }
    );
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      reset();
      setSuccessStatus(null);
      createMutation.reset();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-6 flex-1 overflow-y-auto hide-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Konfirmasi Pembayaran</h2>
                <button 
                  onClick={handleClose}
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h3>
                  <p className="text-gray-500">Pesanan {product.name} sedang diproses.</p>
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
                  <p className="text-gray-500 mb-6">Pastikan saldo Anda mencukupi atau coba lagi nanti.</p>
                  <button 
                    onClick={() => setSuccessStatus(null)}
                    className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-xl w-full"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Product Summary Card */}
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-1">Produk</p>
                      <p className="font-bold text-gray-900">{product.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-medium mb-1">Harga</p>
                      <p className="font-bold text-primary">{formatRupiah(product.price)}</p>
                    </div>
                  </div>

                  {/* Input Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nomor Tujuan / Pelanggan
                    </label>
                    <input
                      {...register("targetNumber")}
                      placeholder="Contoh: 081234567890"
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

                  {/* Action Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all duration-300",
                        createMutation.isPending 
                          ? "bg-gray-400 cursor-not-allowed transform-none" 
                          : "bg-gradient-to-r from-primary to-blue-600 shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0"
                      )}
                    >
                      {createMutation.isPending ? "Memproses..." : "Bayar Sekarang"}
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
