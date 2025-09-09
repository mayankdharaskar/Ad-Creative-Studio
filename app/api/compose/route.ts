import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeLayoutAI } from "@/lib/ai";
import { renderAll } from "@/lib/renderer";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const formSchema = z.object({
    title: z.string().min(2),
    headline: z.string().min(2),
    subhead: z.string().optional(),
    cta: z.string().max(28).optional(),
    sizes: z.array(z.object({ w: z.number().int(), h: z.number().int(), name: z.string() })).min(1),
    formats: z.array(z.enum(["png", "webp", "avif", "jpeg"])).min(1),
    quality: z.number().int().min(50).max(100).default(85),
});

export const runtime = "nodejs";
export const preferredRegion = "auto";

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const json = form.get("json") as string | null;
        const file = form.get("image") as File | null;

        if (!json) {
            return NextResponse.json({ error: "Missing json" }, { status: 400 });
        }
        if (!file) {
            return NextResponse.json({ error: "Missing image" }, { status: 400 });
        }

        const parsed = formSchema.safeParse(JSON.parse(json));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;

        // Write upload to a temp file
        const dir = await mkdtemp(join(tmpdir(), "studio-"));
        const imgPath = join(dir, file.name || "upload.jpg");
        const buf = Buffer.from(await file.arrayBuffer());
        await writeFile(imgPath, buf);

        // Ask Gemini (or fallback) for mask + boxes + styles
        const layout = await computeLayoutAI(imgPath, {
            headline: data.headline,
            subhead: data.subhead,
            cta: data.cta,
            mime: file.type || "image/jpeg",
        });

        // Render with strict no-overlap, collision handling, adaptive fit
        const outputs = await renderAll({
            baseImagePath: imgPath,
            layout,
            text: { headline: data.headline, subhead: data.subhead, cta: data.cta ?? "Shop Now" },
            sizes: data.sizes,
            formats: data.formats,
            quality: data.quality,
        });

        const files = outputs.map((o) => ({
            name: o.name,
            mime: o.mime,
            url: `data:${o.mime};base64,${o.buffer.toString("base64")}`,
        }));

        // Surface which path was used: "gemini" or "fallback"
        const aiUsed = (layout as any).__source ?? "unknown";

        return NextResponse.json({
            files,
            suggestions: layout.suggestions,
            ai: aiUsed,
        });
    } catch (err: any) {
        // Bubble up a friendly error
        const message = typeof err?.message === "string" ? err.message : "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}