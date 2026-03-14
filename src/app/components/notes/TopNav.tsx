import { Share2, Moon, Trash2, PanelRight, PanelRightClose } from "lucide-react";
import type { Note } from "@/app/(app)/notes/page";

interface TopNavProps {
    breadcrumb: string[];
    activeNote: Note | null;
    onDeleteNote: (id: number) => void;
    onToggleSidebar: () => void;
    sidebarOpen: boolean;
}

export default function TopNav({ breadcrumb, activeNote, onDeleteNote, onToggleSidebar, sidebarOpen }: TopNavProps) {
    return (
        <header className="flex items-center justify-between px-3 md:px-5 py-3 bg-[#FFC107] border-b-[3px] border-black shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 md:gap-3 font-black text-xs md:text-sm uppercase tracking-widest min-w-0">
                <span className="text-black shrink-0">STUDY SPACE</span>
                {breadcrumb.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-2 md:gap-3 min-w-0">
                        <span className="text-black/40 font-normal shrink-0">/</span>
                        <span className={`truncate ${i === breadcrumb.length - 1 ? "text-black/60" : "text-black/40"} ${i === 1 ? "hidden sm:block" : ""}`}>
                            {crumb}
                        </span>
                    </span>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                {/* Avatars */}
                <div className="hidden sm:flex items-center border-[3px] border-black shadow-[3px_3px_0px_#000] overflow-hidden">
                    <div className="w-8 h-8 bg-[#A855F7] flex items-center justify-center text-xs font-black text-white border-r-[3px] border-black">JD</div>
                    <div className="w-8 h-8 bg-[#00E5FF] flex items-center justify-center text-xs font-black text-black">AL</div>
                </div>

                {activeNote && (
                    <button
                        onClick={() => onDeleteNote(activeNote.id)}
                        className="hidden sm:flex items-center gap-1.5 px-3 h-8 bg-white text-black text-xs font-black uppercase border-[3px] border-black hover:bg-[#FF3B3B] hover:text-white hover:border-[#FF3B3B] transition-all shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                    >
                        <Trash2 size={12} strokeWidth={3} />
                        <span className="hidden md:inline">DELETE</span>
                    </button>
                )}

                <button className="hidden md:flex items-center gap-1.5 px-3 h-8 bg-black text-white text-xs font-black uppercase border-[3px] border-black hover:bg-white hover:text-black transition-all shadow-[3px_3px_0px_rgba(0,0,0,0.3)] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]">
                    <Share2 size={12} strokeWidth={3} /> SHARE
                </button>

                <button className="hidden sm:flex w-8 h-8 items-center justify-center border-[3px] border-black bg-black text-white hover:bg-white hover:text-black transition-colors shadow-[3px_3px_0px_rgba(0,0,0,0.3)]">
                    <Moon size={14} strokeWidth={2.5} />
                </button>

                {/* Sidebar toggle — hidden on xl (always visible there) */}
                <button
                    onClick={onToggleSidebar}
                    className="xl:hidden w-8 h-8 flex items-center justify-center border-[3px] border-black bg-black text-white hover:bg-white hover:text-black transition-colors shadow-[3px_3px_0px_rgba(0,0,0,0.3)]"
                    title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {sidebarOpen
                        ? <PanelRightClose size={14} strokeWidth={2.5} />
                        : <PanelRight size={14} strokeWidth={2.5} />
                    }
                </button>
            </div>
        </header>
    );
}