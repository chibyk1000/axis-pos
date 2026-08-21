"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  MapPin,
  Mail,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useUserById, useUpdateUser } from "@/hooks/controllers/users";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

/* -------------------------------------------------------------------------- */
/*                                 CONSTANTS                                  */
/* -------------------------------------------------------------------------- */

const ACCESS_LEVEL_LABELS: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  0: { label: "Locked out", color: "text-stone-500", bg: "bg-stone-500" },
  1: { label: "Cashier", color: "text-stone-400", bg: "bg-stone-600" },
  2: { label: "Senior Cashier", color: "text-stone-300", bg: "bg-stone-600" },
  3: { label: "Shift Lead", color: "text-blue-400", bg: "bg-blue-600" },
  4: { label: "Assistant Manager", color: "text-blue-300", bg: "bg-blue-600" },
  5: { label: "Store Manager", color: "text-emerald-400", bg: "bg-emerald-600" },
  6: { label: "Area Manager", color: "text-emerald-300", bg: "bg-emerald-600" },
  7: { label: "Auditor / Finance", color: "text-purple-400", bg: "bg-purple-600" },
  8: { label: "Administrator", color: "text-amber-400", bg: "bg-amber-600" },
  9: { label: "Super Admin", color: "text-orange-400", bg: "bg-orange-600" },
};

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export default function UserInfoPage() {
  const navigate = useNavigate();
  const { user: authUser, updateSession } = useAuth();
  const userId = authUser?.id ? String(authUser.id) : "";

  const { data: dbUser, isLoading, refetch } = useUserById(userId);
  const updateUserMutation = useUpdateUser();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState<string>("");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Status & Validation
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when DB record loads
  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name ?? "");
      setEmail(dbUser.email ?? "");
      setCity(dbUser.city === "NULL" || !dbUser.city ? "" : dbUser.city);
      setAge(dbUser.age != null ? String(dbUser.age) : "");
    }
  }, [dbUser]);

  const accessLevel = dbUser?.accessLevel ?? authUser?.accessLevel ?? 1;
  const roleMeta = ACCESS_LEVEL_LABELS[accessLevel] ?? {
    label: "Cashier",
    color: "text-stone-400",
    bg: "bg-stone-600",
  };
  const initials = getInitials(name || authUser?.username);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;
    setStatusMessage(null);

    if (!name.trim()) {
      setStatusMessage({ type: "error", text: "Name cannot be empty." });
      return;
    }

    // Password validation if attempting to change password
    let updatedPasswordHash: string | undefined = undefined;
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setStatusMessage({
          type: "error",
          text: "Please enter your current password to set a new password.",
        });
        return;
      }
      if (!newPassword) {
        setStatusMessage({
          type: "error",
          text: "Please enter a new password.",
        });
        return;
      }
      if (newPassword.length < 6) {
        setStatusMessage({
          type: "error",
          text: "New password must be at least 6 characters.",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatusMessage({
          type: "error",
          text: "New password and confirmation do not match.",
        });
        return;
      }

      // Verify current password against database hash
      if (dbUser?.passwordHash) {
        const isCurrentValid = await verifyPassword(
          currentPassword,
          dbUser.passwordHash
        );
        if (!isCurrentValid) {
          setStatusMessage({
            type: "error",
            text: "Current password is incorrect.",
          });
          return;
        }
      }

      updatedPasswordHash = await hashPassword(newPassword);
    }

    setIsSaving(true);
    try {
      await updateUserMutation.mutateAsync({
        id: authUser.id,
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase() || null,
          city: city.trim() || "NULL",
          age: age ? Number(age) : null,
          ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash } : {}),
        },
      });

      // Update in-memory auth session so header & drawers update instantly
      updateSession({
        username: name.trim() || email.trim() || authUser.username,
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setStatusMessage({
        type: "success",
        text: "Your profile has been updated successfully.",
      });
      toast.success("Profile updated successfully");
      refetch();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message ?? "Failed to update profile. Please try again.",
      });
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-xl h-9 w-9"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              User Profile
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              View and update your personal account information
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl w-full mx-auto p-6 md:p-8 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-sm">Loading user details…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Profile Card */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                {/* Accent glow */}
                <div
                  className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full opacity-20 pointer-events-none blur-3xl"
                  style={{ background: "#d97706" }}
                />

                {/* Avatar Badge */}
                <div
                  className={`w-20 h-20 rounded-2xl ${roleMeta.bg} flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-md transition-transform`}
                >
                  {initials}
                </div>

                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
                  {name || authUser?.username || "Logged in User"}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {email || "No email assigned"}
                </p>

                {/* Role / Access Level Badge */}
                <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span className={`text-xs font-semibold ${roleMeta.color}`}>
                    Level {accessLevel} · {roleMeta.label}
                  </span>
                </div>

                {/* Mini access level progress bar */}
                <div className="w-full mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex justify-between items-center text-[11px] text-stone-500 mb-1.5">
                    <span>Permission Level</span>
                    <span>{accessLevel} / 9</span>
                  </div>
                  <div className="flex gap-1 w-full">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-sm transition-colors ${
                          i <= accessLevel
                            ? i >= 8
                              ? "bg-amber-500"
                              : i >= 5
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                            : "bg-stone-200 dark:bg-stone-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Meta Card */}
              <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3.5">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Account Details
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-stone-400" /> User ID
                    </span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">
                      #{dbUser?.id ?? authUser?.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" /> City
                    </span>
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {city || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" /> Created
                    </span>
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {dbUser?.created_at
                        ? new Date(dbUser.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Edit Profile & Password Form */}
            <div className="lg:col-span-2">
              <form
                onSubmit={handleSave}
                className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6"
              >
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                    Edit Account Details
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Update your personal profile information and credentials.
                  </p>
                </div>

                {/* Status Message */}
                {statusMessage && (
                  <div
                    className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm border ${
                      statusMessage.type === "success"
                        ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                        : "bg-red-950/40 border-red-900 text-red-400"
                    }`}
                  >
                    {statusMessage.type === "success" ? (
                      <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <span className="leading-relaxed">{statusMessage.text}</span>
                  </div>
                )}

                {/* Section 1: Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" /> General Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl pl-3.5 pr-9 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <Mail className="w-4 h-4 text-stone-400 absolute right-3 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. London"
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                        Age
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 28"
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Security & Password */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" /> Change Password
                    </h3>
                    <span className="text-[11px] text-stone-400">
                      Leave blank if you don't want to change password
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw((v) => !v)}
                          tabIndex={-1}
                          className="absolute right-3 text-stone-400 hover:text-stone-200 transition-colors"
                        >
                          {showCurrentPw ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                          New Password
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type={showNewPw ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            autoComplete="new-password"
                            className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw((v) => !v)}
                            tabIndex={-1}
                            className="absolute right-3 text-stone-400 hover:text-stone-200 transition-colors"
                          >
                            {showNewPw ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                          Confirm New Password
                        </label>
                        <input
                          type={showNewPw ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          autoComplete="new-password"
                          className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (dbUser) {
                        setName(dbUser.name ?? "");
                        setEmail(dbUser.email ?? "");
                        setCity(
                          dbUser.city === "NULL" || !dbUser.city
                            ? ""
                            : dbUser.city
                        );
                        setAge(dbUser.age != null ? String(dbUser.age) : "");
                      }
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setStatusMessage(null);
                    }}
                    disabled={isSaving}
                  >
                    Reset Changes
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
