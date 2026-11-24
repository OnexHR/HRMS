import React from "react";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  Laptop,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Palette,
  Pencil,
  Phone,
  Plug,
  Save,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useEmployeeAuth } from "../../contexts/EmployeeAuthContext";
import { useChangePassword } from "../../hooks/useChangePassword";
import employeeApi from "../../lib/employeeApi";
import type { EmployeeUser } from "../../types/Employee";
import { getProfileImageUrl } from "../../utils/getImageUrl";
import { Card, CardTitle, PageShell, Pill } from "./ui";

type Preferences = {
  language: string;
  timeZone: string;
  dateFormat: string;
};

const DEFAULT_PREFERENCES: Preferences = {
  language: "English",
  timeZone: "IST (GMT+5:30)",
  dateFormat: "DD MMM, YYYY",
};

const DEFAULT_NOTIFICATIONS = {
  email: true,
  push: true,
  teamActivity: true,
  leaveApprovals: true,
};

const preferenceStorageKey = "manager-profile-preferences";
const notificationStorageKey = "manager-notification-preferences";
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

const readStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return typeof parsed === "object" && parsed !== null ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
};

const displayDate = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getManagerName = (manager: EmployeeUser["manager"]) =>
  manager && typeof manager === "object"
    ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() || "Not assigned"
    : "Not assigned";

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { employee, setEmployee, logout: employeeLogout } = useEmployeeAuth();
  const { logout } = useAuth();
  const { changePassword, loading: changingPassword, error: passwordError, success: passwordSuccess } = useChangePassword("manager");
  const [tab, setTab] = React.useState<"general" | "security" | "notifications" | "integrations" | "appearance" | "logs">("general");
  const [editing, setEditing] = React.useState(false);
  const [phone, setPhone] = React.useState(() => employee?.phone ?? "");
  const [bio, setBio] = React.useState(() => employee?.profile?.bio ?? employee?.bio ?? "");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileMessage, setProfileMessage] = React.useState("");
  const [profileError, setProfileError] = React.useState("");
  const [profileImage, setProfileImage] = React.useState<{ imageUrl?: string; src: string }>({ src: "" });
  const [preferences, setPreferences] = React.useState<Preferences>(() => readStoredValue(preferenceStorageKey, DEFAULT_PREFERENCES));
  const [notifications, setNotifications] = React.useState(() => readStoredValue(notificationStorageKey, DEFAULT_NOTIFICATIONS));
  const [preferencesMessage, setPreferencesMessage] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPasswords, setShowPasswords] = React.useState(false);
  const [passwordValidationError, setPasswordValidationError] = React.useState("");
  const [now] = React.useState(() => Date.now());

  React.useEffect(() => {
    let active = true;
    const imageUrl = employee?.profile?.imageUrl;
    if (!imageUrl) return () => { active = false; };
    getProfileImageUrl(imageUrl).then(
      (url) => { if (active) setProfileImage({ imageUrl, src: url }); },
      () => { if (active) setProfileImage({ imageUrl, src: "" }); },
    );
    return () => { active = false; };
  }, [employee?.profile?.imageUrl]);

  const fullName = `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim() || "Manager";
  const initials = fullName === "Manager"
    ? "M"
    : fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const reportingManager = getManagerName(employee?.manager);
  const joinDate = employee?.job?.joinDate ?? employee?.joinDate;
  const profileImageSrc = profileImage.imageUrl === employee?.profile?.imageUrl ? profileImage.src : "";
  const experienceDate = joinDate ? new Date(joinDate).getTime() : Number.NaN;
  const experienceYears = Number.isFinite(experienceDate)
    ? `${Math.max(0, Math.floor((now - experienceDate) / (365.25 * 24 * 60 * 60 * 1000)))}+ Years`
    : "Not available";
  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const response = await employeeApi.put<{ employee?: EmployeeUser }>("/me", {
        phone: phone.trim(),
        bio: bio.trim(),
      });
      const updatedEmployee = response.data?.employee ?? {
        ...employee,
        phone: phone.trim(),
        bio: bio.trim(),
        profile: { ...employee?.profile, bio: bio.trim() },
      };
      setEmployee(updatedEmployee);
      setEditing(false);
      setProfileMessage("Your profile was updated.");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setProfileError(message ?? "Could not update your profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setPasswordValidationError("");
    if (!passwordPattern.test(newPassword)) {
      setPasswordValidationError("Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordValidationError("The new password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordValidationError("Your new password must be different from the current password.");
      return;
    }
    if (await changePassword(currentPassword, newPassword)) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const savePreferences = () => {
    try {
      localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
      localStorage.setItem(notificationStorageKey, JSON.stringify(notifications));
      setPreferencesMessage("Preferences saved on this device.");
    } catch {
      setPreferencesMessage("Could not save preferences in this browser.");
    }
  };

  const signOut = () => {
    employeeLogout();
    logout();
    navigate("/");
  };

  const toggleNotification = (key: keyof typeof DEFAULT_NOTIFICATIONS) => {
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
    setPreferencesMessage("");
  };

  const managerRows = [
    { label: "Employee ID", value: employee?.employeeCode || "Not available", icon: BriefcaseBusiness },
    { label: "Department", value: employee?.department || "Not available", icon: UsersRound },
    { label: "Manager", value: reportingManager, icon: UserRound },
    { label: "Email", value: employee?.email || "Not available", icon: Mail },
    { label: "Phone", value: phone || "Not available", icon: Phone },
  ];

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "security", label: "Security", icon: LockKeyhole },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Plug },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "logs", label: "System Logs", icon: FileText },
  ] as const;
  const unavailable: Record<"integrations" | "appearance" | "logs", string> = {
    integrations: "Integrations are not available in the current manager tools.",
    appearance: "Appearance options are not available yet.",
    logs: "System logs are not available from the current manager API.",
  };

  return (
    <PageShell crumb="Settings" title="Settings & Configuration" subtitle="Manage your OnexHR settings and customize the platform." icon={Settings}>
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-xl border border-[#E6ECF6] bg-white p-1.5 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-bold transition ${tab === id ? "bg-[#E6EFFF] text-[#1F63E8]" : "text-[#40577A] hover:bg-[#F3F6FC]"}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>

      {tab === "general" && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardTitle icon={UserRound} title="My Profile" action={
              <button type="button" onClick={() => {
                if (editing) { setPhone(employee?.phone ?? ""); setBio(employee?.profile?.bio ?? employee?.bio ?? ""); }
                setEditing((current) => !current); setProfileMessage(""); setProfileError("");
              }} className="flex items-center gap-1.5 rounded-full border border-[#CFE0FB] px-4 py-1.5 text-[12px] font-bold text-[#1F63E8] hover:bg-[#EEF4FF]"><Pencil size={13} />{editing ? "Cancel" : "Edit"}</button>
            } />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#DBE8FA] text-2xl font-bold text-[#2459A6] shadow ring-1 ring-[#DCE6F6]">
                {profileImageSrc ? <img src={profileImageSrc} alt={fullName} className="h-full w-full object-cover" /> : initials}
              </div>
              <div><h3 className="text-[16px] font-extrabold">{fullName}</h3><p className="text-[13px] text-[#617492]">{employee?.designation || "Manager"}</p><div className="mt-1.5"><Pill text={employee?.job?.status || employee?.status || "Active"} /></div></div>
            </div>
            <div className="mt-4 divide-y divide-[#F0F3F8]">
              {managerRows.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex min-w-0 items-center gap-3 py-2.5 text-[13px]">
                  <Icon size={15} className="shrink-0 text-[#5073A8]" /><span className="w-28 shrink-0 text-[#617492]">{label}</span>
                  {editing && label === "Phone" ? <input aria-label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" /> : <span className="min-w-0 flex-1 truncate font-semibold" title={value}>{value}</span>}
                </div>
              ))}
              <div className="flex items-center gap-3 py-2.5 text-[13px]"><CalendarDays size={15} className="text-[#5073A8]" /><span className="w-28 text-[#617492]">Join Date</span><span className="font-semibold">{displayDate(joinDate)}</span></div>
              <div className="flex items-center gap-3 py-2.5 text-[13px]"><Clock3 size={15} className="text-[#5073A8]" /><span className="w-28 text-[#617492]">Experience</span><span className="font-semibold">{experienceYears}</span></div>
            </div>
            <div className="mt-4 rounded-lg bg-[#F2F6FD] p-3">
              <p className="mb-1 flex items-center gap-2 text-[12px] font-bold text-[#1F63E8]"><FileText size={14} />About Me</p>
              {editing ? <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} aria-label="About me" className="w-full resize-y rounded-md border border-[#DCE6F6] bg-white p-2 text-[13px] outline-none focus:border-[#1F63E8]" /> : <p className="whitespace-pre-wrap text-[13px] leading-5 text-[#40577A]">{bio || "Add a short introduction to your profile."}</p>}
            </div>
            {profileError && <p role="alert" className="mt-3 text-[12px] text-rose-600">{profileError}</p>}
            {profileMessage && <p role="status" className="mt-3 text-[12px] text-emerald-700">{profileMessage}</p>}
            {editing && <div className="mt-3 flex justify-end"><button type="button" onClick={saveProfile} disabled={savingProfile} className="rounded-lg bg-[#1F63E8] px-5 py-2 text-[13px] font-bold text-white disabled:opacity-60">{savingProfile ? "Saving..." : "Save Profile"}</button></div>}
          </Card>

          <Card>
            <CardTitle icon={Settings} title="System Preferences" action={<button type="button" onClick={savePreferences} className="flex items-center gap-1.5 rounded-lg bg-[#1F63E8] px-4 py-2 text-[12px] font-bold text-white"><Save size={14} />Save Changes</button>} />
            <div className="mt-4 space-y-3">
              <PreferenceSelect label="Default Language" value={preferences.language} onChange={(value) => setPreferences((c) => ({ ...c, language: value }))} icon={Globe2} options={["English", "Hindi"]} />
              <PreferenceSelect label="Time Zone" value={preferences.timeZone} onChange={(value) => setPreferences((c) => ({ ...c, timeZone: value }))} icon={Clock3} options={["IST (GMT+5:30)", "UTC (GMT+0:00)", "EST (GMT-5:00)", "PST (GMT-8:00)"]} />
              <PreferenceSelect label="Date Format" value={preferences.dateFormat} onChange={(value) => setPreferences((c) => ({ ...c, dateFormat: value }))} icon={CalendarDays} options={["DD MMM, YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} />
            </div>
            <p role="status" className="mt-3 text-[12px] text-emerald-700">{preferencesMessage}</p>
            <p className="mt-1 text-[11px] text-[#7C8CA6]">Preferences are saved in this browser only.</p>
          </Card>
        </div>
      )}

      {tab === "security" && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardTitle icon={LockKeyhole} title="Change Password" />
            <p className="mt-1 text-[12px] text-[#617492]">Keep your account secure with a strong password.</p>
            <div className="mt-4 space-y-3">
              <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} visible={showPasswords} />
              <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} visible={showPasswords} />
              <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} visible={showPasswords} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setShowPasswords((c) => !c)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#617492]">{showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}{showPasswords ? "Hide passwords" : "Show passwords"}</button>
              <button type="button" onClick={savePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} className="flex items-center gap-1.5 rounded-lg bg-[#1F63E8] px-4 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><LockKeyhole size={14} />{changingPassword ? "Updating..." : "Update Password"}</button>
            </div>
            {(passwordValidationError || passwordError) && <p role="alert" className="mt-3 text-[12px] text-rose-600">{passwordValidationError || passwordError}</p>}
            {passwordSuccess && <p role="status" className="mt-3 text-[12px] text-emerald-700">Password updated successfully.</p>}
          </Card>
          <Card>
            <CardTitle icon={Monitor} title="Active Session" />
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F6F8FC] p-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#1F63E8] shadow-sm"><Laptop size={19} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">Current browser session</p><p className="flex items-center gap-1 text-[11px] text-[#617492]"><MapPin size={11} />Session information is not available</p></div>
              <Pill text="Current" tone="green" />
            </div>
            <button type="button" onClick={signOut} className="mt-4 flex items-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2 text-[12px] font-bold text-rose-600 hover:bg-rose-50"><LogOut size={14} />Sign Out</button>
          </Card>
        </div>
      )}

      {tab === "notifications" && (
        <Card className="max-w-2xl">
          <CardTitle icon={Bell} title="Notification Settings" action={<button type="button" onClick={savePreferences} className="flex items-center gap-1.5 rounded-lg bg-[#1F63E8] px-4 py-2 text-[12px] font-bold text-white"><Save size={14} />Save Changes</button>} />
          <div className="mt-4 divide-y divide-[#F0F3F8]">
            <NotificationToggle label="Email Notifications" detail="Receive important updates via email" checked={notifications.email} onChange={() => toggleNotification("email")} icon={Mail} />
            <NotificationToggle label="Push Notifications" detail="Get notified on your device" checked={notifications.push} onChange={() => toggleNotification("push")} icon={Bell} />
            <NotificationToggle label="Team Activity Alerts" detail="Team updates and activity" checked={notifications.teamActivity} onChange={() => toggleNotification("teamActivity")} icon={UsersRound} />
            <NotificationToggle label="Leave Approvals" detail="Get notified about leave requests" checked={notifications.leaveApprovals} onChange={() => toggleNotification("leaveApprovals")} icon={CalendarDays} />
          </div>
          <p role="status" className="mt-3 text-[12px] text-emerald-700">{preferencesMessage}</p>
          <p className="mt-1 text-[11px] text-[#7C8CA6]">Notification choices are saved in this browser only.</p>
        </Card>
      )}

      {(tab === "integrations" || tab === "appearance" || tab === "logs") && (
        <Card><p className="py-10 text-center text-[13px] text-[#617492]">{unavailable[tab]}</p></Card>
      )}
    </PageShell>
  );
};

function PasswordField({ label, value, onChange, visible }: { label: string; value: string; onChange: (value: string) => void; visible: boolean }) {
  return (
    <label className="grid grid-cols-1 gap-1.5 text-[12px] sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <span className="font-semibold text-[#40577A]">{label}</span>
      <input aria-label={label} type={visible ? "text" : "password"} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} className="h-10 min-w-0 rounded-lg border border-[#DCE6F7] bg-[#F8FAFE] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
    </label>
  );
}

function NotificationToggle({ label, detail, checked, onChange, icon: Icon }: { label: string; detail: string; checked: boolean; onChange: () => void; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#EFF5FF] text-[#1F63E8]"><Icon size={17} /></span>
      <div className="min-w-0 flex-1"><p className="text-[13px] font-bold">{label}</p><p className="text-[11px] text-[#617492]">{detail}</p></div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#1F63E8]" : "bg-[#C7D1E0]"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function PreferenceSelect({ label, value, onChange, icon: Icon, options }: { label: string; value: string; onChange: (value: string) => void; icon: React.ElementType; options: string[] }) {
  return (
    <label className="grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center">
      <span className="flex items-center gap-2 font-semibold text-[#10284A]"><Icon size={16} className="text-[#2459A6]" />{label}</span>
      <span className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-[#DCE6F7] bg-white px-3 pr-8 text-[13px] font-semibold outline-none focus:border-[#1F63E8]">
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3 text-[#617492]" />
      </span>
    </label>
  );
}

export default ProfileSettings;
