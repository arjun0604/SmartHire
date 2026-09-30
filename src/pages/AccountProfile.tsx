import * as React from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useUser } from "@context/UserContext"
import { AppSidebar } from "@components/app-sidebar"
import { SiteHeader } from "@components/site-header"
import { SidebarInset, SidebarProvider } from "@components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { getInitials, formatDisplayDate } from "../utils/formatters"
import {
  Camera,
  Trash2,
  Upload,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  MapPin,
  Building,
  Globe,
  LogOut,
  AlertTriangle,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react"
import {
  validateName,
  validateIndianPhone,
  normalizeIndianPhone,
  validateLocation,
  validateUrl,
} from "../utils/validation"
import { getLogoutReturnToUrl, getLoginPath } from "../utils/auth-sync"

export default function AccountProfile() {
  const { logout: auth0Logout } = useAuth0();
  const {
    profile,
    updateAccountProfile,
    updateCandidate,
    uploadProfilePhoto,
    removeProfilePhoto,
    deleteAccount,
    clearSession,
  } = useUser();

  const [name, setName] = React.useState(profile?.name || "");
  const [phone, setPhone] = React.useState(profile?.phone || "");
  const [city, setCity] = React.useState("");
  const [stateRegion, setStateRegion] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [willingToRelocate, setWillingToRelocate] = React.useState(false);
  const [linkedin, setLinkedin] = React.useState("");
  const [github, setGithub] = React.useState("");
  const [portfolio, setPortfolio] = React.useState("");

  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [photoMessage, setPhotoMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fieldRefs = React.useRef<Record<string, HTMLElement | null>>({});

  const FIELD_ORDER = [
    "name",
    "phone",
    "city",
    "stateRegion",
    "country",
    "linkedin",
    "github",
    "portfolio",
  ];

  React.useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }

    if (profile?.phone) {
      setPhone(normalizeIndianPhone(profile.phone));
    }

    if (profile?.location) {
      const parts = profile.location.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        setCity(parts[0]);
        setStateRegion(parts[1]);
        setCountry(parts.slice(2).join(", "));
      } else if (parts.length === 2) {
        setCity(parts[0]);
        setStateRegion(parts[1]);
      } else if (parts.length === 1) {
        setCity(parts[0]);
      }
    }

    const savedExt = profile?.id ? localStorage.getItem(`smarthire_profile_ext_${profile.id}`) : null;
    if (savedExt) {
      try {
        const parsed = JSON.parse(savedExt);
        if (parsed.willingToRelocate !== undefined) setWillingToRelocate(Boolean(parsed.willingToRelocate));
        if (parsed.linkedin !== undefined) setLinkedin(parsed.linkedin);
        if (parsed.github !== undefined) setGithub(parsed.github);
        if (parsed.portfolio !== undefined) setPortfolio(parsed.portfolio);
      } catch {}
    }
  }, [profile?.id, profile?.name, profile?.phone, profile?.location]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["png", "jpg", "jpeg", "webp"];
    if (!file.type.startsWith("image/") && (!ext || !validExtensions.includes(ext))) {
      setPhotoMessage({ type: "error", text: "Please upload a valid image file (PNG, JPG, or WEBP)." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size === 0) {
      setPhotoMessage({ type: "error", text: "The selected image file is empty." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage({ type: "error", text: "Image file size must be less than 5MB." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    setSaveError(null);

    try {
      const uploadedUrl = await uploadProfilePhoto(file);
      if (uploadedUrl) {
        setPhotoMessage({ type: "success", text: "Profile photo updated successfully." });
        setTimeout(() => setPhotoMessage(null), 3500);
      } else {
        setPhotoMessage({ type: "error", text: "Failed to upload profile photo." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload profile photo.";
      setPhotoMessage({ type: "error", text: msg });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    setSaveError(null);

    try {
      await removeProfilePhoto();
      setPhotoMessage({ type: "success", text: "Profile photo removed." });
      setTimeout(() => setPhotoMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove profile photo.";
      setPhotoMessage({ type: "error", text: msg });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    const errors: Record<string, string> = {};

    const nameVal = validateName(name, "Full name");
    if (!nameVal.isValid) {
      errors.name = nameVal.error || "Please enter a valid full name";
    }

    if (phone.trim()) {
      const phoneVal = validateIndianPhone(phone);
      if (!phoneVal.isValid) {
        errors.phone = phoneVal.error || "Please enter a valid Indian mobile number";
      }
    }

    if (city.trim()) {
      const cityVal = validateLocation(city, "City");
      if (!cityVal.isValid) {
        errors.city = cityVal.error || "Please enter a valid city";
      }
    }

    if (stateRegion.trim()) {
      const stateVal = validateLocation(stateRegion, "State / Region");
      if (!stateVal.isValid) {
        errors.stateRegion = stateVal.error || "Please enter a valid state/region";
      }
    }

    if (country.trim()) {
      const countryVal = validateLocation(country, "Country");
      if (!countryVal.isValid) {
        errors.country = countryVal.error || "Please enter a valid country";
      }
    }

    if (linkedin.trim()) {
      const liVal = validateUrl(linkedin, "LinkedIn URL");
      if (!liVal.isValid) {
        errors.linkedin = liVal.error || "Please enter a valid LinkedIn URL";
      }
    }

    if (github.trim()) {
      const ghVal = validateUrl(github, "GitHub URL");
      if (!ghVal.isValid) {
        errors.github = ghVal.error || "Please enter a valid GitHub URL";
      }
    }

    if (portfolio.trim()) {
      const pfVal = validateUrl(portfolio, "Portfolio URL");
      if (!pfVal.isValid) {
        errors.portfolio = pfVal.error || "Please enter a valid Portfolio URL";
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = FIELD_ORDER.find((k) => errors[k]);
      if (firstError) {
        setTimeout(() => {
          const el = fieldRefs.current[firstError];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const focusable = el.querySelector<HTMLElement>("input, select, textarea, button") || (el instanceof HTMLElement ? el : null);
            if (focusable && typeof focusable.focus === "function") {
              focusable.focus({ preventScroll: true });
            }
          }
        }, 50);
      }
      return;
    }

    const formattedPhone = normalizeIndianPhone(phone);
    setPhone(formattedPhone);

    setIsSaving(true);

    try {
      await updateAccountProfile(name.trim(), profile?.picture || null);
      const fullLocation = [city.trim(), stateRegion.trim(), country.trim()].filter(Boolean).join(", ");
      if (profile?.role === "candidate" && updateCandidate) {
        await updateCandidate({
          name: name.trim(),
          phone: formattedPhone || undefined,
          location: fullLocation || undefined,
        });
      }
      if (profile?.id) {
        localStorage.setItem(
          `smarthire_profile_ext_${profile.id}`,
          JSON.stringify({ phone: formattedPhone, city, stateRegion, country, willingToRelocate, linkedin, github, portfolio })
        );
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile changes.";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    const returnTo = getLogoutReturnToUrl();
    window.history.replaceState(null, "", getLoginPath());
    auth0Logout({
      logoutParams: {
        returnTo,
      },
    });
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
      const returnTo = getLogoutReturnToUrl();
      window.history.replaceState(null, "", getLoginPath());
      auth0Logout({
        logoutParams: {
          returnTo,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account. Please try again.";
      setDeleteError(msg);
      setIsDeleting(false);
    }
  };

  const roleDisplay = profile?.role === "recruiter" ? "Recruiter" : "Candidate";
  const formattedDob = profile?.dob ? formatDisplayDate(profile.dob, "Not provided") : "Not provided";
  const dangerWarningText =
    profile?.role === "recruiter"
      ? "Deleting your account will permanently remove your recruiter profile, job postings, applications associated with those postings, and associated data."
      : "Deleting your account will permanently remove your profile, applications, resumes, and associated data.";

  return (
    <SidebarProvider>
      <AppSidebar activeTab="account" />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Account Profile" />

        <div className="flex flex-1 flex-col gap-3.5 sm:gap-4 p-3.5 sm:p-6 lg:py-6 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div className="border-b border-[#E6E0D6] pb-3 sm:pb-3.5 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal tracking-tight">
              Account Profile
            </h1>
          </div>

          <form onSubmit={handleSaveChanges} noValidate className="w-full min-w-0 space-y-3 sm:space-y-3.5">
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-medium text-emerald-800 animate-in fade-in-0 duration-150">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>Account profile changes saved successfully.</span>
              </div>
            )}

            {saveError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/90 px-3.5 py-2 text-xs font-medium text-red-800 animate-in fade-in-0 duration-150">
                <AlertCircle className="size-3.5 text-red-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {photoMessage && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium animate-in fade-in-0 duration-150 ${
                  photoMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
                    : "border-red-200 bg-red-50/90 text-red-800"
                }`}
              >
                {photoMessage.type === "success" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="size-3.5 text-red-600 shrink-0" />
                )}
                <span>{photoMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 w-full min-w-0 items-start">
              <div className="rounded-xl border border-[#E6E0D6] bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
                <div className="border-b border-[#F0ECE4] pb-2">
                  <h2 className="font-serif text-sm sm:text-base font-bold text-charcoal">Profile & Contact</h2>
                </div>

                <div className="flex items-center gap-3 pb-0.5">
                  <div className="relative group shrink-0">
                    <Avatar className="size-15 sm:size-16 border-2 border-[#E6E0D6] shadow-xs">
                      <AvatarImage src={profile?.picture || ""} alt={name || "Profile"} />
                      <AvatarFallback className="bg-cream font-serif text-base sm:text-lg font-bold text-charcoal">
                        {getInitials(name || profile?.name)}
                      </AvatarFallback>
                    </Avatar>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-charcoal/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0"
                      aria-label="Upload photo"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Camera className="size-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isUploadingPhoto}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-2.5 py-1 text-xs font-medium text-charcoal shadow-3xs transition-colors hover:border-terracotta/40 hover:bg-cream cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="size-3 animate-spin text-terracotta" />
                        ) : (
                          <Upload className="size-3 text-terracotta" />
                        )}
                        <span>{profile?.picture ? "Replace" : "Upload"}</span>
                      </button>

                      {profile?.picture && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          disabled={isUploadingPhoto}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100/60 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="size-3 text-red-600" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] text-[#A8A199]">Square JPG, PNG, or WEBP &lt; 5MB</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  <div ref={(el) => { fieldRefs.current.name = el; }}>
                    <label htmlFor="fullName" className="block text-xs font-semibold text-charcoal mb-1">
                      Full Name <span className="text-terracotta">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="fullName"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (fieldErrors.name) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.name;
                              return next;
                            });
                          }
                        }}
                        placeholder="Your full name"
                        className={`w-full rounded-lg border ${fieldErrors.name ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                      />
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="email" className="block text-xs font-semibold text-charcoal">
                        Email
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716C] bg-cream px-1.5 py-0.2 rounded border border-[#E6E0D6]">
                        <Lock className="size-2.5 text-[#A8A199]" />
                        Read-only
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={profile?.email || ""}
                        readOnly
                        disabled
                        className="w-full rounded-lg border border-[#E6E0D6] bg-cream px-3 py-1.5 pl-8.5 text-xs text-[#78716C] cursor-not-allowed outline-none select-none"
                      />
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                    </div>
                  </div>

                  <div ref={(el) => { fieldRefs.current.phone = el; }}>
                    <label htmlFor="phone" className="block text-xs font-semibold text-charcoal mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (fieldErrors.phone) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.phone;
                              return next;
                            });
                          }
                        }}
                        onBlur={() => setPhone((prev) => normalizeIndianPhone(prev))}
                        placeholder="+91 98765 43210"
                        className={`w-full rounded-lg border ${fieldErrors.phone ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                      />
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.phone}</p>
                    )}
                  </div>

                  {profile?.role === "candidate" ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="dob" className="block text-xs font-semibold text-charcoal">
                          DOB
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716C] bg-cream px-1.5 py-0.2 rounded border border-[#E6E0D6]">
                          <Lock className="size-2.5 text-[#A8A199]" />
                          Read-only
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="dob"
                          type="text"
                          value={formattedDob}
                          readOnly
                          disabled
                          className="w-full rounded-lg border border-[#E6E0D6] bg-cream px-3 py-1.5 pl-8.5 text-xs text-[#78716C] cursor-not-allowed outline-none select-none"
                        />
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="role" className="block text-xs font-semibold text-charcoal">
                          Role
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716C] bg-cream px-1.5 py-0.2 rounded border border-[#E6E0D6]">
                          <Lock className="size-2.5 text-[#A8A199]" />
                          Read-only
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="role"
                          type="text"
                          value={roleDisplay}
                          readOnly
                          disabled
                          className="w-full rounded-lg border border-[#E6E0D6] bg-cream px-3 py-1.5 pl-8.5 text-xs text-[#78716C] cursor-not-allowed outline-none select-none capitalize"
                        />
                        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                      </div>
                    </div>
                  )}

                  {profile?.role === "candidate" && (
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="role" className="block text-xs font-semibold text-charcoal">
                          Role
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#78716C] bg-cream px-1.5 py-0.2 rounded border border-[#E6E0D6]">
                          <Lock className="size-2.5 text-[#A8A199]" />
                          Read-only
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="role"
                          type="text"
                          value={roleDisplay}
                          readOnly
                          disabled
                          className="w-full rounded-lg border border-[#E6E0D6] bg-cream px-3 py-1.5 pl-8.5 text-xs text-[#78716C] cursor-not-allowed outline-none select-none capitalize"
                        />
                        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-[#F0ECE4]">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-terracotta px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-3.5 w-full min-w-0">
                <div className="rounded-xl border border-[#E6E0D6] bg-white p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                  <div className="border-b border-[#F0ECE4] pb-2">
                    <h2 className="font-serif text-sm sm:text-base font-bold text-charcoal">Location</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    <div ref={(el) => { fieldRefs.current.city = el; }}>
                      <label htmlFor="city" className="block text-xs font-semibold text-charcoal mb-1">
                        City
                      </label>
                      <div className="relative">
                        <input
                          id="city"
                          type="text"
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            if (fieldErrors.city) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.city;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. Mumbai"
                          className={`w-full rounded-lg border ${fieldErrors.city ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-2.5 py-1.5 pl-8 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                        />
                        <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                      </div>
                      {fieldErrors.city && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.city}</p>
                      )}
                    </div>

                    <div ref={(el) => { fieldRefs.current.stateRegion = el; }}>
                      <label htmlFor="stateRegion" className="block text-xs font-semibold text-charcoal mb-1">
                        State / Region
                      </label>
                      <div className="relative">
                        <input
                          id="stateRegion"
                          type="text"
                          value={stateRegion}
                          onChange={(e) => {
                            setStateRegion(e.target.value);
                            if (fieldErrors.stateRegion) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.stateRegion;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. Maharashtra"
                          className={`w-full rounded-lg border ${fieldErrors.stateRegion ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-2.5 py-1.5 pl-8 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                        />
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                      </div>
                      {fieldErrors.stateRegion && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.stateRegion}</p>
                      )}
                    </div>

                    <div ref={(el) => { fieldRefs.current.country = el; }} className={profile?.role === "candidate" ? "" : "sm:col-span-2"}>
                      <label htmlFor="country" className="block text-xs font-semibold text-charcoal mb-1">
                        Country
                      </label>
                      <div className="relative">
                        <input
                          id="country"
                          type="text"
                          value={country}
                          onChange={(e) => {
                            setCountry(e.target.value);
                            if (fieldErrors.country) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.country;
                                return next;
                              });
                            }
                          }}
                          placeholder="e.g. India"
                          className={`w-full rounded-lg border ${fieldErrors.country ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-2.5 py-1.5 pl-8 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                        />
                        <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                      </div>
                      {fieldErrors.country && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.country}</p>
                      )}
                    </div>

                    {profile?.role === "candidate" && (
                      <div>
                        <span className="block text-xs font-semibold text-charcoal mb-1">
                          Relocation
                        </span>
                        <label
                          htmlFor="willingToRelocate"
                          className="flex items-center gap-2 w-full rounded-lg border border-[#E6E0D6] bg-white px-2.5 py-1.5 text-xs text-charcoal shadow-3xs cursor-pointer select-none hover:border-terracotta/40 transition-colors h-7.75"
                        >
                          <input
                            id="willingToRelocate"
                            type="checkbox"
                            checked={willingToRelocate}
                            onChange={(e) => setWillingToRelocate(e.target.checked)}
                            className="size-3.5 accent-terracotta rounded cursor-pointer shrink-0"
                          />
                          <span className="text-xs font-medium text-charcoal truncate">
                            Willing to relocate
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[#E6E0D6] bg-white p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                  <div className="border-b border-[#F0ECE4] pb-1.5">
                    <h2 className="font-serif text-sm sm:text-base font-bold text-charcoal">Online Presence</h2>
                  </div>

                  <div className={profile?.role === "candidate" ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5" : "pt-0.5"}>
                    <div ref={(el) => { fieldRefs.current.linkedin = el; }}>
                      <label htmlFor="linkedin" className="block text-xs font-semibold text-charcoal mb-1">
                        LinkedIn
                      </label>
                      <div className="relative">
                        <input
                          id="linkedin"
                          type="url"
                          value={linkedin}
                          onChange={(e) => {
                            setLinkedin(e.target.value);
                            if (fieldErrors.linkedin) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.linkedin;
                                return next;
                              });
                            }
                          }}
                          placeholder="https://linkedin.com/in/username"
                          className={`w-full rounded-lg border ${fieldErrors.linkedin ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6-1.6c0-.88-.72-1.6-1.6-1.6Z"/>
                        </svg>
                      </div>
                      {fieldErrors.linkedin && (
                        <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.linkedin}</p>
                      )}
                    </div>

                    {profile?.role === "candidate" && (
                      <>
                        <div ref={(el) => { fieldRefs.current.github = el; }}>
                          <label htmlFor="github" className="block text-xs font-semibold text-charcoal mb-1">
                            GitHub
                          </label>
                          <div className="relative">
                            <input
                              id="github"
                              type="url"
                              value={github}
                              onChange={(e) => {
                                setGithub(e.target.value);
                                if (fieldErrors.github) {
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.github;
                                    return next;
                                  });
                                }
                              }}
                              placeholder="https://github.com/username"
                              className={`w-full rounded-lg border ${fieldErrors.github ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                            />
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"/>
                            </svg>
                          </div>
                          {fieldErrors.github && (
                            <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.github}</p>
                          )}
                        </div>

                        <div ref={(el) => { fieldRefs.current.portfolio = el; }} className="sm:col-span-2">
                          <label htmlFor="portfolio" className="block text-xs font-semibold text-charcoal mb-1">
                            Portfolio
                          </label>
                          <div className="relative">
                            <input
                              id="portfolio"
                              type="url"
                              value={portfolio}
                              onChange={(e) => {
                                setPortfolio(e.target.value);
                                if (fieldErrors.portfolio) {
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.portfolio;
                                    return next;
                                  });
                                }
                              }}
                              placeholder="https://yourportfolio.com"
                              className={`w-full rounded-lg border ${fieldErrors.portfolio ? "border-red-400 focus:border-red-500" : "border-[#E6E0D6] focus:border-terracotta"} bg-white px-3 py-1.5 pl-8.5 text-xs text-charcoal outline-none shadow-3xs transition-colors`}
                            />
                            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A8A199]" />
                          </div>
                          {fieldErrors.portfolio && (
                            <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.portfolio}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E0D6] bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="font-serif text-xs sm:text-sm font-bold text-charcoal">Active Session</h2>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  Signed in on this device as <span className="font-semibold text-charcoal">{profile?.email || "User"}</span> ({roleDisplay}).
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E6E0D6] bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow-3xs transition-colors hover:border-terracotta/40 hover:bg-cream cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <LogOut className="size-3.5 text-[#78716C]" />
                <span>Log Out</span>
              </button>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/40 p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex size-7 items-center justify-center rounded-md bg-red-100 text-red-600 shrink-0 mt-0.5">
                  <AlertTriangle className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-xs sm:text-sm font-bold text-red-950">Danger Zone</h2>
                  <p className="text-xs text-red-800/80 mt-0.5 leading-relaxed">
                    {dangerWarningText}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteText("");
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Delete Account
              </button>
            </div>
          </form>
        </div>
      </SidebarInset>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E0D6]">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <AlertTriangle className="size-4" />
                </div>
                <h3 className="font-serif text-base font-bold text-red-950">Delete Account Confirmation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg p-1 text-[#78716C] hover:text-charcoal hover:bg-cream cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed">
              {dangerWarningText} You will be logged out immediately and cannot recover this account.
            </p>

            {deleteError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <label htmlFor="confirmDelete" className="block text-xs font-semibold text-charcoal">
                Type <span className="text-red-600 font-mono">DELETE</span> to confirm:
              </label>
              <input
                id="confirmDelete"
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-xs text-charcoal outline-none focus:border-red-500 font-mono shadow-3xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F0ECE4]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs font-medium text-charcoal hover:bg-cream cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={confirmDeleteText !== "DELETE" || isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <span>Permanently Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
