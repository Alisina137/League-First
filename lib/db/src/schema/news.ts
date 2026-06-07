import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";

export const newsTable = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  imageUrl: text("image_url").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id),
  category: text("category").notNull().default("general"),
  url: text("url"),
});

export type News = typeof newsTable.$inferSelect;
export type InsertNews = typeof newsTable.$inferInsert;
