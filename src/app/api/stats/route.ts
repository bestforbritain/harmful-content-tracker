import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@/generated/prisma/enums";

export async function GET() {
  const [
    totalPosts,
    platformCounts,
    tagCounts,
    timeline,
    recentPosts,
    tagCooccurrence,
  ] = await Promise.all([
    prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),

    prisma.post.groupBy({
      by: ["platform"],
      _count: true,
      where: { status: PostStatus.PUBLISHED },
      orderBy: { _count: { platform: "desc" } },
    }),

    prisma.$queryRaw`
      SELECT t.name, t.color, COUNT(pt."postId")::int as count
      FROM "Tag" t
      JOIN "PostTag" pt ON t.id = pt."tagId"
      JOIN "Post" p ON pt."postId" = p.id
      WHERE p.status = 'PUBLISHED'
      GROUP BY t.id, t.name, t.color
      ORDER BY count DESC
    ` as Promise<Array<{ name: string; color: string; count: number }>>,

    prisma.$queryRaw`
      SELECT DATE_TRUNC('week', "dateFound") as week, COUNT(*)::int as count
      FROM "Post"
      WHERE status = 'PUBLISHED'
      GROUP BY week
      ORDER BY week ASC
    ` as Promise<Array<{ week: Date; count: number }>>,

    prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED },
      include: { tags: { include: { tag: true } } },
      orderBy: { dateFound: "desc" },
      take: 5,
    }),

    prisma.$queryRaw`
      SELECT t1.name as tag1, t2.name as tag2, COUNT(*)::int as count
      FROM "PostTag" pt1
      JOIN "PostTag" pt2 ON pt1."postId" = pt2."postId" AND pt1."tagId" < pt2."tagId"
      JOIN "Tag" t1 ON pt1."tagId" = t1.id
      JOIN "Tag" t2 ON pt2."tagId" = t2.id
      JOIN "Post" p ON pt1."postId" = p.id
      WHERE p.status = 'PUBLISHED'
      GROUP BY t1.name, t2.name
      HAVING COUNT(*) > 0
      ORDER BY count DESC
      LIMIT 20
    ` as Promise<Array<{ tag1: string; tag2: string; count: number }>>,
  ]);

  return NextResponse.json({
    totalPosts,
    platformCounts: platformCounts.map((p) => ({
      platform: p.platform,
      count: p._count,
    })),
    tagCounts,
    timeline: timeline.map((t) => ({
      week: t.week,
      count: t.count,
    })),
    recentPosts,
    tagCooccurrence,
  });
}
