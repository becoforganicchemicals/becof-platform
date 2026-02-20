import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Package, AlertTriangle, Upload, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ProductForm {
  name: string;
  slug: string;
  price: string;
  stock_quantity: string;
  short_description: string;
  long_description: string;
  usage_instructions: string;
  sku: string;
  is_published: boolean;
  parent_category_id: string;
  subcategory_id: string;
}

const emptyForm: ProductForm = {
  name: "", slug: "", price: "", stock_quantity: "", short_description: "",
  long_description: "", usage_instructions: "", sku: "", is_published: true,
  parent_category_id: "", subcategory_id: "",
};

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch categories (top-level)
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").is("parent_id", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch subcategories filtered by selected parent category
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(`
  *,
  categories (
    id,
    name,
    parent_id,
    parent:parent_id (
      id,
      name
    )
  )
`).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    if (bucket === "product-images") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    // For private buckets, store only the path (not a signed URL)
    return path;
  };

  const upsertProduct = useMutation({
    mutationFn: async (product: any) => {
      setUploading(true);
      let imageUrl = editingProduct?.images?.[0] || null;
      let safetySheetPath = editingProduct?.safety_sheet_url || null;

      if (imageFile) {
        imageUrl = await uploadFile(imageFile, "product-images", "products");
      }
      if (pdfFile) {
        safetySheetPath = await uploadFile(pdfFile, "product-pdfs", "manuals");
      }

      // Use subcategory if selected, otherwise parent category
      const finalCategoryId = product.subcategory_id || product.parent_category_id || null;

      let generatedSku = product.sku;

      if (!generatedSku) {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        const nextNumber = String((count || 0) + 1).padStart(7, "0");
        generatedSku = `BECOF-${nextNumber}`;
      }

      const payload = {
        name: product.name,
        slug: product.slug || product.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        price: Number(product.price),
        stock_quantity: Number(product.stock_quantity),
        short_description: product.short_description || null,
        long_description: product.long_description || null,
        usage_instructions: product.usage_instructions || null,
        sku: generatedSku,
        is_published: product.is_published,
        category_id: finalCategoryId,
        images: imageUrl ? [imageUrl] : [],
        safety_sheet_url: safetySheetPath,
      };

      if (product.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        if (!finalCategoryId) throw new Error("Category is required");
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Product saved successfully" });
      setUploading(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setUploading(false);
    },
  });

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
    // Determine if category_id is a subcategory or parent
    const cat = p.categories;
    const isSubcategory = cat?.parent_id;
    setForm({
      name: p.name, slug: p.slug, price: String(p.price),
      stock_quantity: String(p.stock_quantity),
      short_description: p.short_description || "",
      long_description: p.long_description || "",
      usage_instructions: p.usage_instructions || "",
      sku: p.sku || "", is_published: p.is_published,
      parent_category_id: isSubcategory ? cat.parent_id : (p.category_id || ""),
      subcategory_id: isSubcategory ? p.category_id : "",
    });
    setDialogOpen(true);
  };

  const lowStockProducts = products?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];
  const noCategoriesExist = categories.length === 0;

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

  return (
    <div className="space-y-6">
      {lowStockProducts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{lowStockProducts.length} product(s) with low stock</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5" /> Products ({products?.length || 0})
        </h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={noCategoriesExist}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsertProduct.mutate({ ...form, id: editingProduct?.id }); }} className="space-y-4">
              <div>
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({
                    ...f,
                    name,
                    slug: generateSlug(name),
                  }));
                }} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={form.parent_category_id}
                    onValueChange={(v) => setForm(f => ({ ...f, parent_category_id: v, subcategory_id: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={form.subcategory_id}
                    onValueChange={(v) => setForm(f => ({ ...f, subcategory_id: v }))}
                    disabled={!form.parent_category_id || subcategories.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder={subcategories.length === 0 ? "None available" : "Select subcategory"} /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Price (KES) *</Label>
                  <Input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                </div>
                <div>
                  <Label>Stock Quantity *</Label>
                  <Input type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} required />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Short Description</Label>
                <Input value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} />
              </div>

              <div>
                <Label>Full Description</Label>
                <Textarea rows={4} value={form.long_description} onChange={e => setForm(f => ({ ...f, long_description: e.target.value }))} />
              </div>

              <div>
                <Label>Usage Instructions</Label>
                <Textarea rows={4} value={form.usage_instructions} onChange={e => setForm(f => ({ ...f, usage_instructions: e.target.value }))} placeholder="Enter usage instructions..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Product Image</Label>
                  <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  {editingProduct?.images?.[0] && !imageFile && (
                    <p className="text-xs text-muted-foreground mt-1">Current image set. Upload new to replace.</p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-2"><FileText className="h-4 w-4" /> Safety Sheet (PDF)</Label>
                  <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                  {editingProduct?.safety_sheet_url && !pdfFile && (
                    <p className="text-xs text-muted-foreground mt-1">Current PDF set. Upload new to replace.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label>Published (Active)</Label>
                <Switch checked={form.is_published} onCheckedChange={(c) => setForm(f => ({ ...f, is_published: c }))} />
              </div>

              <Button type="submit" className="w-full" disabled={upsertProduct.isPending || uploading}>
                {(upsertProduct.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingProduct ? "Update" : "Create"} Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {noCategoriesExist && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-amber-700 text-sm font-medium">
              ⚠️ No categories exist. Create a category first before adding products.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-muted-foreground">Subcategory</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : products?.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  {/* Category Column */}
                  <TableCell>
                    {(p as any).categories?.parent?.name
                      ? (p as any).categories.parent.name
                      : (p as any).categories?.name || "—"}
                  </TableCell>

                  {/* Subcategory Column */}
                  <TableCell className="text-muted-foreground">
                    {(p as any).categories?.parent?.name
                      ? (p as any).categories.name
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                  <TableCell>KES {p.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={p.stock_quantity <= p.low_stock_threshold ? "text-destructive font-medium" : ""}>
                      {p.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_published ? "default" : "secondary"}>
                      {p.is_published ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProducts;
