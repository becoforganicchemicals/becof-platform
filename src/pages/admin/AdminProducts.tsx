import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Package, AlertTriangle, Upload,
  FileText, Loader2, Star, Search, Eye, EyeOff,
  LayoutGrid, List, RefreshCw,
} from "lucide-react";

interface ProductForm {
  name: string; slug: string; price: string; stock_quantity: string;
  short_description: string; long_description: string; usage_instructions: string;
  sku: string; is_published: boolean; is_featured: boolean;
  parent_category_id: string; subcategory_id: string;
}

const emptyForm: ProductForm = {
  name: "", slug: "", price: "", stock_quantity: "", short_description: "",
  long_description: "", usage_instructions: "", sku: "",
  is_published: true, is_featured: false,
  parent_category_id: "", subcategory_id: "",
};

type ViewMode = "grid" | "list";

/* ══════════════════════════════════════════════════════════════════ */
const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "featured" | "low_stock">("all");

  /* ─── Categories ─── */
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").is("parent_id", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["admin-subcategories", form.parent_category_id],
    queryFn: async () => {
      if (!form.parent_category_id) return [];
      const { data, error } = await supabase.from("categories").select("*").eq("parent_id", form.parent_category_id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!form.parent_category_id,
  });

  /* ─── Products ─── */
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(`
        *,
        categories (id, name, parent_id, parent:parent_id (id, name))
      `).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* ─── Filters ─── */
  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterStatus === "all" ? true :
        filterStatus === "active" ? p.is_published :
          filterStatus === "inactive" ? !p.is_published :
            filterStatus === "featured" ? p.is_featured :
              filterStatus === "low_stock" ? p.stock_quantity <= p.low_stock_threshold : true;
    return matchSearch && matchFilter;
  });

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
  const featuredCount = products.filter(p => p.is_featured).length;
  const noCategoriesExist = categories.length === 0;

  /* ─── File upload ─── */
  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    if (bucket === "product-images") {
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    return path;
  };

  /* ─── SKU generation ─── */
  const generateSku = async () => {
    const today = new Date();
    const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end);
    return `BECOF-${date}-${String((count || 0) + 1).padStart(4, "0")}`;
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");

  useEffect(() => {
    if (dialogOpen && !editingProduct) {
      generateSku().then(sku => setForm(f => ({ ...f, sku })));
    }
  }, [dialogOpen, editingProduct]);

  /* ─── Upsert product ─── */
  const upsertProduct = useMutation({
    mutationFn: async (product: any) => {
      setUploading(true);
      try {
        let imageUrl = editingProduct?.images?.[0] || null;
        let safetySheetPath = editingProduct?.safety_sheet_url || null;
        if (imageFile) imageUrl = await uploadFile(imageFile, "product-images", "products");
        if (pdfFile) safetySheetPath = await uploadFile(pdfFile, "product-pdfs", "manuals");

        const finalCategoryId = product.subcategory_id || product.parent_category_id || null;
        if (!finalCategoryId) throw new Error("Category is required");

        const payload = {
          name: product.name,
          slug: product.slug || generateSlug(product.name),
          price: Number(product.price),
          stock_quantity: Number(product.stock_quantity),
          short_description: product.short_description || null,
          long_description: product.long_description || null,
          usage_instructions: product.usage_instructions || null,
          sku: product.sku || await generateSku(),
          is_published: product.is_published,
          is_featured: product.is_featured,
          category_id: finalCategoryId,
          images: imageUrl ? [imageUrl] : [],
          safety_sheet_url: safetySheetPath,
        };

        if (product.id) {
          const { error } = await supabase.from("products").update(payload).eq("id", product.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("products").insert(payload);
          if (error?.message?.includes("unique_sku")) {
            payload.sku = await generateSku();
            const { error: e2 } = await supabase.from("products").insert(payload);
            if (e2) throw e2;
          } else if (error) throw error;
        }
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Product saved ✓" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ─── Toggle featured inline ─── */
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("products").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_featured }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: is_featured ? "⭐ Product featured on homepage" : "Product removed from featured" });
    },
  });

  /* ─── Toggle published inline ─── */
  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("products").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  /* ─── Delete ─── */
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setImageFile(null);
    setPdfFile(null);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    const cat = p.categories;
    const isSub = cat?.parent_id;
    setForm({
      name: p.name, slug: p.slug, price: String(p.price),
      stock_quantity: String(p.stock_quantity),
      short_description: p.short_description || "",
      long_description: p.long_description || "",
      usage_instructions: p.usage_instructions || "",
      sku: p.sku || "", is_published: p.is_published,
      is_featured: p.is_featured || false,
      parent_category_id: isSub ? cat.parent_id : (p.category_id || ""),
      subcategory_id: isSub ? p.category_id : "",
    });
    setDialogOpen(true);
  };

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ── Low stock alert ── */}
      {lowStockProducts.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-700">
            {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s are" : " is"} running low on stock:{" "}
            <span className="font-normal">{lowStockProducts.map(p => p.name).join(", ")}</span>
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Package className="h-5 w-5 text-emerald-600" />
            Products
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {products.length} total · {featuredCount} featured · {products.filter(p => p.is_published).length} active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-slate-500">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {/* view toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "list" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "grid" ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                disabled={noCategoriesExist}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editingProduct
                    ? <><Edit className="h-4 w-4 text-emerald-600" /> Edit Product</>
                    : <><Plus className="h-4 w-4 text-emerald-600" /> New Product</>
                  }
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={e => { e.preventDefault(); upsertProduct.mutate({ ...form, id: editingProduct?.id }); }}
                className="space-y-5 pt-1"
              >
                {/* Section: Basic Info */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Basic Info</p>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Product Name *</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                      required
                      placeholder="e.g. BioGrow Organic Fertilizer 25kg"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Slug</Label>
                    <Input value={form.slug} readOnly className="mt-1 font-mono text-sm text-slate-400 bg-slate-50" />
                  </div>
                </div>

                {/* Section: Category */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Category *</Label>
                      <Select
                        value={form.parent_category_id}
                        onValueChange={v => setForm(f => ({ ...f, parent_category_id: v, subcategory_id: "" }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Subcategory</Label>
                      <Select
                        value={form.subcategory_id}
                        onValueChange={v => setForm(f => ({ ...f, subcategory_id: v }))}
                        disabled={!form.parent_category_id || subcategories.length === 0}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={subcategories.length === 0 ? "None available" : "Select…"} />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section: Pricing & Stock */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pricing & Stock</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Price (KES) *</Label>
                      <Input
                        type="number" min="0" className="mt-1"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">Stock Qty *</Label>
                      <Input
                        type="number" min="0" className="mt-1"
                        value={form.stock_quantity}
                        onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-500">SKU</Label>
                      <Input value={form.sku} readOnly className="mt-1 font-mono text-xs text-slate-400 bg-slate-50" />
                    </div>
                  </div>
                </div>

                {/* Section: Descriptions */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descriptions</p>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Short Description</Label>
                    <Input
                      className="mt-1" value={form.short_description}
                      onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))}
                      placeholder="One-line summary shown in product cards"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Full Description</Label>
                    <Textarea
                      rows={3} className="mt-1 resize-none" value={form.long_description}
                      onChange={e => setForm(f => ({ ...f, long_description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500">Usage Instructions</Label>
                    <Textarea
                      rows={3} className="mt-1 resize-none" value={form.usage_instructions}
                      onChange={e => setForm(f => ({ ...f, usage_instructions: e.target.value }))}
                      placeholder="How to apply / use this product…"
                    />
                  </div>
                </div>

                {/* Section: Media */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Media</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                      <Upload className="h-5 w-5 text-slate-300 mx-auto mb-1.5" />
                      <Label className="cursor-pointer text-xs text-slate-500">
                        Product Image
                        <Input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                      </Label>
                      {imageFile
                        ? <p className="text-xs text-emerald-600 mt-1 truncate">{imageFile.name}</p>
                        : editingProduct?.images?.[0]
                          ? <p className="text-xs text-slate-400 mt-1">Current image set</p>
                          : null
                      }
                    </div>
                    <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-emerald-400 transition-colors">
                      <FileText className="h-5 w-5 text-slate-300 mx-auto mb-1.5" />
                      <Label className="cursor-pointer text-xs text-slate-500">
                        Safety Sheet (PDF)
                        <Input type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                      </Label>
                      {pdfFile
                        ? <p className="text-xs text-emerald-600 mt-1 truncate">{pdfFile.name}</p>
                        : editingProduct?.safety_sheet_url
                          ? <p className="text-xs text-slate-400 mt-1">Current PDF set</p>
                          : null
                      }
                    </div>
                  </div>
                </div>

                {/* Section: Visibility & Feature */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visibility</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Published</p>
                        <p className="text-xs text-slate-400">Visible to customers in the store.</p>
                      </div>
                      <Switch
                        checked={form.is_published}
                        onCheckedChange={c => setForm(f => ({ ...f, is_published: c }))}
                      />
                    </div>
                    <div className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Featured on Homepage</p>
                          <p className="text-xs text-slate-400">Displays this product in the Featured Products section.</p>
                        </div>
                      </div>
                      <Switch
                        checked={form.is_featured}
                        onCheckedChange={c => setForm(f => ({ ...f, is_featured: c }))}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={upsertProduct.isPending || uploading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
                >
                  {(upsertProduct.isPending || uploading)
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    : editingProduct ? "Update Product" : "Create Product"
                  }
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── No categories warning ── */}
      {noCategoriesExist && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            No categories found. Create a category first before adding products.
          </p>
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: products.length, color: "bg-slate-50 border-slate-200 text-slate-700", filter: "all" as const },
          { label: "Active", value: products.filter(p => p.is_published).length, color: "bg-emerald-50 border-emerald-200 text-emerald-700", filter: "active" as const },
          { label: "Featured", value: featuredCount, color: "bg-amber-50 border-amber-200 text-amber-700", filter: "featured" as const },
          { label: "Low Stock", value: lowStockProducts.length, color: "bg-red-50 border-red-200 text-red-700", filter: "low_stock" as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(filterStatus === s.filter ? "all" : s.filter)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${s.color} ${filterStatus === s.filter ? "ring-2 ring-offset-1 ring-emerald-400" : ""}`}
          >
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or SKU…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ══════════ LIST VIEW ══════════ */}
      {viewMode === "list" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px_80px_80px_100px] gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
            {["Product", "Category", "SKU", "Price", "Stock", "Published", "Featured", "Actions"].map(h => (
              <p key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</p>
            ))}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No products found.</p>
            </div>
          )}

          {filtered.map(p => {
            const cat = p.categories as any;
            const parentName = cat?.parent?.name || (!cat?.parent_id ? cat?.name : null);
            const subName = cat?.parent_id ? cat?.name : null;
            const isLow = p.stock_quantity <= p.low_stock_threshold;

            return (
              <div
                key={p.id}
                className="grid grid-cols-[2fr_1fr_1fr_80px_80px_80px_80px_100px] gap-3 items-center px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
              >
                {/* Product */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      : <Package className="h-4 w-4 text-slate-300" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{p.name}</p>
                    {subName && <p className="text-xs text-slate-400 truncate">{subName}</p>}
                    {p.is_featured && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Category */}
                <p className="text-sm text-slate-500 truncate">{parentName || "—"}</p>

                {/* SKU */}
                <p className="font-mono text-xs text-slate-400 truncate">{p.sku || "—"}</p>

                {/* Price */}
                <p className="text-sm font-semibold text-slate-800">
                  KES {Number(p.price).toLocaleString()}
                </p>

                {/* Stock */}
                <p className={`text-sm font-medium ${isLow ? "text-red-500" : "text-slate-600"}`}>
                  {isLow && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                  {p.stock_quantity}
                </p>

                {/* Published toggle */}
                <Switch
                  checked={p.is_published}
                  onCheckedChange={v => togglePublished.mutate({ id: p.id, is_published: v })}
                />

                {/* Featured toggle */}
                <button
                  onClick={() => toggleFeatured.mutate({ id: p.id, is_featured: !p.is_featured })}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${p.is_featured
                      ? "bg-amber-100 text-amber-500 hover:bg-amber-200"
                      : "text-slate-300 hover:bg-slate-100 hover:text-amber-400"
                    }`}
                  title={p.is_featured ? "Remove from featured" : "Add to featured"}
                >
                  <Star className={`h-4 w-4 ${p.is_featured ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => openEdit(p)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProduct.mutate(p.id); }}
                    className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ GRID VIEW ══════════ */}
      {viewMode === "grid" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading && <p className="col-span-4 text-center text-slate-400 py-10 text-sm animate-pulse">Loading…</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="col-span-4 text-center text-slate-400 py-10 text-sm">No products found.</p>
          )}

          {filtered.map(p => {
            const isLow = p.stock_quantity <= p.low_stock_threshold;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                {/* image */}
                <div className="relative h-40 bg-slate-100">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="flex items-center justify-center h-full"><Package className="h-10 w-10 text-slate-200" /></div>
                  }
                  {/* featured badge */}
                  {p.is_featured && (
                    <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" /> Featured
                    </span>
                  )}
                  {!p.is_published && (
                    <span className="absolute top-2 right-2 bg-slate-700/70 text-white text-xs px-2 py-0.5 rounded-full">Draft</span>
                  )}
                  {isLow && (
                    <span className="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Low Stock</span>
                  )}
                </div>

                <div className="p-4">
                  <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{p.name}</p>
                  <p className="text-emerald-700 font-bold mt-1">KES {Number(p.price).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Stock: {p.stock_quantity}</p>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    {/* published */}
                    <button
                      onClick={() => togglePublished.mutate({ id: p.id, is_published: !p.is_published })}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${p.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      {p.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {p.is_published ? "Live" : "Draft"}
                    </button>

                    {/* featured */}
                    <button
                      onClick={() => toggleFeatured.mutate({ id: p.id, is_featured: !p.is_featured })}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${p.is_featured ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
                        }`}
                    >
                      <Star className={`h-3 w-3 ${p.is_featured ? "fill-amber-400" : ""}`} />
                      {p.is_featured ? "Featured" : "Feature"}
                    </button>

                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-7 w-7 p-0">
                        <Edit className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProduct.mutate(p.id); }}
                        className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
