// src/admin/pages/Dashboard.js - Updated with Project Time & Cost Chart

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchEmployees } from "../store/slices/employeeSlice";
import { fetchProjects } from "../store/slices/projectSlice";
import {
  fetchDashboard,
  fetchProjectTimeCost,
  fetchMonthlyHoursByProject,
  fetchEmployeeDetails,
  clearMonthlyHours,
  clearProjectTimeCost,
} from "../store/slices/dashboardSlice";
import { fetchAssignments } from "../store/slices/projectAssignmentSlice";
import { StatsCard } from "../components/dashboard/StatsCard";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import { showToast } from "../../components/common/Toast";
import { ProjectAllocationChart } from "../components/dashboard/ProjectAllocationChart";
import { ProjectHoursChart } from "../components/dashboard/ProjectHoursChart";
import { WeeklyAttendanceChart } from "../components/dashboard/WeeklyAttendanceChart";
import { TodayStatusChart } from "../components/dashboard/TodayStatsChart";
import { AvgPunchTimeCard } from "../components/dashboard/AvgPunchTimeCrd";
import { RecentPunchesList } from "../components/dashboard/RecentPunchesList";
import { PunchDistributionChart } from "../components/dashboard/PunchDistributionChart";
import { ProjectHoursModal } from "../components/dashboard/ProjectHoursModal";
import { ProjectTimeCostChart } from "../components/dashboard/ProjectTimeCostChart";

// ─── COLOR PALETTE ──────────────────────────────────────────────────────
export const COLORS = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  yellow: "#eda100",
  violet: "#4a3aa7",
  red: "#e34948",
  green: "#008300",
  orange: "#f97316",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
};

export const STATUS_COLORS = {
  "On time": "#2a78d6",
  Late: "#eda100",
  Absent: "#e34948",
  WFH: "#1baf7a",
  Leave: "#4a3aa7",
};

