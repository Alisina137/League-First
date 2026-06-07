import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { leaguesTable } from "./leagues";

export const standingsTable = pgTable("standings", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  position: integer("position").notNull(),
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
  drawn: integer("drawn").notNull().default(0),
  lost: integer("lost").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  goalDifference: integer("goal_difference").notNull().default(0),
  points: integer("points").notNull().default(0),
  form: text("form").notNull().default(""),
});

export type Standing = typeof standingsTable.$inferSelect;
export type InsertStanding = typeof standingsTable.$inferInsert;
