import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Edit, Briefcase, Download, Loader2, Users, MapPin,
  Clock, Mail, Phone, FileText, CheckCircle2, XCircle,
  Star, RotateCcw, Search, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Column names (verified from DB) ─────────────────────────────────────────
// career_applications: id, job_position_id, full_name, email, phone,
//                      cover_letter, cv_url, status, created_at, updated_at
// job_positions: id, title, department, location, type, description,
//               requirements, is_active, created_at, updated_at

const JOB_TYPES = ["full-time", "part-time", "contract", "internship"];
const APP_STATUSES = ["pending", "reviewed", "shortlisted", "rejected", "hired"] as const;
type AppStatus = typeof APP_STATUSES[number];

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock },
  reviewed: { label: "Reviewed", color: "text-blue-600 bg-blue-50 border-blue-200", icon: FileText },
  shortlisted: { label: "Shortlisted", color: "text-purple-600 bg-purple-50 border-purple-200", icon: Star },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
  hired: { label: "Hired", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status as AppStatus] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
};

// ── Blank job form ────────────────────────────────────────────────────────────
const blankJob = () => ({
  title: "", department: "", location: "", type: "full-time",
  description: "", requirements: "", is_active: true,
});

const AdminCareers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Job form state
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [jobForm, setJobForm] = useState(blankJob());

  // Application filters & detail
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [detailApp, setDetailApp] = useState<any>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_positions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("career_applications")
        .select("*, job_positions(title, department, location, type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const upsertJob = useMutation({
    mutationFn: async (job: typeof jobForm & { id?: string }) => {
      const payload = {
        title: job.title,
        department: job.department || null,
        location: job.location || null,
        type: job.type,
        description: job.description || null,
        requirements: job.requirements || null,
        is_active: job.is_active,
      };
      if (job.id) {
        const { error } = await supabase.from("job_positions").update(payload).eq("id", job.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_positions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      setJobDialogOpen(false);
      setJobForm(blankJob());
      setEditingJob(null);
      toast({ title: editingJob ? "Position updated" : "Position created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleJobActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("job_positions")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-jobs"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateAppStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("career_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const openEditJob = (j: any) => {
    setEditingJob(j);
    setJobForm({
      title: j.title,
      department: j.department || "",
      location: j.location || "",
      type: j.type || "full-time",
      description: j.description || "",
      requirements: j.requirements || "",
      is_active: j.is_active,
    });
    setJobDialogOpen(true);
  };

  const downloadCv = async (cvUrl: string) => {
    // cv_url stores the storage path, not a signed URL
    const { data, error } = await supabase.storage
      .from("career-cvs")
      .createSignedUrl(cvUrl, 3600);
    if (error) {
      toast({ title: "Could not generate download link", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  // ── Filtered applications ──────────────────────────────────────────────────
  const filteredApps = applications.filter(app => {
    const matchStatus = statusFilter === "all" || app.status === statusFilter;
    const matchJob = jobFilter === "all" || app.job_position_id === jobFilter;
    const matchSearch = !search ||
      app.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchJob && matchSearch;
  });

  // Stats by status
  const statusCounts = APP_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<AppStatus, number>);

  const activeJobs = jobs.filter(j => j.is_active).length;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> Careers Management
        </h2>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeJobs}</p>
              <p className="text-xs text-muted-foreground">Active Positions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Star className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.shortlisted}</p>
              <p className="text-xs text-muted-foreground">Shortlisted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.hired}</p>
              <p className="text-xs text-muted-foreground">Hired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications">
        <TabsList className="mb-4">
          <TabsTrigger value="applications" className="gap-2">
            <Users className="h-4 w-4" />
            Applications
            <Badge variant="secondary" className="ml-1">{applications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Job Positions
            <Badge variant="secondary" className="ml-1">{jobs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Applications tab ── */}
        <TabsContent value="applications" className="space-y-4">
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
            >
              All ({applications.length})
            </button>
            {APP_STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? cfg.color : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label} ({statusCounts[s]})
                </button>
              );
            })}
          </div>

          {/* Search + job filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {jobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CV</TableHead>
                    <TableHead>Update Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingApps ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredApps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No applications found</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredApps.map(app => (
                    <TableRow key={app.id} className="hover:bg-muted/30">
                      <TableCell>
                        <button
                          className="text-left hover:opacity-80 transition-opacity"
                          onClick={() => setDetailApp(app)}
                        >
                          <p className="font-medium text-sm">{app.full_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {app.email}
                          </p>
                          {app.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {app.phone}
                            </p>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {(app as any).job_positions?.title || "—"}
                        </p>
                        {(app as any).job_positions?.department && (
                          <p className="text-xs text-muted-foreground">
                            {(app as any).job_positions.department}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(app.created_at).toLocaleDateString("en-KE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell>
                        {app.cv_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => downloadCv(app.cv_url!)}
                          >
                            <Download className="h-3.5 w-3.5" /> CV
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={app.status}
                          onValueChange={v => updateAppStatus.mutate({ id: app.id, status: v })}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APP_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>
                                {STATUS_CONFIG[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Job Positions tab ── */}
        <TabsContent value="positions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setJobForm(blankJob()); setEditingJob(null); setJobDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Position
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingJobs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No positions yet</p>
                      </TableCell>
                    </TableRow>
                  ) : jobs.map(j => {
                    const appCount = applications.filter(a => a.job_position_id === j.id).length;
                    return (
                      <TableRow key={j.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{j.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(j.created_at).toLocaleDateString("en-KE")}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {j.department || "—"}
                        </TableCell>
                        <TableCell>
                          {j.location ? (
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {j.location}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {j.type?.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${appCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {appCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleJobActive.mutate({ id: j.id, is_active: !j.is_active })}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${j.is_active ? "text-green-600" : "text-muted-foreground"
                              }`}
                          >
                            {j.is_active
                              ? <ToggleRight className="h-4 w-4" />
                              : <ToggleLeft className="h-4 w-4" />}
                            {j.is_active ? "Active" : "Inactive"}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditJob(j)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Job form dialog ── */}
      <Dialog
        open={jobDialogOpen}
        onOpenChange={o => { setJobDialogOpen(o); if (!o) { setJobForm(blankJob()); setEditingJob(null); } }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Position" : "New Position"}</DialogTitle>
            <DialogDescription>
              {editingJob ? "Update job position details." : "Create a new job opening."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); upsertJob.mutate({ ...jobForm, id: editingJob?.id }); }}
            className="space-y-4 pt-2"
          >
            <div>
              <Label>Job Title *</Label>
              <Input
                value={jobForm.title}
                onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Agronomist"
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <Input
                  value={jobForm.department}
                  onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Research"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={jobForm.location}
                  onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Nairobi"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select
                value={jobForm.type}
                onValueChange={v => setJobForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={jobForm.description}
                onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Role overview, responsibilities…"
                className="mt-1 resize-none"
              />
            </div>
            <div>
              <Label>Requirements</Label>
              <Textarea
                rows={4}
                value={jobForm.requirements}
                onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))}
                placeholder="Qualifications, skills, experience…"
                className="mt-1 resize-none"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Active Listing</p>
                <p className="text-xs text-muted-foreground">Visible to applicants on the careers page</p>
              </div>
              <Switch
                checked={jobForm.is_active}
                onCheckedChange={c => setJobForm(f => ({ ...f, is_active: c }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={upsertJob.isPending}>
              {upsertJob.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : editingJob
                  ? <><RotateCcw className="h-4 w-4 mr-2" /> Update Position</>
                  : <><Plus className="h-4 w-4 mr-2" /> Create Position</>
              }
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Applicant detail dialog ── */}
      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Detail</DialogTitle>
            <DialogDescription>
              Full details for this applicant's submission.
            </DialogDescription>
          </DialogHeader>
          {detailApp && (
            <div className="space-y-5 pt-1">
              {/* Applicant info */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{detailApp.full_name}</h3>
                  <div className="space-y-1 mt-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {detailApp.email}
                    </p>
                    {detailApp.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {detailApp.phone}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={detailApp.status} />
              </div>

              {/* Position */}
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Applied for</p>
                <p className="font-medium">{detailApp.job_positions?.title || "Unknown position"}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                  {detailApp.job_positions?.department && (
                    <span>{detailApp.job_positions.department}</span>
                  )}
                  {detailApp.job_positions?.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {detailApp.job_positions.location}
                    </span>
                  )}
                  {detailApp.job_positions?.type && (
                    <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                      {detailApp.job_positions.type.replace("-", " ")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Cover letter */}
              {detailApp.cover_letter && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Cover Letter
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border">
                    {detailApp.cover_letter}
                  </p>
                </div>
              )}

              {/* CV */}
              {detailApp.cv_url && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => downloadCv(detailApp.cv_url)}
                >
                  <Download className="h-4 w-4" /> Download CV
                </Button>
              )}

              {/* Dates */}
              <div className="flex gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                <span>
                  Applied: {new Date(detailApp.created_at).toLocaleDateString("en-KE", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                {detailApp.updated_at !== detailApp.created_at && (
                  <span>
                    Updated: {new Date(detailApp.updated_at).toLocaleDateString("en-KE", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Quick status update */}
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Update Status
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {APP_STATUSES.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          updateAppStatus.mutate({ id: detailApp.id, status: s });
                          setDetailApp({ ...detailApp, status: s });
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${detailApp.status === s
                            ? cfg.color
                            : "border-border text-muted-foreground hover:border-foreground/40"
                          }`}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCareers;
