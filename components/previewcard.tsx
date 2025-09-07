"use client";

type Props = { dataUrl?: string; note?: string };

export default function PreviewCard({ dataUrl, note }: Props) {
    return (
        <div className="rounded-2xl border bg-white/90 backdrop-blur shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Preview</h3>
                {dataUrl && <span className="text-xs text-gray-500">PNG • Ready to download</span>}
            </div>
            <div className="p-4">
                <div className="relative rounded-xl border bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] flex items-center justify-center min-h-[340px]">
                    {dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dataUrl} alt="Generated creative" className="rounded-xl max-w-full h-auto shadow-md" />
                    ) : (
                        <div className="text-sm text-gray-500">Your creative will appear here after you generate it.</div>
                    )}
                </div>

                {dataUrl && (
                    <a
                        href={dataUrl}
                        download="creative.png"
                        className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-black text-white hover:opacity-90"
                    >
                        Download PNG
                    </a>
                )}
                {note && <div className="mt-3 text-xs text-gray-500">{note}</div>}
            </div>
        </div>
    );
}