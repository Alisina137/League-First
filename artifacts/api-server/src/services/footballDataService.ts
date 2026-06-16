export {
  COMPETITIONS,
  ForbiddenError,
  getStandings,
  getMatches,
  getScorers,
  getTeams,
  invalidateCache,
  type LiveStanding,
  type LiveMatch,
  type LiveScorer,
  type LiveTeam,
} from "./providers/competitionRouter";

export {
  getAllLiveMatches,
  getAllUpcomingMatches,
  getMatchLineup as fdGetMatchLineup,
  getH2H as fdGetH2H,
  type LineupPlayer,
  type TeamLineup,
} from "./providers/footballDataProvider";

export {
  getMatchLineup as afGetMatchLineup,
  getH2H as afGetH2H,
} from "./providers/apiFootballProvider";
