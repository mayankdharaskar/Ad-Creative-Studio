// lib/canvas.ts
import sharp from "sharp";

export type SizePreset = "square" | "portrait" | "story";

export const SIZE_MAP: Record<SizePreset, { w: number; h: number }> = {
    square: { w: 1080, h: 1080 },
    portrait: { w: 1080, h: 1350 }, // 4:5
    story: { w: 1080, h: 1920 },    // 9:16
};

export function gradientSVG(width: number, height: number, start: string, end: string): Buffer {
    const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${start}"/>
        <stop offset="100%" stop-color="${end}"/>
      </linearGradient>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.05"/>
        </feComponentTransfer>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" filter="url(#grain)" opacity="0.18"/>
  </svg>`;
    return Buffer.from(svg);
}

// --- simple text helpers ---
function wrapByChars(text: string, maxChars: number) {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
        if ((line + " " + w).trim().length <= maxChars) {
            line = (line ? line + " " : "") + w;
        } else {
            if (line) lines.push(line);
            line = w;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function escapeXML(s: string) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

export function textSVG(opts: {
    text: string;
    x: number;
    y: number;
    width: number;
    lineHeight: number;
    fontSize: number;
    color: string;
    weight?: number;
    maxLines?: number;
    textTransform?: "uppercase" | "none";
    align?: "left" | "center" | "right";
    fontFamily?: string;
}) {
    const {
        text, x, y, width, lineHeight, fontSize, color,
        weight = 800, maxLines = 4, textTransform = "none", align = "left",
        fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    } = opts;

    const estCharPerLine = Math.max(6, Math.floor(width / (fontSize * 0.6)));
    const lines = wrapByChars(textTransform === "uppercase" ? text.toUpperCase() : text, estCharPerLine)
        .slice(0, maxLines);

    const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
    const textX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;

    const svg = `
  <svg width="${Math.ceil(x + width)}" height="${Math.ceil(y + lineHeight * lines.length)}" xmlns="http://www.w3.org/2000/svg">
    <g font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${color}">
      ${lines.map((line, i) =>
        `<text x="${textX}" y="${y + i * lineHeight}" text-anchor="${anchor}">${escapeXML(line)}</text>`
    ).join("")}
    </g>
  </svg>`;
    return Buffer.from(svg);
}

export function pillSVG(opts: {
    text: string;
    x: number;
    y: number;
    paddingX: number;
    paddingY: number;
    fontSize: number;
    color: string;
    bg: string;
    radius?: number;
    fontWeight?: number;
}) {
    const { text, x, y, paddingX, paddingY, fontSize, color, bg, radius = 999, fontWeight = 700 } = opts;
    const estTextWidth = Math.ceil(text.length * fontSize * 0.62);
    const w = estTextWidth + paddingX * 2;
    const h = fontSize + paddingY * 2;

    const svg = `
  <svg width="${x + w}" height="${y + h}" xmlns="http://www.w3.org/2000/svg">
    <g>
      <rect x="${x}" y="${y}" rx="${radius}" ry="${radius}" width="${w}" height="${h}" fill="${bg}"/>
      <text x="${x + w / 2}" y="${y + h / 2 + fontSize * 0.35 / 2}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="${fontWeight}" font-size="${fontSize}" fill="${color}" text-anchor="middle">${escapeXML(text)}</text>
    </g>
  </svg>`;
    return Buffer.from(svg);
}

export async function composeCreative(opts: {
    size: SizePreset;
    bgStart: string;
    bgEnd: string;
    headline: string;
    subhead?: string;
    cta?: string;
    ctaBg?: string;
    ctaColor?: string;
    productImage: Buffer;
}) {
    const { w, h } = SIZE_MAP[opts.size];
    const pad = Math.round(w * 0.06);

    const bg = await sharp(gradientSVG(w, h, opts.bgStart, opts.bgEnd)).png().toBuffer();

    const productMaxW = opts.size === "story" ? Math.round(w * 0.7) : Math.round(w * 0.46);
    const productMaxH = opts.size === "story" ? Math.round(h * 0.45) : Math.round(h * 0.8);

    const product = await sharp(opts.productImage)
        .rotate()
        .resize({ width: productMaxW, height: productMaxH, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();

    const base = sharp(bg);

    const textBlock = {
        x: pad,
        y: pad + (opts.size === "story" ? Math.round(h * 0.08) : 0),
        w: opts.size === "story" ? Math.round(w * 0.84) : Math.round(w * 0.44)
    };

    const headlineBuf = textSVG({
        text: opts.headline,
        x: textBlock.x,
        y: textBlock.y + 10,
        width: textBlock.w,
        lineHeight: Math.round(w * 0.065),
        fontSize: Math.round(w * 0.075),
        color: "#111111",
        weight: 800,
        align: "left",
    });

    const subheadBuf = opts.subhead
        ? textSVG({
            text: opts.subhead,
            x: textBlock.x,
            y: textBlock.y + Math.round(w * 0.075) + Math.round(w * 0.05),
            width: textBlock.w,
            lineHeight: Math.round(w * 0.045),
            fontSize: Math.round(w * 0.04),
            color: "#222222",
            weight: 500,
            align: "left",
        })
        : undefined;

    const ctaBuf = opts.cta
        ? pillSVG({
            text: opts.cta,
            x: textBlock.x,
            y:
                textBlock.y +
                Math.round(w * 0.075) +
                Math.round(w * 0.05) +
                (opts.subhead ? Math.round(w * 0.15) : Math.round(w * 0.08)),
            paddingX: Math.round(w * 0.02),
            paddingY: Math.round(w * 0.012),
            fontSize: Math.round(w * 0.035),
            color: opts.ctaColor || "#ffffff",
            bg: opts.ctaBg || "#111111",
        })
        : undefined;

    const prodMeta = await sharp(product).metadata();
    const productX = opts.size === "story"
        ? Math.round((w - (prodMeta.width || productMaxW)) / 2)
        : w - productMaxW - pad;
    const productY = opts.size === "story"
        ? Math.round(h * 0.48)
        : Math.round((h - (prodMeta.height || productMaxH)) / 2);

    const composites: sharp.OverlayOptions[] = [
        { input: headlineBuf, left: 0, top: 0 },
    ];
    if (subheadBuf) composites.push({ input: subheadBuf, left: 0, top: 0 });
    if (ctaBuf) composites.push({ input: ctaBuf, left: 0, top: 0 });
    composites.push({ input: product, left: productX, top: productY });

    const out = await base.composite(composites).png().toBuffer();
    return out;
}