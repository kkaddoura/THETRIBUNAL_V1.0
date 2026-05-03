import { useState, useEffect, useRef, useCallback } from "react"
import { Layout } from "@/components/layout/Layout"
import { useLocation, Link } from "wouter"
import { Send, Users, LogOut, ChevronDown, Shield, ArrowDown, ArrowRight, MessageSquare, Hash, Mail, Plus, X, Menu, Lock, BarChart3, TrendingUp, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePageTitle } from "@/hooks/use-page-title"

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? ""

interface MajlisUser {
  id: number
  displayName: string
  email: string
  profileId: number
  profile?: {
    name: string
    role: string
    company: string | null
    imageUrl: string | null
    isVerified: boolean
  }
}

interface Message {
  id: number
  content: string
  replyToId: number | null
  isEdited: boolean
  createdAt: string
  userId: number
  userName: string
  profileId: number
  profileName: string
  profileRole: string
  profileCompany: string | null
  profileImage: string | null
  profileVerified: boolean
}

interface Member {
  id: number
  displayName: string
  profileId: number
  isOnline: boolean
  profileName: string
  profileRole: string
  profileCompany: string | null
  profileImage: string | null
  profileVerified: boolean
  profileCountry: string
  isMuted?: boolean
}

interface Channel {
  id: number
  name: string
  type: string
  isDefault: boolean
  displayName: string
  createdAt: string
  createdBy: number | null
  lastMessage: { content: string; userName: string; createdAt: string } | null
  unreadCount: number
}

function getUser(): MajlisUser | null {
  try {
    const raw = localStorage.getItem("majlis_user")
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getToken(): string | null {
  return localStorage.getItem("majlis_token")
}

function apiHeaders(): Record<string, string> {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-majlis-token": token } : {}),
  }
}

interface SharedContent {
  type: "debate" | "prediction" | "pulse"
  id: string
  title: string
  stat?: string
  category?: string
}

function parseSharedContent(content: string): { text: string; shared: SharedContent | null } {
  const shareRegex = /\[share:(debate|prediction|pulse):(\d+)\|([^\]]+)\]/
  const match = content.match(shareRegex)
  if (!match) return { text: content, shared: null }
  const text = content.replace(shareRegex, "").trim()
  const [, type, id, payload] = match
  const parts = payload.split("|")
  return {
    text,
    shared: {
      type: type as SharedContent["type"],
      id,
      title: parts[0] || "",
      stat: parts[1],
      category: parts[2],
    },
  }
}

