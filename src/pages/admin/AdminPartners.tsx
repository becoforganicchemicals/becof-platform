import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Users, Building2, ChevronDown, ChevronUp, Search, RefreshCw,
    CheckCircle, XCircle, Clock, Eye, Mail, Plus, Pencil, Trash2,
    Phone, MapPin, FileText, Star, EyeOff, Upload, Globe,
} from "lucide-react";

/* ─── types ─── */
interface Application {
    id: string; full_name: string; email: string; phone: string;
    business_name?: string; applicant_type: string; business_reg_number?: string;
    kra_pin?: string; years_in_business?: number; county: string; town?: string;
    expected_monthly_volume?: string; products_interest?: string[];
    has_storage_facility?: boolean; storage_capacity?: string;
    motivation: string; business_reg_cert_url?: string;
    status: string; admin_notes?: string; rejection_reason?: string;
    portal_account_created?: boolean; created_at: string;
}
interface PartnerProfile {
    id: string; application_id?: string; display_name: string; tagline?: string;
    description?: string; logo_url?: string; phone?: string; email?: string;
    website?: string; county?: string; town?: string; address?: string;
    partner_type?: string; products?: string[]; published: boolean; featured: boolean;
    facebook_url?: string; instagram_url?: string; twitter_url?: string;
}

type Tab = "applications" | "profiles";
type AppStatus = "all" | "pending" | "reviewing" | "approved" | "rejected";

const STATUS_OPTIONS = ["pending", "reviewing", "approved", "rejected"];
const PRODUCT_OPTIONS = ["fertilizers", "pesticides", "herbicides", "soil_boosters", "seeds"];

