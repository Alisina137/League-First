import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { leaguesTable } from "./leagues";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  nationality: text("nationality").notNull(),
  age: integer("age"),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  cleanSheets: integer("clean_sheets").notNull().default(0),
  appearances: integer("appearances").notNull().default(0),
  photoUrl: text("photo_url").notNull(),
  injured: boolean("injured").notNull().default(false),
});

export type Player = typeof playersTable.$inferSelect;
export type InsertPlayer = typeof playersTable.$inferInsert;
