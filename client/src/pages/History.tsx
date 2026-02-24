import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle, Search, Calendar, RefreshCw, Copy } from "lucide-react";
import { useTransactions, useCheckTransactionStatus } from "@/hooks/use-transactions";
import { formatRupiah } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const { data: transactions, isLoading } = useTransactions();
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();
  const checkStatus = useCheckTransactionStatus();

  const filteredData = transactions?.filter(tx => {
    if (filter === "all") return true;
    return tx.status === filter;
  }).sort((a: any, b: any) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success': return 'Transaksi Berhasil';
      case 'pending': return 'Sedang Diproses';
      case 'failed': return 'Transaksi Gagal';
      default: return status;
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} disalin!`, duration: 2000 });
    });
  };

  const handleCheckStatus = async (txId: number) => {
    try {
      const updated = await checkStatus.mutateAsync(txId);
      if (updated.status === 'success') {
        toast({ title: "Transaksi Berhasil!", description: updated.serialNumber ? `SN: ${updated.serialNumber}` : undefined });
      } else if (updated.status === 'failed') {
        toast({ title: "Transaksi Gagal", description: "Saldo telah dikembalikan.", variant: "destructive" });
      } else {
        toast({ title: "Masih Diproses", description: "Transaksi masih pending di provider." });
      }
    } catch (err: any) {
      toast({ title: "Gagal cek status", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <header className="bg-white px-6 pt-10 pb-4 shadow-sm z-10 relative">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Riwayat Transaksi</h1>
        
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {['all', 'success', 'pending', 'failed'].map((f) => (
            <button
              key={f}
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600'
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
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredData.length > 0 ? (
          <div className="space-y-4">
            {filteredData.map((tx: any) => (
              <div key={tx.id} data-testid={`tx-card-${tx.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span className="text-sm font-bold text-gray-900">
                      {getStatusLabel(tx.status)}
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
                      <button
                        data-testid={`copy-refid-${tx.id}`}
                        onClick={() => handleCopyToClipboard(tx.refId, "Ref ID")}
                        className="flex-shrink-0 p-0.5 rounded text-gray-400"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {tx.serialNumber && (
                    <div className="flex items-center gap-1 pt-1 border-t border-gray-200 mt-1">
                      <p className="text-xs font-semibold text-green-700">SN: <span className="font-mono">{tx.serialNumber}</span></p>
                      <button
                        data-testid={`copy-sn-${tx.id}`}
                        onClick={() => handleCopyToClipboard(tx.serialNumber, "Serial Number")}
                        className="flex-shrink-0 p-0.5 rounded text-green-600"
                      >
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
                  
                  {tx.status === 'pending' && tx.refId && (
                    <button
                      data-testid={`check-status-${tx.id}`}
                      onClick={() => handleCheckStatus(tx.id)}
                      disabled={checkStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-semibold disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkStatus.isPending ? 'animate-spin' : ''}`} />
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
