import Meeting from "../../models/employee/Meeting.js";
import Task from "../../models/employee/Task.js";
import EmployeeQuery from "../../models/employee/EmployeeQuery.js";
import Employee from "../../models/employee/Employee.js";
import { badRequest, conflict } from "../../validators/employee/util.validator.js";

function dayKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generates a Google Meet-style URL (abc-defg-hij) as a placeholder join link.
// This is the URL format only; provisioning a real Meet room requires Google
// integration, so this is used when the organizer does not supply their own.
export function generateMeetUrl() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const group = (length) =>
    Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `https://meet.google.com/${group(3)}-${group(4)}-${group(3)}`.toLowerCase();
}

export function normalizeMeetingLink(value) {
  const link = typeof value === "string" ? value.trim() : "";
  if (!link) return { value: null };
  let url;
  try {
    url = new URL(link);
  } catch {
    return { error: "Meeting link must be a valid URL." };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { error: "Meeting link must start with http or https." };
  }
  return { value: url.toString() };
}

// Returns the IDs of employees who currently have an active meeting.
// Single query: status "active" + participants in the given list.
export async function activeMeetingParticipantIds(employeeIds) {
  if (!employeeIds || employeeIds.length === 0) return new Set();
  const active = await Meeting.find({
    status: "active",
    participants: { $in: employeeIds },
  }).select("participants").lean();
  const ids = new Set();
  for (const meeting of active) {
    for (const pid of meeting.participants) ids.add(String(pid));
  }
  return ids;
}

// Builds an availability map: employeeId -> { status: "available" | "unavailable", expectedEndAt }
export async function availabilityMapFor(employeeIds) {
  const map = {};
  if (!employeeIds || employeeIds.length === 0) return map;
  for (const id of employeeIds) map[id] = { status: "available", expectedEndAt: null };
  const active = await Meeting.find({
    status: "active",
    participants: { $in: employeeIds },
  }).select("participants expectedEndAt").lean();
  for (const meeting of active) {
    for (const pid of meeting.participants) {
      const key = String(pid);
      if (key in map) {
        map[key] = { status: "unavailable", expectedEndAt: meeting.expectedEndAt };
      }
    }
  }
  return map;
}

export const handleMyMeetings = async (req, res) => {
  try {
    const { upcoming } = req.query;
    const filter = {
      participants: req.employee._id,
      ...(upcoming === "true"
        ? { status: { $in: ["scheduled", "active"] }, endTime: { $gte: new Date() } }
        : {}),
    };
    const meetings = await Meeting.find(filter)
      .populate("organizer", "firstName lastName employeeCode")
      .populate("participants", "firstName lastName employeeCode")
      .sort({ startTime: 1 })
      .lean();
    return res.status(200).json({ meetings });
  } catch (error) {
    console.error("My meetings error:", error);
    return res.status(500).json({ message: "Could not load meetings." });
  }
};

export const handleGetActiveMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      organizer: req.employee._id,
      status: "active",
    })
      .populate("organizer", "firstName lastName employeeCode")
      .populate("participants", "firstName lastName employeeCode")
      .lean();
    return res.status(200).json({ meeting: meeting ?? null });
  } catch (error) {
    console.error("Get active meeting error:", error);
    return res.status(500).json({ message: "Could not load active meeting." });
  }
};

export const handleStartMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) throw badRequest("Meeting not found.");
    if (String(meeting.organizer._id) !== String(req.employee._id)) {
      throw badRequest("Only the meeting organizer can start this meeting.");
    }
    if (meeting.status === "active") {
      return res.status(200).json({ meeting });
    }
    if (meeting.status === "ended" || meeting.status === "cancelled") {
      throw badRequest("This meeting has already ended.");
    }

    // Block if the organizer already has another active meeting.
    const existingActive = await Meeting.findOne({
      organizer: req.employee._id,
      status: "active",
      _id: { $ne: meeting._id },
    });
    if (existingActive) {
      throw conflict("You already have an active meeting. End it before starting another.");
    }

    const now = new Date();
    meeting.status = "active";
    meeting.actualStartedAt = now;
    meeting.expectedDuration = meeting.durationMin || 0;
    meeting.expectedEndAt = new Date(now.getTime() + (meeting.durationMin || 0) * 60000);
    await meeting.save();
    return res.status(200).json({ meeting });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Start meeting error:", error);
    return res.status(500).json({ message: "Could not start meeting." });
  }
};

export const handleEndMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) throw badRequest("Meeting not found.");
    if (String(meeting.organizer._id) !== String(req.employee._id)) {
      throw badRequest("Only the meeting organizer can end this meeting.");
    }
    if (meeting.status !== "active") {
      throw badRequest("This meeting is not active.");
    }

    const now = new Date();
    meeting.status = "ended";
    meeting.actualEndedAt = now;
    meeting.actualDuration = Math.max(0, Math.round((now.getTime() - meeting.actualStartedAt.getTime()) / 1000));
    await meeting.save();
    return res.status(200).json({ meeting });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("End meeting error:", error);
    return res.status(500).json({ message: "Could not end meeting." });
  }
};

