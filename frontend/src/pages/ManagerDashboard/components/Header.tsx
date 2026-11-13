import React from "react";
import { CalendarDays, LogIn, LogOut, Sun, UserRound } from "lucide-react";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import employeeApi from "../../../lib/employeeApi";
import { getProfileImageUrl } from "../../../utils/getImageUrl";
import type { AttendanceToday } from "../../../types/Employee";

// Resolves the R2 key to a signed URL whenever the signed-in manager changes, so
// a picture uploaded on the profile screen appears here without a reload.
const useProfileImage = (imageUrl?: string) => {
  const [src, setSrc] = React.useState("");

  React.useEffect(() => {
    let active = true;
    if (!imageUrl) {
      setSrc("");
      return;
    }
    getProfileImageUrl(imageUrl).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [imageUrl]);

  return src;
};

const Header: React.FC<{
  attendanceToday?: AttendanceToday;
  loading?: boolean;
  onRefresh?: () => void;
}> = ({ attendanceToday, loading, onRefresh }) => {
  const { employee } = useEmployeeAuth();
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [ownAttendance, setOwnAttendance] = React.useState<AttendanceToday | undefined>(undefined);

  // Standalone usages get the status straight from the API; when the page
  // already loaded it, attendanceToday wins and no request is made.
  React.useEffect(() => {
    if (attendanceToday) return;
    let active = true;

    const load = async () => {
      try {
        const res = await employeeApi.get<{ attendance: AttendanceToday }>("/attendance/today");
        if (active) setOwnAttendance(res.data?.attendance ?? undefined);
      } catch {
        if (active) setOwnAttendance(undefined);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [attendanceToday]);

  const today = attendanceToday ?? ownAttendance;

  const managerName =
    employee && (employee.firstName || employee.lastName)
      ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
      : "Manager";

  const managerCode = employee?.employeeCode ?? "MGR";

  const profileImage = useProfileImage(employee?.profile?.imageUrl);
  const initials = `${employee?.firstName?.[0] ?? ""}${employee?.lastName?.[0] ?? ""}`.toUpperCase();
  // Initials stand in until the signed URL lands, and permanently if there is
  // no picture or the lookup fails, so the avatar is never a bare grey circle.
  const avatarNode = profileImage ? (
    <img src={profileImage} alt={managerName} className="h-full w-full object-cover" />
  ) : (
    <span className="text-sm font-bold text-[#2459A6]">
      {initials || <UserRound size={27} strokeWidth={1.8} />}
    </span>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const checkedIn = Boolean(today?.checkIn && !today?.checkOut);
  const onBreak = today?.status === "on_break";
  const statusLabel = onBreak ? "On Break" : checkedIn ? "Online" : "Offline";
  const statusColor = onBreak
    ? "bg-amber-500"
    : checkedIn
      ? "bg-green-500"
      : "bg-gray-400";

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      if (onRefresh) {
        onRefresh();
      } else {
        const res = await employeeApi.get<{ attendance: AttendanceToday }>("/attendance/today");
        setOwnAttendance(res.data?.attendance ?? undefined);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = () =>
    runAction(() => employeeApi.post("/attendance/check-in"));

  const handleCheckOut = () =>
    runAction(() => employeeApi.post("/attendance/check-out"));

  return (
    <header className="sticky top-0 z-10 mx-4 mt-3 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-[#2459A6]">
            {avatarNode}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-bold text-[#10284A]">
                {greeting}, {managerName}
              </h2>
              <Sun size={28} strokeWidth={1.8} className="text-yellow-500" />
            </div>
            <p className="mt-1 text-sm text-gray-500">Manager ID: {managerCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {actionError && (
            <p className="max-w-[220px] truncate rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {actionError}
            </p>
          )}

          <div className="flex h-12 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
            <span className={`h-3.5 w-3.5 rounded-full ${statusColor}`} />
            <span className="text-sm font-semibold text-[#10284A]">{statusLabel}</span>
          </div>

          {checkedIn ? (
            <button
              type="button"
              disabled={busy || loading}
              onClick={handleCheckOut}
              className="flex h-12 items-center gap-2 rounded-xl bg-rose-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
            >
              <LogOut size={18} />
              Check Out
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || loading}
              onClick={handleCheckIn}
              className="flex h-12 items-center gap-2 rounded-xl bg-[#2459A6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4D91] disabled:opacity-60"
            >
              <LogIn size={18} />
              Check In
            </button>
          )}

          <div className="flex h-12 items-center gap-3 border-l border-gray-200 pl-5">
            <CalendarDays size={20} className="text-[#2459A6]" />
            <span className="text-sm font-medium text-gray-600">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-3 border-l border-gray-200 pl-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-[#2459A6]">
              {avatarNode}
            </div>

            <div>
              <p className="text-sm font-semibold text-[#10284A]">{managerName}</p>
              <p className="mt-0.5 text-xs text-gray-500">Manager</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
