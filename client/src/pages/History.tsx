import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle, Search, Calendar } from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { formatRupiah } from "@/lib/utils";

export default function History() {
  const { data: transactions, isLoading } = useTransactions();
  const [filter, setFilter] = useState<string>("all");

  const filteredData = transactions?.filter(tx => {
    if (filter === "all") return true;
    return tx.status === filter;
  }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <header className="bg-white px-6 pt-10 pb-4 shadow-sm z-10 relative">
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-4">Riwayat Transaksi</h1>
        
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {['all', 'success', 'pending', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Semua' : 
               f === 'success' ? 'Berhasil' : 
               f === 'pending' ? 'Menunggu' : 'Gagal'}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 flex-1">
        {isLoading ? (
           <div className="space-y-4">
             {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
           </div>
        ) : filteredData.length > 0 ? (
          <div className="space-y-4">
            {filteredData.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span className="text-sm font-bold text-gray-900">
                      {tx.status === 'success' ? 'Transaksi Berhasil' : 
                       tx.status === 'pending' ? 'Sedang Diproses' : 'Transaksi Gagal'}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-400 text-xs font-medium gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(tx.createdAt!), "dd MMM yyyy, HH:mm")}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
                  <p className="font-bold text-gray-900 text-sm mb-1">{tx.product?.name || `Produk ID: ${tx.productId}`}</p>
                  <p className="text-xs text-gray-500 font-medium">No. Tujuan: {tx.targetNumber}</p>
                </div>

                <div className="flex justify-between items-end">
                  <p className="text-xs text-gray-500 font-medium">Total Pembayaran</p>
                  <p className="font-bold text-gray-900">{formatRupiah(tx.amount)}</p>
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
              {filter === 'all' 
                ? "Anda belum pernah melakukan transaksi apapun." 
                : "Tidak ada transaksi dengan status tersebut."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
