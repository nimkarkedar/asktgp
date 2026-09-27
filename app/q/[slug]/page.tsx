import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AskTGP from "../../components/AskTGP";
import { getQABySlug, listQAs } from "@/lib/qa";

// A shared link: the homepage with this Q&A already open, served from
// storage (no new AI call).
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const qa = await getQABySlug(slug);
  if (!qa) return { title: "asktgp" };

  const title = `${qa.question} — asktgp`;
  const firstLine = qa.long_answer.split(/\s+/).slice(0, 30).join(" ");
  const description = `${qa.short_answer} ${firstLine}…`;
  return {
    title,
    description,
    alternates: { canonical: `/q/${qa.slug}` },
    openGraph: {
      title: qa.question,
      description: qa.short_answer,
      url: `/q/${qa.slug}`,
      siteName: "asktgp",
      type: "article",
      images: [{ url: "/open_graph.png", width: 1200, height: 630, alt: "asktgp" }],
    },
    twitter: {
      card: "summary_large_image",
      title: qa.question,
      description: qa.short_answer,
      images: ["/open_graph.png"],
    },
  };
}

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;
  const [qa, items] = await Promise.all([getQABySlug(slug), listQAs()]);
  if (!qa) notFound();

  const list = items.some((i) => i.id === qa.id) ? items : [qa, ...items];
  return <AskTGP initialItems={list} initialSlug={qa.slug} />;
}
