import type { Note } from "@/app/(app)/notes/page";

interface NoteContentProps {
  sections: Note["sections"];
}

export default function NoteContent({ sections }: NoteContentProps) {
  return (
    <div className="space-y-5">
      {sections.map((section, i) => {
        if (section.type === "heading") return (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1 w-1 self-stretch bg-yellow-400 border-l-2 border-black shrink-0" />
            <h2 className="text-xl font-black text-black leading-snug">{section.content}</h2>
          </div>
        );

        if (section.type === "paragraph") return (
          <p key={i} className="text-sm text-black leading-relaxed font-medium">{section.content}</p>
        );

        if (section.type === "bullets") return (
          <ul key={i} className="space-y-3">
            {section.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-2.5 h-2.5 bg-black shrink-0" />
                <span className="text-black font-medium">
                  {item.label && (
                    <span className="font-black border-2 border-black px-1 mr-1 bg-white">{item.label}</span>
                  )}
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        );

        if (section.type === "quote") return (
          <blockquote key={i} className="border-2 border-black border-l-4 bg-yellow-50 pl-4 pr-3 py-3 text-sm font-medium italic text-black shadow-[4px_4px_0px_#000]">
            {section.content}
          </blockquote>
        );

        return null;
      })}
    </div>
  );
}