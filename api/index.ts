import express from "express";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, sql } from "drizzle-orm";
import { pgTable, serial, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { z } from "zod";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const appInfoTable = pgTable("app_info", {
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
  whatsNew: text("whats_new").notNull().default(""),
  contentRating: text("content_rating").notNull().default("Everyone"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  releasedAt: timestamp("released_at").notNull().defaultNow(),
  downloadUrl: text("download_url").notNull(),
  iconUrl: text("icon_url").notNull(),
});

const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  stars: integer("stars").notNull(),
  reviewText: text("review_text").notNull(),
  helpful: integer("helpful").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const db = drizzle(pool, { schema: { appInfoTable, ratingsTable } });

const SubmitRatingBody = z.object({
  userName: z.string().min(2).max(50),
  stars: z.number().min(1).max(5),
  reviewText: z.string().min(5).max(500),
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/app/info", async (_req, res) => {
  try {
    const [appRow] = await db.select().from(appInfoTable).limit(1);
    if (!appRow) { res.status(404).json({ error: "App not found" }); return; }

    const [ratingsResult] = await db.select({
      avg: sql<number>`COALESCE(AVG(${ratingsTable.stars})::float, 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(ratingsTable);

    res.json({
      id: appRow.id,
      name: appRow.name,
      developer: appRow.developer,
      description: appRow.description,
      shortDescription: appRow.shortDescription,
      version: appRow.version,
      fileSize: appRow.fileSize,
      packageName: appRow.packageName,
      category: appRow.category,
      tags: appRow.tags,
      downloadCount: appRow.downloadCount,
      minAndroidVersion: appRow.minAndroidVersion,
      targetAndroidVersion: appRow.targetAndroidVersion,
      permissions: appRow.permissions,
      whatsNew: appRow.whatsNew,
      contentRating: appRow.contentRating,
      updatedAt: appRow.updatedAt.toISOString(),
      releasedAt: appRow.releasedAt.toISOString(),
      downloadUrl: appRow.downloadUrl,
      iconUrl: appRow.iconUrl,
      averageRating: Math.round((ratingsResult?.avg ?? 0) * 10) / 10,
      totalRatings: ratingsResult?.count ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/app/download", async (_req, res) => {
  try {
    const [appRow] = await db.select().from(appInfoTable).limit(1);
    if (!appRow) { res.status(404).json({ error: "App not found" }); return; }

    const [updated] = await db
      .update(appInfoTable)
      .set({ downloadCount: appRow.downloadCount + 1 })
      .where(eq(appInfoTable.id, appRow.id))
      .returning();

    res.json({
      downloadUrl: appRow.downloadUrl,
      downloadCount: updated?.downloadCount ?? appRow.downloadCount + 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/ratings", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [countResult, ratingsResult] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(ratingsTable),
      db.select().from(ratingsTable)
        .orderBy(sql`${ratingsTable.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    res.json({
      ratings: ratingsResult.map((r) => ({
        id: r.id,
        userName: r.userName,
        stars: r.stars,
        reviewText: r.reviewText,
        helpful: r.helpful,
        createdAt: r.createdAt.toISOString(),
      })),
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/ratings", async (req, res) => {
  try {
    const parsed = SubmitRatingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }

    const { userName, stars, reviewText } = parsed.data;

    const [rating] = await db
      .insert(ratingsTable)
      .values({ userName, stars, reviewText })
      .returning();

    if (!rating) { res.status(500).json({ error: "Failed to insert rating" }); return; }

    res.status(201).json({
      id: rating.id,
      userName: rating.userName,
      stars: rating.stars,
      reviewText: rating.reviewText,
      helpful: rating.helpful,
      createdAt: rating.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/ratings/summary", async (_req, res) => {
  try {
    const [summary] = await db.select({
      avg: sql<number>`ROUND(COALESCE(AVG(${ratingsTable.stars}), 0)::numeric, 1)::float`,
      count: sql<number>`COUNT(*)::int`,
    }).from(ratingsTable);

    const breakdownResult = await db.select({
      stars: ratingsTable.stars,
      count: sql<number>`COUNT(*)::int`,
    }).from(ratingsTable).groupBy(ratingsTable.stars);

    const breakdown: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
    for (const row of breakdownResult) {
      breakdown[String(row.stars)] = row.count;
    }

    res.json({
      averageRating: summary?.avg ?? 0,
      totalRatings: summary?.count ?? 0,
      breakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
