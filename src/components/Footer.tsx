import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy-dark text-white/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">
              Harmful Content Tracker
            </h3>
            <p className="text-sm">
              Part of Best for Britain&apos;s InfoCrisis project, tracking and
              documenting harmful content found online by researchers.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Links</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/repository" className="hover:text-white transition-colors">
                  Content Repository
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Statistics Dashboard
                </Link>
              </li>
              <li>
                <Link href="/submit" className="hover:text-white transition-colors">
                  Report Content
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">About</h4>
            <p className="text-sm">
              This tool is maintained by Best for Britain as part of the InfoCrisis
              project to monitor and document harmful content across social media
              platforms.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-4 text-xs text-center">
          &copy; {new Date().getFullYear()} Best for Britain. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
