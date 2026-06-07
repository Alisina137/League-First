import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const injuriesTable = pgTable("injuries", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  playerPhoto: text("player_photo").notNull(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  injury: text("injury").notNull(),
  expectedReturn: text("expected_return"),
  status: text("status").notNull().default("injured"),
});

export type Injury = typeof injuriesTable.$inferSelect;
export type InsertInjury = typeof injuriesTable.$inferInsert;
