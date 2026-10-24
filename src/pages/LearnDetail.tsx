import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { fetchArticleBySlug } from "@/lib/publicData";
import { getPrerendered } from "@/lib/prerenderData";
import { articleSchema, breadcrumbSchema } from "@/lib/structuredData";
import CropButtons from "@/components/CropButtons";
import WhatsAppOrderButton from "@/components/WhatsAppOrderButton";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, Calendar, User, Clock,
    BookOpen, FlaskConical, FileText, Share2, ChevronRight, Link2, Check,
} from "lucide-react";

/* ─────────────────── social SVG icons ─────────────────── */
const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
);

const LinkedInIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

/* ─────────────────── SharePanel component ─────────────────── */
const SharePanel = ({
    title,
    excerpt,
    slug,
}: {
    title: string;
    excerpt?: string;
    slug: string;
}) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const url = `https://www.becoforganicchemicals.com/learn/${slug}`;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedExcerpt = encodeURIComponent(excerpt || title);

    const socials = [
        {
            label: "Facebook",
            icon: <FacebookIcon />,
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            bg: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
        },
        {
            label: "Instagram",
            icon: <InstagramIcon />,
            // Instagram has no web share URL — opens instagram.com; user copies link and posts manually
            href: `https://www.instagram.com/`,
            bg: "hover:bg-gradient-to-br hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white hover:border-transparent",
            note: "Copy the link below then share on Instagram",
        },
        {
            label: "LinkedIn",
            icon: <LinkedInIcon />,
            href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedExcerpt}`,
            bg: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
        },
        {
            label: "X",
            icon: <XIcon />,
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            bg: "hover:bg-black hover:text-white hover:border-black",
        },
    ];

    // close panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const copyLink = async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* trigger button */}
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(prev => !prev)}
                className={`gap-1.5 h-8 text-xs transition-all ${open ? "border-primary text-primary bg-primary/10" : ""}`}
            >
                <Share2 className="h-3.5 w-3.5" />
                Share on
                <span className="flex items-center gap-1 ml-0.5">
                    {/* mini social dots as a teaser */}
                    <span className="w-2 h-2 rounded-full bg-[#1877F2] inline-block" />
                    <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#ee2a7b] to-[#6228d7] inline-block" />
                    <span className="w-2 h-2 rounded-full bg-[#0A66C2] inline-block" />
                    <span className="w-2 h-2 rounded-full bg-black inline-block" />
                </span>
            </Button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-11 z-50 w-[260px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl p-5"
                    >
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                            Share this article
                        </p>

                        {/* 4 social icons in a row */}
                        <div className="grid grid-cols-4 gap-2 mb-5">
                            {socials.map(s => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={s.note || `Share on ${s.label}`}
                                    className={`
                                        flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border
                                        text-muted-foreground transition-all duration-150 select-none
                                        ${s.bg}
                                    `}
                                >
                                    {s.icon}
                                    <span className="text-[9px] font-semibold leading-none">{s.label}</span>
                                </a>
                            ))}
                        </div>

                        {/* divider */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 h-px bg-muted" />
                            <span className="text-[11px] text-muted-foreground">or copy link</span>
                            <div className="flex-1 h-px bg-muted" />
                        </div>

                        {/* copy link row */}
                        <button
                            onClick={copyLink}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
                        >
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${copied ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">{copied ? "Copied to clipboard!" : "Copy article link"}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{url}</p>
                            </div>
                        </button>

                        {/* Instagram note */}
                        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                            💡 Instagram doesn't support direct sharing — copy the link above and paste it in your post or story.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════ */

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
    updated_at?: string;
    featured_image?: string | null;
    tags?: string[] | null;
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

    const seed = getPrerendered<{ article: Article; category: Category | null; related: Article[] }>(`article:${slug}`);
    const [article, setArticle] = useState<Article | null>(() => seed?.article ?? null);
    const [category, setCategory] = useState<Category | null>(() => seed?.category ?? null);
    const [related, setRelated] = useState<Article[]>(() => seed?.related ?? []);
    const [loading, setLoading] = useState(() => !seed);
    const [notFound, setNotFound] = useState(false);
    // A failed request is not "not found" — never noindex a page over a network error.
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        if (slug) fetchArticle(slug);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    const fetchArticle = async (slug: string) => {
        // Already showing this article (pre-rendered first load) — refresh quietly.
        if (article?.slug !== slug) setLoading(true);
        setNotFound(false);
        setLoadFailed(false);

        let data;
        try {
            data = await fetchArticleBySlug(slug);
        } catch {
            // Keep the article if it's already showing (pre-rendered) — see publicData.ts
            if (article?.slug !== slug) setLoadFailed(true);
            setLoading(false);
            return;
        }
        if (!data) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        setArticle(data.article as Article);
        setCategory(data.category as Category | null);
        setRelated(data.related as Article[]);
        setLoading(false);
    };

    /* ─── loading skeleton ─── */
    if (loading) {
        return (
            <Layout>
                <div className="container py-16">
                  <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-8 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="space-y-3 mt-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className={`h-4 bg-muted rounded ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />
                        ))}
                    </div>
                  </div>
                </div>
            </Layout>
        );
    }

    /* ─── couldn't load (network) — no noindex ─── */
    if (loadFailed && !article) {
        return (
            <Layout>
                <div className="container py-24 text-center">
                    <h1 className="text-2xl font-bold mb-2">We couldn't load this article</h1>
                    <p className="text-muted-foreground mb-6">Please check your connection and try again.</p>
                    <Button onClick={() => slug && fetchArticle(slug)}>Try again</Button>
                </div>
            </Layout>
        );
    }

    /* ─── 404 ─── */
    if (notFound || !article) {
        return (
            <Layout>
                <SEO
                    title="Article not found"
                    description="This article may have been removed or the link is incorrect."
                    url={`https://www.becoforganicchemicals.com/learn/${slug}`}
                    noindex
                />
                <div className="container py-24 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Article not found</h1>
                    <p className="text-muted-foreground mb-6">This article may have been removed or the link is incorrect.</p>
                    <Button onClick={() => navigate("/learn")} className="gap-2">
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
                image={article.featured_image || undefined}
                type="article"
                jsonLd={[
                    articleSchema(article, category?.name),
                    breadcrumbSchema([
                        { name: "Home", path: "/" },
                        { name: "Learning Hub", path: "/learn" },
                        { name: article.title, path: `/learn/${article.slug}` },
                    ]),
                ]}
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
                                <Link to="/learn" className="hover:text-foreground transition-colors">
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
            <section className="bg-gradient-to-br from-primary/5 to-primary/10 border-b border-primary/10 py-12">
                <div className="container">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                        {category && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full border border-primary/20 mb-4">
                                <CatIcon className="h-3.5 w-3.5" />
                                {category.name}
                            </span>
                        )}

                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                            {article.title}
                        </h1>

                        {article.excerpt && (
                            <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-3xl">{article.excerpt}</p>
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

                            <div className="ml-auto">
                                <SharePanel title={article.title} excerpt={article.excerpt} slug={article.slug} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Article body */}
            <section className="py-12">
                <div className="container">
                  {/* Article + sidebar fill the container; the article column
                      keeps a comfortable line length for reading. */}
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-12">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="min-w-0"
                    >
                        <div
                            className="
                                prose prose-slate max-w-none
                                prose-headings:font-bold prose-headings:text-foreground
                                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                prose-p:leading-relaxed prose-p:text-foreground
                                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                prose-img:rounded-xl prose-img:shadow-md
                                prose-blockquote:border-primary prose-blockquote:text-muted-foreground
                                prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                                prose-pre:bg-slate-900 prose-pre:text-slate-100
                                prose-ul:text-foreground prose-ol:text-foreground
                                prose-strong:text-foreground
                            "
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
                        />
                    </motion.div>

                    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                        <CropButtons stacked title="Shop by crop" />
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 space-y-3">
                            <p className="font-semibold">Questions about your farm?</p>
                            <p className="text-sm text-muted-foreground">Tell us your crop and farm size and our team will help you choose.</p>
                            <WhatsAppOrderButton
                                message={`Hi Becof Organic Chemicals! I just read "${article.title}" and have a question.\n\nCrop: ___\nFarm size: ___ acres`}
                                label="Ask on WhatsApp"
                            />
                        </div>
                    </aside>
                  </div>

                    {/* Footer row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-12 pt-8 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/learn")}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Learning Hub
                        </Button>

                        <SharePanel title={article.title} excerpt={article.excerpt} slug={article.slug} />
                    </div>
                </div>
            </section>

            {/* Related articles */}
            {related.length > 0 && (
                <section className="py-12 bg-muted/30 border-t border-border">
                    <div className="container">
                      <div>
                        <h2 className="text-xl font-bold mb-6">More from {category?.name || "this category"}</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {related.map((r) => (
                                <motion.article
                                    key={r.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => navigate(`/learn/${r.slug}`)}
                                    className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                                >
                                    <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors leading-snug">
                                        {r.title}
                                    </h3>
                                    {r.excerpt && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{r.excerpt}</p>
                                    )}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                        <span className="flex items-center gap-1 text-primary font-medium">
                                            Read <ArrowLeft className="h-3 w-3 rotate-180" />
                                        </span>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                      </div>
                    </div>
                </section>
            )}
        </Layout>
    );
};

export default LearnDetail;