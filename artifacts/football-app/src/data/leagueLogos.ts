export interface LeagueLogo {
  slug: string;
  name: string;
  logo: string;
  country: string;
}

export const LEAGUE_LOGOS: LeagueLogo[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    country: "England",
    logo: "https://crests.football-data.org/PL.png",
  },
  {
    slug: "la-liga",
    name: "La Liga",
    country: "Spain",
    logo: "https://crests.football-data.org/PD.png",
  },
  {
    slug: "serie-a",
    name: "Serie A",
    country: "Italy",
    logo: "https://crests.football-data.org/SA.png",
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    logo: "https://crests.football-data.org/BL1.png",
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    country: "France",
    logo: "https://crests.football-data.org/FL1.png",
  },
  {
    slug: "champions-league",
    name: "Champions League",
    country: "Europe",
    logo: "https://crests.football-data.org/CL.png",
  },
  {
    slug: "europa-league",
    name: "Europa League",
    country: "Europe",
    logo: "https://crests.football-data.org/EL.png",
  },
  {
    slug: "saudi-pro-league",
    name: "Saudi Pro League",
    country: "Saudi Arabia",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/Saudi_Professional_League_logo.svg/200px-Saudi_Professional_League_logo.svg.png",
  },
  {
    slug: "mls",
    name: "MLS",
    country: "USA",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/MLS_crest_logo_RGB_gradient.svg/200px-MLS_crest_logo_RGB_gradient.svg.png",
  },
  {
    slug: "world-cup",
    name: "FIFA World Cup",
    country: "World",
    logo: "https://crests.football-data.org/WC.png",
  },
];

export const LEAGUE_LOGO_MAP: Record<string, string> = Object.fromEntries(
  LEAGUE_LOGOS.map((l) => [l.slug, l.logo])
);
