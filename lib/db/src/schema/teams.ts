import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  country: text("country").notNull(),
  founded: integer("founded"),
  stadium: text("stadium"),
  manager: text("manager"),
});

export type Team = typeof teamsTable.$inferSelect;
export type InsertTeam = typeof teamsTable.$inferInsert;
