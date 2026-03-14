import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import TagBadge from "@/app/components/notes/Tagbadge";
import type { Note, TagsMap, TagKey, NoteSection } from "@/app/(app)/notes/page";

interface NoteEditorProps {
  note: Note | null;
  tags: TagsMap;
  onPrev: () => void;
  onNext: () => void;
  onUpdateNote: (updated: Note) => void;
}

const ALL_TAG_KEYS: TagKey[] = ["evergreen", "draft", "idea", "reference"];

export default function NoteEditor({ note, tags, onPrev, onNext, onUpdateNote }: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Note | null>(null);

  useEffect(() => {
    setDraft(note ? { ...note, sections: note.sections.map((s) => ({ ...s })) } : null);
    setIsEditing(false);
  }, [note?.id]);

  if (!note || !draft) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#FFFDF7] xl:border-r-[3px] xl:border-black gap-3">
      <p className="text-black font-black text-lg opacity-20 uppercase tracking-widest">No Note Selected</p>
    </div>
  );

  const handleSave = () => { if (draft) onUpdateNote(draft); setIsEditing(false); };
  const handleCancel = () => {
    setDraft({ ...note, sections: note.sections.map((s) => ({ ...s })) });
    setIsEditing(false);
  };

  const updateSectionContent = (i: number, content: string) => {
    if (!draft) return;
    const sections = [...draft.sections];
    const section = sections[i];
    sections[i] = { ...section, content } as NoteSection;
    setDraft({ ...draft, sections });
  };

  const addSection = (type: NoteSection["type"]) => {
    if (!draft) return;
    let newSection: NoteSection;
    if (type === "heading") newSection = { type: "heading", content: "New heading" };
    else if (type === "quote") newSection = { type: "quote", content: "New quote" };
    else if (type === "code") newSection = { type: "code", content: "// your code here" };
    else if (type === "table") newSection = { type: "table", content: JSON.stringify({ headers: ["Column 1", "Column 2"], rows: [["Cell", "Cell"]] }) };
    else if (type === "graph") newSection = { type: "graph", content: JSON.stringify({ labels: ["A", "B", "C"], values: [30, 60, 90] }) };
    else newSection = { type: "paragraph", content: "New paragraph" };
    setDraft({ ...draft, sections: [...draft.sections, newSection] });
  };

  const removeSection = (i: number) => {
    if (!draft) return;
    setDraft({ ...draft, sections: draft.sections.filter((_, idx) => idx !== i) });
  };

  const toggleTag = (tag: TagKey) => {
    if (!draft) return;
    const has = draft.tags.includes(tag);
    setDraft({ ...draft, tags: has ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag] });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FFFDF7] xl:border-r-[3px] xl:border-black overflow-hidden min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 md:px-5 py-3 border-b-[3px] border-black bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-1.5 border-[3px] border-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]">
            <ChevronLeft size={16} strokeWidth={3} />
          </button>
          <button onClick={onNext} className="p-1.5 border-[3px] border-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]">
            <ChevronRight size={16} strokeWidth={3} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#B3FFB3] text-black text-xs font-black uppercase border-[3px] border-black hover:bg-[#00E676] transition-colors shadow-[3px_3px_0px_#000]"
              >
                <Check size={12} strokeWidth={3} /> SAVE
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-xs font-black uppercase border-[3px] border-black hover:bg-[#FFB3C1] transition-colors shadow-[3px_3px_0px_#000]"
              >
                <X size={12} strokeWidth={3} /> CANCEL
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 bg-[#FFC107] text-black text-xs font-black uppercase border-[3px] border-black hover:bg-[#FFD740] transition-colors shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              EDIT
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 space-y-4">
        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full text-2xl md:text-3xl font-black text-black leading-tight bg-[#FFF9C4] border-[3px] border-black px-3 py-1 focus:outline-none focus:bg-[#FFF176] shadow-[3px_3px_0px_#000]"
          />
        ) : (
          <h1 className="text-2xl md:text-3xl font-black text-black leading-tight">{note.title}</h1>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            ALL_TAG_KEYS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center px-3 py-0.5 text-xs font-black uppercase tracking-wide border-[3px] border-black transition-all ${draft.tags.includes(tag)
                    ? "shadow-[3px_3px_0px_#000] " + tags[tag].color
                    : "bg-white text-black/30 opacity-40 shadow-none"
                  }`}
              >
                {tags[tag].label}
              </button>
            ))
          ) : (
            note.tags.map((tag) => <TagBadge key={tag} tag={tag} tags={tags} />)
          )}
        </div>

        {/* Source */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-black uppercase tracking-wide">From</span>
            <input
              type="text"
              value={draft.source ?? ""}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="Source..."
              className="bg-[#FFF9C4] border-[3px] border-black px-2 py-0.5 text-xs font-black text-black focus:outline-none focus:bg-[#FFF176] w-48 shadow-[2px_2px_0px_#000]"
            />
          </div>
        ) : note.source ? (
          <p className="text-xs font-bold text-black">
            From <span className="bg-black text-white px-2 py-0.5 font-black">{note.source}</span>
          </p>
        ) : null}

        <div className="border-t-[3px] border-black" />

        {/* Sections */}
        <div className="space-y-5">
          {(isEditing ? draft.sections : note.sections).map((section, i) => (
            <div
              key={i}
              className={`relative group ${isEditing ? "border-[3px] border-dashed border-black/30 p-3 bg-white hover:border-black/60 hover:bg-[#FFFDE7]" : ""}`}
            >
              {isEditing && (
                <button
                  onClick={() => removeSection(i)}
                  className="absolute -top-3 -right-3 w-6 h-6 bg-[#FF3B3B] border-[3px] border-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-[2px_2px_0px_#000]"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}

              {section.type === "heading" && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-[5px] self-stretch bg-[#FFC107] border-l-[3px] border-black shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={section.content}
                      onChange={(e) => updateSectionContent(i, e.target.value)}
                      className="flex-1 text-xl font-black text-black bg-transparent border-b-[3px] border-black focus:outline-none px-1 focus:bg-[#FFF9C4]"
                    />
                  ) : (
                    <h2 className="text-xl font-black text-black leading-snug">{section.content}</h2>
                  )}
                </div>
              )}

              {section.type === "paragraph" && (
                isEditing ? (
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSectionContent(i, e.target.value)}
                    rows={3}
                    className="w-full text-sm text-black font-medium bg-transparent border-[3px] border-black p-2 focus:outline-none resize-none focus:bg-[#FFF9C4]"
                  />
                ) : (
                  <p className="text-sm text-black leading-relaxed font-medium">{section.content}</p>
                )
              )}

              {section.type === "quote" && (
                isEditing ? (
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSectionContent(i, e.target.value)}
                    rows={3}
                    className="w-full text-sm text-black font-medium italic bg-[#FFF9C4] border-[3px] border-black p-3 focus:outline-none resize-none"
                  />
                ) : (
                  <blockquote className="border-[3px] border-black border-l-[6px] bg-[#FFF9C4] pl-4 pr-3 py-3 text-sm font-medium italic text-black shadow-[4px_4px_0px_#000]">
                    {section.content}
                  </blockquote>
                )
              )}

              {section.type === "code" && (
                <div className="border-[3px] border-black shadow-[4px_4px_0px_#000] overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1b26] border-b-[3px] border-black">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722] border border-white/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFC107] border border-white/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] border border-white/20" />
                    <span className="ml-auto text-[10px] font-black text-white/40 uppercase tracking-widest">CODE</span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSectionContent(i, e.target.value)}
                      rows={Math.max(4, section.content.split("\n").length + 1)}
                      spellCheck={false}
                      className="w-full bg-[#1a1b26] text-[#a9b1d6] font-mono text-xs p-4 focus:outline-none resize-none leading-relaxed placeholder:text-white/20"
                      placeholder="// write code here..."
                    />
                  ) : (
                    <pre className="m-0 bg-[#1a1b26] overflow-x-auto">
                      <code className="block p-4 text-[#a9b1d6] font-mono text-xs leading-relaxed whitespace-pre">
                        {section.content}
                      </code>
                    </pre>
                  )}
                </div>
              )}

              {section.type === "table" && (() => {
                let parsed: { headers: string[]; rows: string[][] } = { headers: ["Col 1", "Col 2"], rows: [["", ""]] };
                try { parsed = JSON.parse(section.content); } catch { }
                const updateCell = (row: number, col: number, val: string) => {
                  const newRows = parsed.rows.map((r, ri) => r.map((c, ci) => ri === row && ci === col ? val : c));
                  updateSectionContent(i, JSON.stringify({ ...parsed, rows: newRows }));
                };
                const updateHeader = (col: number, val: string) => {
                  const newHeaders = parsed.headers.map((h, hi) => hi === col ? val : h);
                  updateSectionContent(i, JSON.stringify({ ...parsed, headers: newHeaders }));
                };
                return (
                  <div className="border-[3px] border-black shadow-[4px_4px_0px_#000] overflow-x-auto">
                    <table className="w-full text-xs font-bold border-collapse">
                      <thead>
                        <tr className="bg-black text-white">
                          {parsed.headers.map((h, hi) => (
                            <th key={hi} className="border-r-[3px] border-white/20 last:border-r-0 px-3 py-2 text-left font-black uppercase tracking-wide">
                              {isEditing ? (
                                <input value={h} onChange={(e) => updateHeader(hi, e.target.value)} className="bg-transparent focus:outline-none w-full font-black text-white placeholder:text-white/30" />
                              ) : h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#FFFDF7]"}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="border-t-[3px] border-r-[3px] border-black last:border-r-0 px-3 py-2">
                                {isEditing ? (
                                  <input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} className="bg-transparent focus:outline-none w-full" />
                                ) : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {section.type === "graph" && (() => {
                let parsed: { labels: string[]; values: number[] } = { labels: [], values: [] };
                try { parsed = JSON.parse(section.content); } catch { }
                const max = Math.max(...parsed.values, 1);
                const BAR_COLORS = ["bg-[#FFC107]", "bg-[#A855F7]", "bg-[#00E5FF]", "bg-[#FF5722]", "bg-[#B3FFB3]"];
                return (
                  <div className="border-[3px] border-black shadow-[4px_4px_0px_#000] p-4 bg-[#FFFDF7]">
                    <div className="flex items-end gap-3 h-32">
                      {parsed.labels.map((label, li) => (
                        <div key={li} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[10px] font-black text-black">{parsed.values[li]}</span>
                          <div
                            className={`w-full border-[3px] border-black shadow-[2px_2px_0px_#000] ${BAR_COLORS[li % BAR_COLORS.length]} transition-all`}
                            style={{ height: `${(parsed.values[li] / max) * 96}px` }}
                          />
                          {isEditing ? (
                            <input value={label} onChange={(e) => {
                              const newLabels = parsed.labels.map((l, i2) => i2 === li ? e.target.value : l);
                              updateSectionContent(i, JSON.stringify({ ...parsed, labels: newLabels }));
                            }} className="text-[10px] font-black text-black text-center bg-transparent border-b-2 border-black focus:outline-none w-full" />
                          ) : (
                            <span className="text-[10px] font-black text-black text-center truncate w-full">{label}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t-[3px] border-dashed border-black/30 space-y-2">
                        {parsed.labels.map((_, li) => (
                          <div key={li} className="flex items-center gap-2">
                            <span className={`w-3 h-3 border-2 border-black shrink-0 ${BAR_COLORS[li % BAR_COLORS.length]}`} />
                            <span className="text-xs font-black text-black/50 w-16 truncate">{parsed.labels[li]}</span>
                            <input
                              type="number"
                              value={parsed.values[li]}
                              onChange={(e) => {
                                const newValues = parsed.values.map((v, vi) => vi === li ? Number(e.target.value) : v);
                                updateSectionContent(i, JSON.stringify({ ...parsed, values: newValues }));
                              }}
                              className="w-20 border-[3px] border-black px-2 py-0.5 text-xs font-black focus:outline-none focus:bg-[#FFF9C4]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Add section */}
        {isEditing && (
          <div className="pt-3 border-t-[3px] border-dashed border-black/30">
            <p className="text-xs font-black text-black/40 uppercase tracking-widest mb-3">Add Section</p>
            <div className="flex flex-wrap gap-2">
              {(["heading", "paragraph", "quote", "code", "table", "graph"] as const).map((type, idx) => {
                const colors = ["bg-[#FFC107]", "bg-[#60A5FA]", "bg-[#FACC15]", "bg-[#4ADE80]", "bg-[#F87171]", "bg-[#C084FC]"];
                return (
                  <button
                    key={type}
                    onClick={() => addSection(type)}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide border-[3px] border-black ${colors[idx]} hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all shadow-[3px_3px_0px_#000]`}
                  >
                    + {type}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}