import type { MetadataRoute } from "next";
import { listQAs } from "@/lib/qa";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://asktgp.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const qas = await listQAs({ limit: 1000 });
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...qas.map((qa) => ({
      url: `${SITE_URL}/q/${qa.slug}`,
      lastModified: new Date(qa.created_at),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
