import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { formatRupiah } from "@/lib/utils";
import { CheckoutDrawer } from "@/components/CheckoutDrawer";
import { type Product } from "@shared/schema";

type View = "brands" | "subbrands" | "products";

// Brand logo colors for visual variety
const brandColors: Record<string, string> = {
  "Telkomsel": "bg-red-50 text-red-600 border-red-100",
  "XL": "bg-blue-50 text-blue-600 border-blue-100",
  "Indosat": "bg-yellow-50 text-yellow-600 border-yellow-100",
  "Tri": "bg-purple-50 text-purple-600 border-purple-100",
  "Smartfren": "bg-green-50 text-green-600 border-green-100",
  "By.U": "bg-teal-50 text-teal-600 border-teal-100",
  "GoPay": "bg-green-50 text-green-700 border-green-100",
  "OVO": "bg-purple-50 text-purple-700 border-purple-100",
  "Dana": "bg-blue-50 text-blue-600 border-blue-100",
  "ShopeePay": "bg-orange-50 text-orange-600 border-orange-100",
  "LinkAja": "bg-red-50 text-red-600 border-red-100",
};

function getBrandStyle(brand: string) {
  return brandColors[brand] || "bg-gray-50 text-gray-700 border-gray-100";
}

function getBrandInitial(brand: string) {
  return brand.slice(0, 2).toUpperCase();
}

