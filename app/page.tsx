import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      {/* Centered container that scales with screen size */}
      <div className="w-full max-w-5xl px-4 sm:px-6 md:px-8 text-center">
        <header>
          {/* Headline: scales from phones to large screens */}
          <h1 className="font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-md
                             text-4xl sm:text-5xl md:text-6xl">
              Ad Creative Studio (MVP)
            </span>
          </h1>

          {/* Tagline with gradient accent line; responsive text */}
          <p className="mt-3 text-base sm:text-lg font-medium text-gray-800 flex items-center justify-center gap-2">
            <span className="hidden sm:inline-block h-1 w-8 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            Instant ads for Instagram, Meta &amp; LinkedIn
          </p>

          {/* Description: constrained width + responsive size */}
          <p className="mt-3 text-sm sm:text-base text-gray-700 max-w-2xl mx-auto">
            Upload a product, pick colors, drop in a headline—get a polished PNG in seconds.
            Perfect for busy teams that want on-brand creatives without the wait.
          </p>

          {/* CTA: responsive padding/size + accessible focus ring */}
          <div className="mt-6 sm:mt-8">
            <Link
              href="/studio"
              className="inline-flex items-center justify-center rounded-full 
                         bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                         text-white font-semibold shadow
                         px-5 py-2.5 sm:px-7 sm:py-3
                         text-sm sm:text-base
                         hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-100"
            >
              🚀 Try it Now
            </Link>
          </div>
        </header>
      </div>
    </main>
  );
}