import { Component, type ReactNode } from "react"
import { Layout } from "@/components/layout/Layout"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <Layout>
        <div className="bg-foreground text-background border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
              Something Went Wrong
            </p>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
              Unexpected Error<span style={{ color: "#DC143C" }}>.</span>
            </h1>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(250,250,250,0.65)" }}>
              We hit a snag. This shouldn't have happened.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="font-display text-6xl md:text-8xl font-black text-foreground/5 select-none leading-none mb-6">
            !
          </p>
          <p className="text-xl font-sans text-foreground leading-relaxed mb-4 -mt-8">
            Something broke on our end. We're sorry about that.
          </p>
          <p className="text-base text-muted-foreground font-sans leading-relaxed mb-10">
            Try refreshing the page or head back to the homepage. If this keeps happening, let us know.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif"
            >
              Retry
            </button>
            <a
              href="/"
              className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
            >
              Go to Homepage
            </a>
            <a
              href="/contact"
              className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
            >
              Report Issue
            </a>
          </div>
        </div>
      </Layout>
    )
  }
}
