import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TAG_COLORS } from "@/lib/tagColors";

// One-time endpoint to assign random accessible colors to grey tags.
// DELETE this file after running once.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const greyTags = await prisma.tag.findMany({
    where: { color: "#6B7280" },
  });

  const updates = await Promise.all(
    greyTags.map((tag, i) =>
      prisma.tag.update({
        where: { id: tag.id },
        data: { color: TAG_COLORS[i % TAG_COLORS.length] },
      })
    )
  );

  return NextResponse.json({
    fixed: updates.length,
    tags: updates.map((t) => ({ name: t.name, color: t.color })),
  });
}
