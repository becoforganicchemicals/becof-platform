import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    CheckCircle, XCircle, Star, Eye, EyeOff,
    Clock, MessageSquare, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Testimonial {
    id: string;
    content: string;
    rating: number;
    author_name: string;
    author_location: string | null;
    author_role: string | null;
    status: "pending" | "approved" | "rejected";
    featured: boolean;
    created_at: string;
    reviewed_at: string | null;
    rejection_note: string | null;
    product_id: string | null;
    products?: { name: string } | null;
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

const statusBadge = {
    pending: <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Pending</Badge>,
    approved: <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Approved</Badge>,
    rejected: <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50">Rejected</Badge>,
};

const AdminTestimonials = () => {
    const { user } = useAuth();
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>("pending");
    const [actionId, setActionId] = useState<string | null>(null);
    const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
    const [rejectionNote, setRejectionNote] = useState("");

    const fetchTestimonials = async () => {
        setLoading(true);
        let query = supabase
            .from("testimonials")
            .select("*, products(name)")
            .order("created_at", { ascending: false });

        if (filter !== "all") query = query.eq("status", filter);

        const { data, error } = await query;
        if (!error && data) setTestimonials(data as Testimonial[]);
        setLoading(false);
    };

    useEffect(() => { fetchTestimonials(); }, [filter]);

    const updateStatus = async (id: string, status: "approved" | "rejected", note?: string) => {
        setActionId(id);
        const { error } = await supabase
            .from("testimonials")
            .update({
                status,
                reviewed_by: user?.id,
                reviewed_at: new Date().toISOString(),
                rejection_note: note ?? null,
                // Auto-feature when approved, unfeature when rejected
                ...(status === "approved" ? { featured: true } : { featured: false }),
            })
            .eq("id", id);

        if (error) {
            toast.error("Failed to update testimonial");
        } else {
            toast.success(status === "approved" ? "Testimonial approved and featured" : "Testimonial rejected");
            fetchTestimonials();
        }
        setActionId(null);
        setRejectDialog({ open: false, id: null });
        setRejectionNote("");
    };

    const toggleFeatured = async (t: Testimonial) => {
        if (t.status !== "approved") return;
        setActionId(t.id);
        const { error } = await supabase
            .from("testimonials")
            .update({ featured: !t.featured })
            .eq("id", t.id);

        if (!error) {
            toast.success(t.featured ? "Removed from landing page" : "Now featured on landing page");
            fetchTestimonials();
        }
        setActionId(null);
    };

    const counts = {
        all: testimonials.length,
        pending: testimonials.filter(t => t.status === "pending").length,
        approved: testimonials.filter(t => t.status === "approved").length,
        rejected: testimonials.filter(t => t.status === "rejected").length,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Testimonials</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Review and approve farmer testimonials for the landing page
                    </p>
                </div>
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {(["pending", "approved", "rejected", "all"] as FilterStatus[]).map((f) => (
                    <Button
                        key={f}
                        size="sm"
                        variant={filter === f ? "default" : "outline"}
                        onClick={() => setFilter(f)}
                        className="capitalize"
                    >
                        {f}
                        {f === "pending" && counts.pending > 0 && (
                            <span className="ml-1.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {counts.pending}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : testimonials.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No {filter !== "all" ? filter : ""} testimonials found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="bg-card rounded-xl border border-border p-5 space-y-4"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {t.author_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{t.author_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {[t.author_role, t.author_location].filter(Boolean).join(" · ")}
                                        </div>
                                        {t.products?.name && (
                                            <div className="text-xs text-accent mt-0.5">Re: {t.products.name}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {statusBadge[t.status]}
                                    {t.status === "approved" && (
                                        <Badge variant={t.featured ? "default" : "outline"} className="text-xs">
                                            {t.featured ? "Featured" : "Not Featured"}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`h-3.5 w-3.5 ${s <= t.rating ? "fill-earth text-earth" : "text-muted-foreground/20"}`}
                                    />
                                ))}
                            </div>

                            {/* Content — READ ONLY, no edit UI */}
                            <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/20 pl-3 leading-relaxed">
                                "{t.content}"
                            </blockquote>

                            {t.rejection_note && (
                                <p className="text-xs bg-red-50 text-red-500 border border-red-200 rounded px-3 py-2">
                                    Internal note: {t.rejection_note}
                                </p>
                            )}

                            <div className="text-xs text-muted-foreground">
                                Submitted {new Date(t.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                                {t.reviewed_at && ` · Reviewed ${new Date(t.reviewed_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}`}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap pt-1">
                                {t.status === "pending" && (
                                    <>
                                        <Button
                                            size="sm"
                                            className="gap-1.5 bg-green-600 hover:bg-green-700"
                                            disabled={actionId === t.id}
                                            onClick={() => updateStatus(t.id, "approved")}
                                        >
                                            {actionId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                            Approve & Feature
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                                            disabled={actionId === t.id}
                                            onClick={() => setRejectDialog({ open: true, id: t.id })}
                                        >
                                            <XCircle className="h-3.5 w-3.5" /> Reject
                                        </Button>
                                    </>
                                )}

                                {t.status === "approved" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        disabled={actionId === t.id}
                                        onClick={() => toggleFeatured(t)}
                                    >
                                        {actionId === t.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : t.featured ? (
                                            <><EyeOff className="h-3.5 w-3.5" /> Unfeature</>
                                        ) : (
                                            <><Eye className="h-3.5 w-3.5" /> Feature on Landing Page</>
                                        )}
                                    </Button>
                                )}

                                {t.status === "rejected" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5 text-green-600 border-green-300"
                                        disabled={actionId === t.id}
                                        onClick={() => updateStatus(t.id, "approved")}
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" /> Re-approve
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Reject dialog */}
            <Dialog
                open={rejectDialog.open}
                onOpenChange={(open) => { if (!open) setRejectDialog({ open: false, id: null }); }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Testimonial</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            The farmer will not see this note — it is for internal reference only. The testimonial content will remain unchanged.
                        </p>
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Internal Rejection Note (optional)</Label>
                            <Textarea
                                placeholder="e.g. Promotional language, unverified claims…"
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null })}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => rejectDialog.id && updateStatus(rejectDialog.id, "rejected", rejectionNote)}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminTestimonials;