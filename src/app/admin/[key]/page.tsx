import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { adminKeyValid } from "@/lib/admin";
import { adminTemplates, listVideos } from "@/lib/adminFiles";
import { listJobs } from "@/lib/videoJobs";

type Props = { params: Promise<{ key: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Админка", robots: { index: false, follow: false } };

/** Скрытая админка (только локально, ключ ADMIN_KEY): шаблоны и ролики. */
export default async function AdminPage({ params }: Props) {
  const { key } = await params;
  if (!adminKeyValid(key)) notFound();
  const [templates, videos] = await Promise.all([adminTemplates(), listVideos()]);
  return <AdminDashboard adminKey={key} templates={templates} videos={videos} jobs={listJobs()} showcaseKey={process.env.SHOWCASE_KEY ?? null} />;
}
