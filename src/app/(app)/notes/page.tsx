'use client';
import { useState } from "react";
import TopNav from "@/app/components/notes/TopNav";
import NoteEditor from "@/app/components/notes/NoteEditor";
import RightSidebar from "@/app/components/notes/RightSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TagKey = "evergreen" | "draft" | "idea" | "reference";

export interface TagConfig {
    label: string;
    color: string;
}

export type TagsMap = Record<TagKey, TagConfig>;

export type NoteSection =
    | { type: "heading"; content: string }
    | { type: "paragraph"; content: string }
    | { type: "quote"; content: string }
    | { type: "code"; content: string }
    | { type: "table"; content: string }  // JSON: {headers: string[], rows: string[][]}
    | { type: "graph"; content: string }; // JSON: {labels: string[], values: number[]}

export interface Note {
    id: number;
    title: string;
    tags: TagKey[];
    source?: string;
    sections: NoteSection[];
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────

export const TAGS: TagsMap = {
    evergreen: { label: "#evergreen", color: "bg-[#A855F7] text-white border-2 border-black" },
    draft: { label: "#draft", color: "bg-[#FFC107] text-black border-2 border-black" },
    idea: { label: "#idea", color: "bg-[#00E5FF] text-black border-2 border-black" },
    reference: { label: "#reference", color: "bg-[#FF5722] text-white border-2 border-black" },
};

const INITIAL_NOTES: Note[] = [
    {
        id: 1,
        title: "Writing is telepathy",
        tags: ["evergreen", "draft"],
        source: "On Writing",
        sections: [
            { type: "heading", content: "Ideas can travel through time and space" },
            { type: "paragraph", content: "Ideas can travel through time and space without being uttered out loud. The process of telepathy requires two places:" },
            { type: "paragraph", content: "• A sending place — a transmission place where the writer sends ideas, such as a desk.\n• A receiving place — where the reader receives the ideas/imagery such as a couch, a comfortable chair, in bed." },
            { type: "quote", content: '"Look- here\'s a table covered with red cloth. On it is a cage the size of a small fish aquarium. In the cage is a white rabbit with a pink nose and pink-rimmed eyes. On its back, clearly marked in blue ink, is the numeral 8."' },
        ],
    },
    {
        id: 2,
        title: "Everything is a remix",
        tags: ["evergreen"],
        source: "Kirby Ferguson",
        sections: [
            { type: "heading", content: "Creation requires influence" },
            { type: "paragraph", content: "All creative work builds on what came before. Copy, transform, and combine — these are the three elements of all creativity." },
        ],
    },
    {
        id: 3,
        title: "Evergreen notes turn ideas into objects",
        tags: ["evergreen"],
        source: "Andy Matuschak",
        sections: [
            { type: "heading", content: "Notes as thinking tools" },
            { type: "paragraph", content: "Evergreen notes allow you to think about complex ideas by building them up from smaller composable ideas." },
            { type: "paragraph", content: "• A company is a superorganism\n• Calmness is a superpower\n• Everything is a remix\n• Writing is telepathy" },
        ],
    },
    {
        id: 4,
        title: "Calmness is a superpower",
        tags: ["idea", "draft"],
        source: "Personal",
        sections: [
            { type: "heading", content: "The strategic advantage of calm" },
            { type: "paragraph", content: "In high-stakes situations, the person who remains calm has an enormous cognitive advantage. Anxiety narrows thinking; calm expands it." },
        ],
    },
    {
        id: 5,
        title: "A company is a superorganism",
        tags: ["evergreen", "reference"],
        source: "Biology of Business",
        sections: [
            { type: "heading", content: "Emergent behavior in organizations" },
            { type: "paragraph", content: "Like ant colonies, companies exhibit intelligence that exceeds the sum of their individual parts. No single person understands the whole." },
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudySpace() {
    const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
    const [activeNoteId, setActiveNoteId] = useState<number>(1);
    const [nextId, setNextId] = useState<number>(INITIAL_NOTES.length + 1);

    const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;
    const activeIndex = notes.findIndex((n) => n.id === activeNoteId);

    const handlePrev = () => {
        if (notes.length === 0) return;
        setActiveNoteId(notes[(activeIndex - 1 + notes.length) % notes.length].id);
    };
    const handleNext = () => {
        if (notes.length === 0) return;
        setActiveNoteId(notes[(activeIndex + 1) % notes.length].id);
    };

    // ── Add ──────────────────────────────────────────────────────────────────
    const handleAddNote = (title: string) => {
        const newNote: Note = {
            id: nextId,
            title,
            tags: ["draft"],
            source: "",
            sections: [
                { type: "heading", content: "Getting started" },
                { type: "paragraph", content: "Start writing your ideas here..." },
            ],
        };
        setNotes((prev) => [newNote, ...prev]);
        setActiveNoteId(nextId);
        setNextId((n) => n + 1);
    };

    // ── Update ───────────────────────────────────────────────────────────────
    const handleUpdateNote = (updated: Note) => {
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDeleteNote = (id: number) => {
        const remaining = notes.filter((n) => n.id !== id);
        setNotes(remaining);
        if (activeNoteId === id) {
            setActiveNoteId(remaining.length > 0 ? remaining[0].id : -1);
        }
    };

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const breadcrumb = [
        "ideas",
        activeNote ? activeNote.title.toLowerCase().replace(/\s+/g, "-") : "",
    ];

    return (
        <div
            className="-m-4 md:-m-8 h-[calc(100%+2rem)] md:h-[calc(100%+4rem)] flex flex-col overflow-hidden"
            style={{ fontFamily: "'Space Grotesk', monospace" }}
        >
            <TopNav
                breadcrumb={breadcrumb}
                activeNote={activeNote}
                onDeleteNote={handleDeleteNote}
                onToggleSidebar={() => setSidebarOpen((v) => !v)}
                sidebarOpen={sidebarOpen}
            />
            <main className="flex flex-1 overflow-hidden relative">
                <NoteEditor
                    note={activeNote}
                    tags={TAGS}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onUpdateNote={handleUpdateNote}
                />

                {/* Overlay backdrop — mobile & tablet only */}
                {sidebarOpen && (
                    <div
                        className="xl:hidden fixed inset-0 bg-black/40 z-20"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Right sidebar */}
                <div className={`
                    xl:relative xl:translate-x-0 xl:flex
                    fixed top-0 right-0 h-full z-30
                    transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"}
                `}>
                    <RightSidebar
                        notes={notes}
                        tags={TAGS}
                        activeNoteId={activeNoteId}
                        onSelectNote={(id) => { setActiveNoteId(id); setSidebarOpen(false); }}
                        onAddNote={handleAddNote}
                        onDeleteNote={handleDeleteNote}
                    />
                </div>
            </main>
        </div>
    );
}