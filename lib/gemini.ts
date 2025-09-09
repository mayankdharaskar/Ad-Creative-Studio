// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AILayoutResult, LayoutBox, ProductMask, TextStyle, AISuggestions } from "@/app/types/creative";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// helper
export const bufToBase64 = (buf: Buffer) => buf.toString("base64");

// robust JSON scrape
function parseJSONLoose(text: string) {
    try { return JSON.parse(text); } catch { }
    const m = text.match(/```json\s*([\s\S]*?)```/i);
    if (m) return JSON.parse(m[1]);
    throw new Error("Gemini JSON parse failed");
}

function onColor(bg: string) {
    const c = bg.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
    const L = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    const Y = 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b);
    const contrast = (a: number, b: number) => (a + 0.05) / (b + 0.05);
    return contrast(1, Y) >= contrast(Y, 0) ? "#FFFFFF" : "#0B0B0B";
}

/** Copy suggestions from Gemini (parallel tips while the output is generated) */
export async function geminiSuggestCopy(input: { imageBase64: string; mime: string; seedHeadline: string; seedCTA?: string }) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `
You are a marketing copy assistant. Suggest 5 alternative headlines, 5 subheads, and 5 CTAs
that match the style of the image. Keep them concise and brand-neutral.
Return JSON only: {"altHeadlines":[...], "altSubheads":[...], "altCTAs":[...]}
  `.trim();

    const res = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: input.mime, data: input.imageBase64 } },
        { text: `seedHeadline: "${input.seedHeadline}" ; seedCTA: "${input.seedCTA ?? "Shop Now"}"` }
    ]);
    const json = parseJSONLoose(res.response.text());
    const out: AISuggestions = {
        altHeadlines: json.altHeadlines ?? [],
        altSubheads: json.altSubheads ?? [],
        altCTAs: json.altCTAs ?? [],
    };
    return out;
}

/** Main: safe zones + styles from Gemini (no overlap; image-aware fonts/colors) */
export async function geminiLayoutAndStyle(params: {
    imageBase64: string; mime: string;
    headline: string; subhead?: string; cta?: string;
}): Promise<AILayoutResult> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const sys = `
Return ONLY JSON with this schema:

{
 "mask": { "type":"bbox","x":number,"y":number,"w":number,"h":number } | { "type":"polygon","points":[{"x":number,"y":number},...] },
 "palette": { "primary":string, "secondary":string, "onPrimary":string, "onSecondary":string },
 "boxes": [
   // headline top band (avoid product)
   { "id":"headline","x":number,"y":number,"w":number,"h":number,"align":"left"|"center"|"right","fontSize":number,
     "style":{"fontFamily":string,"fontWeight":number,"letterSpacing":number,"color":string,"stroke":{"color":string,"width":number}} },
   // optional subhead under headline
   { "id":"subhead", ... },
   // CTA pill near bottom band
   { "id":"cta","x":number,"y":number,"w":number,"h":number,"align":"center","fontSize":number,
     "style":{"fontFamily":string,"fontWeight":number,"letterSpacing":number,"bg":string,"color":string} },
   // optional left band for poster-like layout (Frido chair reference)
   { "id":"band","x":number,"y":number,"w":number,"h":number,"style":{"bg":string}, "rotate":0 }
 ],
 "suggestions": { "notes":[string] }
}

Rules:
- Text MUST NOT overlap the product mask.
- Prefer generous whitespace. Headline top band, subhead below it; CTA bottom band.
- If the image composition benefits from a left poster band, include a "band" with style.bg and put headline/subhead inside safe areas (not over product).
- Fonts: use web-safe names (Inter/Roboto/system-ui). Colors must be readable on the image (use light text on dark areas).
`;

    const user = `
User input:
- headline: "${params.headline}"
- subhead: "${params.subhead ?? ""}"
- cta: "${params.cta ?? "Shop Now"}"

Make choices that look premium/minimal. Keep it balanced for 1080x1080, 1080x1350, 1080x1920.
`;

    const res = await model.generateContent([
        { text: sys },
        { inlineData: { mimeType: params.mime, data: params.imageBase64 } },
        { text: user }
    ]);
    const j = parseJSONLoose(res.response.text());

    const mask: ProductMask =
        j?.mask?.type === "polygon" ? { type: "polygon", points: j.mask.points }
            : { type: "bbox", x: j?.mask?.x ?? 20, y: j?.mask?.y ?? 28, w: j?.mask?.w ?? 60, h: j?.mask?.h ?? 44 };

    const normStyle = (s?: any, fb?: Partial<TextStyle>): TextStyle => ({
        fontFamily: s?.fontFamily ?? fb?.fontFamily ?? "Inter, system-ui, Arial, sans-serif",
        fontWeight: typeof s?.fontWeight === "number" ? s.fontWeight : fb?.fontWeight ?? 700,
        letterSpacing: typeof s?.letterSpacing === "number" ? s.letterSpacing : fb?.letterSpacing ?? 0,
        color: s?.color ?? fb?.color,
        bg: s?.bg ?? fb?.bg,
        stroke: s?.stroke,
        maxLines: typeof s?.maxLines === "number" ? s.maxLines : fb?.maxLines,
    });

    const boxes: LayoutBox[] = (j?.boxes ?? [])
        .filter((b: any) => ["headline", "subhead", "cta", "price", "badge", "band"].includes(b.id))
        .map((b: any) => ({
            id: b.id,
            x: Number(b.x ?? 6),
            y: Number(b.y ?? (b.id === "cta" ? 82 : b.id === "subhead" ? 20 : 6)),
            w: Number(b.w ?? (b.id === "cta" ? 44 : b.id === "band" ? 22 : 88)),
            h: Number(b.h ?? (b.id === "cta" ? 10 : b.id === "subhead" ? 10 : b.id === "band" ? 100 : 16)),
            align: b.align ?? (b.id === "cta" ? "center" : "left"),
            fontSize: Number(b.fontSize ?? (b.id === "headline" ? 40 : b.id === "subhead" ? 22 : 20)),
            style: b.id === "cta"
                ? normStyle(b.style, { fontWeight: 600, bg: "#111111", color: "#FFFFFF" })
                : b.id === "headline"
                    ? normStyle(b.style, { fontWeight: 800, color: "#111111", maxLines: 2 })
                    : b.id === "band"
                        ? normStyle(b.style, { bg: "#111111" })
                        : normStyle(b.style, { fontWeight: 500, color: "#1F2937", maxLines: 2 }),
            rotate: typeof b.rotate === "number" ? b.rotate : 0,
        }));

    const palette = j?.palette ?? {
        primary: "#0b0b12",
        secondary: "#e5e7eb",
        onPrimary: "#ffffff",
        onSecondary: "#111111",
    };

    // ensure CTA contrast
    const cta = boxes.find(b => b.id === "cta");
    if (cta) {
        if (!cta.style?.bg) cta.style = { ...(cta.style ?? {}), bg: palette.primary };
        cta.style!.color = onColor(cta.style!.bg!);
    }

    return {
        mask,
        boxes,
        palette,
        suggestions: j?.suggestions ?? {},
    };
}