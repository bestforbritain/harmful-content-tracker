import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Platform, PostStatus } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const tag = searchParams.get("tag");
  const platform = searchParams.get("platform") as Platform | null;
  const attribution = searchParams.get("attribution");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status") as PostStatus | null;

  const where: Record<string, unknown> = {};

  // Public routes only see published posts unless admin
  const session = await auth();
  if (!session?.user) {
    where.status = PostStatus.PUBLISHED;
  } else if (status) {
    where.status = status;
  }

  if (platform) where.platform = platform;
  if (attribution) where.attribution = { contains: attribution, mode: "insensitive" };
  if (search) {
    where.OR = [
      { contentText: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { metaTitle: { contains: search, mode: "insensitive" } },
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

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { dateFound: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    url,
    platform,
    contentText,
    screenshotUrl,
    datePosted,
    status,
    notes,
    attribution,
    tagIds,
    metaTitle,
    metaDescription,
    metaImage,
    embedHtml,
  } = body;

  const post = await prisma.post.create({
    data: {
      url,
      platform,
      contentText,
      screenshotUrl,
      datePosted: datePosted ? new Date(datePosted) : null,
      status: status || PostStatus.DRAFT,
      notes,
      attribution,
      metaTitle,
      metaDescription,
      metaImage,
      embedHtml,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(post, { status: 201 });
}
