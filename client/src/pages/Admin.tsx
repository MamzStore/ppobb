import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useCategories } from "@/hooks/use-categories";
import { formatRupiah } from "@/lib/utils";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronUp,
  Users, Package, ToggleLeft, ToggleRight, Check, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function useAdminUsers() {
  return useQuery({
    queryKey: [api.admin.listUsers.path],
    queryFn: async () => {
      const res = await fetch(api.admin.listUsers.path, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data user");
      return res.json();
    },
  });
}

function useAllProducts() {
  return useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil produk");
      return res.json();
    },
  });
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"users" | "products">("users");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <header className="bg-white px-6 pt-10 pb-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Panel Admin</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("users")}
            data-testid="tab-users"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "users" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Users className="w-4 h-4" /> Pengguna
          </button>
          <button
            onClick={() => setActiveTab("products")}
            data-testid="tab-products"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "products" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Package className="w-4 h-4" /> Produk
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "users" ? (
          <UsersPanel toast={toast} queryClient={queryClient} />
        ) : (
          <ProductsPanel toast={toast} queryClient={queryClient} />
        )}
      </div>
    </div>
  );
}

function UsersPanel({ toast, queryClient }: any) {
  const { data: users, isLoading } = useAdminUsers();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [adjustType, setAdjustType] = useState<"add" | "subtract" | "set">("add");
  const [adjustAmount, setAdjustAmount] = useState("");

  const adjustBalance = useMutation({
    mutationFn: async ({ userId, amount, type }: { userId: number; amount: number; type: string }) => {
      const url = buildUrl(api.admin.adjustBalance.path, { id: userId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mengubah saldo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.listUsers.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.me.path] });
      setEditingUserId(null);
      setAdjustAmount("");
      toast({ title: "Saldo berhasil diubah" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (userId: number) => {
    const amount = parseInt(adjustAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" });
      return;
    }
    adjustBalance.mutate({ userId, amount, type: adjustType });
  };

  if (isLoading) {
    return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3">
      {users?.map((user: any) => (
        <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-900">{user.username}</p>
              <p className="text-sm text-gray-500">ID: {user.id}</p>
              <p className="text-lg font-bold text-primary mt-1">{formatRupiah(user.balance)}</p>
            </div>
            <button
              data-testid={`button-edit-balance-${user.id}`}
              onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
              className="p-2 bg-gray-100 rounded-xl text-gray-600"
            >
              {editingUserId === user.id ? <ChevronUp className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
          </div>

          {editingUserId === user.id && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Ubah Saldo</p>
              <div className="flex gap-2">
                {(["add", "subtract", "set"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setAdjustType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                      adjustType === t ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t === "add" ? "+ Tambah" : t === "subtract" ? "- Kurangi" : "= Tetapkan"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="Jumlah (Rp)"
                  data-testid="input-balance-amount"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary"
                />
                <button
                  onClick={() => handleSubmit(user.id)}
                  disabled={adjustBalance.isPending}
                  data-testid="button-save-balance"
                  className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-60"
                >
                  {adjustBalance.isPending ? "..." : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditingUserId(null); setAdjustAmount(""); }}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductsPanel({ toast, queryClient }: any) {
  const { data: products, isLoading } = useAllProducts();
  const { data: categories } = useCategories();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProduct, setNewProduct] = useState({ categoryId: "", brand: "", subBrand: "", name: "", code: "", price: "" });

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.products.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, categoryId: Number(data.categoryId), price: Number(data.price) }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menambah produk");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      setShowAddForm(false);
      setNewProduct({ categoryId: "", name: "", code: "", price: "" });
      toast({ title: "Produk berhasil ditambahkan" });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, categoryId: Number(data.categoryId), price: Number(data.price) }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal update produk");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      setEditingProduct(null);
      toast({ title: "Produk berhasil diperbarui" });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal update status");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Gagal menghapus produk");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Produk dihapus" });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  const ProductForm = ({ data, onChange, onSave, onCancel, isPending, isEdit }: any) => (
    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
      <p className="font-semibold text-gray-800 text-sm">{isEdit ? "Edit Produk" : "Tambah Produk Baru"}</p>
      <select
        value={data.categoryId}
        onChange={e => onChange({ ...data, categoryId: e.target.value })}
        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white"
      >
        <option value="">Pilih Kategori</option>
        {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex gap-2">
        <input
          value={data.brand || ""}
          onChange={e => onChange({ ...data, brand: e.target.value })}
          placeholder="Brand (misal: Telkomsel)"
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
        />
        <input
          value={data.subBrand || ""}
          onChange={e => onChange({ ...data, subBrand: e.target.value })}
          placeholder="Sub-brand (misal: Reguler)"
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
        />
      </div>
      <input
        value={data.name}
        onChange={e => onChange({ ...data, name: e.target.value })}
        placeholder="Nama Produk"
        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <input
          value={data.code}
          onChange={e => onChange({ ...data, code: e.target.value })}
          placeholder="Kode SKU"
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-primary font-mono"
        />
        <input
          value={data.price}
          onChange={e => onChange({ ...data, price: e.target.value })}
          placeholder="Harga (Rp)"
          type="number"
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isPending}
          data-testid={isEdit ? "button-save-product" : "button-add-product"}
          className="flex-1 py-2 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold">
          Batal
        </button>
      </div>
    </div>
  );

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          data-testid="button-show-add-product"
          className="w-full py-3 border-2 border-dashed border-primary/40 text-primary rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Produk
        </button>
      )}

      {showAddForm && (
        <ProductForm
          data={newProduct}
          onChange={setNewProduct}
          onSave={() => createProduct.mutate(newProduct)}
          onCancel={() => setShowAddForm(false)}
          isPending={createProduct.isPending}
          isEdit={false}
        />
      )}

      {products?.map((product: any) => {
        const cat = categories?.find((c: any) => c.id === product.categoryId);
        return (
          <div key={product.id} data-testid={`product-card-${product.id}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {editingProduct?.id === product.id ? (
              <ProductForm
                data={editingProduct}
                onChange={setEditingProduct}
                onSave={() => updateProduct.mutate({ id: product.id, data: editingProduct })}
                onCancel={() => setEditingProduct(null)}
                isPending={updateProduct.isPending}
                isEdit={true}
              />
            ) : (
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{product.code} · {cat?.name || "—"}</p>
                  </div>
                  <p className="font-bold text-primary">{formatRupiah(product.price)}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleActive.mutate({ id: product.id, isActive: !product.isActive })}
                    data-testid={`toggle-active-${product.id}`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setEditingProduct({ ...product })}
                    data-testid={`button-edit-product-${product.id}`}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus produk "${product.name}"?`)) deleteProduct.mutate(product.id);
                    }}
                    data-testid={`button-delete-product-${product.id}`}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
