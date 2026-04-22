import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomTagColor } from "@/lib/tagColors";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, color } = await request.json();

  const tag = await prisma.tag.create({
    data: { name, color: color || randomTagColor() },
  });

  return NextResponse.json(tag, { status: 201 });
}
