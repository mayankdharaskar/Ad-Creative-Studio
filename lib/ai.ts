// lib/ai.ts
import sharp from "sharp";
import { geminiLayoutAndStyle, geminiSuggestCopy, bufToBase64 } from "@/lib/gemini";
import type { AILayoutResult, LayoutBox, ProductMask } from "@/app/types/creative";

async function fallback(
    imagePath: string,
    headline: string,
    subhead?: string,
    cta?: string
): Promise<AILayoutResult> {
    const img = sharp(imagePath);
    const meta = await img.metadata();
    const stats = await img.stats();
    const dom = stats.dominant;
    const primary = `#${[dom.r, dom.g, dom.b]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")}`;

    const mask: ProductMask = { type: "bbox", x: 20, y: 28, w: 60, h: 44 };
    const baseW = meta.width ?? 1080;

    const boxes: LayoutBox[] = [
        {
            id: "headline",
            x: 6,
            y: 6,
            w: 88,
            h: 16,
            align: "left",
            fontSize: Math.max(32, Math.round(baseW * 0.038)),
            style: { fontWeight: 800, color: "#0B0B0B", maxLines: 2 },
        },
        subhead
            ? {
                id: "subhead",
                x: 6,
                y: 22,
                w: 88,
                h: 10,
                align: "left",
                fontSize: Math.max(18, Math.round(baseW * 0.022)),
                style: { fontWeight: 500, color: "#1F2937", maxLines: 2 },
            }
            : undefined,
        cta
            ? {
                id: "cta",
                x: 6,
                y: 82,
                w: 44,
                h: 10,
                align: "center",
                fontSize: Math.max(16, Math.round(baseW * 0.02)),
                style: { fontWeight: 600, bg: primary, color: "#FFFFFF" },
            }
            : undefined,
    ].filter(Boolean) as LayoutBox[];

    const result: AILayoutResult = {
        mask,
        boxes,
        palette: {
            primary,
            secondary: "#e5e7eb",
            onPrimary: "#ffffff",
            onSecondary: "#111111",
        },
        suggestions: { notes: ["Gemini fallback used."] },
    };

    (result as any).__source = "fallback"; // 👈 mark fallback
    return result;
}

export async function computeLayoutAI(imagePath: string, args: {
    headline: string;
    subhead?: string;
    cta?: string;
    mime?: string;
}): Promise<AILayoutResult> {
    try {
        const jpeg = await sharp(imagePath).jpeg().toBuffer();
        const base64 = bufToBase64(jpeg);

        // 1) layout + styling
        const layout = await geminiLayoutAndStyle({
            imageBase64: base64,
            mime: args.mime ?? "image/jpeg",
            headline: args.headline,
            subhead: args.subhead,
            cta: args.cta ?? "Shop Now",
        });

        // 2) parallel copy suggestions
        const sugg = await geminiSuggestCopy({
            imageBase64: base64,
            mime: args.mime ?? "image/jpeg",
            seedHeadline: args.headline,
            seedCTA: args.cta,
        });

        layout.suggestions = {
            altHeadlines: sugg.altHeadlines,
            altSubheads: sugg.altSubheads,
            altCTAs: sugg.altCTAs,
            notes: [...(layout.suggestions?.notes ?? [])],
        };

        (layout as any).__source = "gemini"; // 👈 mark Gemini success
        return layout;
    } catch {
        return fallback(imagePath, args.headline, args.subhead, args.cta);
    }
}