function SharedCard({ shared }: { shared: SharedContent }) {
  const colorMap = { debate: "#DC143C", prediction: "#3B82F6", pulse: "#10B981" }
  const iconMap = { debate: BarChart3, prediction: TrendingUp, pulse: Activity }
  const linkMap = { debate: `/debates/${shared.id}`, prediction: `/predictions`, pulse: `/pulse` }
  const labelMap = { debate: "DEBATE", prediction: "PREDICTION", pulse: "PULSE" }
  const Icon = iconMap[shared.type]
  const color = colorMap[shared.type]

  return (
    <Link href={linkMap[shared.type]}>
      <div
        className="mt-2 border rounded p-3 cursor-pointer hover:bg-muted/50 transition-colors max-w-md"
        style={{ borderColor: `${color}40` }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[8px] font-serif font-bold uppercase tracking-[0.2em]" style={{ color }}>
            {labelMap[shared.type]}
          </span>
          {shared.category && (
            <span className="text-[8px] font-serif uppercase tracking-wider text-muted-foreground">
              · {shared.category}
            </span>
          )}
        </div>
        <p className="font-serif font-black uppercase text-[12px] leading-tight text-foreground">
          {shared.title}
        </p>
        {shared.stat && (
          <p className="text-[10px] mt-1 font-serif" style={{ color }}>
            {shared.stat}
          </p>
        )}
      </div>
    </Link>
  )
}

function MessageBubble({ message, isOwn, onReply, isDeleted }: { message: Message; isOwn: boolean; onReply: (m: Message) => void; isDeleted?: boolean }) {
  const initials = message.profileName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const { text, shared } = parseSharedContent(message.content)

  return (
    <div className={cn("flex gap-3 group px-4 py-2 hover:bg-muted/30 transition-colors", isOwn && "flex-row-reverse")}>
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-border">
        {message.profileImage ? (
          <img src={message.profileImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
            {initials}
          </div>
        )}
      </div>
      <div className={cn("flex-1 min-w-0", isOwn && "text-right")}>
        <div className={cn("flex items-baseline gap-2 mb-0.5", isOwn && "flex-row-reverse")}>
          <span className="text-xs font-bold text-foreground">{message.profileName}</span>
          {message.profileVerified && <Shield className="w-3 h-3 text-primary flex-shrink-0" />}
          <span className="text-[9px] text-muted-foreground font-serif uppercase tracking-wider">
            {message.profileRole}{message.profileCompany ? ` · ${message.profileCompany}` : ""}
          </span>
          <span className="text-[9px] text-muted-foreground/50">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {isDeleted ? (
          <p className={cn("text-sm text-muted-foreground/50 italic leading-relaxed", isOwn && "text-right")}>
            This message was deleted
          </p>
        ) : (
          <>
            {text && (
              <p className={cn("text-sm text-foreground/90 leading-relaxed break-words", isOwn && "text-right")}>
                {text}
              </p>
            )}
            {shared && <SharedCard shared={shared} />}
            <button
              onClick={() => onReply(message)}
              className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground hover:text-primary transition-all font-serif uppercase tracking-wider mt-0.5"
            >
              Reply
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ChannelSidebar({
  channels, activeChannelId, onSelect, onCreateGroup, show, onClose
}: {
  channels: Channel[]
  activeChannelId: number | null
  onSelect: (id: number) => void
  onCreateGroup: () => void
  show: boolean
  onClose: () => void
}) {
  const groups = channels.filter(c => c.type === "group")
  const dms = channels.filter(c => c.type === "dm")

  return (
    <>
      {show && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <div className={cn(
        "w-72 border-r border-border bg-card flex-shrink-0 flex flex-col overflow-hidden z-50",
        "fixed lg:relative inset-y-0 left-0 transition-transform duration-200",
        show ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Channels
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateGroup}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Create Group"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 text-[9px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Groups
              </p>
              {groups.map(ch => (
                <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onSelect={onSelect} />
              ))}
            </div>
          )}
          {dms.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 text-[9px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Direct Messages
              </p>
              {dms.map(ch => (
                <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onSelect={onSelect} />
              ))}
            </div>
          )}
          {channels.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No channels yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ChannelItem({ channel, active, onSelect }: { channel: Channel; active: boolean; onSelect: (id: number) => void }) {
  return (
    <button
      onClick={() => onSelect(channel.id)}
      className={cn(
        "w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-muted/30 transition-colors",
        active && "bg-primary/10 border-r-2 border-primary"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {channel.type === "dm" ? (
          <Mail className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Hash className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs font-medium truncate", active ? "text-foreground" : "text-foreground/80")}>
            {channel.displayName}
          </span>
          {channel.unreadCount > 0 && (
            <span className="flex-shrink-0 w-5 h-5 bg-primary text-white text-[9px] font-bold flex items-center justify-center rounded-full">
              {channel.unreadCount > 9 ? "9+" : channel.unreadCount}
            </span>
          )}
        </div>
        {channel.lastMessage && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            <span className="font-medium">{channel.lastMessage.userName}:</span> {channel.lastMessage.content}
          </p>
        )}
      </div>
    </button>
  )
}

function MembersSidebar({ members, show, onClose, onDm, currentUserId }: {
  members: Member[]
  show: boolean
  onClose: () => void
  onDm: (memberId: number) => void
  currentUserId: number
}) {
  const online = members.filter(m => m.isOnline)
  const offline = members.filter(m => !m.isOnline)

  return (
    <div className={cn(
      "w-72 border-l border-border bg-card flex-shrink-0 flex flex-col overflow-hidden transition-all",
      show ? "block" : "hidden lg:block"
    )}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Members ({members.length})
        </h3>
        <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {online.length > 0 && (
          <>
            <p className="px-2 py-1 text-[9px] font-serif font-bold uppercase tracking-[0.2em] text-green-400">
              Online — {online.length}
            </p>
            {online.map(m => (
              <MemberItem key={m.id} member={m} onDm={onDm} isCurrentUser={m.id === currentUserId} />
            ))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="px-2 py-1 text-[9px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground mt-3">
              Offline — {offline.length}
            </p>
            {offline.map(m => (
              <MemberItem key={m.id} member={m} onDm={onDm} isCurrentUser={m.id === currentUserId} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function MemberItem({ member, onDm, isCurrentUser }: { member: Member; onDm: (id: number) => void; isCurrentUser: boolean }) {
  const initials = member.profileName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-muted/30 transition-colors group">
      <div className="relative flex-shrink-0">
        <div className="w-7 h-7 rounded-full overflow-hidden border border-border">
          {member.profileImage ? (
            <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
              {initials}
            </div>
          )}
        </div>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
          member.isOnline ? "bg-green-400" : "bg-muted-foreground/30"
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-foreground truncate">{member.profileName}</span>
          {member.profileVerified && <Shield className="w-2.5 h-2.5 text-primary flex-shrink-0" />}
        </div>
        <span className="text-[9px] text-muted-foreground truncate block">
          {member.profileRole}{member.profileCountry ? ` · ${member.profileCountry}` : ""}
        </span>
      </div>
      {!isCurrentUser && (
        <button
          onClick={() => onDm(member.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-primary transition-all flex-shrink-0"
          title={`Message ${member.profileName}`}
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function CreateGroupModal({ members, onClose, onSubmit }: {
  members: Member[]
  onClose: () => void
  onSubmit: (name: string, memberIds: number[]) => void
}) {
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-display font-bold uppercase tracking-tight text-foreground">
            Create Group Channel
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Founders Circle"
              className="w-full bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-serif font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
              Add Members ({selected.size} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-border p-2">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="accent-primary"
                  />
                  <span className="text-xs text-foreground">{m.profileName}</span>
                  <span className="text-[9px] text-muted-foreground">{m.profileRole}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={() => { if (name.trim()) onSubmit(name.trim(), Array.from(selected)) }}
            disabled={!name.trim()}
            className="w-full bg-primary text-white font-serif font-bold uppercase tracking-[0.2em] text-xs py-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Create Channel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Majlis() {
  usePageTitle({
    title: "The Majlis",
    description: "A private community for MENA's sharpest voices. Discuss, share, and shape the debate behind closed doors.",
  });
  const [, navigate] = useLocation()
  const [user, setUser] = useState<MajlisUser | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [input, setInput] = useState("")
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [sharePreview, setSharePreview] = useState<{ type: string; title: string; stat: string; category: string; shareString: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = getToken()
    const u = getUser()
    if (!token || !u) {
      return
    }
    setUser(u)

    fetch(`${API_BASE}/api/majlis/auth/verify`, { method: "POST", headers: apiHeaders() })
      .then(r => {
        if (!r.ok) {
          localStorage.removeItem("majlis_token")
          localStorage.removeItem("majlis_user")
          setUser(null)
        }
      })
      .catch(() => {})
  }, [navigate])

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/majlis/channels`, { headers: apiHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setChannels(data.channels)
      if (!activeChannelId && data.channels.length > 0) {
        setActiveChannelId(data.channels[0].id)
      }
    } catch {}
  }, [activeChannelId])

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/majlis/members`, { headers: apiHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setMembers(data.members)
    } catch {}
  }, [])

  const loadMessages = useCallback(async (channelId: number) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`${API_BASE}/api/majlis/channels/${channelId}/messages`, { headers: apiHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      }, 50)
    } catch {}
    setLoadingMessages(false)
  }, [])

  useEffect(() => {
    if (user) {
      loadChannels()
      loadMembers()
    }
  }, [user, loadChannels, loadMembers])

  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId)
    }
  }, [activeChannelId, loadMessages])

  useEffect(() => {
    if (!activeChannelId) return

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = setInterval(async () => {
      if (!activeChannelId) return
      const lastId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) : 0
      try {
        const res = await fetch(
          `${API_BASE}/api/majlis/channels/${activeChannelId}/messages/poll?after=${lastId}`,
          { headers: apiHeaders() }
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id))
            if (newMsgs.length === 0) return prev
            if (!isAtBottomRef.current) {
              setNewMsgCount(c => c + newMsgs.length)
            }
            return [...prev, ...newMsgs]
          })
          if (isAtBottomRef.current) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
          }
        }
      } catch {}
    }, 3000)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [activeChannelId, messages])

  useEffect(() => {
    if (channelPollRef.current) clearInterval(channelPollRef.current)

    channelPollRef.current = setInterval(() => {
      loadChannels()
    }, 10000)

    return () => {
      if (channelPollRef.current) clearInterval(channelPollRef.current)
    }
  }, [loadChannels])

  useEffect(() => {
    if (user) {
      const currentMember = members.find(m => m.id === user.id)
      setIsMuted(currentMember?.isMuted ?? false)
    }
  }, [members, user])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    setNewMsgCount(0)
  }, [])

  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const threshold = 100
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
    isAtBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
    if (atBottom) setNewMsgCount(0)
  }, [])

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    const pollMatch = text.match(/\/debates\/(\d+)/)
    const predMatch = text.match(/\/predictions\/(\d+)/)
    if (!pollMatch && !predMatch) return

    const type = pollMatch ? "debate" : "prediction"
    const id = pollMatch ? pollMatch[1] : predMatch![1]

    try {
      const res = await fetch(`${API_BASE}/api/majlis/share-preview?type=${type}&id=${id}`, { headers: apiHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setSharePreview(data)
      e.preventDefault()
      setInput(data.shareString)
    } catch {}
  }

  const clearSharePreview = () => {
    setSharePreview(null)
    setInput("")
  }

  const handleSend = async () => {
    if (!input.trim() || sending || !user || !activeChannelId) return
    if (isMuted) return
    setSending(true)

    try {
      const res = await fetch(`${API_BASE}/api/majlis/channels/${activeChannelId}/messages`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ content: input.trim(), replyToId: replyTo?.id ?? null }),
      })

      if (!res.ok) {
        const data = await res.json()
        console.error(data.error)
        setSending(false)
        return
      }

      const data = await res.json()
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        if (existingIds.has(data.message.id)) return prev
        return [...prev, data.message]
      })
      setInput("")
      setReplyTo(null)
      setSharePreview(null)
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      console.error(err)
    }
    setSending(false)
  }

  const handleDm = async (memberId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/majlis/channels`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ type: "dm", memberIds: [memberId] }),
      })
      if (!res.ok) return
      const data = await res.json()
      await loadChannels()
      setActiveChannelId(data.channel.id)
      setShowMembers(false)
    } catch {}
  }

  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    try {
      const res = await fetch(`${API_BASE}/api/majlis/channels`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ name, type: "group", memberIds }),
      })
      if (!res.ok) return
      const data = await res.json()
      await loadChannels()
      setActiveChannelId(data.channel.id)
      setShowCreateGroup(false)
    } catch {}
  }

  const handleLogout = () => {
    localStorage.removeItem("majlis_token")
    localStorage.removeItem("majlis_user")
    navigate("/majlis/login")
  }

  const activeChannel = channels.find(c => c.id === activeChannelId)
  const onlineCount = members.filter(m => m.isOnline).length

  const hasApplied = typeof window !== "undefined" && localStorage.getItem("tmh_applied") === "1"

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-20 max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-14 h-14 border-2 border-primary/30 mb-6">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-display font-black text-2xl uppercase tracking-tight text-foreground mb-2">
            The Majlis is Invite-Only
          </h2>
          {hasApplied ? (
            <p className="text-sm text-muted-foreground">
              Your application is being reviewed. You'll hear back within 48 hours.{" "}
              Need help?{" "}
              <a href="mailto:hello@themiddleeasthustle.com" className="text-primary underline">
                Contact support
              </a>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A private space for verified voices across MENA.{" "}
              <a href="/apply?ref=majlis" className="text-primary underline">Apply to join</a>.
            </p>
          )}

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-serif mb-3">Already a member?</p>
            <a
              href="/majlis/login"
              className="inline-flex items-center gap-2 bg-primary text-white font-serif font-bold uppercase tracking-[0.2em] text-xs px-8 py-3 hover:bg-primary/90 transition-colors"
            >
              Login <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="font-display text-lg font-black uppercase tracking-tight text-foreground leading-none">
              The Majlis<span className="text-primary">.</span>
            </h1>
            <span className="text-[9px] font-serif uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline">
              المجلس
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[9px] font-serif text-muted-foreground">
                {onlineCount} online
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Users className="w-4 h-4" />
            </button>
            <span className="text-[9px] text-muted-foreground font-serif hidden sm:inline">{user.displayName}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Leave The Majlis"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <ChannelSidebar
            channels={channels}
            activeChannelId={activeChannelId}
            onSelect={(id) => { setActiveChannelId(id); setShowSidebar(false) }}
            onCreateGroup={() => setShowCreateGroup(true)}
            show={showSidebar}
            onClose={() => setShowSidebar(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 relative">
            {activeChannel && (
              <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-2">
                {activeChannel.type === "dm" ? (
                  <Mail className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Hash className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">{activeChannel.displayName}</span>
              </div>
            )}

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-4 space-y-0.5 relative"
              onScroll={checkIfAtBottom}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-4" />
                  <h3 className="font-display text-xl font-black uppercase text-foreground mb-1">
                    {activeChannel ? `Welcome to ${activeChannel.displayName}` : "Welcome to The Majlis"}<span className="text-primary">.</span>
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {activeChannel?.type === "dm" ? "Start a private conversation." : "Start the conversation."}
                  </p>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.userId === user.id}
                    onReply={setReplyTo}
                    isDeleted={false}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {showScrollBtn && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={scrollToBottom}
                  className="flex items-center gap-1.5 bg-primary text-white text-[10px] font-serif font-bold uppercase tracking-wider px-3 py-1.5 shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <ArrowDown className="w-3 h-3" />
                  {newMsgCount > 0 ? `${newMsgCount} new` : "Latest"}
                </button>
              </div>
            )}

            <div className="border-t border-border p-3 flex-shrink-0 bg-card/30">
              {isMuted && (
                <div className="mb-2 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 text-xs text-yellow-400">
                  You are currently muted. You can read messages but cannot send.
                </div>
              )}
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-primary/5 border-l-2 border-primary">
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">
                    Replying to <span className="text-foreground font-bold">{replyTo.profileName}</span>: {replyTo.content}
                  </span>
                  <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground text-xs">
                    ✕
                  </button>
                </div>
              )}
              {sharePreview && (
                <div className="mb-2 flex items-start gap-2 px-2 py-2 bg-muted/30 border border-border rounded">
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-serif font-bold uppercase tracking-[0.2em] text-primary">
                      {sharePreview.type === "debate" ? "DEBATE" : "PREDICTION"}
                    </span>
                    <p className="text-xs font-serif font-bold text-foreground truncate">{sharePreview.title}</p>
                    <span className="text-[10px] text-muted-foreground">{sharePreview.stat} · {sharePreview.category}</span>
                  </div>
                  <button onClick={clearSharePreview} className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0 p-1">✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value); if (!e.target.value.trim()) setSharePreview(null) }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  onPaste={handlePaste}
                  placeholder={isMuted ? "You are muted" : "Type your message..."}
                  maxLength={2000}
                  disabled={isMuted || !activeChannelId}
                  className="flex-1 bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending || isMuted || !activeChannelId}
                  className="bg-primary text-white px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <MembersSidebar
            members={members}
            show={showMembers}
            onClose={() => setShowMembers(false)}
            onDm={handleDm}
            currentUserId={user.id}
          />
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          members={members.filter(m => m.id !== user.id)}
          onClose={() => setShowCreateGroup(false)}
          onSubmit={handleCreateGroup}
        />
      )}
    </Layout>
  )
}
