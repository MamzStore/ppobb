import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { formatRupiah } from "@/lib/utils";
import { CheckoutDrawer } from "@/components/CheckoutDrawer";
import { type Product } from "@shared/schema";

export default function Category() {
  const params = useParams();
  const categoryId = params.id ? parseInt(params.id) : undefined;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: categories } = useCategories();
  const { data: products, isLoading } = useProducts(categoryId);

  const category = categories?.find(c => c.id === categoryId);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) && p.isActive
  ) || [];

  if (!categoryId) return <div>Invalid Category</div>;

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 z-30 px-4 py-4 flex items-center gap-4">
        <Link href="/">
          <button className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {category?.name || "Memuat..."}
        </h1>
      </header>

      {/* Search Bar */}
      <div className="p-4 bg-white shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl font-medium text-gray-900 transition-all outline-none"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="p-4 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="space-y-3">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedProduct(product)}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-lg">
                      {formatRupiah(product.price)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Produk tidak ditemukan</h3>
            <p className="text-gray-500 text-sm">Coba gunakan kata kunci lain.</p>
          </div>
        )}
      </div>

      <CheckoutDrawer 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </div>
  );
}
