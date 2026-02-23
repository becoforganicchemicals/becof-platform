import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Mail, MailOpen, Search, RefreshCw, Trash2,
    ExternalLink, Phone, Tag, Clock, CheckCheck,
    Inbox, Circle,
} from "lucide-react";

/* ─── types ─── */
interface ContactMessage {
    id: string;
    name: string;
    email: string;
    phone?: string;
    topic?: string;
    message: string;
    read: boolean;
    replied: boolean;
    created_at: string;
}

type FilterTab = "all" | "unread" | "replied";

/* ══════════════════════════════════════════════════════════════════ */
const AdminInbox = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    /* ─── Fetch messages ─── */
    const { data: messages = [], isLoading, refetch } = useQuery({
        queryKey: ["admin-inbox"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("contact_messages")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as ContactMessage[];
        },
    });

    /* ─── Mark as read ─── */
    const markRead = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("contact_messages").update({ read: true }).eq("id", id);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-inbox"] }),
    });

    /* ─── Mark as replied ─── */
    const markReplied = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("contact_messages")
                .update({ read: true, replied: true })
                .eq("id", id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
            toast({ title: "Marked as replied ✓" });
        },
    });

    /* ─── Delete ─── */
    const deleteMessage = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("contact_messages").delete().eq("id", id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-inbox"] });
            if (selectedId === selectedMessage?.id) setSelectedId(null);
            toast({ title: "Message deleted" });
        },
    });

    /* ─── Select message (auto mark read) ─── */
    const handleSelect = (msg: ContactMessage) => {
        setSelectedId(msg.id);
        if (!msg.read) markRead.mutate(msg.id);
    };

    /* ─── Zoho reply link ─── */
    const zohoReplyUrl = (msg: ContactMessage) => {
        const subject = encodeURIComponent(`Re: ${msg.topic ? `[${msg.topic}] ` : ""}Your message to Becof Organic Chemicals`);
        const body = encodeURIComponent(
            `Dear ${msg.name},\n\nThank you for reaching out to us.\n\n`
        );
        return `https://mail.zoho.com/zm/#compose?to=${encodeURIComponent(msg.email)}&subject=${subject}&body=${body}`;
    };

    /* ─── Computed values ─── */
    const unreadCount = messages.filter(m => !m.read).length;
    const repliedCount = messages.filter(m => m.replied).length;

    const filtered = messages.filter(m => {
        const matchSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase()) ||
            (m.topic || "").toLowerCase().includes(search.toLowerCase()) ||
            m.message.toLowerCase().includes(search.toLowerCase());

        const matchFilter =
            filter === "all" ? true :
                filter === "unread" ? !m.read :
                    filter === "replied" ? m.replied : true;

        return matchSearch && matchFilter;
    });

    const selectedMessage = messages.find(m => m.id === selectedId) || null;

    const formatDate = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    };

    /* ── Tab pill ── */
    const TabPill = ({ id, label, count }: { id: FilterTab; label: string; count: number }) => (
        <button
            onClick={() => setFilter(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
                }`}
        >
            {label}
            {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );

    /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
    return (
        <div className="space-y-6">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Inbox className="h-5 w-5" />
                        Contact Inbox
                        {unreadCount > 0 && (
                            <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {messages.length} total · {unreadCount} unread · {repliedCount} replied
                    </p>
                </div>
                <Button variant="outline" onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* ─── Filters + Search ─── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                    <TabPill id="all" label="All" count={messages.length} />
                    <TabPill id="unread" label="Unread" count={unreadCount} />
                    <TabPill id="replied" label="Replied" count={repliedCount} />
                </div>
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search messages…"
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ─── Main layout: list + detail ─── */}
            <div className="grid lg:grid-cols-5 gap-4 items-start">

                {/* ── Message list ── */}
                <Card className="lg:col-span-2 border-slate-200">
                    <CardHeader className="border-b border-slate-100 py-3 px-4">
                        <CardTitle className="text-sm text-slate-500 font-medium">
                            {filtered.length} message{filtered.length !== 1 ? "s" : ""}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                        {isLoading && (
                            <p className="text-center text-slate-400 py-10 text-sm animate-pulse">Loading…</p>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <div className="text-center py-16 text-slate-400">
                                <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No messages found</p>
                            </div>
                        )}

                        {filtered.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => handleSelect(msg)}
                                className={`px-4 py-3.5 border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selectedId === msg.id
                                        ? "bg-emerald-50 border-l-2 border-l-emerald-500"
                                        : "hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-start gap-2.5">
                                    {/* read/unread dot */}
                                    <div className="mt-1.5 shrink-0">
                                        {msg.read
                                            ? <MailOpen className="h-4 w-4 text-slate-300" />
                                            : <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500 mt-0.5" />
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm truncate ${msg.read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                                                {msg.name}
                                            </p>
                                            <p className="text-xs text-slate-400 shrink-0">{formatDate(msg.created_at)}</p>
                                        </div>

                                        <p className="text-xs text-slate-400 truncate mt-0.5">{msg.email}</p>

                                        {msg.topic && (
                                            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                {msg.topic}
                                            </span>
                                        )}

                                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                            {msg.message}
                                        </p>

                                        {msg.replied && (
                                            <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-emerald-600 font-medium">
                                                <CheckCheck className="h-3 w-3" /> Replied
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* ── Message detail ── */}
                <div className="lg:col-span-3">
                    {!selectedMessage ? (
                        <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-24 text-slate-300">
                            <MailOpen className="h-12 w-12 mb-3 opacity-40" />
                            <p className="text-sm">Select a message to read it</p>
                        </div>
                    ) : (
                        <Card className="border-slate-200">
                            {/* detail header */}
                            <CardHeader className="border-b border-slate-100 pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight">
                                            {selectedMessage.topic || "General Inquiry"}
                                        </h3>
                                        <p className="text-sm text-slate-400 mt-0.5">
                                            {new Date(selectedMessage.created_at).toLocaleDateString("en-GB", {
                                                weekday: "long", day: "numeric", month: "long", year: "numeric",
                                                hour: "2-digit", minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    {/* status badges */}
                                    <div className="flex gap-1.5 shrink-0">
                                        {selectedMessage.read && (
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">Read</span>
                                        )}
                                        {selectedMessage.replied && (
                                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                                                <CheckCheck className="h-3 w-3" /> Replied
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-5 space-y-5">
                                {/* sender info */}
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sender</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-emerald-700 font-bold text-xs">
                                                {selectedMessage.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{selectedMessage.name}</p>
                                            <p className="text-slate-500 text-xs">{selectedMessage.email}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {selectedMessage.phone && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                {selectedMessage.phone}
                                            </div>
                                        )}
                                        {selectedMessage.topic && (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Tag className="h-3.5 w-3.5 text-slate-400" />
                                                {selectedMessage.topic}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                            {formatDate(selectedMessage.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {/* message body */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Message</p>
                                    <div className="bg-white border border-slate-100 rounded-xl p-5">
                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                                            {selectedMessage.message}
                                        </p>
                                    </div>
                                </div>

                                {/* actions */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                    {/* Reply in Zoho — primary action */}
                                    <a
                                        href={zohoReplyUrl(selectedMessage)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                            if (!selectedMessage.replied) markReplied.mutate(selectedMessage.id);
                                        }}
                                    >
                                        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                            <Mail className="h-4 w-4" />
                                            Reply in Zoho Mail
                                            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                        </Button>
                                    </a>

                                    {/* Mark replied manually */}
                                    {!selectedMessage.replied && (
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => markReplied.mutate(selectedMessage.id)}
                                        >
                                            <CheckCheck className="h-4 w-4" />
                                            Mark as Replied
                                        </Button>
                                    )}

                                    {/* Delete */}
                                    <Button
                                        variant="ghost"
                                        className="gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 ml-auto"
                                        onClick={() => {
                                            if (confirm("Delete this message? This cannot be undone.")) {
                                                deleteMessage.mutate(selectedMessage.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>

                                {/* Zoho hint */}
                                <p className="text-xs text-slate-400 text-center pb-1">
                                    Clicking "Reply in Zoho Mail" opens a pre-addressed compose window at{" "}
                                    <span className="font-medium text-slate-500">info@becoforganic.com</span>
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminInbox;