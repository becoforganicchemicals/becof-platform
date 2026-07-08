import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminActivity } from "@/lib/audit-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Download, Award, BarChart2, FileText, Eye, EyeOff, GripVertical } from "lucide-react";

/* ─── types ─── */
interface Metric { id: string; icon: string; label: string; value: string; sort_order: number; }
interface Report { id: string; title: string; year: number; description?: string; file_url: string; published: boolean; }
interface ImpactAward { id: string; name: string; awarded_date: string; image_url?: string; }

const ICON_OPTIONS = ["Users", "Globe", "Droplets", "TreePine", "Leaf", "TrendingUp", "Award", "FileText", "Zap", "Heart"];

type ActiveSection = "metrics" | "reports" | "awards";

/* ═══════════════════════════════════════════════════════════════ */
const AdminImpact = () => {
    const { toast } = useToast();
    const [section, setSection] = useState<ActiveSection>("metrics");

    /* ─── metrics state ─── */
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [metricDialog, setMetricDialog] = useState(false);
    const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
    const [metricForm, setMetricForm] = useState({ icon: "Users", label: "", value: "", sort_order: 0 });

    /* ─── reports state ─── */
    const [reports, setReports] = useState<Report[]>([]);
    const [reportDialog, setReportDialog] = useState(false);
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [reportForm, setReportForm] = useState({ title: "", year: new Date().getFullYear(), description: "", file_url: "", published: true });
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    /* ─── awards state ─── */
    const [awards, setAwards] = useState<ImpactAward[]>([]);
    const [awardDialog, setAwardDialog] = useState(false);
    const [editingAward, setEditingAward] = useState<ImpactAward | null>(null);
    const [awardForm, setAwardForm] = useState({ name: "", awarded_date: "", image_url: "" });
    const [awardImageFile, setAwardImageFile] = useState<File | null>(null);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        const [{ data: m }, { data: r }, { data: a }] = await Promise.all([
            supabase.from("impact_metrics").select("*").order("sort_order"),
            supabase.from("esg_reports").select("*").order("year", { ascending: false }),
            supabase.from("impact_awards").select("*").order("awarded_date", { ascending: false }),
        ]);
        setMetrics(m || []);
        setReports(r || []);
        setAwards(a || []);

        const { data, error } = await supabase.rpc('is_admin_or_super_admin');
        console.log('is_admin_or_super_admin:', data, error);
    };

    /* ════════════ METRICS ════════════ */
    const saveMetric = async () => {
        if (!metricForm.label || !metricForm.value) {
            toast({ title: "Label and value are required", variant: "destructive" }); return;
        }
        if (editingMetric) {
            await supabase.from("impact_metrics").update(metricForm).eq("id", editingMetric.id);
            logAdminActivity({ action: "UPDATE", targetTable: "impact_metrics", targetId: editingMetric.id, afterData: metricForm });
            toast({ title: "Metric updated" });
        } else {
            const { data } = await supabase.from("impact_metrics").insert(metricForm).select("id").single();
            logAdminActivity({ action: "INSERT", targetTable: "impact_metrics", targetId: data?.id || null, afterData: metricForm });
            toast({ title: "Metric created" });
        }
        setMetricDialog(false);
        setEditingMetric(null);
        setMetricForm({ icon: "Users", label: "", value: "", sort_order: 0 });
        fetchAll();
    };

    const deleteMetric = async (id: string) => {
        if (!confirm("Delete this metric?")) return;
        await supabase.from("impact_metrics").delete().eq("id", id);
        logAdminActivity({ action: "DELETE", targetTable: "impact_metrics", targetId: id });
        fetchAll();
    };

    const openEditMetric = (m: Metric) => {
        setEditingMetric(m);
        setMetricForm({ icon: m.icon, label: m.label, value: m.value, sort_order: m.sort_order });
        setMetricDialog(true);
    };

    /* ════════════ ESG REPORTS ════════════ */
    const uploadFile = async (file: File, bucket: string) => {
        const name = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from(bucket).upload(name, file);
        if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
        return supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl;
    };

    const saveReport = async () => {
        if (!reportForm.title || !reportForm.year) {
            toast({ title: "Title and year are required", variant: "destructive" }); return;
        }
        setUploading(true);
        let file_url = reportForm.file_url;

        if (reportFile) {
            const url = await uploadFile(reportFile, "esg-reports");
            if (!url) { setUploading(false); return; }
            file_url = url;
        }

        if (!file_url) {
            toast({ title: "Please upload a PDF or provide a file URL", variant: "destructive" });
            setUploading(false); return;
        }

        const payload = { ...reportForm, file_url };
        if (editingReport) {
            await supabase.from("esg_reports").update(payload).eq("id", editingReport.id);
            logAdminActivity({ action: "UPDATE", targetTable: "esg_reports", targetId: editingReport.id, afterData: { title: reportForm.title } });
            toast({ title: "Report updated" });
        } else {
            const { data } = await supabase.from("esg_reports").insert(payload).select("id").single();
            logAdminActivity({ action: "INSERT", targetTable: "esg_reports", targetId: data?.id || null, afterData: { title: reportForm.title } });
            toast({ title: "Report published" });
        }
        setUploading(false);
        setReportDialog(false);
        setEditingReport(null);
        setReportFile(null);
        setReportForm({ title: "", year: new Date().getFullYear(), description: "", file_url: "", published: true });
        fetchAll();
    };

    const deleteReport = async (id: string) => {
        if (!confirm("Delete this ESG report?")) return;
        await supabase.from("esg_reports").delete().eq("id", id);
        logAdminActivity({ action: "DELETE", targetTable: "esg_reports", targetId: id });
        fetchAll();
    };

    const toggleReport = async (r: Report) => {
        await supabase.from("esg_reports").update({ published: !r.published }).eq("id", r.id);
        logAdminActivity({ action: "UPDATE", targetTable: "esg_reports", targetId: r.id, afterData: { published: !r.published } });
        fetchAll();
    };

    const openEditReport = (r: Report) => {
        setEditingReport(r);
        setReportForm({ title: r.title, year: r.year, description: r.description || "", file_url: r.file_url, published: r.published });
        setReportDialog(true);
    };

    /* ════════════ AWARDS ════════════ */
    const saveAward = async () => {
        if (!awardForm.name || !awardForm.awarded_date) {
            toast({ title: "Name and date are required", variant: "destructive" }); return;
        }
        let image_url = awardForm.image_url;
        if (awardImageFile) {
            const url = await uploadFile(awardImageFile, "impact-awards");
            if (!url) return;
            image_url = url;
        }
        const payload = { ...awardForm, image_url };
        if (editingAward) {
            await supabase.from("impact_awards").update(payload).eq("id", editingAward.id);
            logAdminActivity({ action: "UPDATE", targetTable: "impact_awards", targetId: editingAward.id, afterData: { name: awardForm.name } });
            toast({ title: "Award updated" });
        } else {
            const { data } = await supabase.from("impact_awards").insert(payload).select("id").single();
            logAdminActivity({ action: "INSERT", targetTable: "impact_awards", targetId: data?.id || null, afterData: { name: awardForm.name } });
            toast({ title: "Award created" });
        }
        setAwardDialog(false);
        setEditingAward(null);
        setAwardImageFile(null);
        setAwardForm({ name: "", awarded_date: "", image_url: "" });
        fetchAll();
    };

    const deleteAward = async (id: string) => {
        if (!confirm("Delete this award?")) return;
        await supabase.from("impact_awards").delete().eq("id", id);
        logAdminActivity({ action: "DELETE", targetTable: "impact_awards", targetId: id });
        fetchAll();
    };

    const openEditAward = (a: ImpactAward) => {
        setEditingAward(a);
        setAwardForm({ name: a.name, awarded_date: a.awarded_date, image_url: a.image_url || "" });
        setAwardDialog(true);
    };

    /* ─── nav pill ─── */
    const NavPill = ({ id, label, icon: Icon, count }: { id: ActiveSection; label: string; icon: React.ElementType; count: number }) => (
        <button
            onClick={() => setSection(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${section === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
        >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${section === id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {count}
            </span>
        </button>
    );

    /* ═══════════════════════════════════════════════════════════════ */
    return (
        <div className="space-y-6">
            {/* header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Impact Management</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage metrics, ESG reports, and awards shown on the Impact page.</p>
            </div>

            {/* section nav */}
            <div className="flex flex-wrap gap-2">
                <NavPill id="metrics" label="Metrics" icon={BarChart2} count={metrics.length} />
                <NavPill id="reports" label="ESG Reports" icon={FileText} count={reports.length} />
                <NavPill id="awards" label="Awards" icon={Award} count={awards.length} />
            </div>

            {/* ══════════ METRICS SECTION ══════════ */}
            {section === "metrics" && (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setMetricDialog(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Metric
                        </Button>
                    </div>

                    <Card className="border-border">
                        <CardHeader className="border-b border-border/50 py-4">
                            <CardTitle className="text-base">Impact Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {metrics.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No metrics yet.</p>}
                            {metrics.map((m) => (
                                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-muted/20">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-foreground">{m.value}</p>
                                        <p className="text-xs text-muted-foreground">{m.label} · icon: {m.icon}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => openEditMetric(m)} className="h-8 w-8 p-0">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => deleteMetric(m.id)} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* metric dialog */}
                    <Dialog open={metricDialog} onOpenChange={setMetricDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingMetric ? "Edit Metric" : "New Metric"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Icon</label>
                                    <select
                                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={metricForm.icon}
                                        onChange={e => setMetricForm({ ...metricForm, icon: e.target.value })}
                                    >
                                        {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Label</label>
                                    <Input placeholder="e.g. Farmers Empowered" value={metricForm.label}
                                        onChange={e => setMetricForm({ ...metricForm, label: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Value</label>
                                    <Input placeholder="e.g. 500+" value={metricForm.value}
                                        onChange={e => setMetricForm({ ...metricForm, value: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Sort Order</label>
                                    <Input type="number" value={metricForm.sort_order}
                                        onChange={e => setMetricForm({ ...metricForm, sort_order: Number(e.target.value) })} />
                                </div>
                                <Button onClick={saveMetric} className="w-full">
                                    {editingMetric ? "Update" : "Create"} Metric
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {/* ══════════ ESG REPORTS SECTION ══════════ */}
            {section === "reports" && (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setReportDialog(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> Add ESG Report
                        </Button>
                    </div>

                    <Card className="border-border">
                        <CardHeader className="border-b border-border/50 py-4">
                            <CardTitle className="text-base">ESG Reports</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {reports.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No reports yet.</p>}
                            {reports.map((r) => (
                                <div key={r.id} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/20">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground">{r.title} <span className="text-muted-foreground font-normal">({r.year})</span></p>
                                        {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                        {r.published ? "Published" : "Hidden"}
                                    </span>
                                    <div className="flex gap-1">
                                        <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View/Download">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </a>
                                        <Button size="sm" variant="ghost" onClick={() => toggleReport(r)} className="h-8 w-8 p-0" title={r.published ? "Hide" : "Publish"}>
                                            {r.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => openEditReport(r)} className="h-8 w-8 p-0">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => deleteReport(r.id)} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* report dialog */}
                    <Dialog open={reportDialog} onOpenChange={v => { setReportDialog(v); if (!v) { setEditingReport(null); setReportFile(null); } }}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingReport ? "Edit ESG Report" : "New ESG Report"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Title</label>
                                    <Input placeholder="e.g. ESG Report" value={reportForm.title}
                                        onChange={e => setReportForm({ ...reportForm, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Year</label>
                                    <Input type="number" value={reportForm.year}
                                        onChange={e => setReportForm({ ...reportForm, year: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Description (optional)</label>
                                    <Textarea rows={2} placeholder="Brief summary of the report…" value={reportForm.description}
                                        onChange={e => setReportForm({ ...reportForm, description: e.target.value })} className="resize-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Upload PDF</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={e => setReportFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                    {reportForm.file_url && !reportFile && (
                                        <a href={reportForm.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                                            <Download className="h-3 w-3" /> Current file
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <div
                                        onClick={() => setReportForm(prev => ({ ...prev, published: !prev.published }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${reportForm.published ? "bg-primary" : "bg-muted-foreground/40"}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${reportForm.published ? "translate-x-5" : "translate-x-0.5"}`} />
                                    </div>
                                    <span className="text-sm text-muted-foreground">{reportForm.published ? "Published" : "Hidden"}</span>
                                </div>
                                <Button onClick={saveReport} disabled={uploading} className="w-full">
                                    {uploading ? "Uploading…" : editingReport ? "Update Report" : "Publish Report"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {/* ══════════ AWARDS SECTION ══════════ */}
            {section === "awards" && (
                <>
                    <div className="flex justify-end">
                        <Button onClick={() => setAwardDialog(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Award
                        </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {awards.length === 0 && (
                            <p className="col-span-3 text-center text-muted-foreground py-10 text-sm">No awards yet.</p>
                        )}
                        {awards.map((a) => (
                            <div key={a.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                                <div className="h-36 bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center overflow-hidden relative p-4">
                                    {a.image_url
                                        ? <img src={a.image_url} alt={a.name} className="max-w-full max-h-full object-contain" />
                                        : <Award className="h-12 w-12 text-amber-400" />
                                    }
                                    {/* action overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => openEditAward(a)} className="h-8 w-8 p-0">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => deleteAward(a.id)} className="h-8 w-8 p-0">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="font-semibold text-foreground text-sm leading-snug">{a.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(a.awarded_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* award dialog */}
                    <Dialog open={awardDialog} onOpenChange={v => { setAwardDialog(v); if (!v) { setEditingAward(null); setAwardImageFile(null); } }}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingAward ? "Edit Award" : "New Award"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Award / Recognition Name</label>
                                    <Input placeholder="e.g. Kenya Green Innovation Award 2025" value={awardForm.name}
                                        onChange={e => setAwardForm({ ...awardForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Date Awarded</label>
                                    <Input type="date" value={awardForm.awarded_date}
                                        onChange={e => setAwardForm({ ...awardForm, awarded_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-medium block mb-1">Award Image / Badge</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setAwardImageFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                    {awardForm.image_url && !awardImageFile && (
                                        <div className="mt-2 h-20 rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center overflow-hidden p-2">
                                            <img src={awardForm.image_url} alt="current" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                                <Button onClick={saveAward} className="w-full">
                                    {editingAward ? "Update Award" : "Save Award"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
};

export default AdminImpact;