const statusStyle = (s: string) => ({
    pending: { class: "bg-yellow-100 text-yellow-700", icon: Clock },
    reviewing: { class: "bg-blue-100 text-blue-700", icon: Eye },
    approved: { class: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    rejected: { class: "bg-red-100 text-red-700", icon: XCircle },
}[s] || { class: "bg-slate-100 text-slate-600", icon: Clock });

/* ══════════════════════════════════════════════════════════════════ */
const AdminPartners = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [tab, setTab] = useState<Tab>("applications");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<AppStatus>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    /* application review dialog */
    const [reviewDialog, setReviewDialog] = useState(false);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [newStatus, setNewStatus] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [tempPassword, setTempPassword] = useState("");
    const [reviewing, setReviewing] = useState(false);

    /* profile dialog */
    const [profileDialog, setProfileDialog] = useState(false);
    const [editingProfile, setEditingProfile] = useState<PartnerProfile | null>(null);
    const [profileForm, setProfileForm] = useState<Partial<PartnerProfile>>({});
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

    /* ─── Queries ─── */
    const { data: applications = [], isLoading: appsLoading, refetch: refetchApps } = useQuery({
        queryKey: ["admin-applications"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("distributor_applications")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Application[];
        },
    });

    const { data: profiles = [], isLoading: profilesLoading, refetch: refetchProfiles } = useQuery({
        queryKey: ["admin-partner-profiles"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("partner_profiles")
                .select("*")
                .order("featured", { ascending: false });
            if (error) throw error;
            return data as PartnerProfile[];
        },
    });

    /* ─── Filters ─── */
    const filteredApps = applications.filter(a => {
        const matchSearch =
            a.full_name.toLowerCase().includes(search.toLowerCase()) ||
            a.email.toLowerCase().includes(search.toLowerCase()) ||
            (a.business_name || "").toLowerCase().includes(search.toLowerCase()) ||
            a.county.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || a.status === statusFilter;
        return matchSearch && matchStatus;
    });

    /* ─── Open review dialog ─── */
    const openReview = (app: Application) => {
        setSelectedApp(app);
        setNewStatus(app.status);
        setAdminNotes(app.admin_notes || "");
        setRejectionReason(app.rejection_reason || "");
        setTempPassword(`Becof@${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
        setReviewDialog(true);
    };

    /* ─── Save review ─── */
    const saveReview = async () => {
        if (!selectedApp) return;
        setReviewing(true);

        const updates: any = {
            status: newStatus,
            admin_notes: adminNotes,
            reviewed_at: new Date().toISOString(),
        };
        if (newStatus === "rejected") updates.rejection_reason = rejectionReason;

        const { error } = await supabase
            .from("distributor_applications")
            .update(updates)
            .eq("id", selectedApp.id);

        if (error) {
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
            setReviewing(false); return;
        }

        // Send appropriate email
        const emailType = newStatus === "approved" ? "application_approved"
            : newStatus === "rejected" ? "application_rejected"
                : "application_reviewing";

        await supabase.functions.invoke("send-partner-email", {
            body: {
                application_id: selectedApp.id,
                type: emailType,
                temp_password: newStatus === "approved" ? tempPassword : undefined,
                rejection_reason: newStatus === "rejected" ? rejectionReason : undefined,
            },
        });

        toast({ title: `Application ${newStatus} — customer notified ✓` });
        setReviewing(false);
        setReviewDialog(false);
        queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    };

    /* ─── Resend approval email ─── */
    const resendApproval = async (app: Application) => {
        const newTemp = `Becof@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await supabase.functions.invoke("send-partner-email", {
            body: { application_id: app.id, type: "application_approved", temp_password: newTemp },
        });
        toast({ title: "Approval email resent with new temp password ✓" });
    };

    /* ─── Open profile dialog ─── */
    const openProfileDialog = (profile?: PartnerProfile) => {
        if (profile) {
            setEditingProfile(profile);
            setProfileForm({ ...profile });
            setSelectedProducts(profile.products || []);
        } else {
            setEditingProfile(null);
            setProfileForm({ published: false, featured: false });
            setSelectedProducts([]);
        }
        setLogoFile(null);
        setProfileDialog(true);
    };

    /* ─── Upload logo ─── */
    const uploadLogo = async (file: File) => {
        const name = `logos/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { error } = await supabase.storage.from("partner-assets").upload(name, file);
        if (error) return null;
        return supabase.storage.from("partner-assets").getPublicUrl(name).data.publicUrl;
    };

    /* ─── Save profile ─── */
    const saveProfile = async () => {
        if (!profileForm.display_name) {
            toast({ title: "Display name is required", variant: "destructive" }); return;
        }
        setSavingProfile(true);

        let logo_url = profileForm.logo_url;
        if (logoFile) {
            const url = await uploadLogo(logoFile);
            if (url) logo_url = url;
        }

        const payload = { ...profileForm, logo_url, products: selectedProducts };

        if (editingProfile) {
            await supabase.from("partner_profiles").update(payload).eq("id", editingProfile.id);
            toast({ title: "Partner profile updated ✓" });
        } else {
            await supabase.from("partner_profiles").insert(payload);
            toast({ title: "Partner profile created ✓" });
        }

        setSavingProfile(false);
        setProfileDialog(false);
        queryClient.invalidateQueries({ queryKey: ["admin-partner-profiles"] });
    };

    /* ─── Delete profile ─── */
    const deleteProfile = async (id: string) => {
        if (!confirm("Delete this partner profile? This cannot be undone.")) return;
        await supabase.from("partner_profiles").delete().eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["admin-partner-profiles"] });
        toast({ title: "Profile deleted" });
    };

    /* ─── Toggle published/featured ─── */
    const toggleField = async (id: string, field: "published" | "featured", current: boolean) => {
        await supabase.from("partner_profiles").update({ [field]: !current }).eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["admin-partner-profiles"] });
    };

    const appRef = (id: string) => id.slice(0, 8).toUpperCase();

    /* ── Summary stats ── */
    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === "pending").length,
        reviewing: applications.filter(a => a.status === "reviewing").length,
        approved: applications.filter(a => a.status === "approved").length,
        rejected: applications.filter(a => a.status === "rejected").length,
    };

    /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
    return (
        <div className="space-y-6">
            {/* header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="h-5 w-5" /> Partner Management
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {stats.total} applications · {profiles.length} profiles published
                    </p>
                </div>
                <Button variant="outline" onClick={() => { refetchApps(); refetchProfiles(); }} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Pending", count: stats.pending, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
                    { label: "Reviewing", count: stats.reviewing, color: "bg-blue-50 border-blue-200 text-blue-700" },
                    { label: "Approved", count: stats.approved, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                    { label: "Rejected", count: stats.rejected, color: "bg-red-50 border-red-200 text-red-700" },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                        <p className="text-2xl font-bold">{s.count}</p>
                        <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* tabs */}
            <div className="flex gap-2">
                {([
                    { id: "applications", label: "Applications", Icon: FileText, count: applications.length },
                    { id: "profiles", label: "Partner Profiles", Icon: Building2, count: profiles.length },
                ] as any[]).map(({ id, label, Icon, count }) => (
                    <button key={id} onClick={() => setTab(id as Tab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
                            }`}>
                        <Icon className="h-4 w-4" />
                        {label}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            {/* ═══════════════════════ APPLICATIONS TAB ═══════════════════════ */}
            {tab === "applications" && (
                <>
                    {/* filters */}
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search by name, email, county…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as AppStatus)}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {STATUS_OPTIONS.map(s => (
                                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Card className="border-slate-200">
                        <CardHeader className="border-b border-slate-100 py-4">
                            <CardTitle className="text-base">Distributor Applications ({filteredApps.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {appsLoading && <p className="text-center text-slate-400 py-10 text-sm animate-pulse">Loading…</p>}
                            {!appsLoading && filteredApps.length === 0 && (
                                <p className="text-center text-slate-400 py-10 text-sm">No applications found.</p>
                            )}

                            {filteredApps.map(app => {
                                const style = statusStyle(app.status);
                                const Icon = style.icon;
                                return (
                                    <div key={app.id} className="border-b border-slate-100 last:border-0">
                                        <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer"
                                            onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs text-slate-400">#{appRef(app.id)}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${style.class}`}>
                                                        <Icon className="h-3 w-3" />
                                                        {app.status}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-slate-800 mt-0.5">{app.full_name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {app.business_name && <span>{app.business_name} · </span>}
                                                    {app?.applicant_type?.replace(/_/g, " ")} · {app.county}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-slate-400">{new Date(app.created_at).toLocaleDateString("en-GB")}</p>
                                            </div>
                                            {expandedId === app.id
                                                ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                                                : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                            }
                                        </div>

                                        {expandedId === app.id && (
                                            <div className="px-5 pb-5 bg-slate-50/60 border-t border-slate-100 space-y-4">
                                                <div className="grid sm:grid-cols-3 gap-4 pt-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact</p>
                                                        <div className="space-y-1.5 text-sm text-slate-600">
                                                            <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{app.email}</p>
                                                            <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{app.phone}</p>
                                                            <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{[app.town, app.county].filter(Boolean).join(", ")}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Business</p>
                                                        <div className="space-y-1 text-sm text-slate-600">
                                                            {app.business_reg_number && <p>Reg: {app.business_reg_number}</p>}
                                                            {app.kra_pin && <p>KRA: {app.kra_pin}</p>}
                                                            {app.years_in_business && <p>Years: {app.years_in_business}</p>}
                                                            {app.expected_monthly_volume && <p>Volume: {app.expected_monthly_volume.replace(/_/g, " ")}</p>}
                                                            {app.has_storage_facility && <p className="text-emerald-600">✓ Has storage facility</p>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Products Interest</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {app.products_interest?.filter(Boolean).map(p => (
                                                                <span key={p} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full capitalize">
                                                                    {p?.replace(/_/g, " ")}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Motivation</p>
                                                    <p className="text-sm text-slate-600 bg-white border border-slate-100 rounded-lg p-3">{app.motivation}</p>
                                                </div>

                                                {app.business_reg_cert_url && (
                                                    <a href={app.business_reg_cert_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                                                        <FileText className="h-3.5 w-3.5" /> View Business Registration Certificate
                                                    </a>
                                                )}

                                                {app.admin_notes && (
                                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                                        <p className="text-xs font-medium text-amber-700">Admin notes: {app.admin_notes}</p>
                                                    </div>
                                                )}
                                                {app.rejection_reason && (
                                                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                                        <p className="text-xs font-medium text-red-700">Rejection reason: {app.rejection_reason}</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 flex-wrap pt-2">
                                                    <Button size="sm" onClick={() => openReview(app)}
                                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                                                        <Eye className="h-4 w-4" /> Review / Update Status
                                                    </Button>
                                                    {app.status === "approved" && (
                                                        <Button size="sm" variant="outline" onClick={() => resendApproval(app)} className="gap-1.5">
                                                            <Mail className="h-4 w-4" /> Resend Approval Email
                                                        </Button>
                                                    )}
                                                    {app.status === "approved" && (
                                                        <Button size="sm" variant="outline"
                                                            onClick={() => { setTab("profiles"); openProfileDialog(); }}
                                                            className="gap-1.5">
                                                            <Building2 className="h-4 w-4" /> Create Profile
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ═══════════════════════ PARTNER PROFILES TAB ═══════════════════════ */}
            {tab === "profiles" && (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => openProfileDialog()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Plus className="h-4 w-4" /> New Partner Profile
                        </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profilesLoading && <p className="col-span-3 text-center text-slate-400 py-10 text-sm animate-pulse">Loading…</p>}
                        {!profilesLoading && profiles.length === 0 && (
                            <p className="col-span-3 text-center text-slate-400 py-10 text-sm">No partner profiles yet. Create one from an approved application.</p>
                        )}

                        {profiles.map(profile => (
                            <div key={profile.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-all">
                                <div className="h-16 bg-gradient-to-br from-emerald-600 to-green-700 relative">
                                    {profile.featured && (
                                        <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Star className="h-3 w-3" /> Featured
                                        </span>
                                    )}
                                </div>
                                <div className="px-4 -mt-6 mb-2">
                                    <div className="w-12 h-12 rounded-xl border-2 border-white shadow bg-white flex items-center justify-center overflow-hidden">
                                        {profile.logo_url
                                            ? <img src={profile.logo_url} alt={profile.display_name} className="w-full h-full object-cover" />
                                            : <Building2 className="h-6 w-6 text-slate-300" />
                                        }
                                    </div>
                                </div>
                                <div className="px-4 pb-4">
                                    <h3 className="font-bold text-slate-800">{profile.display_name}</h3>
                                    {profile.tagline && <p className="text-xs text-emerald-600 mt-0.5">{profile.tagline}</p>}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            {profile.published ? "Published" : "Draft"}
                                        </span>
                                        {profile.county && (
                                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                                <MapPin className="h-3 w-3" />{profile.county}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1 mt-3">
                                        <Button size="sm" variant="ghost" onClick={() => openProfileDialog(profile)} className="h-8 w-8 p-0">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => toggleField(profile.id, "published", profile.published)}
                                            className="h-8 w-8 p-0" title={profile.published ? "Unpublish" : "Publish"}>
                                            {profile.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => toggleField(profile.id, "featured", profile.featured)}
                                            className={`h-8 w-8 p-0 ${profile.featured ? "text-amber-500" : ""}`} title="Toggle featured">
                                            <Star className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => deleteProfile(profile.id)}
                                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 ml-auto">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ═══════════════════════ REVIEW DIALOG ═══════════════════════ */}
            <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Application #{selectedApp ? appRef(selectedApp.id) : ""}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {selectedApp && (
                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-0.5">
                                <p className="font-medium text-slate-800">{selectedApp.full_name}</p>
                                <p>{selectedApp.email} · {selectedApp.phone}</p>
                                <p>{selectedApp.business_name} · {selectedApp.county}</p>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Decision</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(s => (
                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {newStatus === "approved" && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Temporary Password</label>
                                <Input value={tempPassword} onChange={e => setTempPassword(e.target.value)} />
                                <p className="text-xs text-slate-400 mt-1">
                                    This will be emailed to the applicant along with their portal login link. They must change it on first login.
                                </p>
                            </div>
                        )}

                        {newStatus === "rejected" && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Rejection Reason *</label>
                                <Textarea rows={2} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                    placeholder="Explain why the application was rejected…" className="resize-none" />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Admin Notes (internal)</label>
                            <Textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                                placeholder="Internal notes not visible to applicant…" className="resize-none" />
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                            An email will be sent to the applicant when you save.
                            {newStatus === "approved" && " They will receive a temporary password and portal login link."}
                        </div>

                        <Button onClick={saveReview} disabled={reviewing}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            {reviewing
                                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
                                : "Save Decision & Notify Applicant"
                            }
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════ PROFILE DIALOG ═══════════════════════ */}
            <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProfile ? "Edit Partner Profile" : "New Partner Profile"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {/* Logo */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">Logo / Profile Picture</label>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                                    {logoFile
                                        ? <img src={URL.createObjectURL(logoFile)} alt="" className="w-full h-full object-cover" />
                                        : profileForm.logo_url
                                            ? <img src={profileForm.logo_url} alt="" className="w-full h-full object-cover" />
                                            : <Building2 className="h-6 w-6 text-slate-300" />
                                    }
                                </div>
                                <div>
                                    <input type="file" accept="image/*" id="logoUpload"
                                        onChange={e => setLogoFile(e.target.files?.[0] || null)} className="hidden" />
                                    <label htmlFor="logoUpload">
                                        <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer" asChild>
                                            <span><Upload className="h-3.5 w-3.5" /> Upload Logo</span>
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 block mb-1">Display Name *</label>
                                <Input value={profileForm.display_name || ""} onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Kamau Agrovet Ltd" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 block mb-1">Tagline</label>
                                <Input value={profileForm.tagline || ""} onChange={e => setProfileForm(p => ({ ...p, tagline: e.target.value }))} placeholder="e.g. Your trusted agrovet in Thika" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 block mb-1">Description</label>
                                <Textarea rows={2} value={profileForm.description || ""} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} className="resize-none" placeholder="Brief profile description…" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Phone</label>
                                <Input value={profileForm.phone || ""} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Email</label>
                                <Input value={profileForm.email || ""} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">County</label>
                                <Input value={profileForm.county || ""} onChange={e => setProfileForm(p => ({ ...p, county: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Town</label>
                                <Input value={profileForm.town || ""} onChange={e => setProfileForm(p => ({ ...p, town: e.target.value }))} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 block mb-1">Website</label>
                                <Input value={profileForm.website || ""} onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))} placeholder="https://…" />
                            </div>
                        </div>

                        {/* Products */}
                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-2">Products Distributed</label>
                            <div className="flex flex-wrap gap-2">
                                {PRODUCT_OPTIONS.map(p => (
                                    <button key={p} type="button"
                                        onClick={() => setSelectedProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedProducts.includes(p)
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
                                            }`}>
                                        {p.replace(/_/g, " ")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Social */}
                        <div className="grid sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Facebook URL</label>
                                <Input value={profileForm.facebook_url || ""} onChange={e => setProfileForm(p => ({ ...p, facebook_url: e.target.value }))} placeholder="https://facebook.com/…" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Instagram URL</label>
                                <Input value={profileForm.instagram_url || ""} onChange={e => setProfileForm(p => ({ ...p, instagram_url: e.target.value }))} placeholder="https://instagram.com/…" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1">Twitter/X URL</label>
                                <Input value={profileForm.twitter_url || ""} onChange={e => setProfileForm(p => ({ ...p, twitter_url: e.target.value }))} placeholder="https://twitter.com/…" />
                            </div>
                        </div>

                        {/* Visibility toggles */}
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProfileForm(p => ({ ...p, published: !p.published }))}>
                                <div className={`w-9 h-5 rounded-full relative transition-colors ${profileForm.published ? "bg-emerald-500" : "bg-slate-300"}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileForm.published ? "translate-x-4" : "translate-x-0.5"}`} />
                                </div>
                                <span className="text-sm text-slate-600">Published</span>
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setProfileForm(p => ({ ...p, featured: !p.featured }))}>
                                <div className={`w-9 h-5 rounded-full relative transition-colors ${profileForm.featured ? "bg-amber-500" : "bg-slate-300"}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${profileForm.featured ? "translate-x-4" : "translate-x-0.5"}`} />
                                </div>
                                <span className="text-sm text-slate-600">Featured</span>
                            </div>
                        </div>

                        <Button onClick={saveProfile} disabled={savingProfile} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                            {savingProfile ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</> : editingProfile ? "Update Profile" : "Create Profile"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminPartners;