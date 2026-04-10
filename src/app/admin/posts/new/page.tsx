"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { platformLabels } from "@/lib/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { Loader2, ExternalLink, ImageIcon } from "lucide-react";

type Tag = { id: string; name: string; color: string };
type PreviewData = {
  platform: Platform;
  metadata: {
    title: string | null;
    description: string | null;
    image: string | null;
    embedHtml: string | null;
  };
};

export default function NewPostPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("TWITTER");
  const [contentText, setContentText] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [notes, setNotes] = useState("");
  const [attribution, setAttribution] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  async function fetchPreview() {
    if (!url) return;
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        setPlatform(data.platform);
      }
    } catch {
      // Preview failed, that's okay
    }
    setLoadingPreview(false);
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (res.ok) {
      const tag = await res.json();
      setTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => [...prev, tag.id]);
      setNewTagName("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/posts", {
      method: "POST",
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
        metaTitle: preview?.metadata.title || null,
        metaDescription: preview?.metadata.description || null,
        metaImage: preview?.metadata.image || null,
        embedHtml: preview?.metadata.embedHtml || null,
      }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add New Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL + Preview */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Content URL</h2>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/user/status/..."
              required
              className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              type="button"
              onClick={fetchPreview}
              disabled={!url || loadingPreview}
              className="bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-navy-dark disabled:opacity-50 flex items-center gap-2"
            >
              {loadingPreview ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ExternalLink size={16} />
              )}
              Fetch Preview
            </button>
          </div>

          {/* Preview card */}
          {preview?.metadata && (
            <div className="mt-4 border border-border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-muted">
                Preview from {platformLabels[preview.platform]}
              </div>
              {preview.metadata.embedHtml ? (
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{
                    __html: preview.metadata.embedHtml,
                  }}
                />
              ) : (
                <div className="p-4 flex gap-4">
                  {preview.metadata.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.metadata.image}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div>
                    {preview.metadata.title && (
                      <div className="font-medium">
                        {preview.metadata.title}
                      </div>
                    )}
                    {preview.metadata.description && (
                      <div className="text-sm text-muted mt-1">
                        {preview.metadata.description}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details */}
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
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "DRAFT" | "PUBLISHED")
                }
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Date Posted (if known)
              </label>
              <input
                type="date"
                value={datePosted}
                onChange={(e) => setDatePosted(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Attribution
              </label>
              <input
                type="text"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder='e.g. "Suspected Russia"'
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Content Text
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={3}
              placeholder="Paste or type the content text..."
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              <span className="flex items-center gap-1">
                <ImageIcon size={14} />
                Screenshot URL
              </span>
            </label>
            <input
              type="url"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted mt-1">
              Upload screenshots to an image host (e.g. S3, R2, Imgur) and paste
              the URL here.
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Researcher Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes and commentary..."
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((id) => id !== tag.id)
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
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name..."
              className="flex-1 border border-border rounded-md px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createTag();
                }
              }}
            />
            <button
              type="button"
              onClick={createTag}
              className="bg-gray-100 border border-border px-4 py-2 rounded-md text-sm hover:bg-gray-200"
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy text-white px-6 py-2 rounded-md font-medium hover:bg-navy-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Post"}
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
