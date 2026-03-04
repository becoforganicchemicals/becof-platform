import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Activity, Search, Eye, RefreshCw, Plus, Pencil, Trash2,
  ShieldAlert, Clock, Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Action type → colour + icon ──────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  INSERT: { color: "text-green-600 bg-green-50 border-green-200", icon: Plus },
  UPDATE: { color: "text-blue-600 bg-blue-50 border-blue-200", icon: Pencil },
  DELETE: { color: "text-red-600 bg-red-50 border-red-200", icon: Trash2 },
};

const getActionConfig = (action: string) => {
  const upper = action.toUpperCase();
  if (upper.includes("INSERT") || upper.includes("CREATE") || upper.includes("ADD")) return ACTION_CONFIG.INSERT;
  if (upper.includes("DELETE") || upper.includes("REMOVE") || upper.includes("DROP")) return ACTION_CONFIG.DELETE;
  return ACTION_CONFIG.UPDATE;
};

const ActionBadge = ({ action }: { action: string }) => {
  const cfg = getActionConfig(action);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {action}
    </span>
  );
};

// ── Pretty-print JSON diff ───────────────────────────────────────────────────
const JsonDiff = ({ before, after }: { before: any; after: any }) => {
  const keys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]));

  return (
    <div className="space-y-1 font-mono text-xs">
      {keys.map(key => {
        const bVal = JSON.stringify(before?.[key]);
        const aVal = JSON.stringify(after?.[key]);
        const changed = bVal !== aVal;
        return (
          <div key={key} className={`flex gap-2 p-1 rounded ${changed ? "bg-yellow-50" : ""}`}>
            <span className="text-muted-foreground w-36 shrink-0 truncate">{key}</span>
            {changed ? (
              <div className="flex flex-col gap-0.5">
                {before?.[key] !== undefined && (
                  <span className="text-red-600 line-through">{bVal}</span>
                )}
                {after?.[key] !== undefined && (
                  <span className="text-green-600">{aVal}</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{aVal}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AdminActivityLogs = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [detailLog, setDetailLog] = useState<any>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Unique tables for filter
  const tables = Array.from(new Set(logs.map(l => l.target_table).filter(Boolean)));

  // Filter
  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_table?.toLowerCase().includes(search.toLowerCase());
    const matchTable = tableFilter === "all" || log.target_table === tableFilter;
    const matchAction = actionFilter === "all" || getActionConfig(log.action ?? "").icon === getActionConfig(actionFilter).icon;
    return matchSearch && matchTable && matchAction;
  });

  // Stats
  const inserts = logs.filter(l => getActionConfig(l.action ?? "").icon === Plus).length;
  const updates = logs.filter(l => getActionConfig(l.action ?? "").icon === Pencil).length;
  const deletes = logs.filter(l => getActionConfig(l.action ?? "").icon === Trash2).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5" /> Audit Trail
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({logs.length} entries)
          </span>
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Creates", count: inserts, icon: Plus, color: "text-green-600 bg-green-50" },
          { label: "Updates", count: updates, icon: Pencil, color: "text-blue-600 bg-blue-50" },
          { label: "Deletes", count: deletes, icon: Trash2, color: "text-red-600 bg-red-50" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search admin, action, table…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {tables.map(t => (
              <SelectItem key={t} value={t!}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="INSERT">Creates</SelectItem>
            <SelectItem value="UPDATE">Updates</SelectItem>
            <SelectItem value="DELETE">Deletes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Timestamp
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Admin
                  </div>
                </TableHead>
                <TableHead>Action</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" /> Table
                  </div>
                </TableHead>
                <TableHead>Target ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No activity logged yet</p>
                  </TableCell>
                </TableRow>
              ) : filtered.map(log => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    <div>{new Date(log.created_at).toLocaleDateString("en-KE")}</div>
                    <div className="font-mono">{new Date(log.created_at).toLocaleTimeString("en-KE")}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{log.admin_email || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action || "—"} />
                  </TableCell>
                  <TableCell>
                    {log.target_table ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.target_table}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.target_id ? `${log.target_id.slice(0, 8)}…` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.ip_address ? String(log.ip_address) : "—"}
                  </TableCell>
                  <TableCell>
                    {(log.before_data || log.after_data) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDetailLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Detail
            </DialogTitle>
            <DialogDescription>
              {detailLog && (
                <span className="text-xs">
                  {detailLog.admin_email} · {new Date(detailLog.created_at).toLocaleString("en-KE")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Action</p>
                  <ActionBadge action={detailLog.action || "—"} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Table</p>
                  <Badge variant="outline" className="font-mono text-xs">
                    {detailLog.target_table || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Target ID</p>
                  <p className="font-mono text-xs">{detailLog.target_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">IP Address</p>
                  <p className="font-mono text-xs">{detailLog.ip_address ? String(detailLog.ip_address) : "—"}</p>
                </div>
              </div>

              {(detailLog.before_data || detailLog.after_data) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Data Changes
                  </p>
                  <div className="bg-muted/40 rounded-lg p-3 border border-border overflow-x-auto">
                    <JsonDiff
                      before={detailLog.before_data}
                      after={detailLog.after_data}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    <span className="text-red-500 line-through mr-3">red = old value</span>
                    <span className="text-green-600">green = new value</span>
                    <span className="ml-3 text-yellow-600">highlighted = changed</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActivityLogs;
