import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, ExternalLink, CheckCircle, XCircle, Clock, Star, MessageSquare, Send } from "lucide-react";

interface Application {
  id: number;
  name: string;
  email: string;
  title: string;
  company: string;
  city: string | null;
  country: string | null;
  sector: string | null;
  bio: string;
  linkedin: string;
  quote: string | null;
  impact: string | null;
  aiScore: number | null;
  aiStatus: string | null;
  aiReasoning: string | null;
  editorialStatus: string;
  editorNotes: string | null;
  wantsMajlis: boolean;
  createdAt: string;
  reviewedAt: string | null;
}

interface StatusCount {
  status: string;
  count: number;
}

const STATUS_TABS = ["all", "pending", "approved", "rejected", "shortlisted"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  shortlisted: "bg-blue-500/20 text-blue-400",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ token?: string; error?: string; alreadyInvited?: boolean; emailSent?: boolean } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications({ status: status !== "all" ? status : undefined, search: search || undefined, page });
      setApplications(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setStatusCounts(data.statusCounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, status, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateApplication(id, { editorialStatus: newStatus, editorNotes: notes || undefined });
      setExpandedId(null);
      setNotes("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteMajlis = async (id: number) => {
    setInviting(true);
    setInviteResult(null);
    try {
      const data = await api.inviteToMajlis(id);
      setInviteResult({ token: data.token, alreadyInvited: !!data.alreadyInvited, emailSent: !!data.emailSent });
    } catch (err) {
      setInviteResult({ error: err instanceof Error ? err.message : "Failed to invite" });
    } finally {
      setInviting(false);
    }
  };

  const getStatusCount = (s: string) => {
    if (s === "all") return statusCounts.reduce((sum, sc) => sum + sc.count, 0);
    return statusCounts.find(sc => sc.status === s)?.count ?? 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold uppercase tracking-wide">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">Review "Join The Voices" submissions</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-3 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
              status === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} ({getStatusCount(tab)})
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">
          Search
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground bg-card border border-border">No applications found</div>
        ) : applications.map(app => (
          <div key={app.id} className="bg-card border border-border">
            <div
              className="p-4 flex items-start justify-between cursor-pointer hover:bg-secondary/20 transition-colors"
              onClick={() => { setExpandedId(expandedId === app.id ? null : app.id); setNotes(app.editorNotes || ""); setInviteResult(null); }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium truncate">{app.name}</h3>
                  <span className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_STYLES[app.editorialStatus] || "bg-gray-500/20 text-gray-400"}`}>
                    {app.editorialStatus}
                  </span>
                  {app.wantsMajlis && (
                    <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 shrink-0">
                      <MessageSquare className="w-3 h-3" /> Majlis
                    </span>
                  )}
                  {app.aiScore !== null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Star className="w-3 h-3" /> AI: {app.aiScore}/100
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{app.title} at {app.company}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {app.country && <span>{app.city ? `${app.city}, ` : ""}{app.country}</span>}
                  {app.sector && <span>· {app.sector}</span>}
                  <span>· {new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {expandedId === app.id && (
              <div className="border-t border-border p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bio</p>
                    <p className="text-sm">{app.bio}</p>
                  </div>
                  <div className="space-y-3">
                    {app.quote && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Quote</p>
                        <p className="text-sm italic">"{app.quote}"</p>
                      </div>
                    )}
                    {app.impact && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Impact</p>
                        <p className="text-sm">{app.impact}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${app.email}`} className="text-sm text-primary hover:underline">{app.email}</a>
                    </div>
                    {app.linkedin && (
                      <div className="mt-1">
                        <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                          {app.linkedin}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {app.aiReasoning && (
                  <div className="bg-background border border-border p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">AI Assessment</p>
                    <p className="text-sm">{app.aiReasoning}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Editor Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    rows={2}
                    placeholder="Add notes..."
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleStatusChange(app.id, "approved")} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm hover:bg-green-700 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => handleStatusChange(app.id, "shortlisted")} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
                    <Clock className="w-3.5 h-3.5" /> Shortlist
                  </button>
                  <button onClick={() => handleStatusChange(app.id, "rejected")} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm hover:bg-red-700 transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  {app.wantsMajlis && (
                    <button
                      onClick={() => handleInviteMajlis(app.id)}
                      disabled={inviting || !!(inviteResult && inviteResult.token && expandedId === app.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 ml-auto"
                    >
                      <Send className="w-3.5 h-3.5" /> {inviting ? "Inviting..." : inviteResult?.token && expandedId === app.id ? "Invited" : "Invite to Majlis"}
                    </button>
                  )}
                </div>
                {inviteResult && expandedId === app.id && (
                  <div className={`text-sm px-3 py-2 ${inviteResult.token ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {inviteResult.token ? (
                      <>
                        {inviteResult.alreadyInvited ? "Already invited." : "Invite created."} Code: <span className="font-mono font-bold">{inviteResult.token}</span>
                        {!inviteResult.emailSent && <span className="text-yellow-400 ml-2">(email not sent — RESEND_API_KEY not configured)</span>}
                      </>
                    ) : inviteResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-secondary text-secondary-foreground disabled:opacity-30 hover:bg-secondary/80 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-secondary text-secondary-foreground disabled:opacity-30 hover:bg-secondary/80 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
