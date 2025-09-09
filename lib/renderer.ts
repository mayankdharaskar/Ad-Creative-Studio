import sharp, { OverlayOptions } from "sharp";
import JSZip from "jszip";
import type { AILayoutResult, LayoutBox, TextStyle } from "@/app/types/creative";

/* ----------------------------- math & utils ----------------------------- */

const pct = (px: number, p: number) => Math.round((px * p) / 100);

function escapeXml(s: string) {
    return (s ?? "").replace(/[<>&'"]/g, (c) =>
        ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c as "<" | ">" | "&" | "'" | '"']!)
    );
}

function textWidthApprox(text: string, fontSize: number, style?: TextStyle) {
    const weightFactor = (style?.fontWeight ?? 600) / 600;
    const letter = style?.letterSpacing ?? 0;
    return Math.max(1, text.length * fontSize * 0.55 * weightFactor + letter * Math.max(0, text.length - 1));
}

function wrapAndFit(
    text: string,
    maxWidth: number,
    baseFontSize: number,
    style?: TextStyle,
    minFont = 10,
    maxLines = 3
): { lines: string[]; fontSize: number } {
    let fontSize = baseFontSize;
    const words = (text || "").trim().split(/\s+/);

    while (fontSize >= minFont) {
        const lines: string[] = [];
        let line = "";

        for (let i = 0; i < words.length; i++) {
            const test = line ? line + " " + words[i] : words[i];
            if (textWidthApprox(test, fontSize, style) <= maxWidth) {
                line = test;
            } else {
                if (!line) {
                    let acc = "";
                    for (const ch of words[i]) {
                        const cand = acc + ch;
                        if (textWidthApprox(cand, fontSize, style) <= maxWidth) acc = cand;
                        else break;
                    }
                    lines.push(acc || words[i]);
                } else {
                    lines.push(line);
                    line = words[i];
                }
            }
        }
        if (line) lines.push(line);

        if (lines.length <= maxLines) return { lines, fontSize };
        fontSize -= 1;
    }
    return { lines: [text], fontSize: minFont };
}

/* -------------------------- contrast + sampling ------------------------- */

function srgbToLuminance(hex: string) {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const L = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b);
}
function contrastRatio(aHex: string, bHex: string) {
    const a = srgbToLuminance(aHex);
    const b = srgbToLuminance(bHex);
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
}
function onColor(bg: string) {
    const white = contrastRatio(bg, "#FFFFFF");
    const black = contrastRatio(bg, "#0B0B0B");
    return white >= black ? "#FFFFFF" : "#0B0B0B";
}

/** ✅ CLAMPED region extractor so Sharp never errors */
async function sampleRegionHex(
    base: sharp.Sharp,
    left: number,
    top: number,
    width: number,
    height: number,
    fullW: number,
    fullH: number
): Promise<string> {
    const l = Math.max(0, Math.min(left, fullW - 1));
    const t = Math.max(0, Math.min(top, fullH - 1));
    const w = Math.max(1, Math.min(width, fullW - l));
    const h = Math.max(1, Math.min(height, fullH - t));

    if (w <= 0 || h <= 0) {
        console.error("Invalid extract dimensions:", { left: l, top: t, width: w, height: h });
        return "#000000"; // Default to black in case of invalid dimensions
    }

    let region: Buffer;
    try {
        region = await base
            .clone()
            .extract({ left: l, top: t, width: w, height: h })
            .resize(8, 8, { fit: "fill" })
            .raw()
            .toBuffer();
    } catch (error) {
        console.error("Error sampling region:", error);
        return "#000000"; // Default to black in case of an error
    }

    let r = 0, g = 0, b = 0;
    for (let i = 0; i < region.length; i += 3) {
        r += region[i];
        g += region[i + 1];
        b += region[i + 2];
    }
    const n = region.length / 3;
    r = Math.round(r / n);
    g = Math.round(g / n);
    b = Math.round(b / n);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/* ----------------------- placement & collision ------------------------ */

function clampFromMask(box: LayoutBox, mask: AILayoutResult["mask"]): LayoutBox {
    if (mask?.type === "bbox") {
        const bTop = box.y,
            bBottom = box.y + box.h;
        const mTop = mask.y,
            mBottom = mask.y + mask.h;
        const overlap = !(bBottom < mTop || bTop > mBottom);
        if (overlap) {
            if (bTop < 50) return { ...box, y: Math.max(0, mTop - box.h - 2) };
            return { ...box, y: Math.min(100 - box.h, mBottom + 2) };
        }
    }
    return box;
}

function boxesOverlap(a: LayoutBox, b: LayoutBox) {
    const ax2 = a.x + a.w, ay2 = a.y + a.h;
    const bx2 = b.x + b.w, by2 = b.y + b.h;
    return !(ax2 <= b.x || bx2 <= a.x || ay2 <= b.y || by2 <= a.y);
}
function resolveCollisions(boxes: LayoutBox[], gap = 2) {
    const prio = (id: LayoutBox["id"]) => (id === "headline" ? 0 : id === "subhead" ? 1 : 2);
    const sorted = [...boxes].sort((a, b) => prio(a.id) - prio(b.id));

    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            const a = sorted[i];
            const b = sorted[j];
            if (boxesOverlap(a, b)) {
                const deltaDown = a.y + a.h + gap - b.y;
                if (a.y + a.h <= 50) {
                    b.y = Math.min(100 - b.h, b.y + Math.max(deltaDown, gap));
                } else {
                    a.y = Math.max(0, a.y - Math.max(deltaDown, gap));
                }
            }
        }
    }
    return sorted;
}

/* ----------------------- SVG layer generators ------------------------ */

function svgMultilineText(w: number, h: number, box: LayoutBox, lines: string[], fontSize: number): Buffer {
    const pad = 16;
    const anchor = box.align === "center" ? "middle" : box.align === "right" ? "end" : "start";
    const tx = box.align === "center" ? w / 2 : box.align === "right" ? w - pad : pad;
    const color = box.style?.color ?? "#111111";
    const ls = box.style?.letterSpacing ?? 0;
    const lineHeight = Math.round(fontSize * 1.2);

    const strokeStyle = box.style?.stroke
        ? `paint-order: stroke; stroke: ${box.style.stroke.color}; stroke-width: ${box.style.stroke.width}px;`
        : "";

    const startY = Math.max(lineHeight, (h - lineHeight * (lines.length - 0.2)) / 2);

    const tspans = lines
        .map((t, i) => {
            const dy = i === 0 ? 0 : lineHeight;
            return `<tspan x="${tx}" dy="${dy}" ${i === 0 ? `y="${startY}"` : ""}>${escapeXml(t)}</tspan>`;
        })
        .join("");

    return Buffer.from(
        `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .t{
          font-family:${escapeXml(box.style?.fontFamily ?? "Inter, system-ui, Arial, sans-serif")};
          font-weight:${box.style?.fontWeight ?? 700};
          ${strokeStyle}
        }
      </style>
      <text x="${tx}" text-anchor="${anchor}" fill="${color}" font-size="${fontSize}" letter-spacing="${ls}" class="t">
        ${tspans}
      </text>
    </svg>`
    );
}

function svgCTAPill(w: number, h: number, box: LayoutBox, text: string, baseFontSize: number): Buffer {
    const padX = 20, padY = 10, radius = 999;
    let fs = Math.max(12, box.fontSize ?? baseFontSize);

    let textW = textWidthApprox(text, fs, box.style);
    let pillW = Math.min(w - 8, Math.max(textW + padX * 2, Math.min(280, Math.round(w * 0.7))));
    while (pillW > w && fs > 10) {
        fs -= 1;
        textW = textWidthApprox(text, fs, box.style);
        pillW = Math.min(w - 8, Math.max(textW + padX * 2, Math.min(280, Math.round(w * 0.7))));
    }
    const pillH = Math.min(h - 8, Math.max(fs + padY * 2, Math.min(64, Math.round(h * 0.8))));
    const px = box.align === "left" ? 0 + 4 : box.align === "right" ? w - pillW - 4 : (w - pillW) / 2;
    const py = (h - pillH) / 2;

    const color = box.style?.color ?? "#FFFFFF";
    const bg = box.style?.bg ?? "#111111";
    const ls = box.style?.letterSpacing ?? 0;

    return Buffer.from(
        `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .cta{
          font-family:${escapeXml(box.style?.fontFamily ?? "Inter, system-ui, Arial, sans-serif")};
          font-weight:${box.style?.fontWeight ?? 600};
        }
      </style>
      <rect x="${px}" y="${py}" rx="${radius}" ry="${radius}" width="${pillW}" height="${pillH}" fill="${bg}" opacity="0.96"/>
      <text x="${px + pillW / 2}" y="${py + pillH / 2 + fs / 3}" text-anchor="middle" fill="${color}" font-size="${fs}" letter-spacing="${ls}" class="cta">
        ${escapeXml(text)}
      </text>
    </svg>`
    );
}

