import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { leaguesTable } from "./leagues";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").notNull().references(() => teamsTable.id),
  awayTeamId: integer("away_team_id").notNull().references(() => teamsTable.id),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  status: text("status").notNull().default("upcoming"),
  minute: integer("minute"),
  matchDate: timestamp("match_date", { withTimezone: true }).notNull(),
  matchweek: integer("matchweek").notNull().default(1),
  venue: text("venue"),
});

export type Match = typeof matchesTable.$inferSelect;
export type InsertMatch = typeof matchesTable.$inferInsert;
