import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query') || 'adventure life';
  const count = Math.min(parseInt(req.nextUrl.searchParams.get('count') || '6'), 10);

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: 'Missing Unsplash API key' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=${count}&orientation=squarish`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Unsplash API error' }, { status: res.status });
    }

    const data = await res.json();

    // Return only what we need
    const images = Array.isArray(data)
      ? data.map((img: { urls: { regular: string; small: string }; alt_description: string; user: { name: string } }) => ({
          url: img.urls.regular,
          small: img.urls.small,
          alt: img.alt_description || 'sidequest',
          author: img.user?.name,
        }))
      : [];

    return NextResponse.json(images);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
