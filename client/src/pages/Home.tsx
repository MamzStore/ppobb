import { motion } from "framer-motion";
import { Link } from "wouter";
import { Bell, ScanLine, Wallet, ChevronRight, Activity } from "lucide-react";
import { useMe } from "@/hooks/use-users";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { formatRupiah } from "@/lib/utils";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

export default function Home() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: transactions, isLoading: txLoading } = useTransactions();

  const recentTransactions = transactions?.slice(0, 3) || [];

  return (
    <div className="relative min-h-full bg-gray-50 pb-8">
      {/* Decorative Header Background */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />

      {/* Header Profile */}
      <header className="px-6 pt-10 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 p-[2px] shadow-md">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <span className="font-display font-bold text-primary text-lg">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Selamat datang,</p>
            <h1 className="text-xl font-bold text-gray-900">
              {userLoading ? "Loading..." : user?.username || "Guest"}
            </h1>
          </div>
        </div>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 relative text-gray-600 hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
      </header>

      {/* Balance Card */}
      <div className="px-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-6 shadow-xl relative overflow-hidden"
        >
          {/* Card Decorations */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Total Saldo</p>
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                  {userLoading ? "..." : formatRupiah(user?.balance || 0)}
                </h2>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/topup" className="flex-1">
                <button data-testid="button-topup" className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20">
                  <Activity className="w-4 h-4" /> Top Up
                </button>
              </Link>
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 backdrop-blur-md transition-all border border-white/10">
                <ScanLine className="w-4 h-4" /> Scan QRIS
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Categories Grid */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-bold text-gray-900">Layanan PPOB</h3>
        </div>
        
        {categoriesLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
                <div className="w-12 h-3 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-y-6 gap-x-4">
            {categories?.map((cat, i) => (
              <Link key={cat.id} href={`/category/${cat.id}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
                    <DynamicIcon name={cat.icon} className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="px-6">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-bold text-gray-900">Transaksi Terakhir</h3>
          <Link href="/history" className="text-sm font-semibold text-primary flex items-center hover:underline">
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {txLoading ? (
             <div className="space-y-3">
               {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
             </div>
          ) : recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{tx.product?.name || "Transaksi"}</h4>
                    <p className="text-xs text-gray-500 font-medium">{tx.targetNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm mb-1">-{formatRupiah(tx.amount)}</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                    tx.status === 'success' ? 'bg-green-100 text-green-700' :
                    tx.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {tx.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
              <p className="text-gray-500 font-medium text-sm">Belum ada transaksi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
