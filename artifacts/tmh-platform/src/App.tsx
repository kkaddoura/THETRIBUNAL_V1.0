import { Switch, Route, Router as WouterRouter, Redirect } from "wouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/lib/i18n"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Home from "@/pages/home"
import Polls from "@/pages/polls"
import PollDetail from "@/pages/poll-detail"
import PollArchive from "@/pages/poll-archive"
import Profiles from "@/pages/profiles"
import ProfileDetail from "@/pages/profile-detail"
import Predictions from "@/pages/predictions"
import PredictionDetail from "@/pages/prediction-detail"
import About from "@/pages/about"
import Apply from "@/pages/apply"
import Join from "@/pages/join"
import Terms from "@/pages/terms"
import FAQ from "@/pages/faq"
import Admin from "@/pages/admin"
import MenaPulse from "@/pages/mena-pulse"
import Majlis from "@/pages/majlis"
import MajlisLogin from "@/pages/majlis-login"
import Contact from "@/pages/contact"
import NotFound from "@/pages/not-found"
import { Chatbot } from "@/components/Chatbot"
import { IpConsentBanner } from "@/components/IpConsentBanner"
import { useSiteSettings } from "@/hooks/use-cms-data"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function Router() {
  const { data: siteSettings } = useSiteSettings()
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? true

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/debates" component={Polls} />
      <Route path="/debates/archive" component={PollArchive} />
      <Route path="/debates/:id" component={PollDetail} />
      {voicesEnabled ? (
        <>
          <Route path="/voices" component={Profiles} />
          <Route path="/voices/:id" component={ProfileDetail} />
        </>
      ) : (
        <>
          <Route path="/voices"><Redirect to="/" /></Route>
          <Route path="/voices/:id"><Redirect to="/" /></Route>
        </>
      )}
      <Route path="/predictions" component={Predictions} />
      <Route path="/predictions/:id" component={PredictionDetail} />
      <Route path="/about" component={About} />
      <Route path="/apply" component={Apply} />
      <Route path="/join" component={Join} />
      <Route path="/terms" component={Terms} />
      <Route path="/faq" component={FAQ} />
      <Route path="/pulse" component={MenaPulse} />
      {majlisEnabled ? (
        <>
          <Route path="/majlis/login" component={MajlisLogin} />
          <Route path="/majlis" component={Majlis} />
        </>
      ) : (
        <>
          <Route path="/majlis/login"><Redirect to="/" /></Route>
          <Route path="/majlis"><Redirect to="/" /></Route>
        </>
      )}
      <Route path="/contact" component={Contact} />
      <Route path="/admin" component={Admin} />
      {/* URL redirects */}
      <Route path="/polls"><Redirect to="/debates" /></Route>
      <Route path="/polls/:id">{(params: { id: string }) => <Redirect to={`/debates/${params.id}`} />}</Route>
      <Route path="/profiles">{voicesEnabled ? <Redirect to="/voices" /> : <Redirect to="/" />}</Route>
      <Route path="/profiles/:id">{(params: { id: string }) => <Redirect to={voicesEnabled ? `/voices/${params.id}` : "/"} />}</Route>

      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </WouterRouter>
          <Toaster />
          <Chatbot />
          <IpConsentBanner />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App;
