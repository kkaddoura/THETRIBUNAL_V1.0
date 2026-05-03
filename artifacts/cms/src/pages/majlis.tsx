import { useState, useEffect } from "react";
import { MessageSquare, Users, Ban, VolumeX, CheckCircle, Trash2, RefreshCw, Shield, Mail, Copy, Plus } from "lucide-react";
import { api } from "@/lib/api";

interface MajlisUser {
  id: number;
  email: string;
  displayName: string;
  profileId: number;
  isActive: boolean;
  isBanned: boolean;
  isMuted: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  profileName: string;
  profileRole: string;
  profileCompany: string | null;
  profileImage: string | null;
}

interface MajlisMessage {
  id: number;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  userId: number;
  userName: string;
  profileName: string;
}

interface MajlisInvite {
  id: number;
  profileId: number;
  token: string;
  email: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  profileName: string;
}

interface Stats {
  userCount: number;
  messageCount: number;
  activeCount: number;
  bannedCount: number;
}

export default function MajlisPage() {
  const [tab, setTab] = useState<"users" | "messages" | "invites">("users");
  const [users, setUsers] = useState<MajlisUser[]>([]);
  const [messages, setMessages] = useState<MajlisMessage[]>([]);
  const [invites, setInvites] = useState<MajlisInvite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteProfileId, setInviteProfileId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, messagesData, invitesData] = await Promise.all([
        api.getMajlisStats(),
        api.getMajlisUsers(),
        api.getMajlisMessages(100),
        api.getMajlisInvites(),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setMessages(messagesData.messages);
      setInvites(invitesData.invites);
    } catch (err) {
      console.error("Failed to load majlis data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleUser = async (id: number, field: "isActive" | "isBanned" | "isMuted", value: boolean) => {
    try {
      await api.updateMajlisUser(id, { [field]: value });
      loadData();
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const deleteMessage = async (id: number) => {
    if (!confirm("Delete this message?")) return;
    try {
      await api.deleteMajlisMessage(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const createInvite = async () => {
    setInviteError("");
    setGeneratedCode(null);
    setCopiedGenerated(false);
    if (!inviteProfileId || !inviteEmail) {
      setInviteError("Profile ID and email are required");
      return;
    }
    setInviteLoading(true);
    try {
      const data = await api.createMajlisInvite({ profileId: parseInt(inviteProfileId), email: inviteEmail });
      setInviteProfileId("");
      setInviteEmail("");
      setGeneratedCode(data.invite?.token || null);
      loadData();
    } catch (err) {
      setInviteError("Failed to create invite. Voice must be verified and not already registered.");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyGeneratedCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopiedGenerated(true);
      setTimeout(() => setCopiedGenerated(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = generatedCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedGenerated(true);
      setTimeout(() => setCopiedGenerated(false), 2000);
    }
  };

  const copyToken = async (invite: MajlisInvite) => {
    try {
      await navigator.clipboard.writeText(invite.token);
      setCopiedToken(invite.id);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = invite.token;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedToken(invite.id);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            The Majlis<span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage private chat room for Voices</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 border border-border hover:border-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.userCount} />
          <StatCard icon={MessageSquare} label="Messages" value={stats.messageCount} />
          <StatCard icon={CheckCircle} label="Active" value={stats.activeCount} color="text-green-400" />
          <StatCard icon={Ban} label="Banned" value={stats.bannedCount} color="text-red-400" />
        </div>
      )}

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setTab("invites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "invites" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Invites ({invites.length})
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "messages" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Messages ({messages.length})
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : tab === "invites" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Issue invite codes to verified Voices for Majlis registration</p>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Invite
            </button>
          </div>

          {showInviteForm && (
            <div className="border border-border p-4 space-y-3">
              {generatedCode ? (
                <>
                  <h3 className="text-sm font-bold text-green-400">Invite Created Successfully</h3>
                  <div className="flex items-center gap-3 bg-secondary/30 border border-border p-3">
                    <code className="text-sm font-mono text-foreground flex-1 tracking-wider">{generatedCode}</code>
                    <button
                      onClick={copyGeneratedCode}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 border border-border hover:border-foreground"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedGenerated ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this code with the Voice to complete registration. Expires in 7 days.</p>
                  <button
                    onClick={() => { setShowInviteForm(false); setGeneratedCode(null); setCopiedGenerated(false); }}
                    className="text-sm text-muted-foreground hover:text-foreground px-4 py-1.5 border border-border"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-foreground">New Invite</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Voice Profile ID</label>
                      <input
                        type="number"
                        value={inviteProfileId}
                        onChange={e => setInviteProfileId(e.target.value)}
                        placeholder="e.g. 219"
                        className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        placeholder="voice@email.com"
                        className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  {inviteError && (
                    <p className="text-xs text-red-400">{inviteError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={createInvite}
                      disabled={inviteLoading}
                      className="text-sm bg-primary text-white px-4 py-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {inviteLoading ? "Creating..." : "Send Invite"}
                    </button>
                    <button
                      onClick={() => { setShowInviteForm(false); setInviteError(""); setGeneratedCode(null); }}
                      className="text-sm text-muted-foreground hover:text-foreground px-4 py-1.5 border border-border"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Voice</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Expires</th>
                  <th className="text-right px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Invite Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invites.map(inv => (
                  <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{inv.profileName}</span>
                      <span className="text-xs text-muted-foreground block">Profile #{inv.profileId}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.email}</td>
                    <td className="px-4 py-3">
                      {inv.isUsed ? (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">USED</span>
                      ) : new Date(inv.expiresAt) < new Date() ? (
                        <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded">EXPIRED</span>
                      ) : (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">PENDING</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!inv.isUsed && new Date(inv.expiresAt) >= new Date() && (
                        <button
                          onClick={() => copyToken(inv)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border hover:border-foreground"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedToken === inv.id ? "Copied!" : "Copy Code"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {invites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-8">No invites yet. Create one to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "users" ? (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Seen</th>
                <th className="text-right px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                          {u.profileName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-foreground">{u.profileName}</span>
                        <span className="text-xs text-muted-foreground block">{u.profileRole}{u.profileCompany ? ` · ${u.profileCompany}` : ""}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {u.isBanned && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">BANNED</span>}
                      {u.isMuted && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">MUTED</span>}
                      {u.isActive && !u.isBanned && !u.isMuted && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">ACTIVE</span>}
                      {!u.isActive && <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded">INACTIVE</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleUser(u.id, "isBanned", !u.isBanned)}
                        className={`p-1.5 rounded transition-colors ${u.isBanned ? "text-red-400 hover:bg-red-400/10" : "text-muted-foreground hover:bg-secondary"}`}
                        title={u.isBanned ? "Unban" : "Ban"}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleUser(u.id, "isMuted", !u.isMuted)}
                        className={`p-1.5 rounded transition-colors ${u.isMuted ? "text-yellow-400 hover:bg-yellow-400/10" : "text-muted-foreground hover:bg-secondary"}`}
                        title={u.isMuted ? "Unmute" : "Mute"}
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleUser(u.id, "isActive", !u.isActive)}
                        className={`p-1.5 rounded transition-colors ${u.isActive ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-secondary"}`}
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">No Majlis users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
            <div key={m.id} className={`flex items-start justify-between gap-4 p-3 border border-border hover:bg-secondary/10 transition-colors ${m.isDeleted ? "opacity-40" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{m.profileName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
                  {m.isDeleted && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">DELETED</span>}
                </div>
                <p className="text-sm text-foreground/80 break-words">{m.content}</p>
              </div>
              {!m.isDeleted && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No messages yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color?: string }) {
  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}
