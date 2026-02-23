import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, FolderTree, Loader2,
  ChevronRight, Layers, Tag, ToggleLeft, ToggleRight,
} from "lucide-react";

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", parent_id: "", is_active: true,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const topLevel = categories.filter(c => !c.parent_id);
  const getSubs = (parentId: string) => categories.filter(c => c.parent_id === parentId);
  const subCount = topLevel.reduce((acc, c) => acc + getSubs(c.id).length, 0);

  const upsert = useMutation({
    mutationFn: async (cat: any) => {
      const payload = {
        name: cat.name,
        slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: cat.description || null,
        parent_id: cat.parent_id || null,
        is_active: cat.is_active,
      };
      if (cat.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Category saved ✓" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", parent_id: "", is_active: true });
    setEditing(null);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      name: c.name, slug: c.slug, description: c.description || "",
      parent_id: c.parent_id || "", is_active: c.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const openCreateSub = (parentId: string) => {
    resetForm();
    setForm(f => ({ ...f, parent_id: parentId }));
    setDialogOpen(true);
  };

  const confirmDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) deleteCategory.mutate(id);
  };

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <FolderTree className="h-5 w-5 text-emerald-600" />
            Categories
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {topLevel.length} categories · {subCount} subcategories
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editing
                  ? <><Edit className="h-4 w-4 text-emerald-600" /> Edit Category</>
                  : form.parent_id
                    ? <><Tag className="h-4 w-4 text-emerald-600" /> New Subcategory</>
                    : <><Layers className="h-4 w-4 text-emerald-600" /> New Category</>
                }
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={e => { e.preventDefault(); upsert.mutate({ ...form, id: editing?.id }); }}
              className="space-y-4 pt-1"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Name <span className="text-emerald-600">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    setForm(f => ({
                      ...f,
                      name,
                      slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                    }));
                  }}
                  required
                  placeholder="e.g. Organic Fertilizers"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Slug</Label>
                <Input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="Auto-generated"
                  className="h-10 font-mono text-sm text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Parent Category
                </Label>
                <Select
                  value={form.parent_id || "none"}
                  onValueChange={v => setForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {topLevel.filter(c => c.id !== editing?.id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Leave empty to create a top-level category.</p>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Active</p>
                  <p className="text-xs text-slate-400">Inactive categories are hidden from the store.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={upsert.isPending}
              >
                {upsert.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : editing ? "Update Category" : "Create Category"
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: categories.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Active", value: categories.filter(c => c.is_active).length, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Inactive", value: categories.filter(c => !c.is_active).length, color: "bg-slate-50 border-slate-200 text-slate-500" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Category tree ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Loading categories…</span>
        </div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <FolderTree className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No categories yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first category to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map(cat => {
            const subs = getSubs(cat.id);
            return (
              <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                {/* ── Parent category row ── */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* icon */}
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4 text-emerald-600" />
                  </div>

                  {/* name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{cat.name}</span>
                      <span className="font-mono text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        /{cat.slug}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{cat.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {subs.length} subcategor{subs.length === 1 ? "y" : "ies"}
                    </p>
                  </div>

                  {/* status toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive.mutate({ id: cat.id, is_active: !cat.is_active })}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${cat.is_active
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                    >
                      {cat.is_active
                        ? <ToggleRight className="h-3.5 w-3.5" />
                        : <ToggleLeft className="h-3.5 w-3.5" />
                      }
                      {cat.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCreateSub(cat.id)}
                      className="h-8 gap-1.5 text-xs text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Sub
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(cat)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirmDelete(cat.id, cat.name)}
                      className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* ── Subcategory rows ── */}
                {subs.length > 0 && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {subs.map(sub => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-4 px-5 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        {/* indent indicator */}
                        <div className="w-9 flex items-center justify-center shrink-0">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-700">{sub.name}</span>
                            <span className="font-mono text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                              /{sub.slug}
                            </span>
                          </div>
                          {sub.description && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{sub.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => toggleActive.mutate({ id: sub.id, is_active: !sub.is_active })}
                          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all shrink-0 ${sub.is_active
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
                            }`}
                        >
                          {sub.is_active
                            ? <ToggleRight className="h-3.5 w-3.5" />
                            : <ToggleLeft className="h-3.5 w-3.5" />
                          }
                          {sub.is_active ? "Active" : "Inactive"}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(sub)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirmDelete(sub.id, sub.name)}
                            className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
