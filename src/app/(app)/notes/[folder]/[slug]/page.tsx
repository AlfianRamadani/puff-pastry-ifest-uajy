"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type SectionType = "heading" | "paragraph" | "quote" | "code" | "table" | "graph";
type NoteSection = {
  id: string;
  type: SectionType;
  order_index: number;
  content: { text?: string } | Record<string, unknown> | string;
};

type Collaborator = {
  id: string;
  user_id: string;
  permission: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type NoteDetail = {
  id: string;
  title: string;
  slug: string;
  folder: string | null;
  source: string | null;
  tags: string[] | null;
  is_shared: boolean | null;
  note_sections: NoteSection[];
  note_collaborators: Collaborator[];
};

type NoteNavItem = {
  id: string;
  slug: string;
  folder: string | null;
};

type ProfileSearchRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

const TAG_COLORS: Record<string, string> = {
  evergreen: "bg-[#A855F7] text-white border-2 border-black",
  draft: "bg-[#FFC107] text-black border-2 border-black",
  idea: "bg-[#B3FFB3] text-black border-2 border-black",
  reference: "bg-[#FF5722] text-white border-2 border-black",
};

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function asText(content: NoteSection["content"]): string {
  if (typeof content === "string") return content;
  if (typeof content === "object" && content && "text" in content) return String((content as { text?: unknown }).text ?? "");
  return "";
}

export default function NoteDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useParams<{ folder: string; slug: string }>();
  const folder = params.folder;
  const slug = params.slug;

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [draft, setDraft] = useState<NoteDetail | null>(null);
  const [notesOrder, setNotesOrder] = useState<NoteNavItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<ProfileSearchRow[]>([]);
  const [invitePermission, setInvitePermission] = useState<"view" | "edit">("view");

  const loadNote = useCallback(async () => {
    if (!user) return;
    const [noteResult, orderResult] = await Promise.all([
      supabase
        .from("notes")
        .select("id, title, slug, folder, source, tags, is_shared, note_sections(*), note_collaborators(*, profiles(full_name, avatar_url))")
        .eq("slug", slug)
        .eq("folder", folder)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("notes")
        .select("id, slug, folder")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    if (noteResult.error || orderResult.error) {
      setErrorMessage(noteResult.error?.message ?? orderResult.error?.message ?? "Failed to load note.");
      return;
    }

    if (!noteResult.data) {
      router.push("/notes");
      return;
    }

    const normalized = {
      ...(noteResult.data as NoteDetail),
      note_sections: [...((noteResult.data as NoteDetail).note_sections ?? [])].sort((a, b) => a.order_index - b.order_index),
      note_collaborators: (noteResult.data as NoteDetail).note_collaborators ?? [],
    };

    setNote(normalized);
    setDraft(JSON.parse(JSON.stringify(normalized)) as NoteDetail);
    setNotesOrder((orderResult.data as NoteNavItem[] | null) ?? []);
    setEditing(false);
  }, [folder, router, slug, user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void loadNote(), [loadNote]);

  useEffect(() => {
    if (!shareOpen || !user || inviteQuery.trim().length < 2) return;
    const run = async () => {
      const q = inviteQuery.trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .neq("id", user.id)
        .limit(8);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setInviteResults((data as ProfileSearchRow[] | null) ?? []);
    };
    void run();
  }, [inviteQuery, shareOpen, user]);

  const currentIndex = useMemo(
    () => notesOrder.findIndex((item) => item.slug === slug && (item.folder ?? "study-space") === folder),
    [folder, notesOrder, slug],
  );
  const prevNote = currentIndex > 0 ? notesOrder[currentIndex - 1] : null;
  const nextNote = currentIndex >= 0 && currentIndex < notesOrder.length - 1 ? notesOrder[currentIndex + 1] : null;

  const navigateToNote = useCallback(
    (target: NoteNavItem | null) => {
      if (!target) return;
      router.push(`/notes/${target.folder ?? "study-space"}/${target.slug}`);
    },
    [router],
  );

  const saveNote = useCallback(async () => {
    if (!draft || !note || !user) return;
    const nextSlug = slugify(draft.title);

    const { error: noteError } = await supabase
      .from("notes")
      .update({
        title: draft.title,
        slug: nextSlug,
        source: draft.source,
        tags: draft.tags,
      })
      .eq("id", note.id)
      .eq("user_id", user.id);

    if (noteError) {
      setErrorMessage(noteError.message);
      return;
    }

    const sectionRows = draft.note_sections.map((section, index) => ({
      id: section.id,
      note_id: note.id,
      type: section.type,
      content: section.content,
      order_index: index + 1,
    }));
    const { error: sectionError } = await supabase.from("note_sections").upsert(sectionRows);
    if (sectionError) {
      setErrorMessage(sectionError.message);
      return;
    }

    setEditing(false);
    if (nextSlug !== slug) {
      router.push(`/notes/${draft.folder ?? "study-space"}/${nextSlug}`);
      return;
    }
    await loadNote();
  }, [draft, loadNote, note, router, slug, user]);

  const addSection = useCallback(async (type: SectionType) => {
    if (!note || !draft) return;
    const maxIndex = Math.max(0, ...draft.note_sections.map((section) => section.order_index));
    const { data, error } = await supabase
      .from("note_sections")
      .insert({
        note_id: note.id,
        type,
        content: { text: "" },
        order_index: maxIndex + 1,
      })
      .select("*")
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setDraft((prev) =>
      prev
        ? { ...prev, note_sections: [...prev.note_sections, data as NoteSection].sort((a, b) => a.order_index - b.order_index) }
        : prev,
    );
  }, [draft, note]);

  const deleteNote = useCallback(async () => {
    if (!note || !user) return;
    const confirmed = window.confirm("Delete this note? This action cannot be undone.");
    if (!confirmed) return;
    const { error } = await supabase.from("notes").delete().eq("id", note.id).eq("user_id", user.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    router.push("/notes");
  }, [note, router, user]);

  const toggleShared = useCallback(async () => {
    if (!note || !user) return;
    const nextShared = !(draft?.is_shared ?? false);
    const { error } = await supabase.from("notes").update({ is_shared: nextShared }).eq("id", note.id).eq("user_id", user.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setDraft((prev) => (prev ? { ...prev, is_shared: nextShared } : prev));
    setNote((prev) => (prev ? { ...prev, is_shared: nextShared } : prev));
  }, [draft?.is_shared, note, user]);

  const copyPublicLink = useCallback(async () => {
    if (!note) return;
    const url = `${window.location.origin}/notes/shared/${note.id}`;
    await navigator.clipboard.writeText(url);
  }, [note]);

  const inviteCollaborator = useCallback(async (target: ProfileSearchRow) => {
    if (!note || !user) return;
    const { error: collabError } = await supabase.from("note_collaborators").insert({
      note_id: note.id,
      user_id: target.id,
      permission: invitePermission,
    });
    if (collabError) {
      setErrorMessage(collabError.message);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: target.id,
      type: "message",
      title: "You were invited to collaborate on a note",
      body: draft?.title ?? note.title,
      reference_id: note.id,
      reference_type: "task",
    });
    await loadNote();
  }, [draft?.title, invitePermission, loadNote, note, user]);

  const removeCollaborator = useCallback(async (collaboratorId: string) => {
    const { error } = await supabase.from("note_collaborators").delete().eq("id", collaboratorId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await loadNote();
  }, [loadNote]);

  const collaboratorInitials = useMemo(
    () =>
      (draft?.note_collaborators ?? []).map((collab) =>
        (collab.profiles?.full_name ?? "U")
          .split(" ")
          .map((part) => part[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      ),
    [draft?.note_collaborators],
  );

  if (!draft) return <section className="p-4">Loading note...</section>;

  return (
    <section className="space-y-4">
      {errorMessage && <div className="border-[3px] border-black bg-[#FFB3C1] p-3 font-bold text-xs">{errorMessage}</div>}

      <div className="border-[3px] border-black bg-[#FFC107] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateToNote(prevNote)} disabled={!prevNote} className="px-2 py-1 border-2 border-black bg-white disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigateToNote(nextNote)} disabled={!nextNote} className="px-2 py-1 border-2 border-black bg-white disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
          <p className="font-black text-xs uppercase">study-space / {draft.folder ?? "notes"} / {draft.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {(collaboratorInitials ?? []).map((initial, index) => (
            <span key={`${initial}-${index}`} className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center font-black text-[10px]">
              {initial}
            </span>
          ))}
        </div>
      </div>

      <div className="border-[3px] border-black bg-white p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between gap-3">
          {editing ? (
            <input
              value={draft.title}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
              className="w-full border-[3px] border-black px-3 py-2 font-black text-2xl"
            />
          ) : (
            <h1 className="font-black text-3xl">{draft.title}</h1>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShareOpen(true)} className="px-3 py-2 border-[3px] border-black bg-white font-black text-xs uppercase">Share</button>
            <button onClick={() => void deleteNote()} className="px-3 py-2 border-[3px] border-black bg-[#FFB3C1] font-black text-xs uppercase">Delete</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(draft.tags ?? []).map((tag) => (
            <span key={tag} className={`px-2 py-0.5 text-xs font-black uppercase ${TAG_COLORS[tag] ?? "border-2 border-black bg-white"}`}>
              #{tag}
            </span>
          ))}
        </div>

        {editing ? (
          <input
            value={draft.source ?? ""}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, source: event.target.value } : prev))}
            placeholder="Source..."
            className="border-[3px] border-black px-3 py-2 font-bold text-sm w-full md:w-80"
          />
        ) : (
          <p className="font-bold text-sm">Source: <span className="font-black">{draft.source ?? "-"}</span></p>
        )}

        <div className="space-y-4">
          {draft.note_sections.map((section, index) => (
            <div key={section.id} className="space-y-2">
              {editing ? (
                <textarea
                  value={asText(section.content)}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            note_sections: prev.note_sections.map((item) =>
                              item.id === section.id ? { ...item, content: { text: event.target.value } } : item,
                            ),
                          }
                        : prev,
                    )
                  }
                  className="w-full border-[3px] border-black p-3 font-bold text-sm"
                  rows={section.type === "heading" ? 2 : 4}
                />
              ) : section.type === "heading" ? (
                <h2 className="font-black text-xl">{asText(section.content)}</h2>
              ) : section.type === "quote" ? (
                <blockquote className="border-l-[4px] border-black bg-[#FFF9C4] p-3 font-bold text-sm italic">{asText(section.content)}</blockquote>
              ) : section.type === "code" ? (
                <pre className="border-[3px] border-black bg-black text-white p-3 text-xs overflow-x-auto"><code>{asText(section.content)}</code></pre>
              ) : (
                <p className="font-medium text-sm">{asText(section.content)}</p>
              )}
              <p className="text-[10px] font-black uppercase text-black/50">Section {index + 1}: {section.type}</p>
            </div>
          ))}
        </div>

        {editing && (
          <div className="pt-3 border-t-[3px] border-black flex flex-wrap gap-2">
            {(["heading", "paragraph", "quote", "code", "table", "graph"] as const).map((type) => (
              <button
                key={type}
                onClick={() => void addSection(type)}
                className="px-3 py-2 border-[3px] border-black bg-[#B3D4FF] font-black text-[10px] uppercase"
              >
                + {type}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t-[3px] border-black">
          {editing ? (
            <>
              <button onClick={() => void saveNote()} className="px-4 py-2 border-[3px] border-black bg-[#B3FFB3] font-black text-xs uppercase">Save</button>
              <button onClick={() => { setDraft(JSON.parse(JSON.stringify(note)) as NoteDetail); setEditing(false); }} className="px-4 py-2 border-[3px] border-black bg-white font-black text-xs uppercase">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-4 py-2 border-[3px] border-black bg-[#FFC107] font-black text-xs uppercase">Edit</button>
          )}
        </div>
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl border-[3px] border-black bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Share Note</h3>
              <button onClick={() => setShareOpen(false)} className="px-2 py-1 border-2 border-black font-black text-[10px] uppercase">Close</button>
            </div>

            <div className="border-[3px] border-black p-3 space-y-2">
              <p className="font-black text-xs uppercase">Public Link</p>
              <div className="flex items-center gap-2">
                <button onClick={() => void toggleShared()} className="px-3 py-2 border-2 border-black bg-[#FFC107] font-black text-[10px] uppercase">
                  {draft.is_shared ? "Revoke Public Link" : "Enable Public Link"}
                </button>
                <button onClick={() => void copyPublicLink()} disabled={!draft.is_shared} className="px-3 py-2 border-2 border-black bg-white font-black text-[10px] uppercase disabled:opacity-40">
                  Copy Link
                </button>
              </div>
            </div>

            <div className="border-[3px] border-black p-3 space-y-2">
              <p className="font-black text-xs uppercase">Invite Collaborator</p>
              <div className="flex gap-2">
                <input
                  value={inviteQuery}
                  onChange={(event) => {
                    const next = event.target.value;
                    setInviteQuery(next);
                    if (next.trim().length < 2) {
                      setInviteResults([]);
                    }
                  }}
                  placeholder="Search name or email..."
                  className="flex-1 border-2 border-black px-3 py-2 font-bold text-xs"
                />
                <select value={invitePermission} onChange={(event) => setInvitePermission(event.target.value as "view" | "edit")} className="border-2 border-black px-2 py-2 font-black text-xs uppercase">
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {inviteResults.map((person) => (
                  <div key={person.id} className="border-2 border-black p-2 flex items-center justify-between">
                    <p className="font-bold text-xs">{person.full_name ?? person.email ?? "User"}</p>
                    <button onClick={() => void inviteCollaborator(person)} className="px-2 py-1 border-2 border-black bg-[#B3FFB3] font-black text-[10px] uppercase">Invite</button>
                  </div>
                ))}
              </div>

              <p className="font-black text-xs uppercase mt-3">Current Collaborators</p>
              <div className="space-y-2">
                {(draft.note_collaborators ?? []).map((collaborator) => (
                  <div key={collaborator.id} className="border-2 border-black p-2 flex items-center justify-between">
                    <p className="font-bold text-xs">
                      {collaborator.profiles?.full_name ?? "User"} ({collaborator.permission})
                    </p>
                    <button onClick={() => void removeCollaborator(collaborator.id)} className="px-2 py-1 border-2 border-black bg-[#FFB3C1] font-black text-[10px] uppercase">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
