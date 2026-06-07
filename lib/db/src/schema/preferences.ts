import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const preferencesTable = pgTable("preferences", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  favoriteLeagueSlugs: text("favorite_league_slugs").array().notNull().default([]),
  favoriteTeamIds: text("favorite_team_ids").array().notNull().default([]),
  favoritePlayerIds: text("favorite_player_ids").array().notNull().default([]),
});

export type Preference = typeof preferencesTable.$inferSelect;
export type InsertPreference = typeof preferencesTable.$inferInsert;
