import { Router } from "express";
import { db } from "@workspace/db";
import { appInfoTable, ratingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetAppInfoResponse,
  RecordDownloadResponse,
  GetRatingsQueryParams,
  GetRatingsResponse,
  SubmitRatingBody,
  GetRatingsSummaryResponse,
} from "@workspace/api-zod";

const router = Router();

// GET /app/info
router.get("/app/info", async (req, res) => {
  try {
    const [app] = await db.select().from(appInfoTable).limit(1);
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const ratingsResult = await db
      .select({
        avg: sql<number>`AVG(${ratingsTable.stars})::float`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ratingsTable);

    const avgRating = ratingsResult[0]?.avg ?? 0;
    const totalRatings = ratingsResult[0]?.count ?? 0;

    const response = {
      id: app.id,
      name: app.name,
      developer: app.developer,
      description: app.description,
      shortDescription: app.shortDescription,
      version: app.version,
      fileSize: app.fileSize,
      packageName: app.packageName,
      category: app.category,
      tags: app.tags,
      downloadCount: app.downloadCount,
      minAndroidVersion: app.minAndroidVersion,
      targetAndroidVersion: app.targetAndroidVersion,
      permissions: app.permissions,
      whatsNew: app.whatsNew,
      contentRating: app.contentRating,
      updatedAt: app.updatedAt.toISOString(),
      releasedAt: app.releasedAt.toISOString(),
      downloadUrl: app.downloadUrl,
      iconUrl: app.iconUrl,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings,
    };

    const parsed = GetAppInfoResponse.safeParse(response);
    if (!parsed.success) {
      req.log.error({ error: parsed.error }, "Response validation failed");
    }

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to get app info");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /app/download
router.post("/app/download", async (req, res) => {
  try {
    const [app] = await db.select().from(appInfoTable).limit(1);
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const [updated] = await db
      .update(appInfoTable)
      .set({ downloadCount: app.downloadCount + 1 })
      .where(eq(appInfoTable.id, app.id))
      .returning();

    const response = {
      downloadUrl: app.downloadUrl,
      downloadCount: updated?.downloadCount ?? app.downloadCount + 1,
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to record download");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /ratings
router.get("/ratings", async (req, res) => {
  try {
    const params = GetRatingsQueryParams.safeParse(req.query);
    const page = params.success ? (params.data.page ?? 1) : 1;
    const limit = params.success ? (params.data.limit ?? 10) : 10;
    const offset = (page - 1) * limit;

    const [countResult, ratingsResult] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(ratingsTable),
      db
        .select()
        .from(ratingsTable)
        .orderBy(sql`${ratingsTable.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    const response = {
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
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to get ratings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /ratings
router.post("/ratings", async (req, res) => {
  try {
    const parsed = SubmitRatingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error });
      return;
    }

    const { userName, stars, reviewText } = parsed.data;

    if (stars < 1 || stars > 5) {
      res.status(400).json({ error: "Stars must be between 1 and 5" });
      return;
    }

    const [rating] = await db
      .insert(ratingsTable)
      .values({ userName, stars, reviewText })
      .returning();

    if (!rating) {
      res.status(500).json({ error: "Failed to insert rating" });
      return;
    }

    res.status(201).json({
      id: rating.id,
      userName: rating.userName,
      stars: rating.stars,
      reviewText: rating.reviewText,
      helpful: rating.helpful,
      createdAt: rating.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit rating");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /ratings/summary
router.get("/ratings/summary", async (req, res) => {
  try {
    const [summary] = await db
      .select({
        avg: sql<number>`ROUND(AVG(${ratingsTable.stars})::numeric, 1)::float`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ratingsTable);

    const breakdownResult = await db
      .select({
        stars: ratingsTable.stars,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ratingsTable)
      .groupBy(ratingsTable.stars);

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
    req.log.error({ err }, "Failed to get ratings summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
