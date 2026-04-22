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
    contentText: string | null;
    datePosted: string | null;
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
  const [archiveStatus, setArchiveStatus] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  // manual=true when the user explicitly clicks "Fetch Preview" — always overwrite
  // manual=false for the auto-fetch on paste — only fill empty fields
  async function fetchPreview(fetchUrl?: string, manual = false) {
    const targetUrl = fetchUrl || url;
    if (!targetUrl) return;
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (res.ok) {
        const data: PreviewData = await res.json();
        setPreview(data);
        setPlatform(data.platform);

        // Auto-populate fields — manual fetch always overwrites, auto-paste only fills blanks
        if (data.metadata.contentText && (manual || !contentText)) {
          setContentText(data.metadata.contentText);
        }
        if (data.metadata.datePosted && (manual || !datePosted)) {
          setDatePosted(data.metadata.datePosted);
        }
        if (data.metadata.image && (manual || !screenshotUrl)) {
          setScreenshotUrl(data.metadata.image);
        }
      }
    } catch {
      // Preview failed, that's okay
    }
    setLoadingPreview(false);
  }

  // Auto-fetch preview when a URL is pasted
  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newUrl = e.target.value;
    setUrl(newUrl);

    // Detect paste: if the value looks like a complete URL, auto-fetch
    try {
      const parsed = new URL(newUrl);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        // Debounce: only fetch if this looks like a freshly pasted full URL
        if (newUrl.length > 15 && !url) {
          fetchPreview(newUrl);
        }
      }
    } catch {
      // Not a valid URL yet, that's fine
    }
  }

  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    try {
      new URL(pasted);
      // Let the onChange fire first, then fetch
      setTimeout(() => fetchPreview(pasted), 100);
    } catch {
      // Not a URL
    }
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
    setArchiveStatus("");

    // Archive the screenshot/preview image to our own storage
    let archivedScreenshotUrl = screenshotUrl || null;
    const imageToArchive = screenshotUrl || preview?.metadata.image;
    if (imageToArchive) {
      setArchiveStatus("Archiving screenshot...");
      try {
        const archiveRes = await fetch("/api/archive-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageToArchive,
            postId: Date.now().toString(),
          }),
        });
        if (archiveRes.ok) {
          const { url: archivedUrl } = await archiveRes.json();
          archivedScreenshotUrl = archivedUrl;
          setArchiveStatus("Screenshot archived successfully");
        } else {
          const errData = await archiveRes.json();
          setArchiveStatus(`Archive failed: ${errData.error}`);
        }
      } catch (e) {
        setArchiveStatus(`Archive error: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        platform,
        contentText: contentText || null,
        screenshotUrl: archivedScreenshotUrl,
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
              onChange={handleUrlChange}
              onPaste={handleUrlPaste}
              placeholder="Paste a URL — fields will auto-populate..."
              required
              className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              type="button"
              onClick={() => fetchPreview(undefined, true)}
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
              <label className="block text-sm font-medium mb-1">Platform <span className="text-xs text-muted font-normal">(auto-detected)</span></label>
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
                Date Posted <span className="text-xs text-muted font-normal">(auto-detected if available)</span>
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
              Content Text <span className="text-xs text-muted font-normal">(auto-populated from URL)</span>
            </label>
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={3}
              placeholder="Auto-populated when URL is fetched, or type manually..."
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
              Auto-populated with the OG image if available. You can also upload
              a screenshot to an image host and paste the URL here.
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
        <div className="flex flex-col gap-2">
          {archiveStatus && (
            <div className={`text-sm px-3 py-2 rounded ${
              archiveStatus.includes("success") ? "bg-green-50 text-green-700" :
              archiveStatus.includes("fail") || archiveStatus.includes("error") || archiveStatus.includes("Error") ? "bg-red-50 text-red-700" :
              "bg-blue-50 text-blue-700"
            }`}>
              {archiveStatus}
            </div>
          )}
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
        </div>
      </form>
    </div>
  );
}
