"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";

export default function UploadDropzone() {
    const [filename, setFilename] = useState<string>("");
    const ref = useRef<HTMLInputElement>(null);

    return (
        <div
            className="w-full cursor-pointer rounded-2xl border border-dashed p-5 text-center hover:bg-gray-50"
            onClick={() => ref.current?.click()}
        >
            <input
                ref={ref}
                id="productImage"
                name="productImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    setFilename(f ? f.name : "");
                }}
                required
            />
            <div className="flex items-center justify-center gap-2 text-gray-700">
                <Upload className="h-5 w-5" />
                <span>{filename || "Click to upload product image"}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center justify-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                PNG/JPG recommended
            </div>
        </div>
    );
}