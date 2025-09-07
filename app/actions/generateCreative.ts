// app/actions/generateCreative.ts
"use server";

import { z } from "zod";
import { composeCreative, SIZE_MAP } from "@/lib/canvas";

const schema = z.object({
    size: z.enum(["square", "portrait", "story"]),
    bgStart: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i),
    bgEnd: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i),
    headline: z.string().min(3).max(140),
    subhead: z.string().max(180).optional().or(z.literal("")),
    cta: z.string().max(28).optional().or(z.literal("")),
});

export type ActionState =
    | { ok: false; error: string }
    | { ok: true; dataUrl: string; meta: { width: number; height: number } };

export async function generateCreative(
    _prevState: ActionState,
    formData: FormData
): Promise<ActionState> {
    try {
        const size = (formData.get("size") as string) || "square";
        const bgStart = (formData.get("bgStart") as string) || "#FFF7AE";
        const bgEnd = (formData.get("bgEnd") as string) || "#FFD166";
        const headline = (formData.get("headline") as string) || "";
        const subhead = (formData.get("subhead") as string) || "";
        const cta = (formData.get("cta") as string) || "";
        const file = formData.get("productImage") as unknown as File | null;

        const parsed = schema.safeParse({ size, bgStart, bgEnd, headline, subhead, cta });
        if (!parsed.success) return { ok: false, error: "Invalid inputs. Please check your fields." };
        if (!file || file.size === 0) return { ok: false, error: "Please upload a product image." };

        const buf = Buffer.from(await file.arrayBuffer());
        const png = await composeCreative({
            size: parsed.data.size,
            bgStart: parsed.data.bgStart,
            bgEnd: parsed.data.bgEnd,
            headline: parsed.data.headline,
            subhead: parsed.data.subhead || undefined,
            cta: parsed.data.cta || undefined,
            ctaBg: "#111111",
            ctaColor: "#ffffff",
            productImage: buf,
        });

        const meta = {
            width: SIZE_MAP[parsed.data.size].w,
            height: SIZE_MAP[parsed.data.size].h,
        };
        const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
        return { ok: true, dataUrl, meta };
    } catch (e) {
        console.error(e);
        return { ok: false, error: "Something went wrong while generating the creative." };
    }
}