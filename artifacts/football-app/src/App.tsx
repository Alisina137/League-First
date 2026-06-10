import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import LeagueHub from "./pages/LeagueHub";
import Matches from "./pages/Matches";
import Standings from "./pages/Standings";
import Transfers from "./pages/Transfers";
import News from "./pages/News";
import Teams from "./pages/Teams";
import Players from "./pages/Players";
import Bookmarks from "./pages/Bookmarks";
import Settings from "./pages/Settings";
import { ThemeProvider } from "./context/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/league/:slug" component={LeagueHub} />
        <Route path="/matches" component={Matches} />
        <Route path="/standings" component={Standings} />
        <Route path="/transfers" component={Transfers} />
        <Route path="/news" component={News} />
        <Route path="/teams" component={Teams} />
        <Route path="/players" component={Players} />
        <Route path="/bookmarks" component={Bookmarks} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