export default function Category() {
  const params = useParams();
  const categoryId = params.id ? parseInt(params.id) : undefined;

  const [view, setView] = useState<View>("brands");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSubBrand, setSelectedSubBrand] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories } = useCategories();
  const { data: allProducts = [], isLoading } = useProducts(categoryId);

  const category = categories?.find(c => c.id === categoryId);

  // Only active products
  const activeProducts = allProducts.filter(p => p.isActive);

  // Products with no brand → shown directly at brand level as "Lainnya"
  const brandedProducts = activeProducts.filter(p => p.brand);
  const unbrandedProducts = activeProducts.filter(p => !p.brand);

  // Unique brands
  const brands = Array.from(new Set(brandedProducts.map(p => p.brand!))).sort();

  // Unique sub-brands for selected brand
  const subBrandProducts = selectedBrand
    ? brandedProducts.filter(p => p.brand === selectedBrand)
    : [];
  const subBrands = Array.from(new Set(subBrandProducts.filter(p => p.subBrand).map(p => p.subBrand!))).sort();
  const subBrandlessProducts = subBrandProducts.filter(p => !p.subBrand);

  // Final product list
  let finalProducts: Product[] = [];
  if (view === "products") {
    if (selectedSubBrand) {
      finalProducts = subBrandProducts.filter(p => p.subBrand === selectedSubBrand);
    } else if (selectedBrand === "__unbranded__") {
      finalProducts = unbrandedProducts;
    } else {
      finalProducts = subBrandlessProducts;
    }
  }

  const filteredFinalProducts = finalProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBrandClick = (brand: string) => {
    setSelectedBrand(brand);
    setSearchQuery("");
    if (brand === "__unbranded__") {
      setView("products");
      return;
    }
    const sub = Array.from(new Set(
      brandedProducts.filter(p => p.brand === brand && p.subBrand).map(p => p.subBrand!)
    ));
    if (sub.length > 0) {
      setView("subbrands");
    } else {
      setView("products");
    }
  };

  const handleSubBrandClick = (sub: string) => {
    setSelectedSubBrand(sub);
    setSearchQuery("");
    setView("products");
  };

  const handleBack = () => {
    setSearchQuery("");
    if (view === "products") {
      if (selectedSubBrand) {
        setSelectedSubBrand(null);
        setView("subbrands");
      } else {
        setSelectedBrand(null);
        setView("brands");
      }
    } else if (view === "subbrands") {
      setSelectedBrand(null);
      setView("brands");
    }
  };

  if (!categoryId) return <div>Invalid Category</div>;

  // Breadcrumb title
  const headerTitle = view === "brands"
    ? category?.name || "Memuat..."
    : view === "subbrands"
    ? selectedBrand!
    : selectedSubBrand || selectedBrand!;

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-100 z-30 px-4 py-4">
        <div className="flex items-center gap-3 mb-1">
          {view === "brands" ? (
            <Link href="/">
              <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
          ) : (
            <button
              onClick={handleBack}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{headerTitle}</h1>
            {/* Breadcrumb */}
            {view !== "brands" && (
              <div className="flex items-center gap-1 text-xs text-gray-400 font-medium flex-wrap">
                <span className="truncate max-w-[80px]">{category?.name}</span>
                {selectedBrand && selectedBrand !== "__unbranded__" && (
                  <><ChevronRight className="w-3 h-3 flex-shrink-0" /><span className="truncate max-w-[80px]">{selectedBrand}</span></>
                )}
                {selectedSubBrand && (
                  <><ChevronRight className="w-3 h-3 flex-shrink-0" /><span className="truncate max-w-[80px]">{selectedSubBrand}</span></>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search (only on product view) */}
      {view === "products" && (
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="input-search-product"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* === LEVEL 1: BRANDS === */}
            {view === "brands" && (
              <motion.div
                key="brands"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {brands.length === 0 && unbrandedProducts.length === 0 && (
                  <div className="py-16 text-center text-gray-400">
                    <p className="font-medium">Belum ada produk</p>
                  </div>
                )}
                {brands.map((brand, i) => (
                  <motion.button
                    key={brand}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleBrandClick(brand)}
                    data-testid={`brand-card-${brand}`}
                    className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-sm flex-shrink-0 ${getBrandStyle(brand)}`}>
                      {getBrandInitial(brand)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900">{brand}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {brandedProducts.filter(p => p.brand === brand).length} produk tersedia
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </motion.button>
                ))}
                {/* Products with no brand */}
                {unbrandedProducts.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: brands.length * 0.04 }}
                    onClick={() => handleBrandClick("__unbranded__")}
                    data-testid="brand-card-lainnya"
                    className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="w-12 h-12 rounded-xl border bg-gray-50 text-gray-500 border-gray-100 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      ...
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900">Lainnya</p>
                      <p className="text-xs text-gray-400 mt-0.5">{unbrandedProducts.length} produk tersedia</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* === LEVEL 2: SUB-BRANDS === */}
            {view === "subbrands" && (
              <motion.div
                key="subbrands"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {subBrands.map((sub, i) => (
                  <motion.button
                    key={sub}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleSubBrandClick(sub)}
                    data-testid={`subbrand-card-${sub}`}
                    className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xs flex-shrink-0 ${getBrandStyle(selectedBrand!)}`}>
                      {getBrandInitial(selectedBrand!)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900">{sub}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {subBrandProducts.filter(p => p.subBrand === sub).length} produk tersedia
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </motion.button>
                ))}
                {/* Products under this brand with no sub-brand */}
                {subBrandlessProducts.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: subBrands.length * 0.04 }}
                    onClick={() => { setSelectedSubBrand(null); setView("products"); }}
                    data-testid="subbrand-card-umum"
                    className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform"
                  >
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-xs flex-shrink-0 ${getBrandStyle(selectedBrand!)}`}>
                      {getBrandInitial(selectedBrand!)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900">Umum</p>
                      <p className="text-xs text-gray-400 mt-0.5">{subBrandlessProducts.length} produk tersedia</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* === LEVEL 3: PRODUCTS === */}
            {view === "products" && (
              <motion.div
                key="products"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {filteredFinalProducts.length > 0 ? (
                  filteredFinalProducts.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedProduct(product)}
                      data-testid={`product-item-${product.id}`}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-gray-900">{product.name}</h3>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{product.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-lg">{formatRupiah(product.price)}</p>
                          <p className="text-xs text-gray-400">Pilih &rsaquo;</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                      <Search className="w-8 h-8" />
                    </div>
                    <p className="font-semibold text-gray-700">Produk tidak ditemukan</p>
                    <p className="text-sm text-gray-400 mt-1">Coba kata kunci lain</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
