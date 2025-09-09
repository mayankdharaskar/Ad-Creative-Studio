// types/creative.ts
export type Point = { x: number; y: number };

export type ProductMask =
    | { type: "polygon"; points: Point[] }
    | { type: "bbox"; x: number; y: number; w: number; h: number }; // % coords (0..100)

export type TextStyle = {
    fontFamily?: string;
    fontWeight?: number;        // 300..900
    letterSpacing?: number;     // px in SVG
    color?: string;             // hex
    bg?: string;                // hex (band/CTA background)
    stroke?: { color: string; width: number };
    maxLines?: number;
};

export type LayoutBox = {
    id: "headline" | "subhead" | "cta" | "price" | "badge" | "band";
    x: number; y: number; w: number; h: number;         // percentage coords
    align?: "left" | "center" | "right";
    fontSize?: number;                                   // suggestion at 1080 width
    style?: TextStyle;
    rotate?: number;                                     // degrees (e.g., 90 for vertical)
};

export type AISuggestions = {
    altHeadlines?: string[];
    altSubheads?: string[];
    altCTAs?: string[];
    notes?: string[];
};

export type AILayoutResult = {
    mask: ProductMask;
    boxes: LayoutBox[];
    palette: { primary: string; secondary: string; onPrimary: string; onSecondary: string };
    suggestions: AISuggestions;
};