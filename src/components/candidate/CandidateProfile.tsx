import { useState, useRef } from "react"
import { useUser } from "@context/UserContext"
import { updateCandidateProfile } from "@utils/auth-sync"
import { Mail, User, Calendar, FileCheck } from "lucide-react"

export function CandidateProfile() {
  const { profile, refreshUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState(profile?.name || "");
  const [editResumeName, setEditResumeName] = useState(profile?.resumeName || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleResumeReplace = (file: File) => {
    if (!file) return;
    setEditResumeName(file.name);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    updateCandidateProfile(profile.id, {
      name: editName.trim() || profile.name,
      dob: profile.dob || "",
      resumeName: editResumeName || profile.resumeName || "Resume.pdf",
    });
    refreshUser();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return "Not provided";
    const parts = dobStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dobStr;
  };

  return (
    <div className="max-w-2xl w-full bg-white rounded-xl border border-[#E6E0D6] p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-6 overflow-hidden">
      <div>
        <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Profile & Resume Settings</h2>
        <p className="text-xs text-[#78716C] mt-1">Manage your candidate personal details and active resume.</p>
      </div>

      {savedSuccess && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-700 font-medium">
          Profile changes saved successfully.
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-[#E6E0D6] bg-white/70 p-3 flex items-center gap-2 text-xs text-[#78716C]">
            <Mail className="size-3.5 text-terracotta shrink-0" />
            <span className="truncate">{profile?.email}</span>
          </div>

          <div className="rounded-md border border-[#E6E0D6] bg-white/70 p-3 flex items-center gap-2 text-xs text-[#78716C]">
            <Calendar className="size-3.5 text-terracotta shrink-0" />
            <span className="truncate">DOB: {formatDob(profile?.dob)}</span>
          </div>
        </div>

        <div>
          <label htmlFor="editName" className="block text-xs font-semibold text-charcoal mb-1.5">
            Full name
          </label>
          <div className="relative">
            <input
              id="editName"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-md border border-[#E6E0D6] bg-white px-3.5 py-2 pl-9 text-xs text-charcoal outline-none focus:border-terracotta"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-charcoal mb-1.5">
            Active Resume
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border border-[#E6E0D6] rounded-lg bg-[#FAF8F5]">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileCheck className="size-4 text-terracotta shrink-0" />
              <span className="text-xs font-medium text-charcoal truncate">
                {editResumeName || "Arjun_Resume_2026.pdf"}
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResumeReplace(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-terracotta hover:underline cursor-pointer self-start sm:self-auto shrink-0"
            >
              Replace File
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-terracotta px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer w-full sm:w-auto"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
