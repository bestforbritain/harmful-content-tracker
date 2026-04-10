"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { platformLabels } from "@/lib/platforms";
import type { Platform, PostStatus } from "@/generated/prisma/enums";
import { Loader2 } from "lucide-react";

type Tag = { id: string; name: string; color: string };

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("TWITTER");
  const [contentText, setContentText] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [notes, setNotes] = useState("");
  const [attribution, setAttribution] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaImage, setMetaImage] = useState("");
  const [embedHtml, setEmbedHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/posts/${id}`).then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([post, allTags]) => {
      setUrl(post.url);
      setPlatform(post.platform);
      setContentText(post.contentText || "");
      setScreenshotUrl(post.screenshotUrl || "");
      setDatePosted(
        post.datePosted ? post.datePosted.split("T")[0] : ""
      );
      setStatus(post.status);
      setNotes(post.notes || "");
      setAttribution(post.attribution || "");
      setMetaTitle(post.metaTitle || "");
      setMetaDescription(post.metaDescription || "");
      setMetaImage(post.metaImage || "");
      setEmbedHtml(post.embedHtml || "");
      setSelectedTags(post.tags.map((t: { tagId: string }) => t.tagId));
      setTags(allTags);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        platform,
        contentText: contentText || null,
        screenshotUrl: screenshotUrl || null,
        datePosted: datePosted || null,
        status,
        notes: notes || null,
        attribution: attribution || null,
        tagIds: selectedTags,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaImage: metaImage || null,
        embedHtml: embedHtml || null,
      }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-navy" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Content URL</h2>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="w-full border border-border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              >
                {Object.entries(platformLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Posted</label>
              <input
                type="date"
                value={datePosted}
                onChange={(e) => setDatePosted(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Attribution</label>
              <input
                type="text"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Content Text</label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Screenshot URL</label>
            <input
              type="url"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((tid) => tid !== tag.id)
                      : [...prev, tag.id]
                  )
                }
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  selectedTags.includes(tag.id)
                    ? "text-white ring-2 ring-offset-1 ring-navy"
                    : "text-white opacity-50 hover:opacity-75"
                }`}
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy text-white px-6 py-2 rounded-md font-medium hover:bg-navy-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Post"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 rounded-md border border-border hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
