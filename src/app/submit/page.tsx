"use client";

import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import type { Metadata } from "next";

export default function SubmitPage() {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        notes: notes || null,
        submitterEmail: email || null,
        submitterName: name || null,
      }),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to submit");
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold mb-2">Thank You</h1>
        <p className="text-muted mb-6">
          Your report has been submitted and will be reviewed by our research
          team. If appropriate, it will be added to the Harmful Content Tracker.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setUrl("");
            setNotes("");
            setEmail("");
            setName("");
          }}
          className="text-navy underline"
        >
          Submit another report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Report Harmful Content</h1>
        <p className="text-muted">
          If you&apos;ve seen harmful content online &mdash; disinformation,
          hate speech, coordinated inauthentic behaviour, or other concerning
          material &mdash; you can report it here. Our research team will review
          your submission.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card-bg border border-border rounded-lg p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-1">
            URL of the content <span className="text-bfb-red">*</span>
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://..."
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Why do you think this is harmful?
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Tell us what you noticed about this content..."
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Your name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Your email (optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          Your contact details are optional and will only be used if our team
          needs to follow up. They will not be published.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="bg-bfb-red text-white px-6 py-2 rounded-md font-medium hover:bg-bfb-red-dark disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <Send size={16} />
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  );
}
