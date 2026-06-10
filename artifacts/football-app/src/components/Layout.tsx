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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { LEAGUE_LOGOS } from "../data/leagueLogos";

const TOP_TABS = [
  { label: "Standings", href: "/standings", icon: Trophy },
  { label: "Teams",     href: "/teams",     icon: Users },
  { label: "Players",   href: "/players",   icon: User },
  { label: "Transfers", href: "/transfers", icon: ArrowRightLeft },
  { label: "News",      href: "/news",      icon: Newspaper },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
];

const SIDEBAR_NAV = [
  { label: "Home",     href: "/",        icon: Home },
  { label: "Matches",  href: "/matches", icon: Calendar },
  { label: "Settings", href: "/settings",icon: Settings },
];

function LeagueLogo({
  src,
  name,
  active,
}: {
  src: string;
  name: string;
  active: boolean;
}) {
  const [errored, setErrored] = useState(false);
  return errored ? (
    <span className="w-6 h-6 flex items-center justify-center text-base flex-shrink-0">⚽</span>
  ) : (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`w-6 h-6 object-contain flex-shrink-0 transition-transform duration-200 ${
        active ? "scale-110" : "group-hover:scale-110"
      }`}
      style={{ imageRendering: "crisp-edges" }}
    />
  );
}

function LeagueList({
  onNavigate,
  location,
}: {
  onNavigate?: () => void;
  location: string;
}) {
  return (
    <div className="space-y-0.5">
      {LEAGUE_LOGOS.map((league) => {
        const href = `/league/${league.slug}`;
        const active = location.startsWith(href);
        return (
          <Link
            key={league.slug}
            href={href}
            onClick={onNavigate}
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 text-sm ${
              active
                ? "bg-primary/15 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <LeagueLogo src={league.logo} name={league.name} active={active} />
            <span className="truncate">{league.name}</span>
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTabActive = (href: string) =>
    href === "/" ? location === href : location.startsWith(href);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card flex-shrink-0">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="w-5 h-5" />
            <span>Football Hub</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-5">
          {/* Core nav */}
          <div className="space-y-0.5">
            {SIDEBAR_NAV.map((item) => {
              const active = isTabActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Competitions */}
          <div>
            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Competitions
            </p>
            <LeagueList location={location} />
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Trophy className="w-5 h-5" />
            <span>Football Hub</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative w-64 bg-card border-r border-border flex flex-col overflow-y-auto z-10">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-bold text-lg text-primary"
                >
                  <Trophy className="w-5 h-5" />
                  <span>Football Hub</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-5">
                <div className="space-y-0.5">
                  {SIDEBAR_NAV.map((item) => {
                    const active = isTabActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                          active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
                <div>
                  <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Competitions
                  </p>
                  <LeagueList
                    location={location}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ── Sticky top tab bar ── */}
        <nav className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
          <div
            className="flex items-center gap-1 px-3 md:px-4 py-2.5 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {TOP_TABS.map((tab) => {
              const active = isTabActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold
                    whitespace-nowrap flex-shrink-0 transition-all duration-200
                    ${active
                      ? "bg-[#00b383] text-[#0a1a0f] shadow-[0_0_12px_rgba(0,179,131,0.4)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary hover:shadow-[0_0_8px_rgba(0,179,131,0.15)]"
                    }
                  `}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
