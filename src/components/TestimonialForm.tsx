import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Send, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TestimonialStatus {
    id: string;
    status: "pending" | "approved" | "rejected";
    content: string;
    rating: number;
    created_at: string;
    rejection_note: string | null;
}

const statusConfig = {
    pending: { icon: Clock, label: "Under Review", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
    approved: { icon: CheckCircle, label: "Featured", color: "text-green-600", bg: "bg-green-50 border-green-200" },
    rejected: { icon: XCircle, label: "Not Featured", color: "text-red-500", bg: "bg-red-50 border-red-200" },
};

const TestimonialForm = () => {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [location, setLocation] = useState("");
    const [role, setRole] = useState("");
    const [productId, setProductId] = useState<string>("");
    const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [existing, setExisting] = useState<TestimonialStatus | null | undefined>(undefined);

    // Fetch user's existing testimonial + available products
    useEffect(() => {
        if (!user) return;

        const init = async () => {
            // Check for existing testimonial
            const { data: tData } = await supabase
                .from("testimonials")
                .select("id, status, content, rating, created_at, rejection_note")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            setExisting(tData ?? null);

            // Fetch products for dropdown
            const { data: pData } = await supabase
                .from("products")
                .select("id, name")
                .eq("is_active", true)
                .order("name");

            if (pData) setProducts(pData);
        };

        init();
    }, [user]);

    const handleSubmit = async () => {
        if (!user) return;
        if (rating === 0) { toast.error("Please select a star rating"); return; }
        if (content.trim().length < 20) { toast.error("Please write at least 20 characters"); return; }

        setSubmitting(true);

        // Get user's display name from profile table (adjust table name if different)
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

        const authorName = profile?.full_name || user.email?.split("@")[0] || "Farmer";

        const payload = {
            user_id: user.id,
            content: content.trim(),
            rating,
            author_name: authorName,
            author_location: location.trim() || null,
            author_role: role.trim() || null,
            product_id: productId || null,
        };

        const { error } = await supabase.from("testimonials").insert(payload);

        if (error) {
            if (error.code === "23505") {
                toast.error("You have already submitted a testimonial for this product");
            } else {
                toast.error("Failed to submit testimonial. Please try again.");
            }
        } else {
            toast.success("Thank you! Your testimonial is under review.");
            // Refresh existing
            const { data: newT } = await supabase
                .from("testimonials")
                .select("id, status, content, rating, created_at, rejection_note")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            setExisting(newT ?? null);
        }

        setSubmitting(false);
    };

    const handleWithdraw = async () => {
        if (!existing || existing.status !== "pending") return;
        const { error } = await supabase
            .from("testimonials")
            .delete()
            .eq("id", existing.id);

        if (!error) {
            setExisting(null);
            setContent("");
            setRating(0);
            toast.success("Testimonial withdrawn.");
        }
    };

    // Loading state
    if (existing === undefined) {
        return <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
    }

    // Show existing submission status
    if (existing) {
        const cfg = statusConfig[existing.status];
        const Icon = cfg.icon;
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-5 ${cfg.bg} space-y-3`}
                >
                    <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                        <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= existing.rating ? "fill-earth text-earth" : "text-muted-foreground/20"}`} />
                        ))}
                    </div>
                    <p className="text-sm italic text-muted-foreground">"{existing.content}"</p>

                    {existing.status === "rejected" && existing.rejection_note && (
                        <p className="text-xs text-red-500 bg-red-100 rounded px-3 py-2">
                            Note from reviewer: {existing.rejection_note}
                        </p>
                    )}

                    {existing.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={handleWithdraw} className="text-destructive border-destructive/30 hover:bg-destructive/5">
                            Withdraw Submission
                        </Button>
                    )}

                    {existing.status === "rejected" && (
                        <Button variant="outline" size="sm" onClick={() => setExisting(null)}>
                            Submit a New Testimonial
                        </Button>
                    )}
                </motion.div>
            </AnimatePresence>
        );
    }

    // Submission form
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
        >
            <div>
                <Label className="text-sm font-medium mb-2 block">Your Rating *</Label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setRating(s)}
                            onMouseEnter={() => setHoveredRating(s)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="transition-transform hover:scale-110"
                        >
                            <Star
                                className={`h-7 w-7 ${s <= (hoveredRating || rating) ? "fill-earth text-earth" : "text-muted-foreground/30"}`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <Label htmlFor="testimonial-content" className="text-sm font-medium mb-2 block">
                    Your Experience * <span className="text-muted-foreground font-normal">({content.length}/1000)</span>
                </Label>
                <Textarea
                    id="testimonial-content"
                    placeholder="Tell us how Becof products have impacted your farming — what changed, what improved, and what you'd tell other farmers."
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, 1000))}
                    className="min-h-[120px] resize-none"
                />
                {content.length > 0 && content.length < 20 && (
                    <p className="text-xs text-destructive mt-1">Minimum 20 characters required.</p>
                )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="testimonial-location" className="text-sm font-medium mb-2 block">Your County / Location</Label>
                    <Input
                        id="testimonial-location"
                        placeholder="e.g. Nakuru County"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>
                <div>
                    <Label htmlFor="testimonial-role" className="text-sm font-medium mb-2 block">What do you farm?</Label>
                    <Input
                        id="testimonial-role"
                        placeholder="e.g. Maize & Wheat Farmer"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    />
                </div>
            </div>

            {products.length > 0 && (
                <div>
                    <Label className="text-sm font-medium mb-2 block">Which product are you reviewing? (optional)</Label>
                    <Select value={productId} onValueChange={setProductId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a product…" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="bg-muted/50 rounded-lg px-4 py-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Before you submit:</strong> Your testimonial will be
                reviewed by our team before it appears publicly on our website. We will never edit your
                words — only approve or decline for publishing.
            </div>

            <Button
                className="gap-2 w-full sm:w-auto"
                disabled={submitting || rating === 0 || content.trim().length < 20}
                onClick={handleSubmit}
            >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit Testimonial"}
            </Button>
        </motion.div>
    );
};

export default TestimonialForm;