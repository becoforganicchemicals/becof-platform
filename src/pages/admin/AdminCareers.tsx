import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Briefcase, Download, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const statusOptions = ["pending", "reviewed", "shortlisted", "rejected", "hired"];

const AdminCareers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [jobForm, setJobForm] = useState({ title: "", department: "", location: "", type: "full-time", description: "", requirements: "", is_active: true });
  const [statusFilter, setStatusFilter] = useState("all");

  // Jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_positions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertJob = useMutation({
    mutationFn: async (job: any) => {
      const payload = {
        title: job.title, department: job.department || null,
        location: job.location || null, type: job.type,
        description: job.description || null, requirements: job.requirements || null,
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
      resetJobForm();
      toast({ title: "Job position saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Applications
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("career_applications").select("*, job_positions(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateAppStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("career_applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      toast({ title: "Application status updated" });
    },
  });

  const downloadCv = async (cvPath: string) => {
    const { data, error } = await supabase.storage.from("career-cvs").createSignedUrl(cvPath, 3600);
    if (error) {
      toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const resetJobForm = () => {
    setJobForm({ title: "", department: "", location: "", type: "full-time", description: "", requirements: "", is_active: true });
    setEditingJob(null);
  };

  const openEditJob = (j: any) => {
    setEditingJob(j);
    setJobForm({
      title: j.title, department: j.department || "", location: j.location || "",
      type: j.type, description: j.description || "", requirements: j.requirements || "",
      is_active: j.is_active,
    });
    setJobDialogOpen(true);
  };

  const filteredApps = statusFilter === "all" ? applications : applications.filter(a => a.status === statusFilter);

  return (
    <div className="space-y-8">
      {/* Job Positions Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5" /> Job Positions ({jobs.length})</h2>
          <Dialog open={jobDialogOpen} onOpenChange={(o) => { setJobDialogOpen(o); if (!o) resetJobForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Position</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingJob ? "Edit Position" : "New Position"}</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); upsertJob.mutate({ ...jobForm, id: editingJob?.id }); }} className="space-y-4">
                <div><Label>Title *</Label><Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Department</Label><Input value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} /></div>
                  <div><Label>Location</Label><Input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={jobForm.type} onValueChange={v => setJobForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea rows={3} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><Label>Requirements</Label><Textarea rows={3} value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} /></div>
                <div className="flex items-center gap-3"><Label>Active</Label><Switch checked={jobForm.is_active} onCheckedChange={c => setJobForm(f => ({ ...f, is_active: c }))} /></div>
                <Button type="submit" className="w-full" disabled={upsertJob.isPending}>
                  {upsertJob.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingJob ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(j => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.title}</TableCell>
                    <TableCell className="text-muted-foreground">{j.department || "—"}</TableCell>
                    <TableCell className="capitalize">{j.type}</TableCell>
                    <TableCell><Badge variant={j.is_active ? "default" : "secondary"}>{j.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditJob(j)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Applications Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Applications ({filteredApps.length})</h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CV</TableHead>
                  <TableHead>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingApps ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredApps.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{(app as any).job_positions?.title || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{app.email}</TableCell>
                    <TableCell><Badge className="capitalize">{app.status}</Badge></TableCell>
                    <TableCell>
                      {app.cv_url ? (
                        <Button variant="ghost" size="sm" onClick={() => downloadCv(app.cv_url!)}>
                          <Download className="h-4 w-4 mr-1" /> CV
                        </Button>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Select value={app.status} onValueChange={v => updateAppStatus.mutate({ id: app.id, status: v })}>
                        <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCareers;
