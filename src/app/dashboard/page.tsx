"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { platformLabels, platformColors } from "@/lib/platforms";
import type { Platform } from "@/generated/prisma/enums";
import { format } from "date-fns";

type Stats = {
  totalPosts: number;
  platformCounts: Array<{ platform: Platform; count: number }>;
  tagCounts: Array<{ name: string; color: string; count: number }>;
  timeline: Array<{ week: string; count: number }>;
  tagCooccurrence: Array<{ tag1: string; tag2: string; count: number }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Statistics Dashboard</h1>
        <div className="text-muted">Loading statistics...</div>
      </div>
    );
  }

  const platformData = stats.platformCounts.map((p) => ({
    name: platformLabels[p.platform],
    count: p.count,
    color: platformColors[p.platform],
  }));

  const timelineData = stats.timeline.map((t) => ({
    week: format(new Date(t.week), "d MMM"),
    count: t.count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Statistics Dashboard</h1>
        <p className="text-muted">
          Aggregate analysis of harmful content tracked across platforms
        </p>
      </div>

      {/* Total counter */}
      <div className="bg-navy text-white rounded-lg p-8 mb-8 text-center">
        <div className="text-5xl font-bold mb-2">
          {stats.totalPosts.toLocaleString()}
        </div>
        <div className="text-white/70">
          pieces of harmful content tracked
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Platform breakdown */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-bold text-lg mb-4">By Platform</h2>
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {platformData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm">No data yet</p>
          )}
        </div>

        {/* Tag breakdown */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h2 className="font-bold text-lg mb-4">By Tag</h2>
          {stats.tagCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.tagCounts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.tagCounts.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card-bg border border-border rounded-lg p-6 mb-8">
        <h2 className="font-bold text-lg mb-4">
          Content Tracked Over Time
        </h2>
        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#1E3A5F"
                strokeWidth={2}
                dot={{ fill: "#E63946" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted text-sm">No data yet</p>
        )}
      </div>

      {/* Tag co-occurrence */}
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <h2 className="font-bold text-lg mb-4">
          Tag Co-occurrence
        </h2>
        <p className="text-sm text-muted mb-4">
          Which themes appear together most frequently
        </p>
        {stats.tagCooccurrence.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Tag 1</th>
                  <th className="text-left py-2 px-3 font-medium">Tag 2</th>
                  <th className="text-left py-2 px-3 font-medium">
                    Co-occurrences
                  </th>
                  <th className="text-left py-2 px-3 font-medium">Strength</th>
                </tr>
              </thead>
              <tbody>
                {stats.tagCooccurrence.map((co, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3">{co.tag1}</td>
                    <td className="py-2 px-3">{co.tag2}</td>
                    <td className="py-2 px-3">{co.count}</td>
                    <td className="py-2 px-3">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-navy rounded-full h-2"
                          style={{
                            width: `${Math.min(
                              100,
                              (co.count /
                                Math.max(
                                  ...stats.tagCooccurrence.map((c) => c.count)
                                )) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-sm">
            No co-occurrence data yet. Tag more content to see patterns.
          </p>
        )}
      </div>
    </div>
  );
}
