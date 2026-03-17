"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type TagKey = "evergreen" | "draft" | "idea" | "reference";
export interface TagConfig {
  label: string;
  color: string;
}
export type TagsMap = Record<TagKey, TagConfig>;
export type NoteSection = { type: "heading" | "paragraph" | "quote" | "code" | "table" | "graph"; content: string };
export interface Note {
  id: string;
  title: string;
  slug: string;
  folder: string;
  tags: TagKey[];
  source?: string;
  sections: NoteSection[];
}

const TAGS: TagsMap = {
  evergreen: { label: "#evergreen", color: "bg-[#A855F7] text-white border-2 border-black" },
  draft: { label: "#draft", color: "bg-[#FFC107] text-black border-2 border-black" },
  idea: { label: "#idea", color: "bg-[#00E5FF] text-black border-2 border-black" },
  reference: { label: "#reference", color: "bg-[#FF5722] text-white border-2 border-black" },
};

type SidebarNote = {
  id: string;
  title: string;
  slug: string;
  folder: string;
  tags: string[] | null;
  updated_at: string;
  preview: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"evergreen" | "notetaking">("evergreen");
  const [notes, setNotes] = useState<SidebarNote[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .select("id, title, slug, tags, folder, updated_at, note_sections(content, order_index)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const mapped = ((data as Array<{
      id: string;
      title: string;
      slug: string;
      folder: string | null;
      tags: string[] | null;
      updated_at: string;
      note_sections?: Array<{ content: unknown; order_index: number }>;
    }> | null) ?? []).map((row) => {
      const firstSection = [...(row.note_sections ?? [])].sort((a, b) => a.order_index - b.order_index)[0];
      const preview =
        typeof firstSection?.content === "object" && firstSection?.content && "text" in (firstSection.content as Record<string, unknown>)
          ? String((firstSection.content as Record<string, unknown>).text ?? "")
          : typeof firstSection?.content === "string"
            ? firstSection.content
            : "";
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        folder: row.folder ?? "study-space",
        tags: row.tags ?? [],
        updated_at: row.updated_at,
        preview,
      } satisfies SidebarNote;
    });

    setNotes(mapped);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadNotes(), [loadNotes]);

  const displayed = useMemo(
    () => (activeTab === "evergreen" ? notes.filter((note) => (note.tags ?? []).includes("evergreen")) : notes),
    [activeTab, notes],
  );

  const createNote = useCallback(async () => {
    if (!user) return;
    const title = newTitle.trim();
    if (!title) return;
    const slug = slugify(title);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title,
        slug,
        folder: "study-space",
        tags: [],
      })
      .select("id, folder, slug")
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewTitle("");
    const note = data as { id: string; folder: string | null; slug: string };
    router.push(`/notes/${note.folder ?? "study-space"}/${note.slug}`);
  }, [newTitle, router, user]);

  return (
    <section className="space-y-4">
      {errorMessage && <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="border-[3px] border-black bg-[#FFFDF7] p-6 min-h-[420px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="font-black text-2xl uppercase">Study Space</h1>
          <p className="font-bold text-sm text-black/60 mt-2">
            Select a note from the sidebar or create a new one.
          </p>
        </div>

        <aside className="border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid grid-cols-2 border-b-[3px] border-black">
            <button
              onClick={() => setActiveTab("evergreen")}
              className={`px-3 py-2 font-black text-xs uppercase border-r-[3px] border-black ${activeTab === "evergreen" ? "bg-black text-[#FFC107]" : "bg-white"}`}
            >
              Evergreen Notes
            </button>
            <button
              onClick={() => setActiveTab("notetaking")}
              className={`px-3 py-2 font-black text-xs uppercase ${activeTab === "notetaking" ? "bg-black text-[#FFC107]" : "bg-white"}`}
            >
              Note Taking
            </button>
          </div>

          <div className="p-3 border-b-[3px] border-black flex gap-2">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void createNote()}
              placeholder="New note title..."
              className="flex-1 border-[3px] border-black px-3 py-2 font-bold text-xs"
            />
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {displayed.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.folder}/${note.slug}`}
                className="block p-3 border-b-[2px] border-black hover:bg-[#FFF9C4]"
              >
                <p className="font-black text-xs uppercase">{note.title}</p>
                <p className="font-bold text-xs text-black/60 line-clamp-2 mt-1">{note.preview || "No preview"}</p>
              </Link>
            ))}
            {displayed.length === 0 && <p className="p-3 font-bold text-xs text-black/60">No notes found.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

export { TAGS };
