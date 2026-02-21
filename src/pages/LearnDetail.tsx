import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, Calendar, User, Clock, Tag,
    BookOpen, FlaskConical, FileText, Share2, ChevronRight,
} from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
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
    created_at: string;
    meta_title?: string;
    meta_description?: string;
}

const categoryIcon = (slug?: string) => {
    if (slug === "farming-guides") return BookOpen;
    if (slug === "research-innovation") return FlaskConical;
    return FileText;
};

const estimateReadTime = (content: string) => {
    const words = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
};

const LearnDetail = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [article, setArticle] = useState<Article | null>(null);
    const [category, setCategory] = useState<Category | null>(null);
    const [related, setRelated] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (slug) fetchArticle(slug);
    }, [slug]);

    const fetchArticle = async (slug: string) => {
        setLoading(true);
        setNotFound(false);

        const { data: art } = await supabase
            .from("learn_articles")
            .select("*")
            .eq("slug", slug)
            .eq("published", true)
            .single();

        if (!art) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        setArticle(art);

        // Fetch category
        const { data: cat } = await supabase
            .from("learn_categories")
            .select("*")
            .eq("id", art.category_id)
            .single();

        setCategory(cat || null);

        // Fetch related articles (same category, exclude current)
        const { data: relData } = await supabase
            .from("learn_articles")
            .select("*")
            .eq("published", true)
            .eq("category_id", art.category_id)
            .neq("id", art.id)
            .order("created_at", { ascending: false })
            .limit(3);

        setRelated(relData || []);
        setLoading(false);
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: article?.title, text: article?.excerpt, url });
            } else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch { /* user cancelled */ }
    };

    /* ─── loading skeleton ─── */
    if (loading) {
        return (
            <Layout>
                <div className="container py-16 max-w-3xl mx-auto space-y-6 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-8 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="space-y-3 mt-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className={`h-4 bg-muted rounded ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />
                        ))}
                    </div>
                </div>
            </Layout>
        );
    }

    /* ─── 404 ─── */
    if (notFound || !article) {
        return (
            <Layout>
                <div className="container py-24 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Article not found</h1>
                    <p className="text-muted-foreground mb-6">This article may have been removed or the link is incorrect.</p>
                    <Button onClick={() => navigate("/learn")} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <ArrowLeft className="h-4 w-4" /> Back to Learning Hub
                    </Button>
                </div>
            </Layout>
        );
    }

    const CatIcon = categoryIcon(category?.slug);
    const readTime = estimateReadTime(article.content);

    return (
        <Layout>
            <SEO
                title={article.meta_title || article.title}
                description={article.meta_description || article.excerpt || ""}
                url={`https://www.becoforganicchemicals.com/learn/${article.slug}`}
            />

            {/* Breadcrumb */}
            <div className="border-b border-border bg-muted/30">
                <div className="container py-3">
                    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                        <ChevronRight className="h-3 w-3" />
                        <Link to="/learn" className="hover:text-foreground transition-colors">Learning Hub</Link>
                        <ChevronRight className="h-3 w-3" />
                        {category && (
                            <>
                                <Link
                                    to={`/learn`}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {category.name}
                                </Link>
                                <ChevronRight className="h-3 w-3" />
                            </>
                        )}
                        <span className="text-foreground font-medium truncate max-w-[200px]">{article.title}</span>
                    </nav>
                </div>
            </div>

            {/* Article hero */}
            <section className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 py-12">
                <div className="container max-w-3xl">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Category badge */}
                        {category && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 mb-4">
                                <CatIcon className="h-3.5 w-3.5" />
                                {category.name}
                            </span>
                        )}

                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                            {article.title}
                        </h1>

                        {article.excerpt && (
                            <p className="text-lg text-slate-600 mb-6 leading-relaxed">{article.excerpt}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                <span className="font-medium text-foreground">{article.author || "Becof Team"}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {new Date(article.created_at).toLocaleDateString("en-GB", {
                                    day: "numeric", month: "long", year: "numeric",
                                })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {readTime} min read
                            </span>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleShare}
                                className="ml-auto gap-1.5 h-8 text-xs"
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                {copied ? "Link copied!" : "Share"}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Article body */}
            <section className="py-12">
                <div className="container max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div
                            className="
                prose prose-slate max-w-none
                prose-headings:font-bold prose-headings:text-slate-900
                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                prose-p:leading-relaxed prose-p:text-slate-700
                prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-md
                prose-blockquote:border-emerald-400 prose-blockquote:text-slate-600
                prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-slate-900 prose-pre:text-slate-100
                prose-ul:text-slate-700 prose-ol:text-slate-700
                prose-strong:text-slate-900
              "
                            dangerouslySetInnerHTML={{ __html: article.content }}
                        />
                    </motion.div>

                    {/* Back + Share footer */}
                    <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/learn")}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Learning Hub
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleShare}
                            className="gap-2"
                        >
                            <Share2 className="h-4 w-4" />
                            {copied ? "Copied!" : "Share article"}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Related articles */}
            {related.length > 0 && (
                <section className="py-12 bg-muted/30 border-t border-border">
                    <div className="container max-w-3xl">
                        <h2 className="text-xl font-bold mb-6">More from {category?.name || "this category"}</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {related.map((r) => (
                                <motion.article
                                    key={r.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => navigate(`/learn/${r.slug}`)}
                                    className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
                                >
                                    <h3 className="font-semibold text-base mb-2 group-hover:text-emerald-700 transition-colors leading-snug">
                                        {r.title}
                                    </h3>
                                    {r.excerpt && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{r.excerpt}</p>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                            Read <ArrowLeft className="h-3 w-3 rotate-180" />
                                        </span>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </Layout>
    );
};

export default LearnDetail;