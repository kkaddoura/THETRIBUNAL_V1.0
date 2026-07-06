import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useVotePoll } from "@workspace/api-client-react";
import type { Poll, PollOption } from "@workspace/api-client-react";
import { useVoter } from "@/hooks/use-voter";
import { useToast } from "@/hooks/use-toast";
import { getIpConsent } from "@/components/IpConsentBanner";
import { cn } from "@/lib/utils";

interface Props {
  poll: Poll;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function PollTeaserCard({ poll }: Props) {
  const { hasVoted, getVotedOption, recordVote, token } = useVoter();
  const { toast } = useToast();
  const voteMutation = useVotePoll();

  const wasVoted = hasVoted(poll.id);
  const [expanded, setExpanded] = useState(false);
  const [localOptions, setLocalOptions] = useState<PollOption[]>(poll.options ?? []);
  const [localTotal, setLocalTotal] = useState(poll.totalVotes ?? 0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Drives the "Vote Recorded" confirmation banner shown briefly before the
  // panel auto-collapses. Cleared when the panel reopens or unmounts.
  const [justVoted, setJustVoted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalOptions(poll.options ?? []);
    setLocalTotal(poll.totalVotes ?? 0);
  }, [poll.options, poll.totalVotes]);

  // Clear the confirmation banner whenever the panel collapses, so reopening
  // doesn't flash a stale "Vote Recorded" message.
  useEffect(() => {
    if (!expanded) setJustVoted(false);
  }, [expanded]);

  // Anchor the portaled panel under the card. Resize/RO update its position.
  // Small scrolls just re-anchor (user may need to scroll to bring the panel
  // into view); collapse only after passing a threshold.
  useEffect(() => {
    if (!expanded || !cardRef.current) return;
    const node = cardRef.current;
    const initialRect = node.getBoundingClientRect();
    const initialScrollY = window.scrollY;
    setRect(initialRect);

    const VERTICAL_THRESHOLD = 140;
    const HORIZONTAL_THRESHOLD = 40;

    const onScroll = () => {
      const newRect = node.getBoundingClientRect();
      setRect(newRect);
      const verticalDelta = Math.abs(window.scrollY - initialScrollY);
      const horizontalDelta = Math.abs(newRect.left - initialRect.left);
      if (verticalDelta > VERTICAL_THRESHOLD || horizontalDelta > HORIZONTAL_THRESHOLD) {
        setExpanded(false);
      }
    };

    const update = () => setRect(node.getBoundingClientRect());

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [expanded]);

  // Close on Escape OR click outside (card AND panel)
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cardRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [expanded]);

  const isLive = !poll.endsAt || new Date(poll.endsAt) > new Date();
  const votedOptionId = getVotedOption(poll.id);
  const showResults = wasVoted;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  const close = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setExpanded(false);
  };

  const handleVote = (optionId: number) => {
    if (votedOptionId === optionId) return;

    const isChangeVote = wasVoted;
    const previousOptionId = votedOptionId;
    recordVote(poll.id, optionId, poll.categorySlug);

    let newTotal = localTotal;
    if (!isChangeVote) newTotal = localTotal + 1;

    const newOptions = localOptions.map((opt) => {
      let newCount = opt.voteCount;
      if (opt.id === optionId) newCount += 1;
      if (isChangeVote && opt.id === previousOptionId) newCount = Math.max(newCount - 1, 0);
      return {
        ...opt,
        voteCount: newCount,
        percentage: newTotal > 0 ? Math.round((newCount / newTotal) * 100) : 0,
      };
    });
    setLocalOptions(newOptions);
    setLocalTotal(newTotal);

    const consent = getIpConsent();
    voteMutation.mutate(
      { id: poll.id, data: { optionId, voterToken: token, ipConsent: consent !== "rejected" } },
      {
        onSuccess: (data) => {
          if (data.success) {
            const serverMap = new Map(data.options.map((o: PollOption) => [o.id, o]));
            setLocalOptions((prev) =>
              prev.map((opt) => {
                const updated = serverMap.get(opt.id);
                return updated ? { ...opt, voteCount: updated.voteCount, percentage: updated.percentage } : opt;
              }),
            );
            setLocalTotal(data.totalVotes);
          }
        },
        onError: () => {
          toast({
            title: "Vote failed",
            description: "Could not record your vote. Please try again.",
            variant: "destructive",
          });
        },
      },
    );

    // Show the "Vote Recorded" confirmation, then auto-collapse so the user
    // has a beat to register the action before the panel disappears.
    setJustVoted(true);
    setTimeout(() => setExpanded(false), 2500);
  };

  const ctaLabel = expanded ? "CLOSE" : wasVoted ? "RESULTS" : "VOTE";

