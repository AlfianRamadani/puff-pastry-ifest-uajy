"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NoteSection = {
  id: string;
  type: string;
  order_index: number;
  content: { text?: string } | Record<string, unknown> | string;
};

type SharedNote = {
  id: string;
  title: string;
  source: string | null;
  tags: string[] | null;
  is_shared: boolean;
  note_sections: NoteSection[];
};

function sectionText(content: NoteSection["content"]): string {
  if (typeof content === "string") return content;
  if (typeof content === "object" && content && "text" in content) return String((content as { text?: unknown }).text ?? "");
  return "";
}

export default function SharedNotePage() {
  const params = useParams<{ noteId: string }>();
  const noteId = params.noteId;
  const [note, setNote] = useState<SharedNote | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, source, tags, is_shared, note_sections(*)")
        .eq("id", noteId)
        .eq("is_shared", true)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data) {
        setErrorMessage("This note is not publicly shared.");
        return;
      }

      const normalized = {
        ...(data as SharedNote),
        note_sections: [...((data as SharedNote).note_sections ?? [])].sort((a, b) => a.order_index - b.order_index),
      };
      setNote(normalized);
    };
    void load();
  }, [noteId]);

  if (errorMessage) {
    return <section className="max-w-3xl mx-auto p-6"><div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div></section>;
  }
  if (!note) return <section className="max-w-3xl mx-auto p-6 font-bold">Loading shared note...</section>;

  return (
    <section className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="border-[3px] border-black bg-[#FFC107] p-3">
        <p className="font-black text-xs uppercase">Shared Note</p>
      </div>
      <div className="border-[3px] border-black bg-white p-5 space-y-4">
        <h1 className="font-black text-3xl">{note.title}</h1>
        <div className="flex flex-wrap gap-2">
          {(note.tags ?? []).map((tag) => (
            <span key={tag} className="px-2 py-0.5 border-2 border-black font-black text-xs uppercase">#{tag}</span>
          ))}
        </div>
        <p className="font-bold text-sm">Source: <span className="font-black">{note.source ?? "-"}</span></p>
        <div className="space-y-3">
          {note.note_sections.map((section) => (
            <div key={section.id}>
              {section.type === "heading" ? (
                <h2 className="font-black text-xl">{sectionText(section.content)}</h2>
              ) : section.type === "quote" ? (
                <blockquote className="border-l-[4px] border-black bg-[#FFF9C4] p-3 italic font-bold text-sm">{sectionText(section.content)}</blockquote>
              ) : section.type === "code" ? (
                <pre className="border-[3px] border-black bg-black text-white p-3 text-xs overflow-x-auto"><code>{sectionText(section.content)}</code></pre>
              ) : (
                <p className="font-medium text-sm">{sectionText(section.content)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
