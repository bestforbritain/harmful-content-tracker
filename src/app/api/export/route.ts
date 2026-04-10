import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PostStatus, Platform } from "@/generated/prisma/enums";
import { platformLabels } from "@/lib/platforms";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const platform = searchParams.get("platform") as Platform | null;
  const attribution = searchParams.get("attribution");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = { status: PostStatus.PUBLISHED };

  if (platform) where.platform = platform;
  if (attribution) where.attribution = { contains: attribution, mode: "insensitive" };
  if (search) {
    where.OR = [
      { contentText: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
    ];
  }
  if (dateFrom || dateTo) {
    where.dateFound = {};
    if (dateFrom) (where.dateFound as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.dateFound as Record<string, unknown>).lte = new Date(dateTo);
  }
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const posts = await prisma.post.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { dateFound: "desc" },
  });

  const headers = [
    "ID",
    "URL",
    "Platform",
    "Content",
    "Tags",
    "Attribution",
    "Date Found",
    "Date Posted",
    "Notes",
  ];

  const escapeCSV = (val: string | null | undefined) => {
    if (!val) return "";
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = posts.map((post) => [
    post.id,
    post.url,
    platformLabels[post.platform],
    escapeCSV(post.contentText),
    escapeCSV(post.tags.map((t) => t.tag.name).join("; ")),
    escapeCSV(post.attribution),
    post.dateFound.toISOString().split("T")[0],
    post.datePosted?.toISOString().split("T")[0] || "",
    escapeCSV(post.notes),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="harmful-content-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
