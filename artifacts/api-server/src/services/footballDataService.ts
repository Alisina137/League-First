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
} from "./providers/footballDataProvider";
