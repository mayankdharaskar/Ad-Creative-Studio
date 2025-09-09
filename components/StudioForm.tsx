"use client";

import React, { useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
    Loader2,
    Upload,
    Sparkles,
    Plus,
    X,
    Download,
    Lightbulb,
    LayoutGrid,
    Image as ImageIcon,
} from "lucide-react";
import { PreviewCard } from "./previewcard";

export type PreviewAsset = {
    id: string;
    title: string;
    src: string;
    width?: number;
    height?: number;
    meta?: {
        sizeKB?: number;
        format?: string;
        variant?: string;
    };
};

const composeSchema = z.object({
    title: z.string().min(2),
    headline: z.string().min(2),
    subhead: z.string().optional(),
    cta: z.string().max(28).optional(),
    sizes: z.array(z.object({ w: z.number().int(), h: z.number().int(), name: z.string() })).min(1),
    formats: z.array(z.enum(["png", "webp", "avif", "jpeg"])).min(1),
    quality: z.number().int().min(50).max(100).default(85),
});

type Size = { w: number; h: number; name: string };
type Suggest = { altHeadlines?: string[]; altCTAs?: string[]; notes?: string[] };

export default function StudioForm() {
    // copy fields
    const [title, setTitle] = useState("New creative");
    const [headline, setHeadline] = useState("Comfort that moves with you");
    const [subhead, setSubhead] = useState("Support for long drives & daily grind");
    const [cta, setCta] = useState("Shop Now");

    // output options
    const [sizes, setSizes] = useState<Size[]>([
        { w: 1080, h: 1080, name: "1080x1080" },
        { w: 1080, h: 1350, name: "1080x1350" },
        { w: 1080, h: 1920, name: "1080x1920" },
    ]);
    const [formats, setFormats] = useState<("png" | "webp" | "avif" | "jpeg")[]>(["png", "webp"]);
    const [quality, setQuality] = useState(85);

    // uploads & results
    const [files, setFiles] = useState<File[]>([]);
    const [assets, setAssets] = useState<PreviewAsset[]>([]);
    const [zipUrl, setZipUrl] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<Suggest | null>(null);

    // ui state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const ratioBadge = useMemo(() => {
        const uniq = Array.from(new Set(sizes.map((s) => s.name)));
        return uniq.join(" • ");
    }, [sizes]);

    function onDropFiles(list: FileList | null) {
        if (!list) return;
        const arr = Array.from(list).slice(0, 6);
        setFiles((prev) => [...prev, ...arr]);
    }

    function removeFile(idx: number) {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    }

    function toggleFormat(fmt: "png" | "webp" | "avif" | "jpeg") {
        setFormats((cur) => (cur.includes(fmt) ? cur.filter((f) => f !== fmt) : [...cur, fmt]));
    }

    function addCommonSizes(kind: "square" | "reel" | "story" | "fb") {
        const add: Size[] =
            kind === "square"
                ? [{ w: 1080, h: 1080, name: "1080x1080" }]
                : kind === "reel"
                    ? [{ w: 1080, h: 1350, name: "1080x1350" }]
                    : kind === "story"
                        ? [{ w: 1080, h: 1920, name: "1080x1920" }]
                        : [
                            { w: 1200, h: 628, name: "1200x628" },
                            { w: 1080, h: 1080, name: "1080x1080" },
                        ];
        setSizes((s) => {
            const map = new Map(s.map((i) => [i.name, i]));
            add.forEach((i) => map.set(i.name, i));
            return Array.from(map.values());
        });
    }

    async function onSubmitCompose(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!files.length) {
            setError("Please upload an image first.");
            return;
        }

        const payload = {
            title,
            headline,
            subhead: subhead || undefined,
            cta: cta || undefined,
            sizes,
            formats,
            quality,
        };

        const parsed = composeSchema.safeParse(payload);
        if (!parsed.success) {
            setError("Please fill the required fields correctly.");
            return;
        }

        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("image", files[0]);
            fd.append("json", JSON.stringify(parsed.data));

            const res = await fetch("/api/compose", { method: "POST", body: fd });
            if (!res.ok) throw new Error(await res.text());

            const data: {
                files: { name: string; mime: string; url: string }[];
                suggestions?: Suggest;
            } = await res.json();

            const created = data.files
                .filter((f) => f.name !== "bundle.zip")
                .map((f, i) => ({
                    id: `${Date.now()}-${i}`,
                    title: f.name,
                    src: f.url,
                    meta: {
                        format: f.mime.split("/")[1],
                        variant: f.name.replace(/\.(png|webp|avif|jpe?g)$/i, ""),
                    },
                })) as PreviewAsset[];

            const zip = data.files.find((f) => f.name === "bundle.zip");
            setZipUrl(zip?.url ?? null);
            setSuggestions(data.suggestions || null);
            setAssets(created);
            // auto-scroll to results
            setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 50);
        } catch (err: any) {
            setError(err?.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Card wrapper for modern look */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            <LayoutGrid className="size-5" /> Creative Studio
                        </h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Upload an image, enter copy, choose sizes & formats. AI will position text safely (no overlap).
                        </p>
                    </div>
                    <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {ratioBadge}
                    </div>
                </div>

                <form onSubmit={onSubmitCompose} className="grid gap-6">
                    {/* Inputs grid */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Left column */}
                        <div className="space-y-4">
                            <Field label="Project title">
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring Sale Hero" />
                            </Field>

                            <Field label="Headline">
                                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
                            </Field>

                            <Field label="Subhead (optional)">
                                <Input value={subhead} onChange={(e) => setSubhead(e.target.value)} />
                            </Field>

                            <Field label="CTA (max 28 chars)">
                                <Input value={cta} maxLength={28} onChange={(e) => setCta(e.target.value)} />
                            </Field>
                        </div>

                        {/* Right column */}
                        <div className="space-y-4">
                            <Field label="Formats">
                                <div className="flex flex-wrap gap-2">
                                    {(["png", "webp", "avif", "jpeg"] as const).map((fmt) => (
                                        <ChipCheckbox
                                            key={fmt}
                                            checked={formats.includes(fmt)}
                                            onChange={() => toggleFormat(fmt)}
                                            label={fmt.toUpperCase()}
                                        />
                                    ))}
                                </div>
                            </Field>

                            <Field label={`Quality (${quality})`}>
                                <input
                                    type="range"
                                    min={50}
                                    max={100}
                                    value={quality}
                                    onChange={(e) => setQuality(parseInt(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                            </Field>

                            <Field label="Quick sizes">
                                <div className="flex flex-wrap gap-2">
                                    <GhostButton onClick={() => addCommonSizes("square")}>+ 1:1 Square</GhostButton>
                                    <GhostButton onClick={() => addCommonSizes("reel")}>+ 4:5 Reel</GhostButton>
                                    <GhostButton onClick={() => addCommonSizes("story")}>+ 9:16 Story</GhostButton>
                                    <GhostButton onClick={() => addCommonSizes("fb")}>+ FB Link</GhostButton>
                                </div>
                            </Field>

                            <Field label="Output sizes">
                                <div className="rounded-xl border border-zinc-200 p-2 text-xs dark:border-zinc-800">
                                    <div className="flex flex-wrap gap-2">
                                        {sizes.map((s, i) => (
                                            <span
                                                key={s.name}
                                                className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                                            >
                                                {s.name}
                                                <button
                                                    type="button"
                                                    onClick={() => setSizes((list) => list.filter((_, idx) => idx !== i))}
                                                    className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                    aria-label="Remove size"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Field>
                        </div>
                    </div>

                    {/* Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload product image</label>
                        <div
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                onDropFiles(e.dataTransfer.files);
                            }}
                            className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60"
                        >
                            <div className="rounded-full bg-white p-2 shadow-sm dark:bg-zinc-900">
                                <ImageIcon className="size-6 text-zinc-500" />
                            </div>
                            <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                Drag & drop an image here, or <span className="font-semibold text-indigo-600">click to browse</span>
                            </p>
                            <p className="text-xs text-zinc-500">PNG, JPG, WEBP up to 10MB</p>
                            <input
                                ref={inputRef}
                                type="file"
                                accept="image/*"
                                multiple={false}
                                onChange={(e) => onDropFiles(e.target.files)}
                                className="hidden"
                            />
                        </div>

                        {files.length > 0 && (
                            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {files.map((f, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-2 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="truncate font-medium">{f.name}</p>
                                            <p className="truncate text-xs text-zinc-500">{(f.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800"
                                            onClick={() => removeFile(i)}
                                            aria-label="Remove file"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setSizes([{ w: 1080, h: 1080, name: "1080x1080" }])}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <Sparkles className="size-4" /> Reset to 1:1
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Generate
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                            {error}
                        </div>
                    )}
                </form>
            </div>

            {/* Suggestions */}
            {suggestions && (suggestions.altHeadlines?.length || suggestions.altCTAs?.length || suggestions.notes?.length) ? (
                <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-sm shadow-sm dark:border-amber-400/30 dark:bg-amber-950/20">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                        <Lightbulb className="size-4" /> You may also like
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {suggestions.altHeadlines?.length ? (
                            <div>
                                <div className="mb-1 font-semibold">Alt headlines</div>
                                <ul className="list-disc pl-5">
                                    {suggestions.altHeadlines.map((h, i) => (
                                        <li key={i} className="mb-1">
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {suggestions.altCTAs?.length ? (
                            <div>
                                <div className="mb-1 font-semibold">Alt CTAs</div>
                                <ul className="list-disc pl-5">
                                    {suggestions.altCTAs.map((c, i) => (
                                        <li key={i} className="mb-1">
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {suggestions.notes?.length ? (
                            <div>
                                <div className="mb-1 font-semibold">Notes</div>
                                <ul className="list-disc pl-5">
                                    {suggestions.notes.map((n, i) => (
                                        <li key={i} className="mb-1">
                                            {n}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {/* Results */}
            {assets.length > 0 && (
                <section id="results" className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            <Download className="size-4" /> Generated outputs
                        </h2>
                        {zipUrl ? (
                            <a
                                href={zipUrl}
                                download="bundle.zip"
                                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-black dark:bg-zinc-100 dark:text-zinc-900"
                            >
                                <Download className="size-4" /> Download All
                            </a>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {assets.map((a) => (
                            <PreviewCard key={a.id} asset={a} showMeta selectable={false} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

/* ---------- UI helpers (styled to be readable & modern) ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
            {children}
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={[
                "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900",
                "placeholder:text-zinc-400 shadow-sm outline-none transition",
                "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
                "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                props.className || "",
            ].join(" ")}
        />
    );
}

function ChipCheckbox({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={[
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition",
                checked
                    ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
            ].join(" ")}
            aria-pressed={checked}
        >
            {checked && <span className="mr-1 inline-block size-1.5 rounded-full bg-white" />}
            {label}
        </button>
    );
}

function GhostButton({
    children,
    onClick,
}: {
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
            {children}
        </button>
    );
}