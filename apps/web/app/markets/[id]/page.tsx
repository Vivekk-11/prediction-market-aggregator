import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MarketDetail } from "@/lib/types";
import MarketDetailClient from "./market-detail-client";

async function getMarket(id: string): Promise<MarketDetail | null> {
  const apiUrl = process.env.API_URL || "http://localhost:3001";
  const res = await fetch(`${apiUrl}/markets/${id}`, { next: { revalidate: 30 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch market");
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const market = await getMarket(id);
  return {
    title: market ? market.title : "Market Not Found",
  };
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const market = await getMarket(id);
  if (!market) notFound();
  return <MarketDetailClient market={market} />;
}