export const CHART_COLORS = [
  "#2a78d6",
  "#1baf7a",
  "#eda100",
  "#e34948",
  "#4a3aa7",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────
const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getStatusBadge = (status) => {
  const statusMap = {
    on_time: { label: "On time", className: "badge-success" },
    "on-time": { label: "On time", className: "badge-success" },
    ontime: { label: "On time", className: "badge-success" },
    late: { label: "Late", className: "badge-warn" },
    absent: { label: "Absent", className: "badge-danger" },
    wfh: { label: "WFH", className: "badge-blue" },
    leave: { label: "Leave", className: "badge-violet" },
  };
  return statusMap[status] || { label: status, className: "badge-gray" };
};

export const formatDateDisplay = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { employees } = useSelector((state) => state.employees);
  const { user } = useSelector((state) => state.auth);
  const { stats, charts, loading } = useSelector(
    (state) => state.dashboard,
  );
  const { projectTimeCost } = useSelector((state) => state.dashboard);
  const { projects, loading: projectsLoading } = useSelector(
    (state) => state.projects || { projects: [], loading: false },
  );
  const { assignments } = useSelector(
    (state) => state.projectAssignments || { assignments: [], loading: false },
  );

  const [showProjectHoursModal, setShowProjectHoursModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [modalMonth, setModalMonth] = useState(new Date().getMonth() + 1);
  const [modalYear, setModalYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const userType = user?.type || "admin";
  const basePath = userType === "admin" ? "/admin" : "/employee";

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchProjects());
    dispatch(fetchAssignments());
    dispatch(fetchEmployees());
    // Fetch project time & cost report for current month
    dispatch(fetchProjectTimeCost({ month: reportMonth, year: reportYear }));
  }, [dispatch, reportMonth, reportYear]);

  const totalEmployees = employees?.length || 0;
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const totalAssignments = assignments.length;
  const totalTaggedEmployees = assignments.reduce(
    (sum, a) => sum + (a.projectIds?.length || 0),
    0,
  );

  const todayStatus = charts?.today_status || {};
  const onTimeCount = todayStatus["On time"] || 0;
  const lateCount = todayStatus.Late || 0;
  const absentCount = todayStatus.Absent || 0;
  const wfhCount = todayStatus.WFH || 0;
  const leaveCount = todayStatus.Leave || 0;
  
  const punchedInToday = todayStatus.punched_in || (onTimeCount + lateCount);
  const totalPresent = onTimeCount + lateCount;
  const attendanceRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

  const lateArrivals = lateCount;
  const absentToday = absentCount;

  const projectStats = charts?.project_stats || {};
  const totalProjects = projectStats.total_projects || projects.length;
  const activeProjectsCount = projectStats.active_projects || activeProjects;
  const totalAssignmentsCount = projectStats.total_assignments || totalAssignments;
  const employeesAssigned = projectStats.employees_assigned || totalTaggedEmployees;

  const allocationData = charts?.project_allocation || [];
  const hoursData = charts?.project_hours || [];
  const timeCostData = charts?.project_time_cost || projectTimeCost?.data?.projects || [];

  const handleNavigate = (route) => {
    navigate(`${basePath}${route}`);
  };

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const projectData = data.activePayload[0].payload;
      const projectName =
        projectData.fullName || projectData.name || projectData.displayName;
      const matchedProject = projects.find((p) => p.name === projectName);
      const projectId =
        matchedProject?.id || projectData.id || projectData.projectId || projectData.project_id;

      if (projectId) {
        setSelectedProject({
          id: projectId,
          name: projectName,
          projectId: projectId,
        });
        setModalMonth(new Date().getMonth() + 1);
        setModalYear(new Date().getFullYear());
        setShowProjectHoursModal(true);
      } else {
        showToast("Project ID not found", "error");
      }
    }
  };

  const handleProjectTimeCostClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const projectData = data.activePayload[0].payload;
      const projectName = projectData.fullName || projectData.name;
      const matchedProject = projects.find((p) => p.name === projectName);
      const projectId = matchedProject?.id || projectData.projectId || projectData.project_id;

      if (projectId) {
        setSelectedProject({
          id: projectId,
          name: projectName,
          projectId: projectId,
        });
        setModalMonth(new Date().getMonth() + 1);
        setModalYear(new Date().getFullYear());
        setShowProjectHoursModal(true);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <WelcomeBanner
        stats={{
          punchedInToday: punchedInToday,
          attendanceRate: attendanceRate,
          late: lateCount,
          totalEmployees: totalEmployees,
          absent: absentCount,
        }}
        user={user}
      />

      {/* ─── ROW 1: Overview (8 cards in a single row) ────────────────────── */}
      <div className="section-label text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
        Overview
      </div>
      <div className="stats-grid grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 mb-6">
        <StatsCard
          title="Total Employees"
          value={totalEmployees}
          icon="fas fa-users"
          color="green"
          route="/employees"
          onClick={() => handleNavigate("/employees")}
        />
        <StatsCard
          title="Punched In Today"
          value={punchedInToday}
          icon="fas fa-fingerprint"
          color="blue"
          route="/attendances"
          onClick={() => handleNavigate("/attendances")}
        />
        <StatsCard
          title="Late Arrivals"
          value={lateArrivals}
          icon="fas fa-clock"
          color="amber"
          route="/attendances"
          onClick={() => handleNavigate("/attendances")}
        />
        <StatsCard
          title="Absent Today"
          value={absentToday}
          icon="fas fa-user-slash"
          color="red"
          route="/attendances"
          onClick={() => handleNavigate("/attendances")}
        />
        <StatsCard
          title="Total Projects"
          value={totalProjects}
          icon="fas fa-project-diagram"
          color="purple"
          route="/projects"
          onClick={() => handleNavigate("/projects")}
        />
        <StatsCard
          title="Active Projects"
          value={activeProjectsCount}
          icon="fas fa-play-circle"
          color="green"
          route="/projects"
          onClick={() => handleNavigate("/projects")}
        />
        <StatsCard
          title="Total Assignments"
          value={totalAssignmentsCount}
          icon="fas fa-link"
          color="orange"
          route="/project-assignments"
          onClick={() => handleNavigate("/project-assignments")}
        />
        <StatsCard
          title="Employees Assigned"
          value={employeesAssigned}
          icon="fas fa-user-check"
          color="blue"
          route="/project-assignments"
          onClick={() => handleNavigate("/project-assignments")}
        />
      </div>

      {/* ─── ROW 3: Project Allocation & Hours ────────────────────────── */}
      <div className="section-label text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
        Project Allocation & Hours
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ProjectAllocationChart data={allocationData} />
        <ProjectHoursChart data={hoursData} onBarClick={handleBarClick} />
      </div>

      {/* ─── ROW 3.5: Project Time & Cost ─────────────────────────────── */}
      <div className="section-label text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
        Project Time & Cost Report
      </div>
      <div className="mb-6">
        <ProjectTimeCostChart
          data={timeCostData}
          onBarClick={handleProjectTimeCostClick}
          loading={projectTimeCost?.loading}
        />
      </div>

      {/* ─── ROW 4: Attendance Analytics (3 equal height cards) ────────── */}
      <div className="section-label text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
        Attendance Analytics
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="h-[220px]">
          <WeeklyAttendanceChart data={charts?.weekly_attendance} />
        </div>
        <div className="h-[220px]">
          <TodayStatusChart data={charts?.today_status} />
        </div>
        <div className="h-[220px]">
          <AvgPunchTimeCard data={charts?.avg_punch_time} />
        </div>
      </div>

      {/* ─── ROW 5: Today's Punch-in Activity ──────────────────────────── */}
      <div className="section-label text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-4 mb-2">
        Today's Punch-in Activity
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RecentPunchesList
          punches={charts?.recent_punches || []}
          employees={employees}
        />
        <PunchDistributionChart data={charts?.punch_distribution || []} />
      </div>

      {/* ─── PROJECT HOURS DETAIL MODAL ───────────────────────────────── */}
      <ProjectHoursModal
        isOpen={showProjectHoursModal}
        onClose={() => {
          setShowProjectHoursModal(false);
          setSelectedProject(null);
          dispatch(clearMonthlyHours());
        }}
        project={selectedProject}
        month={modalMonth}
        year={modalYear}
        employees={employees}
      />
    </div>
  );
};

export default Dashboard;