export const handleCalendarEvents = async (req, res) => {
  try {
    const monthParam = req.query.month ? String(req.query.month) : "";
    const baseDate = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? new Date(`${monthParam}-01T00:00:00`)
      : new Date();

    const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    let taskFilter = { assignedTo: req.employee._id };
    let queryFilter = { employee: req.employee._id };

    if (req.employee.role === "manager") {
      const team = await Employee.find({ manager: req.employee._id, "job.isActive": true }).select("_id").lean();
      const ids = team.map((member) => member._id);
      taskFilter = ids.length ? {
        assignedBy: req.employee._id,
        dueDate: { $gte: monthStart, $lt: monthEnd },
      } : { assignedBy: req.employee._id, dueDate: { $lt: new Date(0) } };
      queryFilter = ids.length ? {
        employee: { $in: ids },
        createdAt: { $gte: monthStart, $lt: monthEnd },
      } : { employee: { $in: [] } };
    } else {
      taskFilter = {
        assignedTo: req.employee._id,
        dueDate: { $gte: monthStart, $lt: monthEnd },
      };
      queryFilter = {
        employee: req.employee._id,
        createdAt: { $gte: monthStart, $lt: monthEnd },
      };
    }

    const [meetings, tasks, queries] = await Promise.all([
      Meeting.find({ participants: req.employee._id, startTime: { $gte: monthStart, $lt: monthEnd } })
        .select("title startTime status")
        .sort({ startTime: 1 })
        .lean(),
      Task.find(taskFilter)
        .select("title dueDate status")
        .sort({ dueDate: 1 })
        .lean(),
      EmployeeQuery.find(queryFilter)
        .select("message status createdAt")
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    const events = [
      ...meetings.map((meeting) => ({
        id: String(meeting._id),
        type: "meeting",
        title: meeting.title,
        date: dayKey(meeting.startTime),
        status: meeting.status,
      })),
      ...tasks
        .filter((task) => task.dueDate)
        .map((task) => ({
          id: String(task._id),
          type: "task",
          title: task.title,
          date: dayKey(task.dueDate),
          status: task.status,
        })),
      ...queries.map((query) => ({
        id: String(query._id),
        type: "query",
        title: query.message.length > 40 ? `${query.message.slice(0, 37)}...` : query.message,
        date: dayKey(query.createdAt),
        status: query.status,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Calendar events error:", error);
    return res.status(500).json({ message: "Could not load calendar events." });
  }
};

// Who an employee may invite: their own teammates plus their manager. The
// manager-only /team/available hands back the whole company directory, which is
// more than an employee needs and more than they should be handed.
export const handleListColleagues = async (req, res) => {
  try {
    const self = req.employee;
    const filter = { "job.isActive": true };

    if (self.manager) {
      filter.$or = [{ manager: self.manager }, { _id: self.manager }];
    } else {
      // No manager on file, so there is no team to scope to.
      filter._id = { $ne: self._id };
    }

    const colleagues = await Employee.find(filter)
      .select("firstName lastName employeeCode department designation role manager")
      .sort({ firstName: 1 })
      .lean();

    const ids = colleagues.map((c) => String(c._id));
    const availability = await availabilityMapFor(ids);

    return res.status(200).json({
      colleagues: colleagues
        .filter((person) => String(person._id) !== String(self._id))
        .map((person) => ({
          ...person,
          isManager: String(person._id) === String(self.manager),
          availability: availability[String(person._id)] ?? { status: "available", expectedEndAt: null },
        })),
    });
  } catch (error) {
    console.error("List colleagues error:", error);
    return res.status(500).json({ message: "Could not load colleagues." });
  }
};

export const handleCreateMeeting = async (req, res) => {
  try {
    const { title, participants = [], startTime, endTime, durationMin } = req.body || {};
    if (!title || !startTime) throw badRequest("title and startTime are required.");

    const { value: meetingLink, error: linkError } = normalizeMeetingLink(req.body?.meetingLink);
    if (linkError) throw badRequest(linkError);

    const participantsList = [...new Set([String(req.employee._id), ...participants.map(String)])];

    // Block scheduling with employees who currently have an active meeting.
    const activeIds = await activeMeetingParticipantIds(participantsList);
    if (activeIds.size > 0) {
      const busyNames = await Employee.find({ _id: { $in: [...activeIds] } })
        .select("firstName lastName")
        .lean();
      const names = busyNames.map((e) => `${e.firstName} ${e.lastName}`).join(", ");
      throw conflict(`Cannot schedule: ${names} currently has an active meeting.`);
    }

    const start = new Date(startTime);
    const dur = Number(durationMin) || 0;
    const meeting = await Meeting.create({
      organizer: req.employee._id,
      title: String(title).trim(),
      meetingLink: meetingLink || generateMeetUrl(),
      participants: participantsList,
      startTime: start,
      endTime: endTime ? new Date(endTime) : null,
      durationMin: dur,
      expectedDuration: dur,
      expectedEndAt: dur > 0 ? new Date(start.getTime() + dur * 60000) : null,
      status: "scheduled",
    });
    return res.status(201).json({ meeting });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Create meeting error:", error);
    return res.status(500).json({ message: "Could not create meeting." });
  }
};
