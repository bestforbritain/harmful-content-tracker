import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@/generated/prisma/enums";
import { Shield, Search, BarChart3, Send } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let totalPosts = 0;
  try {
    totalPosts = await prisma.post.count({
      where: { status: PostStatus.PUBLISHED },
    });
  } catch {
    // DB not available yet
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Harmful Content Tracker
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-2">
            Best for Britain&apos;s InfoCrisis Project
          </p>
          <p className="text-white/60 max-w-2xl mx-auto mb-8">
            A public repository of harmful online content found by researchers
            &mdash; documenting disinformation, hate speech, and coordinated
            inauthentic behaviour across social media platforms.
          </p>

          {/* Counter */}
          {totalPosts > 0 && (
            <div className="inline-flex items-center gap-3 bg-bfb-red/90 rounded-lg px-8 py-4 mb-8">
              <span className="text-4xl font-bold">
                {totalPosts.toLocaleString()}
              </span>
              <span className="text-left text-sm leading-tight">
                pieces of harmful
                <br />
                content tracked so far
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/repository"
              className="bg-white text-navy font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse the Repository
            </Link>
            <Link
              href="/dashboard"
              className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              View Statistics
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-12 text-foreground">
          What is the Harmful Content Tracker?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: <Shield className="text-bfb-red" size={32} />,
              title: "Document",
              desc: "Researchers identify and document harmful content found across social media platforms.",
            },
            {
              icon: <Search className="text-bfb-red" size={32} />,
              title: "Categorise",
              desc: "Content is tagged by type — from disinformation and hate speech to AI-generated content and foreign state actor activity.",
            },
            {
              icon: <BarChart3 className="text-bfb-red" size={32} />,
              title: "Analyse",
              desc: "Aggregate data reveals patterns and trends in harmful content across platforms and over time.",
            },
            {
              icon: <Send className="text-bfb-red" size={32} />,
              title: "Report",
              desc: "Members of the public can flag harmful content they encounter for researchers to review.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="text-center p-6 bg-card-bg rounded-lg border border-border"
            >
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-dark text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Seen harmful content?</h2>
          <p className="text-white/70 mb-6">
            If you&apos;ve encountered harmful content online, you can report it
            to our research team for review and inclusion in the tracker.
          </p>
          <Link
            href="/submit"
            className="inline-block bg-bfb-red hover:bg-bfb-red-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Report Content
          </Link>
        </div>
      </section>
    </div>
  );
}
