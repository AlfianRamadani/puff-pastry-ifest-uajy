import TagBadge from "@/app/components/notes/Tagbadge";
import type { Note, TagsMap } from "@/app/(app)/notes/page";

interface EvergreenPanelProps {
    notes: Note[];
    tags: TagsMap;
    activeNoteId: number;
    onSelectNote: (id: number) => void;
}

export default function EvergreenPanel({ notes, tags, activeNoteId, onSelectNote }: EvergreenPanelProps) {
    const evergreenNotes = notes.filter((n) => n.tags.includes("evergreen"));

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFFDF7]">
            {evergreenNotes.length === 0 && (
                <div className="p-6 text-center">
                    <p className="text-xs font-black text-black/30 uppercase tracking-widest">No evergreen notes</p>
                </div>
            )}
            {evergreenNotes.map((note, idx) => {
                const isActive = note.id === activeNoteId;
                const preview = note.sections.find((s) => s.type === "paragraph");
                // Cycle accent colors for non-active cards
                const accentColors = ["border-l-[#A855F7]", "border-l-[#00E5FF]", "border-l-[#FF5722]", "border-l-[#FFC107]"];
                const accent = accentColors[idx % accentColors.length];

                return (
                    <div
                        key={note.id}
                        onClick={() => onSelectNote(note.id)}
                        className={`border-[3px] border-black p-4 cursor-pointer transition-all border-l-[6px] ${isActive
                                ? "bg-[#FFC107] shadow-[4px_4px_0px_#000] border-l-black"
                                : `bg-white hover:bg-[#FFFDE7] shadow-[2px_2px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] ${accent}`
                            }`}
                    >
                        <h3 className="font-black text-sm text-black leading-snug mb-2">{note.title}</h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {note.tags.map((tag) => <TagBadge key={tag} tag={tag} tags={tags} />)}
                        </div>
                        {preview && "content" in preview && (
                            <p className="text-xs text-black/60 font-medium line-clamp-2">{preview.content}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}