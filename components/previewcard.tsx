"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Download, Eye, Sparkles, Trash2, Copy } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

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

export type PreviewCardProps = {
    asset: PreviewAsset;
    onDelete?: (id: string) => void;
    onOpen?: (asset: PreviewAsset) => void;
    className?: string;
    showMeta?: boolean;
    selectable?: boolean;
    selected?: boolean;
    onSelectChange?: (id: string, next: boolean) => void;
    zipUrl?: string; // optional "Download All"
};

export function PreviewCard({
    asset,
    onDelete,
    onOpen,
    className,
    showMeta = true,
    selectable = false,
    selected = false,
    onSelectChange,
    zipUrl,
}: PreviewCardProps) {
    const [hovered, setHovered] = useState(false);

    const humanSize = useMemo(() => {
        if (!asset.meta?.sizeKB) return "";
        const kb = asset.meta.sizeKB;
        return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
    }, [asset.meta?.sizeKB]);

    async function handleDownload() {
        const a = document.createElement("a");
        a.href = asset.src;
        const ext =
            asset.meta?.format ??
            (asset.src.startsWith("data:image/") ? asset.src.slice(11, asset.src.indexOf(";")) : "png");
        a.download = `${asset.title || "creative"}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(asset.src);
        } catch { }
    }

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900",
                selectable && selected && "ring-2 ring-indigo-500",
                className
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Top meta bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {asset.title || "Untitled creative"}
                    </p>
                    {showMeta && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {asset.meta?.variant || "—"}
                            {asset.meta?.format ? ` • ${asset.meta.format.toUpperCase()}` : ""}
                            {humanSize ? ` • ${humanSize}` : ""}
                        </p>
                    )}
                </div>
                {selectable && (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
                        <input
                            type="checkbox"
                            className="size-4 accent-indigo-600"
                            checked={selected}
                            onChange={(e) => onSelectChange?.(asset.id, e.target.checked)}
                        />
                        Select
                    </label>
                )}
            </div>

            {/* Image area */}
            <div className="relative aspect-[1/1] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800/60">
                {asset.src ? (
                    <Image
                        src={asset.src}
                        alt={asset.title}
                        fill
                        className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                        sizes="(min-width: 1024px) 400px, 100vw"
                        priority={false}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <Sparkles className="mr-2" />
                        <span className="text-sm">No preview available</span>
                    </div>
                )}

                {/* Floating actions */}
                <div
                    className={cn(
                        "pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-2 opacity-0 transition-all duration-300",
                        (hovered || selected) && "pointer-events-auto translate-y-0 opacity-100"
                    )}
                >
                    <button
                        onClick={() => onOpen?.(asset)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-zinc-900 backdrop-blur transition hover:bg-white dark:bg-zinc-950/80 dark:text-zinc-100"
                    >
                        <Eye className="size-4" /> Preview
                    </button>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 rounded-full bg-zinc-900/95 px-3 py-2 text-xs font-medium text-white transition hover:bg-black dark:bg-zinc-100 dark:text-zinc-900"
                    >
                        <Download className="size-4" /> Download
                    </button>
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-zinc-900 backdrop-blur transition hover:bg-white dark:bg-zinc-950/80 dark:text-zinc-100"
                        title="Copy image URL"
                    >
                        <Copy className="size-4" /> Copy URL
                    </button>
                    {zipUrl ? (
                        <a
                            href={zipUrl}
                            download="bundle.zip"
                            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-zinc-900 backdrop-blur transition hover:bg-white dark:bg-zinc-950/80 dark:text-zinc-100"
                            title="Download all outputs"
                        >
                            <Download className="size-4" /> Download All
                        </a>
                    ) : null}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(asset.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-red-600 backdrop-blur transition hover:bg-white dark:bg-zinc-950/80"
                        >
                            <Trash2 className="size-4" /> Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}