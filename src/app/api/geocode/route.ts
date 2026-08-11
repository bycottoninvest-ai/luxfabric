import { NextResponse } from "next/server";

/** GPS → manzil (OpenStreetMap Nominatim) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat/lng kerak" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("accept-language", "uz,ru");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "LUXFABRIC-Shop/1.0 (checkout geolocation)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocode xatosi" }, { status: 502 });
    }

    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };

    const a = data.address || {};
    const streetParts = [a.road, a.house_number, a.neighbourhood, a.suburb, a.quarter]
      .filter(Boolean)
      .join(", ");
    const addressLine =
      streetParts ||
      [a.pedestrian, a.residential, a.city_district].filter(Boolean).join(", ") ||
      data.display_name ||
      "";

    const geoText = [
      data.display_name,
      a.state,
      a.region,
      a.county,
      a.city,
      a.town,
      a.village,
      a.suburb,
      a.city_district,
      a.municipality,
    ]
      .filter(Boolean)
      .join(" | ");

    return NextResponse.json({
      address: addressLine,
      displayName: data.display_name || "",
      geoText,
      raw: a,
    });
  } catch {
    return NextResponse.json({ error: "Joylashuvni o‘qib bo‘lmadi" }, { status: 500 });
  }
}
