import { useState, useEffect } from "react"
import { Link } from "wouter"
import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Share2, Lock, CheckCircle2, Flame } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useVotePoll } from "@workspace/api-client-react"
import type { Poll, PollOption } from "@workspace/api-client-react"
import { useVoter } from "@/hooks/use-voter"
import { useToast } from "@/hooks/use-toast"
import { useSiteSettings } from "@/hooks/use-cms-data"
import { cn } from "@/lib/utils"
import { PollViewToggle } from "./PollViewToggle"
import { getIpConsent } from "@/components/IpConsentBanner"
import { ShareModal } from "@/components/ShareModal"
import type { DebateShareContext } from "@/lib/share"

interface PollCardProps {
  poll: Poll
  featured?: boolean
}

type Phase = "vote" | "gate" | "results"

function getInitialPhase(pollId: number, hasVoted: (id: number) => boolean, shareGateEnabled?: boolean): Phase {
  if (typeof window === "undefined") return "vote"
  if (!hasVoted(pollId)) return "vote"
  // If share gate is disabled in CMS, skip straight to results
  if (!shareGateEnabled) return "results"
  if (localStorage.getItem(`tmh_unlocked_${pollId}`)) return "results"
  if (localStorage.getItem("tmh_email_submitted")) return "results"
  return "gate"
}

function generateInsight(
  votedPct: number,
  options: PollOption[]
): string {
  const maxPct = Math.max(...options.map(o => o.percentage ?? 0))
  const isMostDivided = maxPct < 35
  const isInMajority = votedPct >= 50
  const isStrong = votedPct >= 65

  if (isMostDivided) return "This is the most divided debate on The Tribunal right now. No clear majority."
  if (isStrong) return `${Math.round(votedPct)}% of the region voted the same way. You're with the majority.`
  if (isInMajority) return `You voted with ${Math.round(votedPct)}% of voters — a slim majority.`
  if (votedPct < 20) return `Only ${Math.round(votedPct)}% chose this. You might be onto something.`
  return `${Math.round(votedPct)}% of voters agree with you on this one.`
}

