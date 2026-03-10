import Sidebar from './components/layouts/sidebar';
import TopBar from './components/layouts/topbar';
import './globals.css'; // Make sure your Tailwind CSS is imported!

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* md:flex-row makes it Side-by-Side on Desktop.
        flex-col makes it stack on Mobile.
      */}
      <body className="flex flex-col md:flex-row h-screen w-full bg-[#FFF9F0] overflow-hidden m-0">
        
        {/* 1. SIDEBAR FIRST */}
        <Sidebar />

        {/* 2. MAIN CONTENT WRAPPER */}
        {/* Must be flex-col so TopBar stays on top of the content */}
        <div className="flex flex-col flex-1 w-full h-full overflow-hidden relative">
          
          {/* TOPBAR MUST BE HERE (Above main) */}
          <div className="w-full shrink-0">
            <TopBar />
          </div>

          {/* PAGE CONTENT (The dynamic part) */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
            {/* The 'children' prop is where your page.tsx gets injected */}
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}