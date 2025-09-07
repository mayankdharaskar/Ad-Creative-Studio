"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { generateCreative, type ActionState } from "@/app/actions/generateCreative";
import UploadDropzone from "./uploaddropzone";
import PreviewCard from "./previewcard";
import { Loader2, Sparkles, Paintbrush, Wand2, Stars } from "lucide-react";

const initialState: ActionState = { ok: false, error: "" } as any;

type Preset = {
    name: string;
    start: string;
    end: string;
    headline: string;
    subhead?: string;
    cta?: string;
};

const COLOR_PRESETS: Array<{ name: string; start: string; end: string }> = [
    { name: "Sunburst", start: "#FFF7AE", end: "#FFD166" },
    { name: "Ocean", start: "#C7E9FB", end: "#6EC1FF" },
    { name: "Mint", start: "#E8FFF3", end: "#6EE7B7" },
    { name: "Lavender", start: "#EAE6FF", end: "#C4B5FD" },
    { name: "Rose", start: "#FFE4E6", end: "#FDA4AF" },
];

const COPY_PRESETS: Preset[] = [
    {
        name: "Comfort",
        start: "#FFF7AE",
        end: "#FFD166",
        headline: "Cloud-soft comfort for tired feet",
        subhead: "Light, cushioned, all-day support you can feel from step one.",
        cta: "Shop Now",
    },
    {
        name: "Productivity",
        start: "#C7E9FB",
        end: "#6EC1FF",
        headline: "Strong posture. Strong performance.",
        subhead: "Sit smarter, focus longer—ergonomics that work as hard as you do.",
        cta: "Upgrade Setup",
    },
    {
        name: "Sale",
        start: "#FFE4E6",
        end: "#FDA4AF",
        headline: "Extra 20% Off—Today Only",
        subhead: "Limited stock. Don’t miss the comfort everyone’s talking about.",
        cta: "Grab the Deal",
    },
];

export default function StudioForm() {
    const [state, formAction, isPending] = useActionState(generateCreative, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const [activeCopy, setActiveCopy] = useState<string>("");

    useEffect(() => {
        if (state && (state as any).ok) {
            document.getElementById("preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [state]);

    function applyColors(start: string, end: string) {
        if (!formRef.current) return;
        const s = formRef.current.elements.namedItem("bgStart") as HTMLInputElement | null;
        const e = formRef.current.elements.namedItem("bgEnd") as HTMLInputElement | null;
        if (s) s.value = start;
        if (e) e.value = end;
    }

    function applyCopy(preset: Preset) {
        if (!formRef.current) return;
        (formRef.current.elements.namedItem("headline") as HTMLInputElement).value = preset.headline;
        (formRef.current.elements.namedItem("subhead") as HTMLInputElement).value = preset.subhead || "";
        (formRef.current.elements.namedItem("cta") as HTMLInputElement).value = preset.cta || "";
        applyColors(preset.start, preset.end);
        setActiveCopy(preset.name);
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left: Form */}
            <form ref={formRef} action={formAction} className="rounded-2xl border bg-white/90 backdrop-blur p-6 shadow-lg">
                <div className="mb-5 flex items-center gap-2">
                    <Stars className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Creative Studio</h2>
                </div>

                {/* Size */}
                <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-900">Canvas</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {[
                            { k: "square", label: "1:1 • Post" },
                            { k: "portrait", label: "4:5 • Feed" },
                            { k: "story", label: "9:16 • Story/Reel" },
                        ].map((s) => (
                            <label key={s.k} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-gray-800 cursor-pointer hover:bg-gray-100">
                                <input type="radio" name="size" value={s.k} defaultChecked={s.k === "square"} />
                                {s.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Colors */}
                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4 text-gray-500" />
                        <label className="text-sm font-semibold text-gray-900">Background</label>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs font-semibold text-gray-800 mb-1">Gradient Start</div>
                            <input name="bgStart" type="color" defaultValue="#FFF7AE" className="h-10 w-full cursor-pointer rounded-md border" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-gray-800 mb-1">Gradient End</div>
                            <input name="bgEnd" type="color" defaultValue="#FFD166" className="h-10 w-full cursor-pointer rounded-md border" />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">Quick Palettes:</span>
                        {COLOR_PRESETS.map((p) => (
                            <button
                                key={p.name}
                                type="button"
                                onClick={() => applyColors(p.start, p.end)}
                                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100"
                                title={`${p.name}: ${p.start} → ${p.end}`}
                            >
                                <span className="h-3 w-3 rounded-full" style={{ background: p.start }} />
                                <span className="h-3 w-3 rounded-full" style={{ background: p.end }} />
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Copy */}
                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-gray-500" />
                        <label className="text-sm font-semibold text-gray-900">Headline &amp; Copy</label>
                    </div>

                    <div className="mt-2">
                        <input
                            required
                            name="headline"
                            placeholder="e.g., Cloud-soft comfort for tired feet"
                            className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                        <p className="mt-1 text-xs text-gray-700">Keep it under 6–8 words for maximum impact.</p>
                    </div>

                    <div className="mt-2">
                        <input
                            name="subhead"
                            placeholder="e.g., Light, cushioned, and built for all-day wear"
                            className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/20"
                        />
                    </div>

                    <div className="mt-2">
                        <input
                            name="cta"
                            placeholder="e.g., Shop Now"
                            className="w-full rounded-md border px-3 py-2 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-black/20"
                            maxLength={28}
                        />
                        <p className="mt-1 text-xs text-gray-700">Tip: Short CTAs convert better. “Shop Now”, “Upgrade Setup”, “Grab the Deal”.</p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">Copy Presets:</span>
                        {COPY_PRESETS.map((p) => (
                            <button
                                key={p.name}
                                type="button"
                                onClick={() => applyCopy(p)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 ${activeCopy === p.name ? "bg-gray-200" : ""}`}
                                title={`Apply ${p.name} copy & palette`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Image */}
                <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-900 mb-1 block">Product Image</label>
                    <UploadDropzone />
                    <p className="mt-1 text-xs text-gray-700">PNG/JPG. Transparent background (cutout) works best.</p>
                </div>

                {/* Errors */}
                {state && !state.ok && (state as any).error && (
                    <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">{(state as any).error}</div>
                )}

                {/* Submit */}
                <button
                    disabled={isPending}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-60"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" /> Generate Creative
                        </>
                    )}
                </button>
            </form>

            {/* Right: Preview */}
            <div id="preview">
                <PreviewCard
                    dataUrl={state && (state as any).ok ? (state as any).dataUrl : undefined}
                    note="Download and post directly to Meta, Instagram, or LinkedIn."
                />
            </div>
        </div>
    );
}