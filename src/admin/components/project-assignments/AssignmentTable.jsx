import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PROJECT_MODULE_NAME } from "../../utils/constants";
import ProjectTags from "./ProjectTags";
import EmptyState from "../projects/EmptyState";
import { getPhotoUrl, getFallbackAvatar } from "../../../utils/imageHelper";
import { fetchEmployeeProjectWorkingTime } from "../../store/slices/projectAssignmentSlice";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

/* ─── EmployeeProjectsModal ─── */
const EmployeeProjectsModal = ({
  isOpen,
  onClose,
  employeeName,
  employeeCode = "",
  designation = "-",
  department = "-",
  avatar = null,
  userId = null,
  projectIds = [],
  projectsWithDetails = [],
  employees = [],
}) => {
  const dispatch = useDispatch();
  const { employeeWorkingTime, loading: workingTimeLoading } = useSelector(
    (state) =>
      state.projectAssignments || { employeeWorkingTime: {}, loading: false },
  );

  const { user } = useSelector((state) => state.auth);
  const userRole = user?.type || "admin";
  const basePath = userRole === "admin" ? "/admin" : "/employee";

  const [workingTimeData, setWorkingTimeData] = useState(null);
  const [isLoadingTime, setIsLoadingTime] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isWorkingTimeModalOpen, setIsWorkingTimeModalOpen] = useState(false);

  // Fetch working time when modal opens
  useEffect(() => {
    if (isOpen && userId && !hasFetched) {
      // Check if we already have the data in Redux
      if (employeeWorkingTime && employeeWorkingTime[userId]) {
        setWorkingTimeData(employeeWorkingTime[userId]);
        setHasFetched(true);
        return;
      }

      // Fetch working time
      const fetchWorkingTime = async () => {
        setIsLoadingTime(true);
        try {
          const result = await dispatch(
            fetchEmployeeProjectWorkingTime(userId),
          ).unwrap();
          setWorkingTimeData(result.data);
          setHasFetched(true);
        } catch (error) {
          console.error("Failed to fetch working time:", error);
        } finally {
          setIsLoadingTime(false);
        }
      };

      fetchWorkingTime();
    }
  }, [isOpen, userId, hasFetched, dispatch, employeeWorkingTime]);

  // Reset fetch state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasFetched(false);
      setWorkingTimeData(null);
    }
  }, [isOpen]);

  // Update working time data if Redux state changes
  useEffect(() => {
    if (userId && employeeWorkingTime && employeeWorkingTime[userId]) {
      setWorkingTimeData(employeeWorkingTime[userId]);
    }
  }, [userId, employeeWorkingTime]);

  if (!isOpen) return null;

  // Helper to get employee name from employee object
  const getEmployeeFullName = (emp) => {
    if (!emp) return "Not Assigned";
    if (emp.name) return emp.name;
    if (emp.first_name || emp.last_name) {
      return (
        `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
        "Not Assigned"
      );
    }
    if (emp.user?.username) return emp.user.username;
    return "Not Assigned";
  };

  // Helper to get employee details from various formats
  const getEmployeeDetails = (empData) => {
    if (!empData)
      return { name: "Not Assigned", avatar: null, designation: "-" };

    if (
      typeof empData === "number" ||
      (typeof empData === "string" && !isNaN(empData))
    ) {
      if (!employees || !Array.isArray(employees)) {
        return { name: "Not Assigned", avatar: null, designation: "-" };
      }
      const emp = employees.find((e) => String(e.id) === String(empData));
      if (!emp) return { name: "Not Assigned", avatar: null, designation: "-" };
      return {
        name: getEmployeeFullName(emp),
        avatar: getPhotoUrl(emp.avatar),
        designation: emp.designation || emp.user?.designation?.name || "-",
      };
    }

    if (typeof empData === "object") {
      return {
        name: getEmployeeFullName(empData),
        avatar: getPhotoUrl(empData.avatar),
        designation: empData.designation || "-",
      };
    }

    return { name: "Not Assigned", avatar: null, designation: "-" };
  };

  const getInitials = (name) =>
    name && name !== "Not Assigned" ? name.charAt(0).toUpperCase() : "N";

  // Get full details for assigned projects from projectsWithDetails
  const assignedProjects =
    projectsWithDetails && Array.isArray(projectsWithDetails)
      ? projectsWithDetails.filter((p) => projectIds.includes(String(p.id)))
      : [];


  // Helper to get working time for a project
  const getProjectWorkingTime = (projectId) => {
    if (!workingTimeData || !Array.isArray(workingTimeData)) {
      return null;
    }


    const projectTime = workingTimeData.find(
      (item) => String(item.project_id) === String(projectId),
    );

    return projectTime;
  };

  // Update the formatWorkingTime function to handle the new structure
  const formatWorkingTime = (workingTimeObj) => {
    if (!workingTimeObj) return null;

    // Use total_working_time_formatted if available
    if (workingTimeObj.total_working_time_formatted) {
      return workingTimeObj.total_working_time_formatted;
    }

    // Fallback to calculating from minutes
    const totalMinutes =
      workingTimeObj.total_working_time_minutes ||
      workingTimeObj.working_time_minutes ||
      0;

    if (totalMinutes === 0) return "0 hours 0 mins";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes} mins`;
    if (minutes === 0) return `${hours} hours`;
    return `${hours} hours ${minutes} mins`;
  };

  const handleViewWorkingTime = (project) => {
    setSelectedProject(project);
    setIsWorkingTimeModalOpen(true);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[1200] flex items-center justify-center p-4 sm:p-6 modal-overlay"
      >
        {/* Modal Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-2xl rounded-3xl w-full max-w-lg md:max-w-xl max-h-[85vh] flex flex-col overflow-hidden modal-card"
        >
          {/* Header area */}
          <div className="relative p-6 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-start bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-transparent flex-shrink-0">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-green-500/20 to-teal-500/20 dark:from-green-500/10 dark:to-teal-500/10 flex items-center justify-center border border-green-500/20 flex-shrink-0 shadow-sm">
                {avatar ? (
                  <img
                    src={getPhotoUrl(avatar)}
                    alt={employeeName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getFallbackAvatar(employeeName);
                    }}
                  />
                ) : (
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {getInitials(employeeName)}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-500/10 px-2.5 py-1 rounded-md">
                  Assigned {PROJECT_MODULE_NAME}s
                </span>
                <h3 className="text-base font-extrabold text-gray-850 dark:text-gray-100 mt-2 leading-none">
                  {employeeName}
                </h3>
                <p className="text-[10.5px] text-gray-400 dark:text-gray-500 font-semibold mt-1.5 leading-none">
                  {employeeCode} 
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors w-8 h-8 rounded-full flex items-center justify-center"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          {/* Scrollable list of assigned projects */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4.5 bg-gray-50/50 dark:bg-gray-900/10 scrollbar-thin">
            {assignedProjects.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-green-500/10 rounded-3xl flex items-center justify-center mb-4 text-green-500 animate-pulse">
                  <i className="fas fa-folder-open text-2xl"></i>
                </div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  No Assigned Projects
                </h4>
                <p className="text-xs text-gray-400 mt-2 max-w-[240px] leading-relaxed">
                  This employee is not currently mapped to any project
                  directories.
                </p>
              </div>
            ) : (
              assignedProjects.map((proj) => {
                const pm = getEmployeeDetails(proj.project_manager);
                const tl = getEmployeeDetails(proj.team_lead);
                const workingTime = getProjectWorkingTime(proj.id);
                const timeDisplay = workingTime
                  ? formatWorkingTime(workingTime)
                  : null;

                return (
                  <div
                    key={proj.id}
                    className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 space-y-4 shadow-sm hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="text-sm font-bold text-gray-850 dark:text-gray-200 leading-snug">
                        {proj.name}
                      </h4>
                      {isLoadingTime ? (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 whitespace-nowrap">
                          <i className="fas fa-spinner fa-spin"></i>
                          Loading...
                        </span>
                      ) : workingTime ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20 whitespace-nowrap">
                          <i className="fas fa-clock text-[9px]"></i>
                          {workingTime.total_working_time_formatted ||
                            formatWorkingTime(workingTime)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 whitespace-nowrap">
                          <i className="fas fa-clock"></i>
                          No time tracked
                        </span>
                      )}
                    </div>

                    {proj.project_time && (
                      <h4 className="text-sm font-bold text-gray-850 dark:text-gray-200">
                        {proj.project_time}
                      </h4>
                    )}

                    {proj.description && (
                      <p className="text-[11px] text-gray-550 dark:text-gray-450 leading-relaxed font-medium">
                        {proj.description}
                      </p>
                    )}

                    <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50">
                      {/* Project Manager info */}
                      <div className="space-y-2">
                        <span className="text-[8.5px] font-bold text-gray-405 dark:text-gray-500 uppercase tracking-widest block font-extrabold">
                          PM
                        </span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-blue-500/10 flex items-center justify-center border border-gray-100 dark:border-gray-700 flex-shrink-0">
                            {pm.avatar ? (
                              <img
                                src={pm.avatar}
                                alt={pm.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getFallbackAvatar(pm.name);
                                }}
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                {getInitials(pm.name)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300 block truncate"
                              title={pm.name}
                            >
                              {pm.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Team Lead info */}
                      <div className="space-y-2 mt-3">
                        <span className="text-[8.5px] font-bold text-gray-405 dark:text-gray-500 uppercase tracking-widest block font-extrabold">
                          TL
                        </span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-500/10 flex items-center justify-center border border-gray-100 dark:border-gray-700 flex-shrink-0">
                            {tl.avatar ? (
                              <img
                                src={tl.avatar}
                                alt={tl.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getFallbackAvatar(tl.name);
                                }}
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                {getInitials(tl.name)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className="text-[10.5px] font-bold text-gray-700 dark:text-gray-300 block truncate"
                              title={tl.name}
                            >
                              {tl.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex justify-end">
                        <Link
                          to={`${basePath}/project-working-hours`}
                          state={{
                            employeeId: userId,
                            employeeName: employeeName,
                            projectId: proj.id,
                            projectName: proj.name,
                          }}
                          className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white text-xs font-bold flex items-center gap-2 transition-all duration-200 group"
                        >
                          <i className="fas fa-chart-bar text-xs group-hover:scale-110 transition-transform"></i>
                          View Daily Hours
                          <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-gray-55 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-750 flex items-center justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-green-500 hover:bg-green-600 shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Close View
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Main Table Component ─── */
const AssignmentTable = ({
  assignments = [],
  employees = [],
  projects = [],
  loading = false,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("employeeName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Side Drawer state for single employee assignments
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEmployee, setDrawerEmployee] = useState(null);

  // Sort options for dropdown
  const sortOptions = [
    { value: "employeeName_asc", label: "Name (A-Z)" },
    { value: "employeeName_desc", label: "Name (Z-A)" },
    { value: "projectCount_asc", label: "Fewest Projects" },
    { value: "projectCount_desc", label: "Most Projects" },
  ];

  const handleSortChange = (e) => {
    const [field, direction] = e.target.value.split("_");
    setSortField(field);
    setSortDirection(direction);
  };

  // Get current sort value for dropdown
  const getCurrentSortValue = () => {
    return `${sortField}_${sortDirection}`;
  };

  // In AssignmentTable.jsx - fullAssignments mapping
  const fullAssignments = useMemo(() => {
    if (!assignments || !Array.isArray(assignments)) {
      return [];
    }

    return assignments.map((assign) => {
      // Find employee by ID (primary key)
      const emp = employees && Array.isArray(employees)
        ? employees.find((e) => Number(e.id) === Number(assign.employeeId))
        : undefined;
      
      let employeeName = emp?.name || "";
      if (!employeeName && (assign.firstName || assign.lastName)) {
        employeeName = [assign.firstName, assign.lastName]
          .filter(Boolean)
          .join(" ");
      }
      if (!employeeName && emp) {
        employeeName = [emp.first_name, emp.last_name]
          .filter(Boolean)
          .join(" ");
      }
      if (!employeeName && emp) {
        employeeName = emp.user?.username || `Employee #${emp.id}`;
      }
      if (!employeeName) employeeName = `Employee #${assign.employeeId}`;

      // IMPORTANT: Use emp?.employee_id (from the employee data) as the primary source
      // Only fallback to assign.employeeCode if emp doesn't have it
      const employeeCode = emp?.employee_id || assign.employeeCode || `EMP-${assign.employeeId}`;

      return {
        ...assign,
        employeeName,
        employeeCode, // Use the employee's employee_id
        userId: assign.userId || emp?.user_id || emp?.user?.id || null,
        designation: emp?.designation || emp?.user?.designation?.name || "-",
        department: emp?.department || emp?.user?.department?.name || "-",
        avatar: getPhotoUrl(emp?.avatar) || null,
        projectCount: assign.projectIds?.length || 0,
      };
    });
  }, [assignments, employees]);

  // Build projects with manager/team lead data from assignments
  const projectsWithDetails = useMemo(() => {
    if (!assignments || !Array.isArray(assignments)) return [];

    const projectMap = {};
    assignments.forEach((assign) => {
      if (
        assign.raw &&
        assign.raw.projects &&
        Array.isArray(assign.raw.projects)
      ) {
        assign.raw.projects.forEach((proj) => {
          if (proj && proj.id) {
            projectMap[proj.id] = {
              ...proj,
              project_manager: proj.project_manager || null,
              team_lead: proj.team_lead || null,
            };
          }
        });
      }
    });
    return Object.values(projectMap);
  }, [assignments]);

  // Handle column sorting toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Client side search filtering
  const filteredAssignments = useMemo(() => {
    if (!fullAssignments || !Array.isArray(fullAssignments)) {
      return [];
    }

    return fullAssignments.filter((assign) => {
      const matchName = assign.employeeName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchCode = assign.employeeCode
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchRole = assign.designation
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchDept = assign.department
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchEmpId = String(assign.employeeId).includes(searchTerm);

      const matchProjects = assign.projectIds.some((projId) => {
        const proj =
          projects && Array.isArray(projects)
            ? projects.find((p) => String(p.id) === String(projId))
            : undefined;
        return proj?.name.toLowerCase().includes(searchTerm.toLowerCase());
      });

      return matchName || matchCode || matchRole || matchDept || matchProjects || matchEmpId;
    });
  }, [fullAssignments, searchTerm, projects]);

  // Client side sorting
  const sortedAssignments = useMemo(() => {
    if (!filteredAssignments || !Array.isArray(filteredAssignments)) {
      return [];
    }

    const sorted = [...filteredAssignments];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [filteredAssignments, sortField, sortDirection]);

  // Pagination bounds calculation
  const totalItems = sortedAssignments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedAssignments = useMemo(() => {
    if (!sortedAssignments || !Array.isArray(sortedAssignments)) {
      return [];
    }

    const start = (currentPage - 1) * itemsPerPage;
    return sortedAssignments.slice(start, start + itemsPerPage);
  }, [sortedAssignments, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset page number on search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "E";
  };

  const handleOpenDrawer = (assign) => {
    setDrawerEmployee(assign);
    setDrawerOpen(true);
  };

  // Handle row click - opens the modal
  const handleRowClick = (assign) => {
    handleOpenDrawer(assign);
  };

  // Handle action button click - prevents row click from triggering
  const handleActionClick = (e, callback, assign) => {
    e.stopPropagation();
    if (callback) {
      callback(assign);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-soft overflow-hidden animate-fadeIn">
      {/* Utilities Control Bar */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Page entry selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
            Show
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-650 bg-transparent text-gray-750 dark:text-gray-300 text-xs font-semibold focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
            entries
          </span>
        </div>

        {/* Sort Dropdown and Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={getCurrentSortValue()}
              onChange={handleSortChange}
              className="pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white dark:focus:bg-gray-800 transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <i className="fas fa-sort absolute left-3 top-2.5 text-gray-400 text-xs"></i>
            <i className="fas fa-chevron-down absolute right-3 top-2.5 text-gray-400 text-[10px] pointer-events-none"></i>
          </div>

          {/* Global Filter Input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search employee, ID or projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-250 dark:border-gray-600 bg-gray-55 dark:bg-gray-750 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-gray-700/25 border-b border-gray-100 dark:border-gray-700">
              <th
                onClick={() => handleSort("employeeName")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Employee{" "}
                {sortField === "employeeName" && (
                  <i
                    className={`fas fa-sort-amount-${sortDirection === "asc" ? "up" : "down"} text-green-500 ml-1.5`}
                  ></i>
                )}
              </th>
              <th
                onClick={() => handleSort("employeeCode")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Employee Id{" "}
                {sortField === "employeeCode" && (
                  <i
                    className={`fas fa-sort-amount-${sortDirection === "asc" ? "up" : "down"} text-green-500 ml-1.5`}
                  ></i>
                )}
              </th>
              <th
                onClick={() => handleSort("projectCount")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Assigned {PROJECT_MODULE_NAME}s
                {sortField === "projectCount" && (
                  <i
                    className={`fas fa-sort-amount-${sortDirection === "asc" ? "up" : "down"} text-green-500 ml-1.5`}
                  ></i>
                )}
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {loading ? (
              // Loading Skeleton Layouts
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div>
                        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-1"></div>
                        <div className="h-3 bg-gray-150 dark:bg-gray-700/60 rounded w-16"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : paginatedAssignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10">
                  <EmptyState
                    message={
                      searchTerm ? "No Match Found" : "No Assignments Found"
                    }
                    description={
                      searchTerm
                        ? "We couldn't find any assignments matching your search queries. Try modifying your filter term."
                        : `Start by mapping projects to employee profiles in your organization.`
                    }
                    onAction={searchTerm ? null : onAddNew}
                    actionText={searchTerm ? null : "Assign Projects"}
                  />
                </td>
              </tr>
            ) : (
              paginatedAssignments.map((assign) => (
                <tr
                  key={assign.employeeId}
                  onClick={() => handleRowClick(assign)}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors group cursor-pointer"
                >
                  {/* Employee Info Card */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-green-500/20 to-teal-500/20 dark:from-green-500/10 dark:to-teal-500/10 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-gray-700 transition-all">
                        {assign.avatar ? (
                          <img
                            src={assign.avatar}
                            alt={assign.employeeName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getFallbackAvatar(
                                assign.employeeName,
                              );
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            {getInitials(assign.employeeName)}
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block transition-colors">
                          {assign.employeeName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Employee Code Column - Now showing employee_id */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-md text-gray-600 dark:text-gray-300 font-semibold">
                      {assign.employeeCode}
                    </span>
                  </td>

                  {/* Assigned Tags List with Count */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ProjectTags
                        projectIds={assign.projectIds}
                        projectsList={projects}
                      />
                      <span className="text-xs text-gray-400 font-medium ml-1">
                        ({assign.projectCount})
                      </span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end items-center gap-2">
                      {/* View Assignments (Drawer) */}
                      <button
                        onClick={(e) => handleActionClick(e, handleOpenDrawer, assign)}
                        title="View Assignments Card"
                        className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-550 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                      >
                        <i className="fas fa-eye text-xs"></i>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={(e) => handleActionClick(e, onEdit, assign)}
                        title="Edit Assignment"
                        className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                      >
                        <i className="fas fa-pencil-alt text-xs"></i>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleActionClick(e, onDelete, assign)}
                        title="Delete Assignment"
                        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && totalItems > 0 && (
        <div className="px-6 py-4 bg-gray-55 dark:bg-gray-800/40 border-t border-gray-150 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold text-center sm:text-left">
            Showing{" "}
            <span className="font-bold text-gray-700 dark:text-gray-200">
              {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
            </span>{" "}
            to{" "}
            <span className="font-bold text-gray-700 dark:text-gray-200">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-700 dark:text-gray-200">
              {totalItems}
            </span>{" "}
            entries
          </span>

          <div className="flex justify-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-655 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-transparent hover:bg-green-500 hover:text-white hover:border-green-500 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-550 transition-all select-none"
            >
              <i className="fas fa-angle-left"></i>
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNo = idx + 1;
              return (
                <button
                  key={pageNo}
                  onClick={() => handlePageChange(pageNo)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all select-none ${
                    currentPage === pageNo
                      ? "bg-green-500 text-white shadow-soft"
                      : "border border-gray-200 dark:border-gray-650 text-gray-600 dark:text-gray-400 bg-transparent hover:bg-green-500/10 hover:border-green-500 hover:text-green-500"
                  }`}
                >
                  {pageNo}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-655 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-transparent hover:bg-green-500 hover:text-white hover:border-green-500 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-550 transition-all select-none"
            >
              <i className="fas fa-angle-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Center-aligned Modal for project assignments detailed cards */}
      <EmployeeProjectsModal
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerEmployee(null);
        }}
        employeeName={drawerEmployee?.employeeName || ""}
        employeeCode={drawerEmployee?.employeeCode || ""}
        designation={drawerEmployee?.designation || ""}
        department={drawerEmployee?.department || ""}
        avatar={drawerEmployee?.avatar || null}
        userId={drawerEmployee?.userId || null}
        projectIds={drawerEmployee?.projectIds || []}
        projectsWithDetails={projectsWithDetails}
        employees={employees}
      />
    </div>
  );
};

export default AssignmentTable;