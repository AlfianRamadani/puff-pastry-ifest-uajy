"use client";

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "in-session";
  activity?: string;
  lastSeen?: string;
  sessionDuration?: string;
}

const STORAGE_KEY = "puff_pastry_friends";

const SEED_FRIENDS: Friend[] = [
  {
    id: "1",
    name: "Jordan Smith",
    avatar: "JS",
    status: "online",
    activity: "Studying: UI Design",
    sessionDuration: "4h Session",
  },
  {
    id: "2",
    name: "Alex Rivera",
    avatar: "AR",
    status: "in-session",
    activity: "Maths",
    sessionDuration: "2h Session",
  },
  {
    id: "3",
    name: "Taylor Kim",
    avatar: "TK",
    status: "online",
    activity: "Advanced Thermodynamics",
    sessionDuration: "1h Session",
  },
  {
    id: "4",
    name: "Morgan Lee",
    avatar: "ML",
    status: "offline",
    lastSeen: "2d ago",
  },
  {
    id: "5",
    name: "Casey Nguyen",
    avatar: "CN",
    status: "online",
    activity: "Data Structures",
    sessionDuration: "3h Session",
  },
  {
    id: "6",
    name: "Riley Parker",
    avatar: "RP",
    status: "offline",
    lastSeen: "5h ago",
  },
];

let cachedFriends: Friend[] | null = null;

function loadFriends(): Friend[] {
  if (cachedFriends) return cachedFriends;
  if (typeof window === "undefined") return SEED_FRIENDS;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_FRIENDS));
    cachedFriends = SEED_FRIENDS;
    return cachedFriends;
  }

  try {
    cachedFriends = JSON.parse(raw);
    return cachedFriends!;
  } catch {
    cachedFriends = SEED_FRIENDS;
    return cachedFriends;
  }
}

export function getFriends(): Friend[] {
  return loadFriends();
}
