import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import DebatesPage from "@/pages/debates";
import PredictionsPage from "@/pages/predictions";
import VoicesPage from "@/pages/voices";
import EditDebatePage from "@/pages/edit-debate";
import EditPredictionPage from "@/pages/edit-prediction";
import EditVoicePage from "@/pages/edit-voice";
import HomepagePage from "@/pages/homepage";
import SubscribersPage from "@/pages/subscribers";
import ApplicationsPage from "@/pages/applications";
import AnalyticsPage from "@/pages/analytics";
import PageAbout from "@/pages/page-about";
import PagePulse from "@/pages/page-pulse";
import PageFaq from "@/pages/page-faq";
import PageTerms from "@/pages/page-terms";
import PageContact from "@/pages/page-contact";
import PageDebates from "@/pages/page-debates";
import PagePredictions from "@/pages/page-predictions";
import PageVoices from "@/pages/page-voices";
import PagePolls from "@/pages/page-polls";
import PageApply from "@/pages/page-apply";
import PageSiteSettings from "@/pages/page-site-settings";
import DesignTokensPage from "@/pages/design-tokens";
import IdeationPage from "@/pages/ideation";
import MajlisPage from "@/pages/majlis";
import { Toaster } from "sonner";

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/homepage" component={HomepagePage} />
        <Route path="/debates" component={DebatesPage} />
        <Route path="/debates/:id/edit" component={EditDebatePage} />
        <Route path="/predictions" component={PredictionsPage} />
        <Route path="/predictions/:id/edit" component={EditPredictionPage} />
        <Route path="/pulse" component={PagePulse} />
        <Route path="/voices" component={VoicesPage} />
        <Route path="/voices/:id/edit" component={EditVoicePage} />
        <Route path="/design-tokens" component={DesignTokensPage} />
        <Route path="/ideation" component={IdeationPage} />
        <Route path="/pages/about" component={PageAbout} />
        <Route path="/pages/faq" component={PageFaq} />
        <Route path="/pages/terms" component={PageTerms} />
        <Route path="/pages/contact" component={PageContact} />
        <Route path="/pages/debates" component={PageDebates} />
        <Route path="/pages/predictions" component={PagePredictions} />
        <Route path="/pages/voices" component={PageVoices} />
        <Route path="/pages/polls" component={PagePolls} />
        <Route path="/pages/apply" component={PageApply} />
        <Route path="/site-settings" component={PageSiteSettings} />
        <Route path="/subscribers" component={SubscribersPage} />
        <Route path="/applications" component={ApplicationsPage} />
        <Route path="/majlis" component={MajlisPage} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <ProtectedRoutes />
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;
