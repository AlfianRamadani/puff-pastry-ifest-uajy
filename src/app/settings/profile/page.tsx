"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, Mail, GraduationCap, BookOpen, Save, Camera, Clock, Target } from "lucide-react";
import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type ProfileForm = {
  full_name: string;
  email: string;
  university: string;
  major: string;
  bio: string;
  avatar_url: string | null;
  daily_study_goal_hours: number;
  preferred_study_time: "morning" | "afternoon" | "evening" | "night";
};

const DEFAULT_PROFILE: ProfileForm = {
  full_name: "",
  email: "",
  university: "",
  major: "",
  bio: "",
  avatar_url: null,
  daily_study_goal_hours: 4,
  preferred_study_time: "evening",
};

const TIME_OPTIONS = [
  { value: "morning", label: "Morning (6-12)", color: "bg-[#FFC107]" },
  { value: "afternoon", label: "Afternoon (12-17)", color: "bg-[#B3FFB3]" },
  { value: "evening", label: "Evening (17-22)", color: "bg-[#B3D4FF]" },
  { value: "night", label: "Night (22-6)", color: "bg-[#E8D5FF]" },
];

export default function ProfileSettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const loadUserProfile = async () => {
      setLoadingProfile(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setLoadingProfile(false);
        return;
      }

      if (!data) {
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            email: user.email ?? "",
            full_name: user.user_metadata?.full_name ?? "",
            avatar_url: user.user_metadata?.avatar_url ?? null,
            daily_study_goal_hours: 4,
            preferred_study_time: "evening",
          }, { onConflict: "id" });

        if (upsertError) {
          setErrorMessage(upsertError.message);
          setLoadingProfile(false);
          return;
        }

        const { data: upsertedRow, error: refetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (refetchError || !upsertedRow) {
          setErrorMessage(refetchError?.message ?? "Unable to load profile data.");
          setLoadingProfile(false);
          return;
        }

        setForm({
          full_name: upsertedRow.full_name ?? "",
          email: upsertedRow.email ?? user.email ?? "",
          university: upsertedRow.university ?? "",
          major: upsertedRow.major ?? "",
          bio: upsertedRow.bio ?? "",
          avatar_url: upsertedRow.avatar_url ?? null,
          daily_study_goal_hours: upsertedRow.daily_study_goal_hours ?? 4,
          preferred_study_time: (upsertedRow.preferred_study_time ?? "evening") as ProfileForm["preferred_study_time"],
        });
        setLoadingProfile(false);
        return;
      }

      setForm({
        full_name: data.full_name ?? "",
        email: data.email ?? user.email ?? "",
        university: data.university ?? "",
        major: data.major ?? "",
        bio: data.bio ?? "",
        avatar_url: data.avatar_url ?? null,
        daily_study_goal_hours: data.daily_study_goal_hours ?? 4,
        preferred_study_time: (data.preferred_study_time ?? "evening") as ProfileForm["preferred_study_time"],
      });
      setLoadingProfile(false);
    };

    void loadUserProfile();
  }, [user]);

  const avatarInitial = useMemo(() => {
    const source = form.full_name || form.email || "S";
    return source.charAt(0).toUpperCase();
  }, [form.email, form.full_name]);

  const update = useCallback((field: keyof ProfileForm, value: string | number | null) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        bio: form.bio,
        university: form.university,
        major: form.major,
        daily_study_goal_hours: form.daily_study_goal_hours,
        preferred_study_time: form.preferred_study_time,
      })
      .eq("id", user.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }, [form, refreshProfile, user]);

  const handleAvatarUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user) return;
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingAvatar(true);
      setErrorMessage(null);

      const extension = file.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        setErrorMessage(uploadError.message);
        setUploadingAvatar(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) {
        setErrorMessage(updateError.message);
        setUploadingAvatar(false);
        return;
      }

      setForm((prev) => ({
        ...prev,
        avatar_url: urlData.publicUrl,
      }));
      await refreshProfile();
      setUploadingAvatar(false);
      event.target.value = "";
    },
    [refreshProfile, user],
  );

  return (
    <ProtectedRoute>
      <div className="w-full max-w-4xl mx-auto py-8 px-4 md:px-0 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-2xl md:text-3xl text-black tracking-wider uppercase">Profile Settings</h2>
          <p className="font-bold text-sm text-black/60 mt-1">Manage your account and study preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loadingProfile || saving}
          className={`flex items-center gap-2 px-5 py-3 border-[3px] border-black font-black text-sm uppercase tracking-wide transition-all outline-none focus-visible:ring-2 focus-visible:ring-black ${
            saved
              ? 'bg-[#B3FFB3] shadow-none translate-x-[2px] translate-y-[2px]'
              : 'bg-[#FFC107] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" strokeWidth={2.5} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {errorMessage && (
        <div className="border-[3px] border-black bg-[#FFB3C1] px-4 py-3">
          <p className="font-black text-xs uppercase tracking-wide text-black">Error: {errorMessage}</p>
        </div>
      )}

      {uploadingAvatar && (
        <div className="border-[3px] border-black bg-[#B3D4FF] px-4 py-3">
          <p className="font-black text-xs uppercase tracking-wide text-black">Uploading avatar...</p>
        </div>
      )}

      {/* Avatar Card */}
      <div className="bg-[#FFB3C1] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-[#FFC107] border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {form.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatar_url} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="font-black text-4xl text-black">{avatarInitial}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingProfile || uploadingAvatar}
              className="absolute -bottom-2 -right-2 p-2 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Upload avatar"
            >
              <Camera className="w-4 h-4 text-black" strokeWidth={2.5} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="text-center sm:text-left">
            {loadingProfile ? (
              <>
                <div className="h-6 w-48 animate-pulse bg-black/10" />
                <div className="mt-2 h-4 w-64 animate-pulse bg-black/10" />
              </>
            ) : (
              <>
                <h3 className="font-black text-xl text-black">{form.full_name || "Unnamed user"}</h3>
                <p className="font-bold text-sm text-black/60">{form.email}</p>
                <p className="font-bold text-sm text-black/60">{form.university} — {form.major}</p>
              </>
            )}
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
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              disabled={loadingProfile}
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
              value={form.email}
              disabled
              className="w-full px-4 py-3 bg-[#FFFDF7] border-[3px] border-black font-bold text-sm text-black/60 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="font-black text-xs text-black/60 uppercase tracking-wider block mb-2">Bio</label>
            <textarea
              id="profile-bio"
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              disabled={loadingProfile}
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
              value={form.university}
              onChange={(e) => update("university", e.target.value)}
              disabled={loadingProfile}
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
              value={form.major}
              onChange={(e) => update("major", e.target.value)}
              disabled={loadingProfile}
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
                value={form.daily_study_goal_hours}
                onChange={(e) => update("daily_study_goal_hours", parseInt(e.target.value, 10))}
                disabled={loadingProfile}
                className="flex-1 accent-[#FFC107]"
              />
              <div className="w-14 h-14 bg-[#FFC107] border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-lg text-black">{form.daily_study_goal_hours}h</span>
              </div>
            </div>
          </div>

          <div>
            <p className="font-black text-xs text-black/60 uppercase tracking-wider mb-2">Preferred Study Time</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update("preferred_study_time", opt.value)}
                  disabled={loadingProfile}
                  className={`px-3 py-2.5 border-[3px] border-black font-bold text-xs text-black uppercase tracking-wide transition-all outline-none focus-visible:ring-2 focus-visible:ring-black ${
                    form.preferred_study_time === opt.value
                      ? `${opt.color} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`
                      : 'bg-[#FFFDF7] shadow-none hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed'
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
    </ProtectedRoute>
  );
}
