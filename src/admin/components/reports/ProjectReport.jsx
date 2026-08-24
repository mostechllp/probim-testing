// src/admin/pages/reports/ProjectReport.js

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SearchBar from "../common/SearchBar";
import EntriesSelector from "../common/EntriesSelector";
import { showToast } from "../../../components/common/Toast";
import Pagination from "../common/Paginations";
import { fetchProjectReport, exportReport } from "../../store/slices/reportSlice";
import { clearMonthlyHours } from "../../store/slices/dashboardSlice";
import { ProjectHoursModal } from "../../components/dashboard/ProjectHoursModal";
import ExportModal from "../../../components/common/ExportModal";
import DateInput from "../common/DateInput";

// Blue gradient shades for chart
const BLUE_GRADIENT = [
  "#1a56db",
  "#2563eb", 
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
];

const ProjectReport = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  // Determine base path based on current route
  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/employee')) return '/employee';
    return '';
  };
  const basePath = getBasePath();

  const { 
    projectReportRecords = [], 
    projectReportLoading: loading = false,
    projectReportTotalCount: totalCount = 0,
    projectReportLastPage: lastPage = 1,
  } = useSelector((state) => state.reports || {});
  const { employees = [] } = useSelector((state) => state.employees || {});
  const { exportLoading } = useSelector((state) => state.reports || {});

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("");
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [appliedStartDate, setAppliedStartDate] = useState(startDate);
  const [appliedEndDate, setAppliedEndDate] = useState(endDate);

  // Modal states
  const [showProjectHoursModal, setShowProjectHoursModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [modalMonth, setModalMonth] = useState(new Date().getMonth() + 1);
  const [modalYear, setModalYear] = useState(new Date().getFullYear());

  // Fetch project report data
  useEffect(() => {
    const fetchData = async () => {
      const params = {
        page: currentPage,
        per_page: perPage,
        search: appliedSearchTerm || undefined,
        start_date: appliedStartDate,
        end_date: appliedEndDate,
        status: appliedStatus,
      };

      await dispatch(fetchProjectReport(params));
    };
    fetchData();
  }, [dispatch, currentPage, perPage, appliedSearchTerm, appliedStartDate, appliedEndDate, appliedStatus]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedSearchTerm, appliedStatus, selectedCompany, perPage, appliedStartDate, appliedEndDate]);

  // Transform project data with hours from API
  const transformProject = (project) => {
    return {
      id: project.id || project.project_id,
      name: project.name || project.project_name || "Unnamed Project",
      status: project.status || "Active",
      company_name: project.company_name || "-", 
      totalHours: project.total_hours || project.totalHours || 0,
      totalEmployees: project.employee_count || project.total_employees || project.totalEmployees || 0,
      plannedTotalCost: project.planned_total_cost || project.plannedTotalCost || 0,
      actualCost: project.actual_cost || project.actualCost || 0,
      hoursByEmployee: project.employees || project.hoursByEmployee || [],
      originalData: project,
      raw: project,
    };
  };

  // Safely transform projects
  const transformedProjects = Array.isArray(projectReportRecords)
    ? projectReportRecords.map(transformProject)
    : [];

  const pageProjects = transformedProjects;
  const totalFiltered = totalCount;
  const totalPages = lastPage || Math.ceil(totalFiltered / perPage);
  const start = (currentPage - 1) * perPage;

  // Calculate statistics
  const totalProjects = transformedProjects.length;
  const activeProjects = transformedProjects.filter(p => p.status === "Active" || p.status === "active").length;
  const inactiveProjects = transformedProjects.filter(p => p.status === "Inactive" || p.status === "inactive" || (p.status !== "Active" && p.status !== "active")).length;
  const totalHoursAllProjects = transformedProjects.reduce((sum, p) => sum + (p.totalHours || 0), 0);
  const projectsWithHours = transformedProjects.filter(p => (p.totalHours || 0) > 0).length;
  // Calculate total actual cost across all projects
  const totalActualCost = transformedProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0);

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase() || '';
    
    if (normalizedStatus === 'active') {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    } else if (normalizedStatus === 'inactive') {
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    } else if (normalizedStatus === 'completed') {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    } else if (normalizedStatus === 'archived') {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const handleApplyFilters = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedStatus(selectedStatus);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCompany("");
    setSelectedStatus("all");
    setAppliedStatus("all");
    setSearchTerm("");
    setAppliedSearchTerm("");
    
    const initialStart = new Date();
    initialStart.setDate(1);
    const startStr = initialStart.toISOString().split("T")[0];
    const endStr = new Date().toISOString().split("T")[0];
    
    setStartDate(startStr);
    setEndDate(endStr);
    setAppliedStartDate(startStr);
    setAppliedEndDate(endStr);
    
    setCurrentPage(1);
    showToast("Filters reset successfully", "success");
  };

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const projectData = data.activePayload[0].payload;
      const projectId = projectData.id || projectData.projectId;
      
      if (projectId) {
        setSelectedProject({
          id: projectId,
          name: projectData.name,
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

  // Prepare chart data
  const chartData = transformedProjects
    .filter(p => (p.totalHours || 0) > 0)
    .sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
    .slice(0, 10)
    .map(p => ({
      name: p.name || "Unnamed",
      hours: Math.round(p.totalHours || 0),
      fullName: p.name || "Unnamed",
      id: p.id,
      projectId: p.id,
    }));

  // ─── HANDLE EXPORT USING BACKEND API ──────────────────────────────────
  const handleExport = async (format) => {
    try {
      const filters = {
        start_date: appliedStartDate,
        end_date: appliedEndDate,
        status: appliedStatus !== "all" ? appliedStatus : undefined,
        search: appliedSearchTerm || undefined,
      };

      // Dispatch the export action
      await dispatch(exportReport({
        reportType: 'project',
        format: format,
        filters: filters,
      })).unwrap();

      showToast(`Project report exported successfully as ${format.toUpperCase()}`, "success");
    } catch (error) {
      console.error("Export error:", error);
      showToast(error || "Failed to export report", "error");
    }
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0) return "0h";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "0.00";
    return amount.toFixed(2);
  };

  // SVG Gradient for chart
  const gradientId = "hoursBlueGradient";

  return (
    <div className="w-full overflow-x-hidden">
      <main className="content px-4 py-4 md:px-6 md:py-6 w-full overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
            <Link
              to={`${basePath}/reports`}
              className="text-green-500 hover:text-green-600 font-medium"
            >
              Reports
            </Link>
            <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
            <span className="text-gray-500">Project Report</span>
          </div>
          <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-indigo-600 bg-clip-text text-transparent">
            Project Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed project information including hours worked and employee assignments
          </p>
        </div>

        {/* Stats Cards - Updated */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Projects</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {totalProjects}
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-project-diagram text-indigo-600 dark:text-indigo-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Projects</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {activeProjects}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-play-circle text-green-600 dark:text-green-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Hours</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatHours(totalHoursAllProjects)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-blue-600 dark:text-blue-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Projects with Hours</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {projectsWithHours}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-bar text-amber-600 dark:text-amber-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Actual Cost</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalActualCost)}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-money-bill-wave text-purple-600 dark:text-purple-400"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-circle mr-1"></i> Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Date Filters */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-calendar-alt mr-1"></i> START
              </label>
              <DateInput
                value={startDate}
                onChange={(date) => setStartDate(date)}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-calendar-alt mr-1"></i> END
              </label>
              <DateInput
                value={endDate}
                onChange={(date) => setEndDate(date)}
                placeholder="dd/mm/yyyy"
              />
            </div>

            {/* Filter Actions */}
            <div className="flex items-end gap-2 lg:col-span-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm flex items-center gap-2 transition-all"
              >
                <i className="fas fa-check"></i> Apply
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                <i className="fas fa-undo-alt"></i> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
          <EntriesSelector
            value={perPage}
            onChange={(val) => {
              setPerPage(val);
              setCurrentPage(1);
            }}
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by project name, ID..."
            />
            <button
              onClick={() => setShowExportModal(true)}
              disabled={exportLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="fas fa-download"></i> Export Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
          <div className="min-w-[900px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">S.No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Project Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Total Hours</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Employees</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Estimated Cost</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Actual Cost</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && pageProjects.length > 0 ? (
                  pageProjects.map((project, idx) => (
                    <tr
                      key={project.id || idx}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                        {start + idx + 1}
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {project.name || "Unnamed"}
                      </td>
                      <td className="px-3 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                        {formatHours(project.totalHours)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full">
                          <i className="fas fa-user text-indigo-500 text-xs"></i>
                          {project.totalEmployees || 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                        {project.plannedTotalCost ? `${formatCurrency(project.plannedTotalCost)}` : "-"}
                      </td>
                      <td className="px-3 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                        {project.actualCost ? `${formatCurrency(project.actualCost)}` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                          {project.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => {
                            setSelectedProject({
                              id: project.id,
                              name: project.name,
                              projectId: project.id,
                            });
                            setModalMonth(new Date().getMonth() + 1);
                            setModalYear(new Date().getFullYear());
                            setShowProjectHoursModal(true);
                          }}
                          className="text-indigo-500 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          <i className="fas fa-users"></i>
                          View Employees
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {loading ? "Loading projects..." : "No projects found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalFiltered > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalFiltered}
            itemsPerPage={perPage}
          />
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        title="Export Project Report"
        subtitle="Download project data with hours and employee information"
        totalRecords={transformedProjects.length}
        formats={["csv", "pdf"]}
        defaultFormat="csv"
        loading={exportLoading}
      />

      {/* Project Hours Modal */}
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

export default ProjectReport;