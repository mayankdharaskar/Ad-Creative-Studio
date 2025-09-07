import Link from "next/link";
import StudioForm from "@/components/StudioForm";

export default function StudioPage() {
    return (
        <main className="min-h-screen bg-gray-100">
            <div className="mx-auto max-w-6xl px-5 py-8">
                <div className="mb-6">
                    <Link
                        href="/"
                        className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        ← Back to Home
                    </Link>
                </div>

                <StudioForm />

                <footer className="mt-10 text-center text-xs text-gray-500">
                    Tip: Use clean product cutouts for best results.
                </footer>
            </div>
        </main>
    );
}