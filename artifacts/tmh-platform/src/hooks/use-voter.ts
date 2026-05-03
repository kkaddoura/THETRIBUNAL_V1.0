import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface VoterProfile {
  visitorId: string;
  country: string | null;
  totalVotes: number;
  pollsVoted: number[];
  firstVoteAt: string | null;
  lastVoteAt: string | null;
  streak: number;
  categories: Record<string, number>;
  welcomed: boolean;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function isStreakAlive(lastVoteAt: string | null): boolean {
  if (!lastVoteAt) return false;
  const diff = daysBetween(lastVoteAt, todayStr());
  return diff <= 1;
}

function defaultProfile(token: string): VoterProfile {
  return {
    visitorId: token,
    country: null,
    totalVotes: 0,
    pollsVoted: [],
    firstVoteAt: null,
    lastVoteAt: null,
    streak: 0,
    categories: {},
    welcomed: false,
  };
}

function loadProfile(token: string): VoterProfile {
  try {
    const stored = localStorage.getItem('tmh_voter');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultProfile(token), ...parsed, visitorId: token };
    }
  } catch {}
  // Migrate: if there are existing votes but no profile, build a partial profile
  try {
    const votesRaw = localStorage.getItem('tmh_votes');
    if (votesRaw) {
      const votesMap: Record<string, number> = JSON.parse(votesRaw);
      const pollsVoted = Object.keys(votesMap).map(Number).filter(Boolean);
      if (pollsVoted.length > 0) {
        return {
          ...defaultProfile(token),
          totalVotes: pollsVoted.length,
          pollsVoted,
          welcomed: true,
        };
      }
    }
  } catch {}
  return defaultProfile(token);
}

export function useVoter() {
  const [token, setToken] = useState<string>('');
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [profile, setProfile] = useState<VoterProfile | null>(null);
  const profileRef = useRef<VoterProfile | null>(null);

  useEffect(() => {
    let t = localStorage.getItem('tmh_voter_token');
    if (!t) {
      t = uuidv4();
      localStorage.setItem('tmh_voter_token', t);
    }
    setToken(t);

    const v = localStorage.getItem('tmh_votes');
    if (v) {
      try { setVotes(JSON.parse(v)); } catch {}
    }

    const p = loadProfile(t);
    profileRef.current = p;
    setProfile(p);
  }, []);

  const saveProfile = useCallback((updated: VoterProfile) => {
    profileRef.current = updated;
    setProfile(updated);
    localStorage.setItem('tmh_voter', JSON.stringify(updated));
  }, []);

  const recordVote = useCallback((pollId: number, optionId: number, categorySlug?: string) => {
    const newVotes = { ...votes, [pollId]: optionId };
    setVotes(newVotes);
    localStorage.setItem('tmh_votes', JSON.stringify(newVotes));

    const current = profileRef.current;
    if (!current) return;

    // If already voted on this poll, just update the optionId (already done above), skip stats
    const alreadyVotedThisPoll = current.pollsVoted.includes(pollId) || !!votes[pollId];
    if (alreadyVotedThisPoll) {
      saveProfile(current);
      return;
    }

    const today = todayStr();
    let newStreak = current.streak;

    if (!current.lastVoteAt) {
      newStreak = 1;
    } else {
      const diff = daysBetween(current.lastVoteAt, today);
      if (diff === 0) {
        // Same day vote, streak unchanged
      } else if (diff === 1) {
        newStreak = current.streak + 1;
      } else {
        newStreak = 1;
      }
    }

    const updated: VoterProfile = {
      ...current,
      totalVotes: current.totalVotes + 1,
      pollsVoted: [...current.pollsVoted, pollId],
      firstVoteAt: current.firstVoteAt ?? today,
      lastVoteAt: today,
      streak: newStreak,
      categories: categorySlug
        ? { ...current.categories, [categorySlug]: (current.categories[categorySlug] ?? 0) + 1 }
        : current.categories,
    };

    saveProfile(updated);
  }, [votes, saveProfile]);

  const hasVoted = useCallback((pollId: number) => !!votes[pollId], [votes]);
  const getVotedOption = useCallback((pollId: number) => votes[pollId], [votes]);

  const markWelcomed = useCallback(() => {
    const current = profileRef.current;
    if (!current) return;
    saveProfile({ ...current, welcomed: true });
  }, [saveProfile]);

  const setCountry = useCallback((code: string) => {
    const current = profileRef.current;
    if (!current || current.country) return;
    saveProfile({ ...current, country: code });
  }, [saveProfile]);

  const currentStreak = profile ? (isStreakAlive(profile.lastVoteAt) ? profile.streak : 0) : 0;
  const isFirstTimer = profile !== null && profile.totalVotes === 0;

  return {
    token,
    votes,
    profile,
    recordVote,
    hasVoted,
    getVotedOption,
    markWelcomed,
    setCountry,
    isFirstTimer,
    currentStreak,
    totalVotesAllTime: profile?.totalVotes ?? 0,
  };
}
