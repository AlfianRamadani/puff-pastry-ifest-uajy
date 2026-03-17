import Sidebar from '@/app/components/layouts/sidebar';
import TopBar from '@/app/components/layouts/topbar';
import Walkthrough from '@/app/components/onboarding/Walkthrough';
import ProtectedRoute from '@/app/components/auth/ProtectedRoute';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col md:flex-row h-screen w-full bg-[#FFF9F0] overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 w-full h-full overflow-hidden relative">
          <div className="w-full shrink-0">
            <TopBar />
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
            {children}
          </main>
        </div>
        <Walkthrough />
      </div>
    </ProtectedRoute>
  );
}
