import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Pencil } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import ImageResize from 'tiptap-extension-resize-image'
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
}

interface Article {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    category_id: string;
    author?: string;
    published: boolean;
}

const slugify = (text: string) =>
    text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const AdminLearn = () => {
    const { toast } = useToast();

    const [categories, setCategories] = useState<Category[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category_id: "",
        author: "",
        published: true,
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: false,
                HTMLAttributes: {
                    class: "block mx-auto my-4",
                },
            }),
            ImageResize.configure({
                inline: true,
            }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({
                placeholder: "Start writing your article...",
            }),
        ],
    })

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: catData } = await supabase.from("learn_categories").select("*");
        const { data: artData } = await supabase
            .from("learn_articles")
            .select("*")
            .order("created_at", { ascending: false });

        setCategories(catData || []);
        setArticles(artData || []);
    };

    const resizeImage = (file: File, maxWidth = 800, maxHeight = 600): Promise<File> => {
        return new Promise(resolve => {
            const img = new window.Image(); // make sure it's the DOM Image
            img.src = URL.createObjectURL(file);

            img.onload = () => {
                let { width, height } = img;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (blob) resolve(new File([blob], file.name, { type: file.type }));
                }, file.type);
            };
        });
    };

    const uploadImage = async (file: File) => {
        const fileName = `learn-${Date.now()}-${file.name}`;

        const { error } = await supabase.storage
            .from("learn-content")
            .upload(fileName, file);

        if (error) {
            toast({ title: "Upload error", description: error.message });
            return null;
        }

        const { data } = supabase.storage.from("learn-content").getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleImageUpload = async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.onchange = async () => {
            if (!input.files?.length) return;
            let file = input.files[0];

            // Resize before upload
            file = await resizeImage(file, 800, 600);

            const url = await uploadImage(file);
            if (url && editor) editor.chain().focus().setImage({ src: url }).run();
        };

        input.click();
    };

    // ================= CREATE / UPDATE =================
    const saveArticle = async () => {
        if (!form.title || !form.category_id) {
            toast({ title: "Title & Category required", variant: "destructive" });
            return;
        }

        const payload = { ...form, slug: form.slug || slugify(form.title) };

        if (editingArticle) {
            await supabase.from("learn_articles").update(payload).eq("id", editingArticle.id);
            toast({ title: "Article updated" });
        } else {
            await supabase.from("learn_articles").insert(payload);
            toast({ title: "Article created" });
        }

        resetForm();
        fetchData();
    };

    const resetForm = () => {
        setEditingArticle(null);
        setForm({ title: "", slug: "", excerpt: "", content: "", category_id: "", author: "", published: true });
        editor?.commands.setContent("");
        setDialogOpen(false);
    };

    const editArticle = (article: Article) => {
        setEditingArticle(article);
        setForm({
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || "",
            content: article.content,
            category_id: article.category_id,
            author: article.author || "",
            published: article.published,
        });
        editor?.commands.setContent(article.content);
        setDialogOpen(true);
    };

    const togglePublish = async (article: Article) => {
        await supabase.from("learn_articles").update({ published: !article.published }).eq("id", article.id);
        fetchData();
    };

    const deleteArticle = async (id: string) => {
        await supabase.from("learn_articles").delete().eq("id", id);
        fetchData();
    };

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Learn Content Management</h1>

            <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New Article
            </Button>

            {/* ================= ARTICLES LIST ================= */}
            <Card>
                <CardHeader>
                    <CardTitle>Articles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {articles.map(article => (
                        <div key={article.id} className="flex items-center justify-between border rounded-md p-3">
                            <div>
                                <p className="font-medium">{article.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {article.slug} • {article.published ? "Published" : "Draft"}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => togglePublish(article)}>
                                    {article.published ? "Unpublish" : "Publish"}
                                </Button>

                                <Button size="sm" variant="outline" onClick={() => editArticle(article)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>

                                <Button size="sm" variant="destructive" onClick={() => deleteArticle(article.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ================= EDIT MODAL ================= */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingArticle ? "Edit Article" : "Create Article"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Input
                            placeholder="Title"
                            value={form.title}
                            onChange={e => setForm(prev => ({ ...prev, title: e.target.value, slug: slugify(e.target.value) }))}
                        />

                        <Input
                            placeholder="Slug"
                            value={form.slug}
                            onChange={e => setForm({ ...form, slug: e.target.value })}
                        />

                        <Textarea
                            placeholder="Excerpt"
                            value={form.excerpt}
                            onChange={e => setForm({ ...form, excerpt: e.target.value })}
                        />

                        <select
                            className="border rounded-md p-2"
                            value={form.category_id}
                            onChange={e => setForm({ ...form, category_id: e.target.value })}
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>

                        <Input
                            placeholder="Author"
                            value={form.author}
                            onChange={e => setForm({ ...form, author: e.target.value })}
                        />

                        <div className="border rounded-md p-2">
                            <div className="flex flex-wrap gap-2 mb-2">
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()}>Strike</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullet List</Button>
                                <Button size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Numbered List</Button>
                                <Button size="sm" onClick={handleImageUpload}>Image</Button>
                            </div>

                            <div className="border rounded-md p-4">
                                <div className="max-h-[400px] overflow-y-auto prose max-w-none">
                                    <EditorContent editor={editor} />
                                </div>
                            </div>
                        </div>

                        <Button onClick={saveArticle}>{editingArticle ? "Update" : "Create"}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminLearn;