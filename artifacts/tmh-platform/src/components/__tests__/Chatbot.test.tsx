/**
 * @vitest-environment jsdom
 *
 * Tests for Noor Chatbot — focuses on visual structure and greeting.
 * Full API integration is covered by manual QA (streaming SSE is hard to mock).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { Chatbot } from "../Chatbot"

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}))

// Mock site settings hook — default to Majlis OFF
const mockUseSiteSettings = vi.fn()
vi.mock("@/hooks/use-cms-data", () => ({
  useSiteSettings: () => mockUseSiteSettings(),
}))

// Mock motion
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x" />,
  Send: () => <span data-testid="icon-send" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Loader2: () => <span data-testid="icon-loader" />,
}))

describe("Noor Chatbot", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSiteSettings.mockReturnValue({
      data: { featureToggles: { majlis: { enabled: false } } },
    })
  })

  it("renders the 'Ask Noor' trigger bubble", () => {
    render(<Chatbot />)
    expect(screen.getByLabelText("Chat with Noor")).toBeTruthy()
    expect(screen.getByText("Ask Noor")).toBeTruthy()
  })

  it("shows Noor greeting without Majlis when toggle is off", async () => {
    render(<Chatbot />)
    // Open the chat panel
    fireEvent.click(screen.getByLabelText("Chat with Noor"))
    await waitFor(() => {
      const greeting = screen.getByText(/I'm Noor/)
      expect(greeting).toBeTruthy()
      // Body should mention debates/predictions/voices but NOT Majlis
      expect(greeting.textContent).not.toMatch(/Majlis/)
    })
  })

  it("shows Noor greeting with Majlis when toggle is on", async () => {
    mockUseSiteSettings.mockReturnValue({
      data: { featureToggles: { majlis: { enabled: true } } },
    })
    render(<Chatbot />)
    fireEvent.click(screen.getByLabelText("Chat with Noor"))
    await waitFor(() => {
      const greeting = screen.getByText(/I'm Noor/)
      expect(greeting.textContent).toMatch(/Majlis/)
    })
  })

  it("greeting uses Noor branding (sparkles icon is present)", async () => {
    render(<Chatbot />)
    await waitFor(() => {
      // Multiple sparkles: one in trigger avatar, one would appear in header when opened
      const icons = screen.getAllByTestId("icon-sparkles")
      expect(icons.length).toBeGreaterThanOrEqual(1)
    })
  })
})
