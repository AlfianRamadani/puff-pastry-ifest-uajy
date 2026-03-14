import type { TagKey, TagsMap } from "@/app/(app)/notes/page";

interface TagBadgeProps {
  tag: TagKey;
  tags: TagsMap;
}

export default function TagBadge({ tag, tags }: TagBadgeProps) {
  const config = tags[tag];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-3 py-0.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_#000] ${config.color}`}>
      {config.label}
    </span>
  );
}