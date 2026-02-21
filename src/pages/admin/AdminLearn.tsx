import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Trash2, Plus, Pencil, Eye, EyeOff, Save, AlignLeft, AlignCenter,
    AlignRight, Bold, Italic, Strikethrough, List, ListOrdered,
    Heading1, Heading2, Heading3, ImageIcon, Clock, FileText,
    BarChart2, Search, X, ChevronDown, ChevronUp, GripVertical
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

/* ─────────────────────────── types ─────────────────────────── */
interface Category { id: string; name: string; slug: string; description?: string; }
interface Article {
    id: string; title: string; slug: string; excerpt?: string; content: string;
    category_id: string; author?: string; published: boolean;
    meta_title?: string; meta_description?: string;
}
type Tab = "editor" | "preview" | "seo";

/* ─────────────────────────── helpers ─────────────────────────── */
const slugify = (t: string) =>
    t.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const countWords = (html: string) => {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text ? text.split(" ").length : 0;
};

const AUTOSAVE_KEY = "becof_learn_draft";
const AUTOSAVE_MS = 30_000;

/* ─────────────────────────── toolbar button ─────────────────────────── */
const TB = ({
    onClick, active, title, children
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`
      inline-flex items-center justify-center w-8 h-8 rounded-md text-sm transition-all duration-150
      ${active
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
    `}
    >
        {children}
    </button>
);

/* ─────────────────────────── separator ─────────────────────────── */
const Sep = () => <div className="w-px h-5 bg-slate-200 mx-1 self-center" />;

