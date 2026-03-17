'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/app/components/notes/TopNav";
import NoteEditor from "@/app/components/notes/NoteEditor";
import RightSidebar from "@/app/components/notes/RightSidebar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
  | { type: "table"; content: string }
  | { type: "graph"; content: string };

export interface Note {
  id: string;
  title: string;
  slug: string;
  folder: string;
  tags: TagKey[];
  source?: string;
  sections: NoteSection[];
}

const SECTION_TYPES = ["heading", "paragraph", "quote", "code", "table", "graph"] as const;

type SectionType = (typeof SECTION_TYPES)[number];

type NoteRow = {
  id: string;
  title: string;
  slug: string;
  folder: string | null;
  source: string | null;
  tags: string[] | null;
  note_sections?: Array<{ type: string; content: unknown; order_index: number }>;
};

export const TAGS: TagsMap = {
  evergreen: { label: "#evergreen", color: "bg-[#A855F7] text-white border-2 border-black" },
  draft: { label: "#draft", color: "bg-[#FFC107] text-black border-2 border-black" },
  idea: { label: "#idea", color: "bg-[#00E5FF] text-black border-2 border-black" },
  reference: { label: "#reference", color: "bg-[#FF5722] text-white border-2 border-black" },
};

const DEFAULT_SECTIONS: NoteSection[] = [
  { type: "heading", content: "Getting started" },
  { type: "paragraph", content: "Start writing your ideas here..." },
];

function slugify(text: string): string {
  const base = text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  return base || "untitled-note";
}

function isTagKey(tag: string): tag is TagKey {
  return ["evergreen", "draft", "idea", "reference"].includes(tag);
}

function normalizeSectionType(value: string): SectionType {
  if (SECTION_TYPES.includes(value as SectionType)) return value as SectionType;
  return "paragraph";
}

function normalizeSectionContent(type: SectionType, content: unknown): string {
  if (type === "table" || type === "graph") {
    if (typeof content === "string") return content;
    if (typeof content === "object" && content) return JSON.stringify(content);
    return "";
  }

  if (typeof content === "string") return content;
  if (typeof content === "object" && content && "text" in content) {
    return String((content as { text?: unknown }).text ?? "");
  }
  return "";
}

function mapDbNote(row: NoteRow): Note {
  const sections = [...(row.note_sections ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((section) => {
      const type = normalizeSectionType(section.type);
      return {
        type,
        content: normalizeSectionContent(type, section.content),
      } as NoteSection;
    });

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    folder: row.folder ?? "study-space",
    tags: (row.tags ?? []).filter(isTagKey),
    source: row.source ?? "",
    sections,
  };
}

export default function StudySpace() {
  const router = useRouter();
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setActiveNoteId("");
      return;
    }

    const { data, error } = await supabase
      .from("notes")
      .select("id, title, slug, folder, source, tags, note_sections(type, content, order_index)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const mapped = ((data as NoteRow[] | null) ?? []).map(mapDbNote);
    setNotes(mapped);
    setActiveNoteId((prev) => (mapped.some((note) => note.id === prev) ? prev : (mapped[0]?.id ?? "")));
    setErrorMessage(null);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadNotes(), [loadNotes]);

  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null;
  const activeIndex = notes.findIndex((note) => note.id === activeNoteId);

  const handlePrev = useCallback(() => {
    if (notes.length === 0) return;
    setActiveNoteId(notes[(activeIndex - 1 + notes.length) % notes.length].id);
  }, [activeIndex, notes]);

  const handleNext = useCallback(() => {
    if (notes.length === 0) return;
    setActiveNoteId(notes[(activeIndex + 1) % notes.length].id);
  }, [activeIndex, notes]);

  const handleAddNote = useCallback(async (title: string) => {
    if (!user) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const baseSlug = slugify(trimmedTitle);
    const existingSlugs = new Set(notes.map((note) => note.slug));
    let nextSlug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(nextSlug)) {
      nextSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        slug: nextSlug,
        folder: "study-space",
        tags: ["draft"],
        source: "",
      })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const noteId = (data as { id: string }).id;
    const { error: sectionError } = await supabase.from("note_sections").insert(
      DEFAULT_SECTIONS.map((section, index) => ({
        note_id: noteId,
        type: section.type,
        content: { text: section.content },
        order_index: index + 1,
      })),
    );

    if (sectionError) {
      setErrorMessage(sectionError.message);
      return;
    }

    await loadNotes();
    setActiveNoteId(noteId);
  }, [loadNotes, notes, user]);

  const handleUpdateNote = useCallback(async (updated: Note) => {
    if (!user) return;

    const nextSlug = slugify(updated.title);

    const { error: noteError } = await supabase
      .from("notes")
      .update({
        title: updated.title,
        slug: nextSlug,
        folder: updated.folder,
        tags: updated.tags,
        source: updated.source ?? "",
      })
      .eq("id", updated.id)
      .eq("user_id", user.id);

    if (noteError) {
      setErrorMessage(noteError.message);
      return;
    }

    const { error: deleteSectionsError } = await supabase.from("note_sections").delete().eq("note_id", updated.id);
    if (deleteSectionsError) {
      setErrorMessage(deleteSectionsError.message);
      return;
    }

    if (updated.sections.length > 0) {
      const { error: insertSectionsError } = await supabase.from("note_sections").insert(
        updated.sections.map((section, index) => ({
          note_id: updated.id,
          type: section.type,
          content: section.type === "table" || section.type === "graph" ? JSON.parse(section.content || "{}") : { text: section.content },
          order_index: index + 1,
        })),
      );

      if (insertSectionsError) {
        setErrorMessage(insertSectionsError.message);
        return;
      }
    }

    await loadNotes();
    setActiveNoteId(updated.id);
  }, [loadNotes, user]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const remaining = notes.filter((note) => note.id !== id);
    setNotes(remaining);
    setActiveNoteId((prev) => (prev === id ? (remaining[0]?.id ?? "") : prev));
    setErrorMessage(null);
  }, [notes, user]);

  const handleShareNote = useCallback(() => {
    if (!activeNote) return;
    router.push(`/notes/${activeNote.folder}/${activeNote.slug}`);
  }, [activeNote, router]);

  const breadcrumb = useMemo(
    () => ["ideas", activeNote ? activeNote.title.toLowerCase().replace(/\s+/g, "-") : ""],
    [activeNote],
  );

  return (
    <div
      className="-m-4 md:-m-8 h-[calc(100%+2rem)] md:h-[calc(100%+4rem)] flex flex-col overflow-hidden"
      style={{ fontFamily: "'Space Grotesk', monospace" }}
    >
      {errorMessage && (
        <div className="mx-4 mt-4 md:mx-8 border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs shrink-0">
          {errorMessage}
        </div>
      )}

      <TopNav
        breadcrumb={breadcrumb}
        activeNote={activeNote}
        onDeleteNote={handleDeleteNote}
        onShareNote={handleShareNote}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
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

        {sidebarOpen && (
          <div
            className="xl:hidden fixed inset-0 bg-black/40 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`
            xl:relative xl:translate-x-0 xl:flex
            fixed top-0 right-0 h-full z-30
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"}
          `}
        >
          <RightSidebar
            notes={notes}
            tags={TAGS}
            activeNoteId={activeNoteId}
            onSelectNote={(id) => {
              setActiveNoteId(id);
              setSidebarOpen(false);
            }}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </main>
    </div>
  );
}