  return (
    <div ref={cardRef} className="relative h-full">
      <Link
        href={`/debates/${poll.id}`}
        className={cn(
          "tmh-card group block bg-card border h-full transition-colors",
          expanded ? "border-foreground" : "border-border hover:border-foreground",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="tmh-card-bg flex-1 flex flex-col p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3 mb-5">
              <span className="inline-flex max-w-full px-1.5 py-0.5 bg-foreground text-background text-[10px] font-bold uppercase tracking-[0.08em] leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                {poll.category}
              </span>
              {wasVoted ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-[0.18em] whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3" />
                  Voted
                </span>
              ) : isLive ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-[0.18em] whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  LIVE
                </span>
              ) : null}
            </div>

            <h3 className="font-serif font-semibold text-foreground uppercase text-[1.05rem] sm:text-lg leading-snug group-hover:text-primary transition-colors mb-3">
              {poll.question}
            </h3>

            {poll.context && (
              <p className="text-muted-foreground text-[13px] leading-relaxed font-sans">
                {poll.context}
              </p>
            )}
          </div>

          <div className="bg-card px-6 sm:px-7 py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 text-[12px] uppercase tracking-widest text-muted-foreground">
              <span>{localTotal.toLocaleString()} votes</span>
              {poll.endsAt && (
                <span>{isLive ? `Ends ${formatDistanceToNow(new Date(poll.endsAt))}` : "Ended"}</span>
              )}
            </div>
            <CtaButton
              label={ctaLabel}
              onClick={toggle}
              active={expanded}
              disabled={!isLive && !wasVoted}
            />
          </div>
        </div>
      </Link>

      <ExpandedPanel
        expanded={expanded}
        rect={rect}
        panelRef={panelRef}
        showResults={showResults}
        justVoted={justVoted}
        options={localOptions}
        votedOptionId={votedOptionId}
        onVote={handleVote}
        disabled={!isLive || voteMutation.isPending}
        onClose={close}
      />
    </div>
  );
}

function CtaButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={active}
      className={cn(
        "group/cta cursor-pointer w-full sm:w-auto",
        "inline-flex items-center justify-center gap-1.5",
        "px-4 py-2.5 sm:px-3 sm:py-1.5",
        "text-[13px] sm:text-[12px] font-black uppercase tracking-[0.2em]",
        "border transition-colors duration-150",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-foreground border-border hover:bg-foreground hover:text-background hover:border-foreground",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
      )}
    >
      {label}
      <ArrowRight
        className={cn(
          "w-3 h-3 flex-shrink-0 transition-transform duration-150",
          active ? "rotate-90" : "group-hover/cta:translate-x-0.5",
        )}
      />
    </button>
  );
}

function ExpandedPanel({
  expanded,
  rect,
  panelRef,
  showResults,
  justVoted,
  options,
  votedOptionId,
  onVote,
  disabled,
  onClose,
}: {
  expanded: boolean;
  rect: DOMRect | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  showResults: boolean;
  justVoted: boolean;
  options: PollOption[];
  votedOptionId: number | undefined;
  onVote: (id: number) => void;
  disabled: boolean;
  onClose: (e?: React.MouseEvent) => void;
}) {
  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {expanded && rect && (
        <motion.div
          ref={panelRef}
          key="vote-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT_EXPO }}
          // Block clicks from bubbling to the card's <Link> wrapper through
          // the React portal tree, which would otherwise navigate the user
          // to /debates/:id and unmount the panel before the vote registers.
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: rect.bottom - 1,
            left: rect.left,
            width: rect.width,
            overflow: "hidden",
          }}
          className="z-40 bg-card border border-foreground border-t-0"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <AnimatePresence mode="wait" initial={false}>
                {justVoted ? (
                  <motion.span
                    key="just-voted"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] font-bold text-primary"
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                      className="inline-flex"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </motion.span>
                    Vote Recorded
                  </motion.span>
                ) : (
                  <motion.span
                    key="status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground"
                  >
                    {showResults ? "Live Results" : "Cast Your Vote"}
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showResults ? (
              <ResultsList options={options} votedOptionId={votedOptionId} />
            ) : (
              <VoteList options={options} onVote={onVote} disabled={disabled} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function VoteList({
  options,
  onVote,
  disabled,
}: {
  options: PollOption[];
  onVote: (id: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          // React events bubble through the React tree (not the DOM), so a
          // click here propagates up to the <Link> wrapping the card and
          // triggers navigation to /debates/:id. Stop propagation + prevent
          // default so the vote registers in place.
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote(opt.id);
          }}
          disabled={disabled}
          className={cn(
            "group/opt relative w-full bg-background border border-border overflow-hidden cursor-pointer",
            "hover:border-foreground transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <div className="relative px-3 py-2 min-h-[2rem] flex items-start justify-between gap-2 text-[12px] font-bold uppercase leading-snug tracking-wide text-foreground group-hover/opt:text-primary transition-colors">
            <span className="text-left transition-transform duration-150 group-hover/opt:translate-x-0.5">
              {opt.text}
            </span>
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-0 -translate-x-1 transition-all duration-150 group-hover/opt:opacity-100 group-hover/opt:translate-x-0" />
          </div>
        </button>
      ))}
    </div>
  );
}

function ResultsList({
  options,
  votedOptionId,
}: {
  options: PollOption[];
  votedOptionId: number | undefined;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const pct = opt.percentage ?? 0;
        const isMine = opt.id === votedOptionId;
        return (
          <div key={opt.id} className="relative bg-background border border-border overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out",
                isMine ? "bg-primary/20" : "bg-foreground/10",
              )}
              style={{ width: `${Math.max(2, pct)}%` }}
            />
            <div className="relative px-3 py-2 min-h-[2rem] flex items-start justify-between gap-2 text-[12px] font-bold uppercase leading-snug tracking-wide">
              <span className={cn("text-left", isMine ? "text-primary" : "text-foreground")}>
                {isMine && "✓ "}
                {opt.text}
              </span>
              <span className={cn("flex-shrink-0 mt-0.5", isMine ? "text-primary" : "text-foreground")}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