export function PollCard({ poll, featured = false }: PollCardProps) {
  const { hasVoted, getVotedOption, recordVote, token, currentStreak, isFirstTimer, markWelcomed, totalVotesAllTime } = useVoter()
  const { toast } = useToast()
  const { data: siteSettings } = useSiteSettings()
  const shareGate = siteSettings?.shareGate
  const voteMutation = useVotePoll()
  const [localOptions, setLocalOptions] = useState<PollOption[]>(poll.options ?? [])
  const [localTotal, setLocalTotal] = useState(poll.totalVotes ?? 0)
  const shareGateEnabled = !!shareGate?.enabled
  const [phase, setPhase] = useState<Phase>(() => getInitialPhase(poll.id, hasVoted, shareGateEnabled))
  const [wasFirstTimer, setWasFirstTimer] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showGateModal, setShowGateModal] = useState(true)

  const isVoted = hasVoted(poll.id)
  const votedOptionId = getVotedOption(poll.id)

  // Re-evaluate phase when vote status changes or shareGate setting loads from CMS
  useEffect(() => {
    if (isVoted && phase === "vote") {
      if (!shareGateEnabled) {
        setPhase("results")
      } else {
        const unlocked = localStorage.getItem("tmh_email_submitted") || localStorage.getItem(`tmh_unlocked_${poll.id}`)
        setPhase(unlocked ? "results" : "gate")
      }
    }
  }, [isVoted, phase, poll.id, shareGateEnabled])

  // When shareGate loads asynchronously and is disabled, transition gate -> results
  useEffect(() => {
    if (phase === "gate" && !shareGateEnabled) {
      setPhase("results")
    }
  }, [shareGateEnabled, phase])

  const unlock = () => {
    localStorage.setItem(`tmh_unlocked_${poll.id}`, "true")
    setPhase("results")
  }

  const handleVote = (optionId: number) => {
    // If clicking the same option they already voted for, do nothing
    if (votedOptionId === optionId) return

    const isChangeVote = isVoted
    const previousOptionId = votedOptionId

    if (!isChangeVote) {
      const firstVote = isFirstTimer
      setWasFirstTimer(firstVote)
    }

    recordVote(poll.id, optionId, poll.categorySlug)

    // Optimistic UI update
    let newTotal = localTotal
    if (!isChangeVote) newTotal = localTotal + 1

    const newOptions = localOptions.map(opt => {
      let newCount = opt.voteCount
      if (opt.id === optionId) newCount += 1
      if (isChangeVote && opt.id === previousOptionId) newCount = Math.max(newCount - 1, 0)
      return { ...opt, voteCount: newCount, percentage: newTotal > 0 ? Math.round((newCount / newTotal) * 100) : 0 }
    })
    setLocalOptions(newOptions)
    setLocalTotal(newTotal)

    const consent = getIpConsent()
    voteMutation.mutate(
      { id: poll.id, data: { optionId, voterToken: token, ipConsent: consent !== "rejected" } },
      {
        onSuccess: (data) => {
          if (data.success) {
            const serverMap = new Map(data.options.map((o: PollOption) => [o.id, o]))
            setLocalOptions(prev =>
              prev.map(opt => {
                const updated = serverMap.get(opt.id)
                return updated ? { ...opt, voteCount: updated.voteCount, percentage: updated.percentage } : opt
              })
            )
            setLocalTotal(data.totalVotes)
          }
        },
        onError: () => {
          toast({ title: "Vote failed", description: "Could not record your vote. Please try again.", variant: "destructive" })
        },
      }
    )

    // Only transition phase on first vote, not on vote changes
    if (!isChangeVote) {
      const alreadyUnlocked = localStorage.getItem("tmh_email_submitted") || localStorage.getItem(`tmh_unlocked_${poll.id}`)
      setTimeout(() => {
        if (!shareGateEnabled || alreadyUnlocked) { unlock() } else { setShowGateModal(true); setPhase("gate") }
      }, 500)
    }
  }

  const handleWelcomeCTA = () => {
    markWelcomed()
    const target = document.getElementById("cross-sell-polls")
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
    } else {
      window.location.href = "/debates"
    }
  }

  const isLive = !poll.endsAt || new Date(poll.endsAt) > new Date()
  const votedOption = localOptions.find(o => o.id === votedOptionId)

  return (
    <>
      <div className={cn(
        "bg-card border border-border flex flex-col transition-all duration-300",
        featured ? "md:flex-row md:items-stretch" : ""
      )}>
        {/* Left: question + metadata */}
        <div className={cn("p-6 sm:p-8 flex-1 flex flex-col", featured ? "md:p-12 md:w-1/2" : "")}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-foreground text-background text-[13px] font-bold uppercase tracking-[0.18em]">
                {poll.category}
              </span>
              {isLive && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-[0.25em]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            <div className="relative flex items-center gap-2">
              {/* "You haven't weighed in" subtle dot when not voted */}
              {!isVoted && (
                <span className="hidden sm:flex items-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground font-serif">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                  Weigh in
                </span>
              )}
              {/* "You voted" when voted */}
              {isVoted && (
                <span className="hidden sm:flex items-center gap-1 text-[9px] uppercase tracking-widest text-primary font-serif font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Voted
                </span>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareModal(true) }}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
                aria-label="Share debate"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Link href={`/debates/${poll.id}`}>
            <h3 className={cn(
              "font-serif font-black text-foreground uppercase tracking-tight hover:text-primary transition-colors cursor-pointer mb-4",
              featured ? "text-4xl md:text-5xl leading-none" : "text-3xl leading-none"
            )}>
              {poll.question}
            </h3>
          </Link>

          {poll.context && (
            <p className="text-muted-foreground text-sm line-clamp-3 mb-4 font-sans">
              {poll.context}
            </p>
          )}

          <div className="mt-auto pt-6 border-t border-border flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-4">
              {isVoted && votedOption ? (
                <span className="text-primary font-bold">
                  You voted: {votedOption.text.length > 20 ? votedOption.text.slice(0, 17) + "…" : votedOption.text} · {localTotal.toLocaleString()} total
                </span>
              ) : (
                <>
                  <span>{localTotal.toLocaleString()} votes</span>
                  {poll.endsAt && (
                    <span>{isLive ? `Ends ${formatDistanceToNow(new Date(poll.endsAt))}` : "Ended"}</span>
                  )}
                </>
              )}
            </div>
            {!featured && (
              <Link href={`/debates/${poll.id}`} className="text-foreground hover:text-primary flex items-center gap-1 transition-colors font-bold">
                VIEW <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Right: voting / gate / results panel */}
        <div className={cn(
          "p-6 sm:p-8 bg-background border-t border-border flex flex-col justify-center",
          featured ? "md:w-1/2 md:border-t-0 md:border-l" : ""
        )}>
          <AnimatePresence mode="wait">

            {/* PHASE: VOTE */}
            {phase === "vote" && (() => {
              const ptype = poll.pollType as string
              const isBinaryPair = ptype === "binary" && localOptions.length === 2
              return (
              <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-4 border-l-4 border-primary pl-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    {ptype === "scale" ? "Rate This" : "Cast Your Vote"}
                  </span>
                </div>

                {/* BINARY: Two prominent buttons side by side, neutral styling */}
                {isBinaryPair && (
                  <div className="flex gap-3">
                    {localOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleVote(option.id)}
                        disabled={!isLive}
                        className={cn(
                          "flex-1 py-5 text-center font-bold text-sm uppercase tracking-widest border transition-colors duration-150",
                          "bg-background text-foreground border-border",
                          "hover:bg-foreground hover:text-background hover:border-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          !isLive && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* SCALE: Horizontal rating buttons */}
                {ptype === "scale" && (
                  <div className="flex gap-2 flex-wrap">
                    {localOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleVote(option.id)}
                        disabled={!isLive}
                        className={cn(
                          "flex-1 min-w-[3rem] py-4 text-center border border-border transition-all duration-150 font-bold text-sm",
                          "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                          !isLive && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                )}

                {/* MULTIPLE CHOICE + DEFAULT: Standard stacked option buttons */}
                {!isBinaryPair && ptype !== "scale" && (
                  <div className="space-y-3">
                    {localOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleVote(option.id)}
                        disabled={!isLive}
                        className={cn(
                          "tmh-vote-option group w-full text-left px-5 py-4 border border-border transition-colors duration-150 font-medium text-sm font-sans",
                          "bg-background text-foreground",
                          "hover:bg-foreground hover:text-background hover:border-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          !isLive && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className="block transition-transform duration-150 group-hover:translate-x-1">
                          {option.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
              )
            })()}

            {/* PHASE: SHARE GATE — blurred placeholder in panel */}
            {phase === "gate" && (
              <motion.div key="gate-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-3 pointer-events-none select-none" style={{ filter: "blur(3.5px)", opacity: 0.45 }}>
                  {localOptions.slice(0, 3).map(opt => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <span className="text-xs font-sans text-foreground truncate flex-1">{opt.text}</span>
                      <div className="w-20 h-2 bg-border overflow-hidden rounded">
                        <div className="h-full bg-primary transition-all" style={{ width: `${opt.percentage ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{opt.percentage ?? 0}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-primary">
                  <Lock className="w-3.5 h-3.5" />
                  {shareGate?.heading || "Share to unlock full breakdown"}
                </div>
              </motion.div>
            )}

            {/* PHASE: RESULTS */}
            {phase === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* First-time welcome message */}
                {wasFirstTimer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-primary/10 border border-primary/30 p-4"
                  >
                    <p className="font-serif font-black uppercase text-sm text-primary tracking-tight mb-1">
                      Welcome to The Tribunal<span className="text-primary">.</span>
                    </p>
                    <p className="text-[11px] text-foreground/70 font-sans leading-relaxed">
                      You just joined {localTotal.toLocaleString()} people shaping the region's most honest conversation.
                    </p>
                    <button
                      onClick={handleWelcomeCTA}
                      className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary hover:text-foreground transition-colors border-b border-primary/40 hover:border-foreground pb-0.5 cursor-pointer"
                    >
                      Keep Voting →
                    </button>
                  </motion.div>
                )}

                {/* Streak badge */}
                {currentStreak >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-serif">
                      {currentStreak}-day streak
                    </span>
                  </motion.div>
                )}
                {currentStreak === 1 && totalVotesAllTime === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-serif"
                  >
                    Day 1 — come back tomorrow.
                  </motion.div>
                )}

                {/* Personal Insight Card */}
                {votedOptionId && votedOption && (() => {
                  const pct = votedOption.percentage ?? 0
                  const insight = generateInsight(pct, localOptions)
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-secondary/60 border border-border p-4"
                    >
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2 font-serif">
                        Your Result
                      </p>
                      <p className="font-serif font-black uppercase text-sm text-foreground tracking-tight leading-snug">
                        {insight}
                      </p>
                      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
                        <span className="text-[10px] text-primary font-bold font-sans">"{votedOption.text}"</span>
                        <span className="text-[10px] text-muted-foreground font-sans">— your vote</span>
                      </div>
                    </motion.div>
                  )
                })()}

                <PollViewToggle
                  pollId={poll.id}
                  totalVotes={localTotal}
                  resultsView={
                    <>
                      {/* Results bars — clickable to change vote */}
                      {localOptions.map((option, i) => (
                        <div
                          key={option.id}
                          className={cn("relative cursor-pointer group/bar", option.id !== votedOptionId && "hover:opacity-80")}
                          onClick={() => handleVote(option.id)}
                          role="button"
                          aria-label={`Change vote to ${option.text}`}
                        >
                          <div className="flex justify-between items-end mb-1">
                            <span className={cn(
                              "text-sm font-sans",
                              option.id === votedOptionId ? "text-primary font-bold" : "text-foreground font-medium group-hover/bar:text-primary"
                            )}>
                              {option.text}
                            </span>
                            <span className="font-serif font-bold text-lg text-foreground leading-none">{option.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${option.percentage}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                              className={cn("h-full", option.id === votedOptionId ? "bg-primary" : "bg-foreground/20")}
                            />
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t border-border flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        <p className="font-serif font-black uppercase tracking-widest text-sm text-primary">
                          Voted — Results Live
                        </p>
                      </div>
                    </>
                  }
                />

                {/* Share Your Stance */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className={cn(
                      "w-full flex items-center justify-center gap-2.5 px-5 py-3.5",
                      "bg-foreground text-background text-[11px] font-black uppercase tracking-[0.2em]",
                      "hover:bg-primary hover:text-white transition-colors duration-150",
                    )}
                  >
                    <Share2 className="w-3.5 h-3.5 flex-shrink-0" />
                    Share Your Result
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── SHARE GATE OVERLAY — opens unified ShareModal ── */}
      {phase === "gate" && showGateModal && (() => {
        const gateContext: DebateShareContext = {
          contentType: "debate",
          pollId: poll.id,
          url: `${window.location.origin}/debates/${poll.id}`,
          title: poll.question,
          category: poll.category,
          totalVotes: localTotal,
          votedOptionText: votedOption?.text,
          votedPct: votedOption?.percentage,
          options: localOptions.map(o => ({ text: o.text, percentage: o.percentage ?? 0 })),
        }
        return (
          <ShareModal
            context={gateContext}
            onClose={() => setShowGateModal(false)}
            showEmailGate
            onUnlock={unlock}
          />
        )
      })()}

      {showShareModal && (() => {
        const shareContext: DebateShareContext = {
          contentType: "debate",
          pollId: poll.id,
          url: `${window.location.origin}/debates/${poll.id}`,
          title: poll.question,
          category: poll.category,
          totalVotes: localTotal,
          votedOptionText: votedOption?.text,
          votedPct: votedOption?.percentage,
          options: localOptions.map(o => ({ text: o.text, percentage: o.percentage ?? 0 })),
        }
        return (
          <ShareModal
            context={shareContext}
            onClose={() => {
              setShowShareModal(false)
              if (phase === "gate" && localStorage.getItem("tmh_email_submitted")) {
                unlock()
              }
            }}
            showEmailGate={phase === "gate"}
            onUnlock={unlock}
          />
        )
      })()}
    </>
  )
}
