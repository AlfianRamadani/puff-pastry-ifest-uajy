"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Plus, X, Search } from "lucide-react";
import { getFriends, type Friend } from "./friendsData";

const StartStudySession: React.FC = () => {
  const allFriends = useMemo(() => getFriends(), []);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Friend[]>([
    allFriends[0],
    allFriends[1],
  ]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return allFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(query.toLowerCase()) &&
        !selected.some((s) => s.id === f.id)
    );
  }, [query, allFriends, selected]);

  const addFriend = useCallback((friend: Friend) => {
    setSelected((prev) => [...prev, friend]);
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const removeFriend = useCallback((id: string) => {
    setSelected((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isOpen = showDropdown && filtered.length > 0;
  const listboxId = "friend-search-listbox";

  return (
    <section className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
      <h2 className="font-black text-base md:text-lg text-black uppercase tracking-wide mb-4">
        Start a Study Session
      </h2>

      {/* Search input (combobox pattern) */}
      <div className="relative mb-4" ref={containerRef}>
        <div className="flex items-center border-[3px] border-black bg-[#F4F8FA] px-3 py-2.5">
          <Search className="w-4 h-4 text-black mr-2 shrink-0" strokeWidth={2.5} />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            placeholder="Invite friends by name or email..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => query && setShowDropdown(true)}
            className="bg-transparent outline-none w-full font-bold text-sm text-black placeholder:text-[#5E6A78] tracking-wide"
          />
          <button
            onClick={() => query && setShowDropdown(!showDropdown)}
            className="ml-2 w-10 h-10 bg-black text-white flex items-center justify-center shrink-0 border-2 border-black outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-1"
            aria-label="Search friends"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-40 overflow-y-auto"
          >
            {filtered.map((f) => (
              <li key={f.id} role="option" aria-selected={false}>
                <button
                  onClick={() => addFriend(f)}
                  className="w-full text-left px-4 py-2.5 font-bold text-sm text-black uppercase tracking-wide hover:bg-[#FFC107] transition-colors duration-150 border-b-2 border-black last:border-b-0 outline-none focus-visible:bg-[#FFC107]"
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Selected friends">
          {selected.map((f) => (
            <span
              key={f.id}
              role="listitem"
              className="flex items-center gap-1.5 bg-[#F4F8FA] border-2 border-black px-3 py-1.5 font-black text-xs text-black uppercase tracking-wide"
            >
              {f.name}
              <button
                onClick={() => removeFriend(f.id)}
                aria-label={`Remove ${f.name}`}
                className="ml-1 p-1 hover:text-red-600 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
              >
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        disabled={selected.length === 0}
        className="w-full bg-[#FFC107] border-[3px] border-black py-3 font-black text-sm md:text-base text-black uppercase tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      >
        {selected.length > 0
          ? `Start Session with ${selected.length} Friend${selected.length > 1 ? "s" : ""}`
          : "Select Friends to Start"}
      </button>
    </section>
  );
};

export default StartStudySession;
