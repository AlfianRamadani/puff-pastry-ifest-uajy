import { useState } from "react";
import { FileText } from "lucide-react";
import EvergreenPanel from "@/app/components/notes/EvergreenPanel";
import NoteTakingPanel from "@/app/components/notes/NoteTakingPanel";
import type { Note, TagsMap } from "@/app/(app)/notes/page";

type TabId = "evergreen" | "notetaking";
interface Tab { id: TabId; label: string; }

interface RightSidebarProps {
    notes: Note[];
    tags: TagsMap;
    activeNoteId: number;
    onSelectNote: (id: number) => void;
    onAddNote: (title: string) => void;
    onDeleteNote: (id: number) => void;
}

const TABS: Tab[] = [
    { id: "evergreen", label: "Evergreen notes" },
    { id: "notetaking", label: "Note Taking" },
];

export default function RightSidebar({ notes, tags, activeNoteId, onSelectNote, onAddNote, onDeleteNote }: RightSidebarProps) {
    const [activeTab, setActiveTab] = useState<TabId>("evergreen");

    return (
        <div className="w-[85vw] sm:w-80 h-full flex flex-col border-l-[3px] border-black bg-[#FFFDF7] overflow-hidden pb-[72px] md:pb-0">
            {/* Tabs */}
            <div className="flex items-center border-b-[3px] border-black shrink-0">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-3 py-3 text-xs font-black uppercase tracking-wide border-r-[3px] border-black transition-colors ${activeTab === tab.id
                                ? "bg-black text-[#FFC107]"
                                : "bg-white text-black hover:bg-[#FFF9C4]"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}

            </div>

            {/* Panel */}
            {activeTab === "evergreen" ? (
                <EvergreenPanel notes={notes} tags={tags} activeNoteId={activeNoteId} onSelectNote={onSelectNote} />
            ) : (
                <NoteTakingPanel
                    notes={notes}
                    activeNoteId={activeNoteId}
                    onSelectNote={onSelectNote}
                    onAddNote={onAddNote}
                    onDeleteNote={onDeleteNote}
                />
            )}

            {/* Quick-open strip */}
            <div className="border-t-[3px] border-black shrink-0 bg-white">
                <div className="flex items-center gap-2 px-3 py-2 border-b-[3px] border-black bg-[#B3FFB3]">
                    <span className="w-2.5 h-2.5 bg-[#00C853] border-[2px] border-black" />
                    <span className="text-xs font-black text-black uppercase tracking-wide">New Tab</span>
                </div>
                {notes.slice(0, 3).map((note) => {
                    const isActive = note.id === activeNoteId;
                    return (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b-[2px] border-black/10 transition-colors ${isActive ? "bg-[#E0F7FA]" : "hover:bg-[#FFF9C4]"
                                }`}
                        >
                            <FileText size={11} strokeWidth={2.5} className="shrink-0 text-black" />
                            <span className="flex-1 text-xs font-bold text-black truncate">{note.title}</span>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}