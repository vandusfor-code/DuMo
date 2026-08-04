import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

/**
 * Shared shell for every authenticated screen: fixed 260px sidebar + a content
 * column with the top utility bar. Content is capped at 1440px and fills the
 * available width (never centered narrow) per the specs.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-10">
          <Header />
          <main className="pb-16">{children}</main>
        </div>
      </div>
    </div>
  );
}
