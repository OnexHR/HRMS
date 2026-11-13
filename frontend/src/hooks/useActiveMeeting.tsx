import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import employeeApi from "../lib/employeeApi";
import { useEmployeeAuth } from "../contexts/EmployeeAuthContext";
import type { ActiveMeeting } from "../types/Employee";

// Re-exported so consumers only need this module for meeting state.
export type { ActiveMeeting };

/** How long the End button reads "Meeting Ended" after a meeting ends. */
const END_LABEL_MS = 6000;

export interface StartMeetingPayload {
  title: string;
  meetingLink?: string;
  /** Participant ids picked in the form; the server sends them back populated. */
  participants: string[];
  startTime: Date;
  durationMin: number;
}

interface MeetingContextValue {
  /** The live meeting (server status "active") or null. Single source of truth. */
  activeMeeting: ActiveMeeting | null;
  /** The just-ended meeting, kept for the "Meeting ended" banner. */
  lastEnded: ActiveMeeting | null;
  /** Epoch ms until which the End button reads "Meeting Ended". */
  endedLabelUntil: number;
  /** "Meeting Ended" while now < endedLabelUntil, else "End Meeting". */
  endButtonLabel: "Meeting Ended" | "End Meeting";
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  /** Create (or reuse a scheduled) meeting, start it, set activeMeeting at once. */
  startMeeting: (payload: StartMeetingPayload) => Promise<ActiveMeeting>;
  /** POST /meetings/:id/end; clears activeMeeting immediately on success. */
  endMeeting: () => Promise<void>;
  /** Re-read GET /meetings/active. A failed refetch keeps the current state. */
  refetch: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextValue | undefined>(undefined);

export function useActiveMeeting(): MeetingContextValue {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error("useActiveMeeting must be used within a MeetingProvider");
  }
  return context;
}

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { role } = useEmployeeAuth();
  // Only employee/manager sessions have meetings. Admin sessions must not call
  // /meetings/active: it is employee-guarded, and a 401 would clear the admin
  // token in the shared axios interceptor.
  const isEmployeeSession = role === 'employee' || role === 'manager';

  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(null);
  const [lastEnded, setLastEnded] = useState<ActiveMeeting | null>(null);
  const [endedLabelUntil, setEndedLabelUntil] = useState(0);
  // Bumped once when the 6-second label expires, to re-render consumers.
  const [, setLabelTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The 6-second "Meeting Ended" timer lives in a ref (never state) so its
  // schedule is stable across renders; cleared on unmount and on new starts.
  const endLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEndLabel = useCallback(() => {
    if (endLabelTimerRef.current) {
      clearTimeout(endLabelTimerRef.current);
      endLabelTimerRef.current = null;
    }
    setEndedLabelUntil(0);
  }, []);

  // Unmount: drop any pending 6-second timer.
  useEffect(
    () => () => {
      if (endLabelTimerRef.current) clearTimeout(endLabelTimerRef.current);
    },
    [],
  );

  // Signed out: there cannot be an active meeting; reset local state.
  useEffect(() => {
    if (isEmployeeSession) return;
    setActiveMeeting(null);
    setLastEnded(null);
    clearEndLabel();
    setLoading(false);
  }, [isEmployeeSession, clearEndLabel]);

  const refetch = useCallback(async () => {
    if (!isEmployeeSession) return;
    try {
      const res = await employeeApi.get<{ meeting: ActiveMeeting | null }>(
        "/meetings/active",
      );
      const meeting = res.data?.meeting ?? null;
      const active = meeting && meeting.status === "active" ? meeting : null;
      setActiveMeeting(active);
      // A live meeting supersedes the "Meeting Ended" label window.
      if (active) clearEndLabel();
    } catch {
      // Refetch failed: keep the current state; never null it out here.
    } finally {
      setLoading(false);
    }
  }, [isEmployeeSession, clearEndLabel]);

  // Load on mount...
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // ...and re-read the server whenever the tab regains focus (another
  // tab/device may have started or ended the meeting meanwhile).
  useEffect(() => {
    if (!isEmployeeSession) return;
    const onFocus = () => {
      void refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isEmployeeSession, refetch]);

  const startMeeting = useCallback(
    async (payload: StartMeetingPayload) => {
      setError(null);
      // A new meeting cancels the 6-second "Meeting Ended" label.
      clearEndLabel();

      const title = payload.title.trim();
      const start = payload.startTime;
      try {
        // Reuse an already-scheduled meeting with the same title if one exists.
        const existingRes = await employeeApi.get<{ meetings: ActiveMeeting[] }>(
          "/meetings?upcoming=true",
        );
        const existing = existingRes.data.meetings?.find(
          (m) => m.status === "scheduled" && m.title === title,
        );

        let meetingId: string;
        if (existing) {
          meetingId = existing._id;
        } else {
          const createRes = await employeeApi.post<{ meeting: ActiveMeeting }>(
            "/meetings",
            {
              title,
              meetingLink: payload.meetingLink || undefined,
              participants: payload.participants,
              startTime: start.toISOString(),
              endTime: new Date(
                start.getTime() + payload.durationMin * 60000,
              ).toISOString(),
              durationMin: payload.durationMin,
            },
          );
          meetingId = createRes.data.meeting._id;
        }

        const startRes = await employeeApi.post<{ meeting: ActiveMeeting }>(
          `/meetings/${meetingId}/start`,
        );
        const meeting = startRes.data.meeting;
        setActiveMeeting(
          meeting && meeting.status === "active" ? meeting : null,
        );
        setLastEnded(null);
        return meeting;
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Could not start the meeting.";
        setError(msg);
        throw err;
      }
    },
    [clearEndLabel],
  );

  const endMeeting = useCallback(async () => {
    if (!activeMeeting) return;
    setError(null);
    try {
      const res = await employeeApi.post<{ meeting?: ActiveMeeting }>(
        `/meetings/${activeMeeting._id}/end`,
      );
      const ended: ActiveMeeting = res.data?.meeting ?? {
        ...activeMeeting,
        status: "ended" as const,
        actualEndedAt: new Date().toISOString(),
      };
      // Reset everything that depends on the live meeting immediately so the
      // Today's button and the modal Start button flip without a refetch.
      setActiveMeeting(null);
      setLastEnded(ended);
      setEndedLabelUntil(Date.now() + END_LABEL_MS);
      // One small timeout: when the 6 seconds finish, re-render so the label
      // flips back to "End Meeting" (which stays disabled — no active meeting).
      if (endLabelTimerRef.current) clearTimeout(endLabelTimerRef.current);
      endLabelTimerRef.current = setTimeout(() => {
        endLabelTimerRef.current = null;
        setLabelTick((tick) => tick + 1);
      }, END_LABEL_MS);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not end the meeting.";
      setError(msg);
      throw err;
    }
  }, [activeMeeting]);

  const endButtonLabel: "Meeting Ended" | "End Meeting" =
    endedLabelUntil > 0 && Date.now() < endedLabelUntil
      ? "Meeting Ended"
      : "End Meeting";

  const value = useMemo<MeetingContextValue>(
    () => ({
      activeMeeting,
      lastEnded,
      endedLabelUntil,
      endButtonLabel,
      loading,
      error,
      setError,
      startMeeting,
      endMeeting,
      refetch,
    }),
    [
      activeMeeting,
      lastEnded,
      endedLabelUntil,
      endButtonLabel,
      loading,
      error,
      startMeeting,
      endMeeting,
      refetch,
    ],
  );

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
};