/* ------------------------------ render ------------------------------- */

export type RenderParams = {
    baseImagePath: string;
    layout: AILayoutResult;
    text: { headline: string; subhead?: string; cta?: string };
    sizes: { w: number; h: number; name: string }[];
    formats: ("png" | "webp" | "avif" | "jpeg")[];
    quality: number;
};

export async function renderAll(p: RenderParams) {
    const zip = new JSZip();
    const outputs: { name: string; buffer: Buffer; mime: string }[] = [];

    for (const size of p.sizes) {
        const base = sharp(p.baseImagePath).resize(size.w, size.h, { fit: "cover", position: "attention" });
        const sampler = base.clone();

        const initial = p.layout.boxes.map((b) => clampFromMask({ ...b }, p.layout.mask));
        const arranged = resolveCollisions(initial, 2);

        const overlays: OverlayOptions[] = [];
        for (const b of arranged) {
            const bw = pct(size.w, b.w);
            const bh = pct(size.h, b.h);
            const bx = pct(size.w, b.x);
            const by = pct(size.h, b.y);
            console.log("hhhh");
            const bgHex = await sampleRegionHex(sampler, bx, by, Math.max(1, bw), Math.max(1, bh), size.w, size.h);
            const fore = onColor(bgHex);

            const style: TextStyle = {
                fontFamily: b.style?.fontFamily ?? "Inter, system-ui, Arial, sans-serif",
                fontWeight: b.style?.fontWeight ?? (b.id === "headline" ? 800 : b.id === "cta" ? 600 : 500),
                letterSpacing: b.style?.letterSpacing ?? 0,
                color: b.id === "cta" ? (b.style?.color ?? fore) : (b.style?.color ?? fore),
                bg: b.id === "cta" ? (b.style?.bg ?? (fore === "#FFFFFF" ? "#111111" : "#FFFFFF")) : b.style?.bg,
                stroke: b.style?.stroke,
                maxLines: b.style?.maxLines ?? 2,
            };

            const txt = b.id === "headline" ? p.text.headline : b.id === "subhead" ? p.text.subhead ?? "" : p.text.cta ?? "";
            if (!txt) continue;

            const boxForRender: LayoutBox = { ...b, style };

            if (b.id === "cta") {
                overlays.push({ input: svgCTAPill(bw, bh, boxForRender, txt, 22), left: bx, top: by });
            } else {
                const pad = 16;
                const maxWidth = Math.max(1, bw - pad * 2);
                const baseFs = b.fontSize ?? (b.id === "headline" ? 40 : 22);
                const { lines, fontSize } = wrapAndFit(txt, maxWidth, baseFs, style, 10, style.maxLines ?? 2);
                overlays.push({ input: svgMultilineText(bw, bh, boxForRender, lines, fontSize), left: bx, top: by });
            }
        }

        const composed = await base.composite(overlays).toBuffer();

        for (const fmt of p.formats) {
            const inst = sharp(composed);
            const out =
                fmt === "png"
                    ? await inst.png().toBuffer()
                    : fmt === "webp"
                        ? await inst.webp({ quality: p.quality }).toBuffer()
                        : fmt === "avif"
                            ? await inst.avif({ quality: p.quality }).toBuffer()
                            : await inst.jpeg({ quality: p.quality }).toBuffer();

            const name = `${size.name}.${fmt}`;
            const mime =
                fmt === "png" ? "image/png" : fmt === "webp" ? "image/webp" : fmt === "avif" ? "image/avif" : "image/jpeg";

            outputs.push({ name, buffer: out, mime });
            zip.file(name, out);
        }
    }

    const zipBuf = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    });
    outputs.push({ name: "bundle.zip", buffer: zipBuf, mime: "application/zip" });
    return outputs;
}