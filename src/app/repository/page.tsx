"use client";

import { useState, useEffect, useCallback } from "react";
import PostCard from "@/components/PostCard";
import { platformLabels } from "@/lib/platforms";
import type { Platform } from "@/generated/prisma/enums";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type Tag = { id: string; name: string; color: string; _count: { posts: number } };
type PostWithTags = {
  id: string;
  url: string;
  platform: Platform;
  contentText: string | null;
  screenshotUrl: string | null;
  metaImage: string | null;
  metaTitle: string | null;
  dateFound: string;
  datePosted: string | null;
  attribution: string | null;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
};

export default function RepositoryPage() {
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedAttribution, setSelectedAttribution] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchPosts = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedPlatform) params.set("platform", selectedPlatform);
    if (selectedAttribution) params.set("attribution", selectedAttribution);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/posts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts);
        setTotal(d.total);
        setTotalPages(d.totalPages);
      });
  }, [page, search, selectedTag, selectedPlatform, selectedAttribution, dateFrom, dateTo]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags);
  }, []);

  function clearFilters() {
    setSearch("");
    setSelectedTag("");
    setSelectedPlatform("");
    setSelectedAttribution("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  }

  const exportUrl = (() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedPlatform) params.set("platform", selectedPlatform);
    if (selectedAttribution) params.set("attribution", selectedAttribution);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/export?${params}`;
  })();

  const hasActiveFilters = selectedTag || selectedPlatform || selectedAttribution || dateFrom || dateTo;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Repository</h1>
        <p className="text-muted">
          {total} pieces of harmful content documented by researchers
        </p>
      </div>

      {/* Search and filter bar */}
      <div className="bg-card-bg border border-border rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content..."
              className="w-full border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-md border text-sm flex items-center gap-1 ${
              hasActiveFilters
                ? "border-navy bg-navy text-white"
                : "border-border hover:bg-gray-50"
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="ml-1"
              >
                <X size={14} />
              </button>
            )}
          </button>
          <a
            href={exportUrl}
            className="px-3 py-2 rounded-md border border-border text-sm flex items-center gap-1 hover:bg-gray-50"
            title="Export as CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">CSV</span>
          </a>
        </form>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Tag
              </label>
              <select
                value={selectedTag}
                onChange={(e) => {
                  setSelectedTag(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t._count.posts})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Platform
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => {
                  setSelectedPlatform(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All platforms</option>
                {Object.entries(platformLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Attribution
              </label>
              <input
                type="text"
                value={selectedAttribution}
                onChange={(e) => {
                  setSelectedAttribution(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Russia"
                className="w-full border border-border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results grid */}
      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded border border-border hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-muted px-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded border border-border hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-muted">
          <p className="text-lg mb-2">No content found</p>
          <p className="text-sm">
            {hasActiveFilters
              ? "Try adjusting your filters."
              : "No published content yet."}
          </p>
        </div>
      )}
    </div>
  );
}
