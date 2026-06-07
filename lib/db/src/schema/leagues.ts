import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const leaguesTable = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  country: text("country").notNull(),
  logoUrl: text("logo_url").notNull(),
  currentSeason: text("current_season").notNull(),
  currentMatchweek: integer("current_matchweek").notNull().default(1),
});

export type League = typeof leaguesTable.$inferSelect;
export type InsertLeague = typeof leaguesTable.$inferInsert;
