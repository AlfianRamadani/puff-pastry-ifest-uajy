import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import type { Note } from "@/app/(app)/notes/page";

interface NoteTakingPanelProps {
    notes: Note[];
    activeNoteId: number;
    onSelectNote: (id: number) => void;
    onAddNote: (title: string) => void;
    onDeleteNote: (id: number) => void;
}

export default function NoteTakingPanel({ notes, activeNoteId, onSelectNote, onAddNote, onDeleteNote }: NoteTakingPanelProps) {
    const [input, setInput] = useState<string>("");

    const handleAdd = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        onAddNote(trimmed);
        setInput("");
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#FFFDF7]">
            {/* Input */}
            <div className="p-3 border-b-[3px] border-black flex gap-2 shrink-0 bg-white">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="New note title..."
                    className="flex-1 border-[3px] border-black px-3 py-2 text-xs font-bold bg-[#FFFDF7] placeholder:text-black/40 focus:outline-none focus:bg-[#FFF9C4] shadow-[2px_2px_0px_#000] focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                />
                <button
                    onClick={handleAdd}
                    disabled={!input.trim()}
                    className="bg-[#FFC107] text-black px-3 border-[3px] border-black font-black hover:bg-[#FFD740] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                    <Plus size={14} strokeWidth={3} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {notes.length === 0 && (
                    <div className="p-6 text-center">
                        <p className="text-xs font-black text-black/30 uppercase tracking-widest">No notes yet</p>
                    </div>
                )}
                {notes.map((note) => {
                    const isActive = note.id === activeNoteId;
                    return (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note.id)}
                            className={`group flex items-center gap-3 px-4 py-3 border-b-[3px] border-black transition-colors cursor-pointer ${isActive ? "bg-[#00E5FF]" : "bg-white hover:bg-[#E0F7FA]"
                                }`}
                        >
                            <FileText size={13} strokeWidth={2.5} className="shrink-0 text-black" />
                            <span
                                className="flex-1 text-xs font-bold text-black truncate"
                            >
                                {note.title}
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 bg-[#FF3B3B] text-white border-[3px] border-black transition-all shadow-[2px_2px_0px_#000]"
                                title="Delete note"
                            >
                                <Trash2 size={11} strokeWidth={2.5} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}