import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postIds, tagIds, action } = await request.json();

  if (!postIds?.length || !tagIds?.length) {
    return NextResponse.json(
      { error: "postIds and tagIds are required" },
      { status: 400 }
    );
  }

  if (action === "remove") {
    await prisma.postTag.deleteMany({
      where: {
        postId: { in: postIds },
        tagId: { in: tagIds },
      },
    });
  } else {
    // Add tags - use createMany with skipDuplicates
    const data = postIds.flatMap((postId: string) =>
      tagIds.map((tagId: string) => ({ postId, tagId }))
    );
    await prisma.postTag.createMany({
      data,
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true });
}
