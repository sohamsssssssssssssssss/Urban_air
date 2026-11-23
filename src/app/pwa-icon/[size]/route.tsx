import { ImageResponse } from "next/og";

export const dynamic = "force-static";
const SIZES = [192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

/** GET /pwa-icon/192 or /512 : PNG app icons for the web manifest, drawn from the same shapes as icon.svg. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }): Promise<Response> {
  const { size: requested } = await params;
  const size = SIZES.find((s) => String(s) === requested);
  if (!size) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="13" fill="#0f172a" />
        <path d="M48 13c0 20-9 32-23 32-7 0-11-5-11-11 0-13 15-20 34-21Z" fill="#86efac" />
        <path d="M13 50c6-11 15-18 26-25" fill="none" stroke="#0f172a" strokeLinecap="round" strokeWidth="3" />
        <path d="M27 51h17m-10 5h16" fill="none" stroke="#bae6fd" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
