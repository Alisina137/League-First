import { Link, useLocation } from "wouter";
import {
  Home,
  Calendar,
  Trophy,
  Users,
  User,
  ArrowRightLeft,
  Newspaper,
  Bookmark,
  Settings,
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Matches", href: "/matches", icon: Calendar },
    { label: "Standings", href: "/standings", icon: Trophy },
    { label: "Teams", href: "/teams", icon: Users },
    { label: "Players", href: "/players", icon: User },
    { label: "Transfers", href: "/transfers", icon: ArrowRightLeft },
    { label: "News", href: "/news", icon: Newspaper },
    { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const popularLeagues = [
    { name: "Premier League", slug: "premier-league" },
    { name: "La Liga", slug: "la-liga" },
    { name: "Serie A", slug: "serie-a" },
    { name: "Bundesliga", slug: "bundesliga" },
    { name: "Ligue 1", slug: "ligue-1" },
    { name: "Champions League", slug: "champions-league" },
    { name: "Europa League", slug: "europa-league" },
    { name: "Saudi Pro League", slug: "saudi-pro-league" },
    { name: "MLS", slug: "mls" },
    { name: "World Cup", slug: "world-cup" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="w-6 h-6" />
            <span>Football Hub</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-1">
            {navItems.slice(0, 2).map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Popular Leagues
            </h3>
            <div className="space-y-1">
              {popularLeagues.map((league) => {
                const href = `/league/${league.slug}`;
                const active = location.startsWith(href);
                return (
                  <Link
                    key={league.slug}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${active ? "bg-primary" : "bg-muted-foreground"}`} />
                    {league.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              More
            </h3>
            {navItems.slice(2).map((item) => {
              const active = location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
