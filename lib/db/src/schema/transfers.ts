import { pgTable, serial, text, integer, date } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  playerPhoto: text("player_photo").notNull(),
  fromTeam: text("from_team").notNull(),
  fromTeamLogo: text("from_team_logo").notNull(),
  toTeam: text("to_team").notNull(),
  toTeamLogo: text("to_team_logo").notNull(),
  fee: text("fee").notNull(),
  transferDate: date("transfer_date", { mode: "string" }).notNull(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  type: text("type").notNull().default("permanent"),
});

export type Transfer = typeof transfersTable.$inferSelect;
export type InsertTransfer = typeof transfersTable.$inferInsert;
