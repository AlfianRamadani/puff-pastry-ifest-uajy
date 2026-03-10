"use client";

import React, { useMemo } from "react";
import { getFriends } from "./friendsData";
import {
  FriendCardDesktop,
  FriendCardMobile,
  AddFriendCard,
} from "./FriendCard";

const FriendsList: React.FC = () => {
  const friends = useMemo(() => getFriends(), []);

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-black text-base md:text-lg text-black uppercase tracking-wide">
          Your Friends
        </h2>
        <span className="bg-black text-white font-black text-xs px-2.5 py-1 tracking-wide">
          {friends.length} Total
        </span>
      </div>

      {/* Desktop grid */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {friends.map((f) => (
          <FriendCardDesktop key={f.id} friend={f} />
        ))}
        <AddFriendCard />
      </div>

      {/* Mobile list */}
      <div className="sm:hidden flex flex-col gap-3">
        {friends.map((f) => (
          <FriendCardMobile key={f.id} friend={f} />
        ))}
      </div>
    </section>
  );
};

export default FriendsList;
