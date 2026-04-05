import { pgTable, serial, text, integer, real, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appInfoTable = pgTable("app_info", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  developer: text("developer").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description").notNull(),
  version: text("version").notNull(),
  fileSize: text("file_size").notNull(),
  packageName: text("package_name").notNull(),
  category: text("category").notNull(),
  tags: json("tags").$type<string[]>().notNull().default([]),
  downloadCount: integer("download_count").notNull().default(0),
  minAndroidVersion: text("min_android_version").notNull(),
  targetAndroidVersion: text("target_android_version").notNull(),
  permissions: json("permissions").$type<string[]>().notNull().default([]),
  whatsNew: text("whats_new").notNull(),
  contentRating: text("content_rating").notNull(),
  downloadUrl: text("download_url").notNull(),
  iconUrl: text("icon_url").notNull(),
  releasedAt: timestamp("released_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  stars: integer("stars").notNull(),
  reviewText: text("review_text").notNull().default(""),
  helpful: integer("helpful").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAppInfoSchema = createInsertSchema(appInfoTable).omit({ id: true });
export type InsertAppInfo = z.infer<typeof insertAppInfoSchema>;
export type AppInfo = typeof appInfoTable.$inferSelect;

export const insertRatingSchema = createInsertSchema(ratingsTable).omit({ id: true, helpful: true, createdAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratingsTable.$inferSelect;
