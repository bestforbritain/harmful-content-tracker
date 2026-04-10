"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { platformLabels } from "@/lib/platforms";
import type { Platform, PostStatus } from "@/generated/prisma/enums";
import { Check, Loader2 } from "lucide-react";

type PostWithTags = {
  id: string;
  url: string;
  platform: Platform;
  contentText: string | null;
  metaTitle: string | null;
  status: PostStatus;
  dateFound: string;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
};

type Tag = { id: string; name: string; color: string };

export default function BulkTagPage() {
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [action, setAction] = useState<"add" | "remove">("add");
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/posts?limit=100")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts));
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  function togglePost(id: string) {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map((p) => p.id));
    }
  }

  async function applyTags() {
    if (!selectedPosts.length || !selectedTags.length) return;
    setApplying(true);
    setSuccess(false);
    await fetch("/api/posts/bulk-tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postIds: selectedPosts,
        tagIds: selectedTags,
        action,
      }),
    });

    // Refresh posts
    const res = await fetch("/api/posts?limit=100");
    const data = await res.json();
    setPosts(data.posts);
    setSelectedPosts([]);
    setSelectedTags([]);
    setApplying(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Bulk Tag Management</h1>

      {/* Tag selection bar */}
      <div className="bg-card-bg border border-border rounded-lg p-4 mb-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">
              Select tags to {action}:
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
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
                      : "text-white opacity-40 hover:opacity-70"
                  }`}
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as "add" | "remove")}
              className="border border-border rounded px-2 py-1 text-sm"
            >
              <option value="add">Add tags</option>
              <option value="remove">Remove tags</option>
            </select>
            <button
              onClick={applyTags}
              disabled={
                applying || !selectedPosts.length || !selectedTags.length
              }
              className="bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-navy-dark disabled:opacity-50 flex items-center gap-2"
            >
              {applying ? (
                <Loader2 size={16} className="animate-spin" />
              ) : success ? (
                <Check size={16} />
              ) : null}
              Apply to {selectedPosts.length} posts
            </button>
          </div>
        </div>
      </div>

      {/* Posts table */}
      <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedPosts.length === posts.length && posts.length > 0
                  }
                  onChange={selectAll}
                  className="rounded"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium">Content</th>
              <th className="text-left px-4 py-3 font-medium">Platform</th>
              <th className="text-left px-4 py-3 font-medium">Current Tags</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.map((post) => (
              <tr
                key={post.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedPosts.includes(post.id) ? "bg-blue-50" : ""
                }`}
                onClick={() => togglePost(post.id)}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPosts.includes(post.id)}
                    onChange={() => togglePost(post.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {post.metaTitle || post.contentText || post.url}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {platformLabels[post.platform]}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((pt) => (
                      <span
                        key={pt.tag.id}
                        className="px-1.5 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: pt.tag.color }}
                      >
                        {pt.tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {format(new Date(post.dateFound), "d MMM yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
