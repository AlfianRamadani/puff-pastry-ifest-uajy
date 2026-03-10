"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, GraduationCap, BookOpen, Save, Camera, Clock, Target } from 'lucide-react';

interface Profile {
  name: string;
  email: string;
  university: string;
  major: string;
  bio: string;
  avatar: string;
  studyGoal: number;
  preferredTime: string;
}

const DEFAULT_PROFILE: Profile = {
  name: 'Alfian Ramadani',
  email: '11251068@student.itk.ac.id',
  university: 'Institut Teknologi kalimantan',
  major: 'Informatika',
  bio: 'Computer science student passionate about web development and UI design.',
  avatar: 'A',
  studyGoal: 4,
  preferredTime: 'evening',
};

const STORAGE_KEY = 'puff-pastry-profile';

function loadProfile(): Profile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch { /* fallback */ }
  return DEFAULT_PROFILE;
}

function saveProfile(p: Profile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning (6–12)', color: 'bg-[#FFC107]' },
  { value: 'afternoon', label: 'Afternoon (12–17)', color: 'bg-[#B3FFB3]' },
  { value: 'evening', label: 'Evening (17–22)', color: 'bg-[#B3D4FF]' },
  { value: 'night', label: 'Night (22–6)', color: 'bg-[#E8D5FF]' },
];

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const update = useCallback((field: keyof Profile, value: string | number) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    setProfile((current) => {
      saveProfile(current);
      return current;
    });
    setSaved(true);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 md:px-0 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-2xl md:text-3xl text-black tracking-wider uppercase">Profile Settings</h2>
          <p className="font-bold text-sm text-black/60 mt-1">Manage your account and study preferences</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-3 border-[3px] border-black font-black text-sm uppercase tracking-wide transition-all outline-none focus-visible:ring-2 focus-visible:ring-black ${
            saved
              ? 'bg-[#B3FFB3] shadow-none translate-x-[2px] translate-y-[2px]'
              : 'bg-[#FFC107] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]'
          }`}
        >
          <Save className="w-4 h-4" strokeWidth={2.5} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Avatar Card */}
      <div className="bg-[#FFB3C1] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-[#FFC107] border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-black text-4xl text-black">{profile.avatar}</span>
            </div>
            {editingAvatar ? (
              <div className="absolute -bottom-2 -right-2 flex items-center gap-1">
                <input
                  autoFocus
                  maxLength={1}
                  defaultValue={profile.avatar}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      const v = (e.target as HTMLInputElement).value.trim();
                      if (v) update('avatar', v.charAt(0).toUpperCase());
                      setEditingAvatar(false);
                    }
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) update('avatar', v.charAt(0).toUpperCase());
                    setEditingAvatar(false);
                  }}
                  className="w-10 h-10 text-center bg-white border-[3px] border-black font-black text-lg text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none uppercase"
                  aria-label="Avatar initial"
                />
              </div>
            ) : (
              <button
                onClick={() => setEditingAvatar(true)}
                className="absolute -bottom-2 -right-2 p-2 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                aria-label="Change avatar initial"
              >
                <Camera className="w-4 h-4 text-black" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-black text-xl text-black">{profile.name}</h3>
            <p className="font-bold text-sm text-black/60">{profile.email}</p>
            <p className="font-bold text-sm text-black/60">{profile.university} — {profile.major}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-5">
          <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
            <User className="w-5 h-5" strokeWidth={2.5} />
            Personal Info
          </h3>

          <div>
            <label htmlFor="profile-name" className="font-black text-xs text-black/60 uppercase tracking-wider block mb-2">Full Name</label>
            <input
              id="profile-name"
              type="text"
              value={profile.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-4 py-3 bg-[#FFFDF7] border-[3px] border-black font-bold text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="font-black text-xs text-black/60 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Mail className="w-3 h-3" strokeWidth={2.5} />
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={profile.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full px-4 py-3 bg-[#FFFDF7] border-[3px] border-black font-bold text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="font-black text-xs text-black/60 uppercase tracking-wider block mb-2">Bio</label>
            <textarea
              id="profile-bio"
              value={profile.bio}
              onChange={(e) => update('bio', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[#FFFDF7] border-[3px] border-black font-bold text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all resize-none"
            />
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-5">
          <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-5 h-5" strokeWidth={2.5} />
            Academic Info
          </h3>

          <div>
            <label htmlFor="profile-university" className="font-black text-xs text-black/60 uppercase tracking-wider block mb-2">University</label>
            <input
              id="profile-university"
              type="text"
              value={profile.university}
              onChange={(e) => update('university', e.target.value)}
              className="w-full px-4 py-3 bg-[#FFFDF7] border-[3px] border-black font-bold text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all"
            />
          </div>

          <div>
            <label htmlFor="profile-major" className="font-black text-xs text-black/60 uppercase tracking-wider mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" strokeWidth={2.5} />
              Major
            </label>
            <input
              id="profile-major"
              type="text"
              value={profile.major}
              onChange={(e) => update('major', e.target.value)}
              className="w-full px-4 py-3 bg-[#FFFDF7] border-[3px] border-black font-bold text-sm text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Study Preferences */}
      <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 space-y-5">
        <h3 className="font-black text-lg text-black uppercase tracking-wider flex items-center gap-2">
          <Target className="w-5 h-5" strokeWidth={2.5} />
          Study Preferences
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="study-goal" className="font-black text-xs text-black/60 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" strokeWidth={2.5} />
              Daily Study Goal (hours)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="study-goal"
                type="range"
                min={1}
                max={12}
                value={profile.studyGoal}
                onChange={(e) => update('studyGoal', parseInt(e.target.value))}
                className="flex-1 accent-[#FFC107]"
              />
              <div className="w-14 h-14 bg-[#FFC107] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-lg text-black">{profile.studyGoal}h</span>
              </div>
            </div>
          </div>

          <div>
            <p className="font-black text-xs text-black/60 uppercase tracking-wider mb-2">Preferred Study Time</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('preferredTime', opt.value)}
                  className={`px-3 py-2.5 border-[3px] border-black font-bold text-xs text-black uppercase tracking-wide transition-all outline-none focus-visible:ring-2 focus-visible:ring-black ${
                    profile.preferredTime === opt.value
                      ? `${opt.color} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`
                      : 'bg-[#FFFDF7] shadow-none hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
