import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { BottomNav } from "@/components/app/bottom-nav";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const sidebarUser = user ? { name: user.name, role: user.role } : null;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-paper">
      <AppSidebar user={sidebarUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
