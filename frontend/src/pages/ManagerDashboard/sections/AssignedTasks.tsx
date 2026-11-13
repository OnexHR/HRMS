import React from "react";
import Sidebar from "./../components/Sidebar";
import Header from "./../components/Header";
import CalendarWidget from "../components/CalendarWidget";
import AvailableEmployees from "../components/Availableemployees";
import TaskSummary from "../components/Tasksummary";
import AssignTaskForm from "../components/Assigntaskform";
import AllTasksTable from "../components/Alltaskstable";
import employeeApi from "../../../lib/employeeApi";
import type { Task, TaskSummary as TaskSummaryType } from "../../../types/Employee";

type CalendarEvent = {
  id: string;
  title: string;
  type: "task" | "meeting" | "query";
  date: string;
  status?: string;
};

const AssignedTasks: React.FC = () => {
  const [members, setMembers] = React.useState<Array<{ _id: string; firstName: string; lastName: string; employeeCode?: string; department?: string }>>([]);
  const [taskSummary, setTaskSummary] = React.useState<TaskSummaryType | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCalendarEvents = React.useCallback(async (month?: string) => {
    const res = await employeeApi.get<{ events: CalendarEvent[] }>('/calendar/events', {
      params: month ? { month } : {},
    });
    setEvents(res.data.events ?? []);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setError(null);
      const [teamRes, summaryRes, tasksRes] = await Promise.all([
        employeeApi.get<{ members: Array<{ _id: string; firstName: string; lastName: string; employeeCode?: string; department?: string }> }>('/team'),
        employeeApi.get<TaskSummaryType>('/tasks/team/summary'),
        employeeApi.get<{ tasks: Task[] }>('/tasks/team'),
      ]);
      setMembers(teamRes.data.members ?? []);
      setTaskSummary(summaryRes.data ?? null);
      setTasks(tasksRes.data.tasks ?? []);
      await fetchCalendarEvents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load assigned tasks.');
    } finally {
      setLoading(false);
    }
  }, [fetchCalendarEvents]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar active="assigned-tasks" />

      <main className="ml-60">
        <Header />

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <CalendarWidget events={events} onMonthChange={fetchCalendarEvents} />
            <AvailableEmployees members={members} loading={loading} />
          </div>

          <TaskSummary summary={taskSummary} loading={loading} />

          <AssignTaskForm members={members} onCreated={fetchData} />

          <AllTasksTable tasks={tasks} loading={loading} />
        </div>
      </main>
    </div>
  );
};

export default AssignedTasks;
