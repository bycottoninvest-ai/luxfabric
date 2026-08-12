import { AdminShell } from "@/components/admin/AdminShell";

/** Admin DB ma’lumotlari — build-time prerender/kesh bo‘lmasin (yangi mahsulot ko‘rinsin). */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
