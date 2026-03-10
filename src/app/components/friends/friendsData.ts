"use client";

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "in-session";
  activity?: string;
  lastSeen?: string;
  sessionDuration?: string;
  email: string;
  university: string;
  major: string;
  bio: string;
  skills: string[];
  studyHours: number;
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
    email: "jordan.smith@university.edu",
    university: "MIT",
    major: "Computer Science",
    bio: "Full-stack developer who loves clean UI and design systems.",
    skills: ["React", "Figma", "TypeScript", "UI/UX"],
    studyHours: 320,
  },
  {
    id: "2",
    name: "Alex Rivera",
    avatar: "AR",
    status: "in-session",
    activity: "Maths",
    sessionDuration: "2h Session",
    email: "alex.rivera@university.edu",
    university: "Stanford",
    major: "Mathematics",
    bio: "Math enthusiast with a passion for problem solving and algorithms.",
    skills: ["Linear Algebra", "Calculus", "Python", "LaTeX"],
    studyHours: 450,
  },
  {
    id: "3",
    name: "Taylor Kim",
    avatar: "TK",
    status: "online",
    activity: "Advanced Thermodynamics",
    sessionDuration: "1h Session",
    email: "taylor.kim@university.edu",
    university: "Caltech",
    major: "Mechanical Engineering",
    bio: "Engineering student focused on thermodynamics and energy systems.",
    skills: ["Thermodynamics", "MATLAB", "CAD", "Physics"],
    studyHours: 280,
  },
  {
    id: "4",
    name: "Morgan Lee",
    avatar: "ML",
    status: "offline",
    lastSeen: "2d ago",
    email: "morgan.lee@university.edu",
    university: "UC Berkeley",
    major: "Data Science",
    bio: "Data nerd who enjoys turning numbers into insights.",
    skills: ["Python", "SQL", "Machine Learning", "Statistics"],
    studyHours: 195,
  },
  {
    id: "5",
    name: "Casey Nguyen",
    avatar: "CN",
    status: "online",
    activity: "Data Structures",
    sessionDuration: "3h Session",
    email: "casey.nguyen@university.edu",
    university: "Georgia Tech",
    major: "Computer Science",
    bio: "Competitive programmer and open source contributor.",
    skills: ["C++", "Algorithms", "Java", "Git"],
    studyHours: 510,
  },
  {
    id: "6",
    name: "Riley Parker",
    avatar: "RP",
    status: "offline",
    lastSeen: "5h ago",
    email: "riley.parker@university.edu",
    university: "NYU",
    major: "Psychology",
    bio: "Studying cognitive psychology and human behavior patterns.",
    skills: ["Research Methods", "SPSS", "Writing", "Statistics"],
    studyHours: 220,
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

export function getFriendById(id: string): Friend | undefined {
  return loadFriends().find((f) => f.id === id);
}
