import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, ClipboardList, Loader2, PackageSearch } from "lucide-react";
import SEO from "@/components/SEO";

const CustomOrder = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Product info passed via navigate state
    const productName = (location.state as any)?.productName || "";
    const productId = (location.state as any)?.productId || null;

    const [submitted, setSubmitted] = useState(false);
    const [orderId, setOrderId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        full_name: user ? "" : "",
        phone: "",
        email: user?.email || "",
        product_name: productName,
        quantity: 1,
        unit: "kg",
        delivery_address: "",
        city: "",
        notes: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name || !form.phone || !form.product_name || !form.delivery_address || !form.city) {
            toast.error("Please fill all required fields"); return;
        }
        setSubmitting(true);

        const payload = {
            ...form,
            quantity: Number(form.quantity),
            product_id: productId,
            user_id: user?.id || null,
            status: "pending",
        };

        const { data, error } = await supabase
            .from("custom_orders")
            .insert(payload)
            .select("id")
            .single();

        if (error || !data) {
            toast.error("Failed to submit order. Please try again.");
            setSubmitting(false); return;
        }

        // Trigger email notifications
        await supabase.functions.invoke("send-order-email", {
            body: { order_id: data.id, order_type: "custom", type: "custom_order_placed" },
        });

        setOrderId(data.id.slice(0, 8).toUpperCase());
        setSubmitted(true);
        setSubmitting(false);
    };

    if (!user) return (
        <Layout>
            <div className="container py-20 text-center max-w-md mx-auto">
                <PackageSearch className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Sign in to place an order</h1>
                <p className="text-muted-foreground mb-6">You need an account to submit a custom order request.</p>
                <Link to="/signin"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Sign In</Button></Link>
            </div>
        </Layout>
    );

    if (submitted) return (
        <Layout>
            <div className="container py-20 max-w-lg mx-auto text-center">
                <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Order Request Submitted!</h1>
                    <p className="text-slate-500 mb-1">Reference #{orderId}</p>
                    <p className="text-sm text-slate-500 mt-3 mb-8">
                        Our sales team will review your request and contact you on <strong>{form.phone}</strong> to confirm availability, pricing, delivery fee, and deposit amount.
                        You'll also receive a confirmation email.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link to="/products"><Button variant="outline">Back to Products</Button></Link>
                        <Link to="/profile"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white">View My Orders</Button></Link>
                    </div>
                </div>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <SEO
                title="Make a Custom Order"
                description="Request a custom order for out-of-stock products at Becof Organic Chemicals."
                url="https://www.becoforganicchemicals.com/custom-order"
            />
            <section className="py-10">
                <div className="container max-w-2xl">
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Make a Custom Order</h1>
                            <p className="text-sm text-slate-500">Our sales team will confirm availability and contact you.</p>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
                        <p className="font-semibold mb-1">📦 How Custom Orders Work</p>
                        <ol className="list-decimal list-inside space-y-1 text-amber-700">
                            <li>Submit your order request below</li>
                            <li>Our team reviews and contacts you to confirm details</li>
                            <li>When ready, you'll be notified to pay a deposit via M-Pesa</li>
                            <li>Delivery fee is confirmed by our sales team based on your location</li>
                        </ol>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-5">
                        {/* Product */}
                        <div>
                            <h2 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Product Details</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="product_name">Product Name *</Label>
                                    <Input id="product_name" name="product_name" value={form.product_name}
                                        onChange={handleChange} required placeholder="e.g. BioBoost Fertilizer" />
                                </div>
                                <div>
                                    <Label htmlFor="quantity">Quantity *</Label>
                                    <Input id="quantity" name="quantity" type="number" min={1}
                                        value={form.quantity} onChange={handleChange} required />
                                </div>
                                <div>
                                    <Label htmlFor="unit">Unit</Label>
                                    <select id="unit" name="unit" value={form.unit} onChange={handleChange}
                                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1">
                                        <option value="kg">Kilograms (kg)</option>
                                        <option value="litres">Litres (L)</option>
                                        <option value="bags">Bags</option>
                                        <option value="units">Units</option>
                                        <option value="tonnes">Tonnes</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h2 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Your Details</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="full_name">Full Name *</Label>
                                    <Input id="full_name" name="full_name" value={form.full_name}
                                        onChange={handleChange} required />
                                </div>
                                <div>
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input id="phone" name="phone" value={form.phone}
                                        onChange={handleChange} required placeholder="+254..." />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" name="email" type="email" value={form.email}
                                        onChange={handleChange} placeholder="For order notifications" />
                                </div>
                            </div>
                        </div>

                        {/* Delivery */}
                        <div>
                            <h2 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Delivery Address</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="delivery_address">Street / Area *</Label>
                                    <Input id="delivery_address" name="delivery_address" value={form.delivery_address}
                                        onChange={handleChange} required placeholder="e.g. Ngong Road, near Total petrol station" />
                                </div>
                                <div>
                                    <Label htmlFor="city">City / Town *</Label>
                                    <Input id="city" name="city" value={form.city}
                                        onChange={handleChange} required placeholder="e.g. Nairobi" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                Delivery is not free. Our sales team will confirm the delivery fee when your order is ready.
                            </p>
                        </div>

                        {/* Notes */}
                        <div>
                            <Label htmlFor="notes">Additional Notes (optional)</Label>
                            <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange}
                                placeholder="Any specific requirements, preferred delivery time, etc." rows={3} className="resize-none" />
                        </div>

                        <Button type="submit" disabled={submitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base gap-2">
                            {submitting
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                                : <><ClipboardList className="h-4 w-4" /> Submit Custom Order</>
                            }
                        </Button>
                    </form>
                </div>
            </section>
        </Layout>
    );
};

export default CustomOrder;