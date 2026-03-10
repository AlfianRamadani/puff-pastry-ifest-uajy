import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] flex items-center justify-center">
      <Link href="/dashboard" className="font-black text-xl text-black uppercase">
        Go to Dashboard
      </Link>
    </div>
  );
}