/* ═══════════════════════════════════════════════════════════════ */
const AdminLearn = () => {
    const { toast } = useToast();
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<string>("");

    const [categories, setCategories] = useState<Category[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("editor");
    const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const [form, setForm] = useState({
        title: "", slug: "", excerpt: "", content: "",
        category_id: "", author: "", published: true,
        meta_title: "", meta_description: "",
    });

    /* ─── editor ─── */
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: false, HTMLAttributes: { class: "block mx-auto my-4 max-w-full rounded-lg" } }),
            ImageResize.configure({ inline: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({ placeholder: "Start writing your article…" }),
        ],
        editorProps: {
            attributes: {
                class: "focus:outline-none min-h-[320px] prose prose-slate max-w-none text-slate-800 leading-relaxed caret-emerald-600",
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setForm(prev => ({ ...prev, content: html }));
            setWordCount(countWords(html));
            scheduleAutoSave(html);
        },
    });

    /* ─── autosave ─── */
    const scheduleAutoSave = useCallback((content: string) => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            if (content !== lastSavedRef.current) {
                const draft = { ...form, content, savedAt: new Date().toISOString() };
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
                lastSavedRef.current = content;
                setAutoSavedAt(new Date());
            }
        }, AUTOSAVE_MS);
    }, [form]);

    const manualSaveDraft = () => {
        const draft = { ...form, content: editor?.getHTML() || "", savedAt: new Date().toISOString() };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
        lastSavedRef.current = draft.content;
        setAutoSavedAt(new Date());
        toast({ title: "Draft saved locally" });
    };

    /* ─── restore draft on open ─── */
    useEffect(() => {
        if (dialogOpen && !editingArticle) {
            const saved = localStorage.getItem(AUTOSAVE_KEY);
            if (saved) {
                try {
                    const draft = JSON.parse(saved);
                    setForm({ ...draft });
                    editor?.commands.setContent(draft.content || "");
                    setAutoSavedAt(new Date(draft.savedAt));
                    toast({ title: "Unsaved draft restored", description: "Your previous draft has been loaded." });
                } catch { /* ignore */ }
            }
        }
    }, [dialogOpen]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const { data: catData } = await supabase.from("learn_categories").select("*");
        const { data: artData } = await supabase.from("learn_articles").select("*").order("created_at", { ascending: false });
        setCategories(catData || []);
        setArticles(artData || []);
    };

    /* ─── image upload ─── */
    const resizeImage = (file: File, maxWidth = 800, maxHeight = 600): Promise<File> =>
        new Promise(resolve => {
            const img = new window.Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
                if (height > maxHeight) { width = (maxHeight / height) * width; height = maxHeight; }
                const canvas = document.createElement("canvas");
                canvas.width = width; canvas.height = height;
                canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => { if (blob) resolve(new File([blob], file.name, { type: file.type })); }, file.type);
            };
        });

    const uploadImage = async (file: File) => {
        const fileName = `learn-${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("learn-content").upload(fileName, file);
        if (error) { toast({ title: "Upload error", description: error.message }); return null; }
        return supabase.storage.from("learn-content").getPublicUrl(fileName).data.publicUrl;
    };

    const handleImageUpload = async () => {
        const input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.onchange = async () => {
            if (!input.files?.length) return;
            let file = await resizeImage(input.files[0], 800, 600);
            const url = await uploadImage(file);
            if (url && editor) editor.chain().focus().setImage({ src: url }).run();
        };
        input.click();
    };

    /* ─── save ─── */
    const saveArticle = async () => {
        if (!form.title || !form.category_id) {
            toast({ title: "Title & Category required", variant: "destructive" }); return;
        }
        const payload = { ...form, slug: form.slug || slugify(form.title) };
        if (editingArticle) {
            await supabase.from("learn_articles").update(payload).eq("id", editingArticle.id);
            toast({ title: "Article updated ✓" });
        } else {
            await supabase.from("learn_articles").insert(payload);
            toast({ title: "Article created ✓" });
            localStorage.removeItem(AUTOSAVE_KEY);
        }
        resetForm(); fetchData();
    };

    const resetForm = () => {
        setEditingArticle(null);
        setForm({ title: "", slug: "", excerpt: "", content: "", category_id: "", author: "", published: true, meta_title: "", meta_description: "" });
        editor?.commands.setContent("");
        setDialogOpen(false);
        setActiveTab("editor");
        setWordCount(0);
        setAutoSavedAt(null);
    };

    const editArticle = (article: Article) => {
        setEditingArticle(article);
        setForm({
            title: article.title, slug: article.slug, excerpt: article.excerpt || "",
            content: article.content, category_id: article.category_id,
            author: article.author || "", published: article.published,
            meta_title: article.meta_title || "", meta_description: article.meta_description || "",
        });
        editor?.commands.setContent(article.content);
        setWordCount(countWords(article.content));
        setDialogOpen(true);
    };

    const togglePublish = async (article: Article) => {
        await supabase.from("learn_articles").update({ published: !article.published }).eq("id", article.id);
        fetchData();
    };

    const deleteArticle = async (id: string) => {
        if (!confirm("Delete this article? This cannot be undone.")) return;
        await supabase.from("learn_articles").delete().eq("id", id);
        fetchData();
    };

    /* ─── drag to reorder ─── */
    const handleDragStart = (idx: number) => setDragIndex(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIndex(idx); };
    const handleDrop = async () => {
        if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
            setDragIndex(null); setDragOverIndex(null); return;
        }
        const reordered = [...articles];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dragOverIndex, 0, moved);
        setArticles(reordered);
        setDragIndex(null); setDragOverIndex(null);
    };

    /* ─── image alignment ─── */
    const setImageAlign = (align: "left" | "center" | "right") => {
        if (!editor) return;
        const classMap = { left: "float-left mr-4 mb-2", center: "block mx-auto my-4", right: "float-right ml-4 mb-2" };
        editor.chain().focus().updateAttributes("image", { class: classMap[align] }).run();
    };

    /* ─── tab pill ─── */
    const TabPill = ({ id, label, icon }: { id: Tab; label: string; icon: React.ReactNode }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === id
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
        >
            {icon} {label}
        </button>
    );

    /* ══════════════════════════════════════════════════ render ══════════════════════════════════════════════════ */
    return (
        <div className="space-y-6">
            {/* page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Learn Content</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{articles.length} articles across {categories.length} categories</p>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4" /> New Article
                </Button>
            </div>

            {/* articles list */}
            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold text-slate-800">Articles</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {articles.length === 0 && (
                        <p className="text-center text-slate-400 py-12 text-sm">No articles yet. Create your first one!</p>
                    )}
                    {articles.map((article, idx) => (
                        <div
                            key={article.id}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={e => handleDragOver(e, idx)}
                            onDrop={handleDrop}
                            className={`
                flex items-center gap-3 px-5 py-4 border-b border-slate-100 last:border-0 transition-colors
                ${dragOverIndex === idx ? "bg-emerald-50 border-emerald-300" : "hover:bg-slate-50"}
                cursor-grab active:cursor-grabbing
              `}
                        >
                            <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{article.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                    /{article.slug} · {categories.find(c => c.id === article.category_id)?.name || "—"}
                                </p>
                            </div>
                            <Badge
                                variant={article.published ? "default" : "secondary"}
                                className={article.published
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                                    : "bg-slate-100 text-slate-500 text-xs"
                                }
                            >
                                {article.published ? "Published" : "Draft"}
                            </Badge>
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => togglePublish(article)} title={article.published ? "Unpublish" : "Publish"} className="h-8 w-8 p-0">
                                    {article.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => editArticle(article)} title="Edit" className="h-8 w-8 p-0">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteArticle(article.id)} title="Delete" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ═══ EDITOR DIALOG ═══ */}
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetForm(); else setDialogOpen(true); }}>
                <DialogContent className="max-w-4xl w-full max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
                    {/* dialog header */}
                    <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-lg font-semibold text-slate-900">
                                {editingArticle ? "Edit Article" : "New Article"}
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                {autoSavedAt && (
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Auto-saved {autoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                )}
                                <Button size="sm" variant="outline" onClick={manualSaveDraft} className="h-8 gap-1.5 text-xs">
                                    <Save className="h-3.5 w-3.5" /> Save Draft
                                </Button>
                                <Button size="sm" onClick={saveArticle} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
                                    {editingArticle ? "Update" : "Publish"}
                                </Button>
                            </div>
                        </div>

                        {/* tabs */}
                        <div className="flex items-center gap-1 mt-3">
                            <TabPill id="editor" label="Editor" icon={<Pencil className="h-3.5 w-3.5" />} />
                            <TabPill id="preview" label="Preview" icon={<Eye className="h-3.5 w-3.5" />} />
                            <TabPill id="seo" label="SEO" icon={<Search className="h-3.5 w-3.5" />} />
                            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                                <BarChart2 className="h-3.5 w-3.5" />
                                {wordCount} words
                            </div>
                        </div>
                    </DialogHeader>

                    {/* scrollable body */}
                    <div className="flex-1 overflow-y-auto">

                        {/* ─── EDITOR TAB ─── */}
                        {activeTab === "editor" && (
                            <div className="flex flex-col gap-0">
                                {/* meta fields */}
                                <div className="px-6 pt-5 pb-4 space-y-3 border-b border-slate-100 bg-slate-50/60">
                                    <Input
                                        placeholder="Article title…"
                                        value={form.title}
                                        className="text-lg font-semibold border-0 bg-transparent shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-slate-300"
                                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value, slug: slugify(e.target.value) }))}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input placeholder="Slug (auto-generated)" value={form.slug}
                                            onChange={e => setForm({ ...form, slug: e.target.value })}
                                            className="text-sm text-slate-500" />
                                        <Input placeholder="Author" value={form.author}
                                            onChange={e => setForm({ ...form, author: e.target.value })}
                                            className="text-sm text-slate-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <select
                                            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={form.category_id}
                                            onChange={e => setForm({ ...form, category_id: e.target.value })}
                                        >
                                            <option value="">Select Category…</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-slate-500 flex items-center gap-2 cursor-pointer select-none">
                                                <div
                                                    onClick={() => setForm(prev => ({ ...prev, published: !prev.published }))}
                                                    className={`w-10 h-5 rounded-full transition-colors relative ${form.published ? "bg-emerald-500" : "bg-slate-300"}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.published ? "translate-x-5" : "translate-x-0.5"}`} />
                                                </div>
                                                {form.published ? "Published" : "Draft"}
                                            </label>
                                        </div>
                                    </div>
                                    <Textarea
                                        placeholder="Excerpt (short summary shown in listings)…"
                                        value={form.excerpt}
                                        rows={2}
                                        onChange={e => setForm({ ...form, excerpt: e.target.value })}
                                        className="text-sm resize-none"
                                    />
                                </div>

                                {/* toolbar */}
                                <div className="px-6 py-2 border-b border-slate-100 bg-white sticky top-0 z-10">
                                    <div className="flex flex-wrap items-center gap-0.5">
                                        {/* text style */}
                                        <TB onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold (Ctrl+B)">
                                            <Bold className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic (Ctrl+I)">
                                            <Italic className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Strikethrough">
                                            <Strikethrough className="h-3.5 w-3.5" />
                                        </TB>

                                        <Sep />

                                        {/* headings */}
                                        <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} title="Heading 1">
                                            <Heading1 className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Heading 2">
                                            <Heading2 className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Heading 3">
                                            <Heading3 className="h-3.5 w-3.5" />
                                        </TB>

                                        <Sep />

                                        {/* lists */}
                                        <TB onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Bullet List">
                                            <List className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Numbered List">
                                            <ListOrdered className="h-3.5 w-3.5" />
                                        </TB>

                                        <Sep />

                                        {/* text align */}
                                        <TB onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Align Left">
                                            <AlignLeft className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Align Center">
                                            <AlignCenter className="h-3.5 w-3.5" />
                                        </TB>
                                        <TB onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Align Right">
                                            <AlignRight className="h-3.5 w-3.5" />
                                        </TB>

                                        <Sep />

                                        {/* image */}
                                        <TB onClick={handleImageUpload} title="Insert Image">
                                            <ImageIcon className="h-3.5 w-3.5" />
                                        </TB>

                                        {/* image align (visible when image selected) */}
                                        <Sep />
                                        <span className="text-xs text-slate-400 px-1">Image:</span>
                                        <TB onClick={() => setImageAlign("left")} title="Float image left"><AlignLeft className="h-3.5 w-3.5" /></TB>
                                        <TB onClick={() => setImageAlign("center")} title="Center image"><AlignCenter className="h-3.5 w-3.5" /></TB>
                                        <TB onClick={() => setImageAlign("right")} title="Float image right"><AlignRight className="h-3.5 w-3.5" /></TB>
                                    </div>
                                </div>

                                {/* editor area */}
                                <div className="px-8 py-6 min-h-[380px]" onClick={() => editor?.commands.focus()}>
                                    <EditorContent editor={editor} />
                                </div>
                            </div>
                        )}

                        {/* ─── PREVIEW TAB ─── */}
                        {activeTab === "preview" && (
                            <div className="px-8 py-8">
                                {/* SERP preview */}
                                <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-white">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-medium">SERP Preview</p>
                                    <p className="text-blue-700 text-lg font-medium leading-tight hover:underline cursor-pointer">
                                        {form.meta_title || form.title || "Article Title"}
                                    </p>
                                    <p className="text-green-700 text-xs mt-0.5">https://becoforganics.com/learn/{form.slug || "article-slug"}</p>
                                    <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                                        {form.meta_description || form.excerpt || "No description set."}
                                    </p>
                                </div>

                                {/* rendered article */}
                                <div className="max-w-2xl">
                                    <h1 className="text-3xl font-bold text-slate-900 mb-3">{form.title || "Untitled Article"}</h1>
                                    {form.excerpt && <p className="text-slate-500 text-lg mb-6 border-l-4 border-emerald-400 pl-4">{form.excerpt}</p>}
                                    <div
                                        className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-emerald-600 prose-img:rounded-lg"
                                        dangerouslySetInnerHTML={{ __html: form.content || "<p class='text-slate-300 italic'>Nothing written yet…</p>" }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ─── SEO TAB ─── */}
                        {activeTab === "seo" && (
                            <div className="px-6 py-6 space-y-6 max-w-2xl">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <Search className="h-4 w-4 text-emerald-600" /> SEO Settings
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium block mb-1.5">Meta Title</label>
                                            <Input
                                                placeholder="Meta title (50–60 chars ideal)"
                                                value={form.meta_title}
                                                onChange={e => setForm({ ...form, meta_title: e.target.value })}
                                            />
                                            <div className="flex justify-between mt-1">
                                                <span className="text-xs text-slate-400">Leave blank to use article title</span>
                                                <span className={`text-xs ${form.meta_title.length > 60 ? "text-red-500" : "text-slate-400"}`}>
                                                    {form.meta_title.length}/60
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-slate-500 font-medium block mb-1.5">Meta Description</label>
                                            <Textarea
                                                placeholder="Meta description (150–160 chars ideal)"
                                                value={form.meta_description}
                                                rows={3}
                                                onChange={e => setForm({ ...form, meta_description: e.target.value })}
                                                className="resize-none"
                                            />
                                            <div className="flex justify-between mt-1">
                                                <span className="text-xs text-slate-400">Shown in search results</span>
                                                <span className={`text-xs ${form.meta_description.length > 160 ? "text-red-500" : "text-slate-400"}`}>
                                                    {form.meta_description.length}/160
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-slate-500 font-medium block mb-1.5">Canonical Slug</label>
                                            <Input
                                                placeholder="article-url-slug"
                                                value={form.slug}
                                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                            />
                                        </div>

                                        {/* content stats */}
                                        <div className="grid grid-cols-3 gap-3 pt-2">
                                            {[
                                                { label: "Word count", value: wordCount },
                                                { label: "Title length", value: `${form.title.length} chars` },
                                                { label: "Read time", value: `~${Math.max(1, Math.ceil(wordCount / 200))} min` },
                                            ].map(stat => (
                                                <div key={stat.label} className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                                    <p className="text-xl font-bold text-emerald-600">{stat.value}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* SERP live preview */}
                                <div className="p-4 border border-slate-200 rounded-lg bg-white">
                                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 font-medium">Live SERP Preview</p>
                                    <p className="text-blue-700 text-base font-medium hover:underline cursor-pointer">
                                        {form.meta_title || form.title || "Article Title"}
                                    </p>
                                    <p className="text-green-700 text-xs mt-0.5">https://becoforganics.com/learn/{form.slug || "article-slug"}</p>
                                    <p className="text-slate-600 text-sm mt-1">
                                        {form.meta_description || form.excerpt || "No description set."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminLearn;