export default function TestSidebarPage() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar - Fixed or Static */}

      {/* Empty Main Content Area */}
      <main className="flex-1 p-10">
        <div className="border-4 border-dashed border-gray-300 rounded-lg h-full flex items-center justify-center">
          <p className="text-gray-500 font-mono">Main Content Area (Testing Sidebar Layout)</p>
        </div>
      </main>


    </div>
  );
}