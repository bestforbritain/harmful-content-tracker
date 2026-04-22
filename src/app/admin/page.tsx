"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { platformLabels } from "@/lib/platforms";
import { Plus, Tags, ExternalLink, Pencil, Trash2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { Platform, PostStatus } from "@/generated/prisma/enums";

type PostWithTags = {
  id: string;
  url: string;
  platform: Platform;
  contentText: string | null;
  metaTitle: string | null;
  status: PostStatus;
  dateFound: string;
  attribution: string | null;
  submitterEmail: string | null;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
};

type TagWithCount = {
  id: string;
  name: string;
  color: string;
  _count: { posts: number };
};

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const [posts, setPosts] = useState<PostWithTags[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const fetchPosts = useCallback(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (platformFilter) params.set("platform", platformFilter);
    if (tagFilter) params.set("tag", tagFilter);
    fetch(`/api/posts?${params}`)
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts); setTotal(d.total); });
  }, [page, search, statusFilter, platformFilter, tagFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setTags);
    fetch("/api/posts?limit=1").then((r) => r.json()).then((d) => setTotalAll(d.total));
  }, []);

  function resetPage() { setPage(1); }

  function clearFilters() {
    setSearch("");
    setSearchInput("");
    setStatusFilter("");
    setPlatformFilter("");
    setTagFilter("");
    setPage(1);
  }

  const hasFilters = search || statusFilter || platformFilter || tagFilter;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    resetPage();
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => prev - 1);
    setTotalAll((prev) => prev - 1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted text-sm">{totalAll} total submissions</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/posts/new"
            className="bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-navy-dark transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Post
          </Link>
          <Link
            href="/admin/bulk-tag"
            className="bg-card-bg border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Tags size={16} /> Bulk Tag
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card-bg border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-navy">{totalAll}</div>
          <div className="text-xs text-muted">Total Posts</div>
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-bfb-red">
            {posts.filter((p) => p.status === "DRAFT").length}
          </div>
          <div className="text-xs text-muted">Drafts in View</div>
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {posts.filter((p) => p.status === "PUBLISHED").length}
          </div>
          <div className="text-xs text-muted">Published in View</div>
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-navy">{tags.length}</div>
          <div className="text-xs text-muted">Tags</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card-bg border border-border rounded-lg p-4 mb-4 space-y-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search content, URL, notes..."
              className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <button
            type="submit"
            className="bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-navy-dark"
          >
            Search
          </button>
        </form>

        {/* Dropdown filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); resetPage(); }}
            className="border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All platforms</option>
            {Object.entries(platformLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(e) => { setTagFilter(e.target.value); resetPage(); }}
            className="border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-muted hover:text-red-600 transition-colors"
            >
              <X size={14} /> Clear filters
            </button>
          )}

          {total > 0 && (
            <span className="ml-auto text-sm text-muted">
              Showing {from}–{to} of {total}
            </span>
          )}
        </div>
      </div>

      {/* Posts table */}
      <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Content</th>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-left px-4 py-3 font-medium">Tags</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate font-medium">
                      {post.metaTitle || post.contentText || post.url}
                    </div>
                    {post.submitterEmail && (
                      <div className="text-xs text-muted">
                        Submitted by: {post.submitterEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {platformLabels[post.platform]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((pt) => (
                        <span
                          key={pt.tag.id}
                          className="px-1.5 py-0.5 rounded text-xs text-white"
                          style={{ backgroundColor: pt.tag.color }}
                        >
                          {pt.tag.name}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-muted">+{post.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {format(new Date(post.dateFound), "d MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/posts/${post.id}`} className="text-navy hover:text-navy-dark" title="Edit">
                        <Pencil size={16} />
                      </Link>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-navy" title="View original">
                        <ExternalLink size={16} />
                      </a>
                      <button onClick={() => deletePost(post.id)} className="text-red-400 hover:text-red-600" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    {hasFilters ? "No posts match your filters." : "No posts yet. "}
                    {!hasFilters && (
                      <Link href="/admin/posts/new" className="text-navy underline">Add the first one</Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-gray-50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e-${i}`} className="px-2 text-muted text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded text-sm font-medium ${
                        page === p ? "bg-navy text-white" : "border border-border bg-white hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium border border-border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Tag summary */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="px-3 py-1 rounded-full text-sm text-white flex items-center gap-1"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <span className="bg-white/20 px-1.5 rounded-full text-xs">{tag._count.posts}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
