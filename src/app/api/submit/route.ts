import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlatform } from "@/lib/platforms";
import { PostStatus } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  const { url, notes, submitterEmail, submitterName } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const platform = detectPlatform(url);

  const post = await prisma.post.create({
    data: {
      url,
      platform,
      notes: notes || null,
      submitterEmail: submitterEmail || null,
      submitterName: submitterName || null,
      status: PostStatus.DRAFT,
    },
  });

  return NextResponse.json({ id: post.id, success: true }, { status: 201 });
}
