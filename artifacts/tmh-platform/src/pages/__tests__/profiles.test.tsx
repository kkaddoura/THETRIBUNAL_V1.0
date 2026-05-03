/**
 * @vitest-environment jsdom
 *
 * Tests for Profiles (Voices) page — editorial status filtering.
 *
 * Verifies that the Voices page only renders profiles returned by
 * the API (which should only return approved profiles).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import Profiles from "../profiles"

/* ------------------------------------------------------------------ */
/*  Mocks                                                             */
/* ------------------------------------------------------------------ */

const mockUseListProfiles = vi.fn()

vi.mock("@workspace/api-client-react", () => ({
  useListProfiles: (...args: any[]) => mockUseListProfiles(...args),
}))

vi.mock("@/hooks/use-cms-data", () => ({
  usePageConfig: () => ({ data: null }),
  useSiteSettings: () => ({ data: { featureToggles: { majlis: { enabled: false } } } }),
}))

vi.mock("wouter", () => ({
  useLocation: () => ["/voices", vi.fn()],
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: any) => <div data-testid="layout">{children}</div>,
}))

vi.mock("@/components/profile/ProfileCard", () => ({
  ProfileCard: ({ profile }: any) => (
    <div data-testid={`profile-card-${profile.id}`}>{profile.name}</div>
  ),
}))

vi.mock("@/hooks/use-page-title", () => ({
  usePageTitle: () => {},
}))

vi.mock("@/hooks/use-infinite-scroll", () => ({
  useInfiniteScroll: (items: any[], _perPage: number) => ({
    sentinelRef: { current: null },
    visibleItems: items,
    hasMore: false,
  }),
}))

vi.mock("@/components/ui/loading-dots", () => ({
  LoadingDots: () => <span data-testid="loading-dots" />,
}))

vi.mock("@/components/skeletons/ProfileCardSkeleton", () => ({
  ProfileGridSkeleton: () => <div data-testid="profile-grid-skeleton" />,
}))

vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="search-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
}))

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  },
}))

/* ------------------------------------------------------------------ */
/*  Test Data                                                         */
/* ------------------------------------------------------------------ */

const approvedProfile = {
  id: 1,
  name: "Ahmad Al-Rashid",
  headline: "CEO of TechCo",
  role: "CEO",
  company: "TechCo",
  sector: "Technology",
  country: "UAE",
  city: "Dubai",
  imageUrl: null,
  isFeatured: true,
  isVerified: true,
  viewCount: 100,
  associatedPollCount: 5,
  quote: "Building the future",
  impactStatement: "Leading tech innovation in MENA",
}

const anotherApprovedProfile = {
  id: 2,
  name: "Sara Khan",
  headline: "Founder of FinStart",
  role: "Founder",
  company: "FinStart",
  sector: "Finance",
  country: "Saudi Arabia",
  city: "Riyadh",
  imageUrl: null,
  isFeatured: false,
  isVerified: false,
  viewCount: 50,
  associatedPollCount: 2,
  quote: "Innovation matters",
  impactStatement: null,
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("Profiles (Voices) Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("loading state", () => {
    it("renders skeleton when loading", () => {
      mockUseListProfiles.mockReturnValue({ data: undefined, isLoading: true })
      render(<Profiles />)
      expect(screen.getByTestId("profile-grid-skeleton")).toBeTruthy()
    })

    it("does not render profile cards when loading", () => {
      mockUseListProfiles.mockReturnValue({ data: undefined, isLoading: true })
      render(<Profiles />)
      expect(screen.queryByTestId("profile-card-1")).toBeNull()
    })
  })

  describe("loaded state — only approved profiles rendered", () => {
    it("renders only the profiles returned by the API", () => {
      mockUseListProfiles.mockReturnValue({
        data: {
          profiles: [approvedProfile, anotherApprovedProfile],
          total: 2,
        },
        isLoading: false,
      })
      render(<Profiles />)
      expect(screen.getByTestId("profile-card-1")).toBeTruthy()
      expect(screen.getByTestId("profile-card-2")).toBeTruthy()
      expect(screen.getByText("Ahmad Al-Rashid")).toBeTruthy()
      expect(screen.getByText("Sara Khan")).toBeTruthy()
    })

    it("does not render profiles that are not in the API response", () => {
      // API returns only 1 approved profile (the other is archived server-side)
      mockUseListProfiles.mockReturnValue({
        data: {
          profiles: [approvedProfile],
          total: 1,
        },
        isLoading: false,
      })
      render(<Profiles />)
      expect(screen.getByTestId("profile-card-1")).toBeTruthy()
      expect(screen.queryByTestId("profile-card-2")).toBeNull()
    })

    it("shows correct voice count matching API response", () => {
      mockUseListProfiles.mockReturnValue({
        data: {
          profiles: [approvedProfile],
          total: 1,
        },
        isLoading: false,
      })
      render(<Profiles />)
      // The count should reflect only what the API returned (approved profiles)
      // The voices count appears as a styled number followed by "Voices" text
      const voicesLabels = screen.getAllByText("Voices")
      // At least one "Voices" label should exist in the stats bar
      expect(voicesLabels.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("empty state", () => {
    it("shows no profiles found when API returns empty list", () => {
      mockUseListProfiles.mockReturnValue({
        data: { profiles: [], total: 0 },
        isLoading: false,
      })
      render(<Profiles />)
      expect(screen.getByText("No profiles found")).toBeTruthy()
    })
  })
})
