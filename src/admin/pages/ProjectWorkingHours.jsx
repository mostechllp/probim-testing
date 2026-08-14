// src/admin/pages/ProjectWorkingHours.jsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { fetchEmployeeProjectWorkingTime } from "../store/slices/projectAssignmentSlice";
import { fetchEmployees } from "../store/slices/employeeSlice";
import { fetchProjects } from "../store/slices/projectSlice";
import { getPhotoUrl, getFallbackAvatar } from "../../utils/imageHelper";
import { PROJECT_MODULE_NAME } from "../utils/constants";
import SearchBar from "../components/common/SearchBar";
import EntriesSelector from "../components/common/EntriesSelector";
import Pagination from "../components/common/Paginations";
import { showToast } from "../../components/common/Toast";

const ProjectWorkingHours = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  
  // Redux States
  const { employeeWorkingTime, loading: workingTimeLoading } = useSelector(
    (state) => state.projectAssignments || { employeeWorkingTime: {}, loading: false }
  );
  const { employees = [] } = useSelector((state) => state.employees || { employees: [] });
  const { projects = [] } = useSelector((state) => state.projects || { projects: [] });
  const { user } = useSelector((state) => state.auth);
  
  // Local States
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeWorkingData, setEmployeeWorkingData] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  
  // Use ref to track if we're currently fetching
  const isFetchingRef = useRef(false);

  // Get user role for base path
  const userRole = user?.type || 'admin';
  const basePath = userRole === 'admin' ? '/admin' : '/employee';

  // Load initial data
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchProjects());
  }, [dispatch]);

  // Handle navigation state from Link - only once
  useEffect(() => {
    if (location.state) {
      const { employeeId, employeeName, projectId, projectName } = location.state;
      
      if (employeeId) {
        setSelectedEmployee(employeeId);
      }
      if (projectId) {
        setSelectedProject(projectId);
      }
      if (employeeName) {
        setSearchTerm(employeeName);
      } else if (projectName) {
        setSearchTerm(projectName);
      }
    }
  }, [location.state]);

  // Fetch working time data
  const fetchWorkingTimeData = async (isInitialFetch = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoading(true);
    
    try {
      let targetEmployees = employees;
      
      // If specific employee selected, filter to just that one
      if (selectedEmployee) {
        targetEmployees = employees.filter(emp => String(emp.id) === String(selectedEmployee));
      }

      // If no employees, don't clear data, just show empty state
      if (targetEmployees.length === 0) {
        // Only clear if we have no data at all
        if (Object.keys(employeeWorkingData).length === 0) {
          setEmployeeWorkingData({});
        }
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Fetch working time for each employee
      const results = await Promise.all(
        targetEmployees.map(async (emp) => {
          // Use user_id for the API call
          const userId = emp.user_id || emp.user?.id || null;
          
          if (!userId) {
            return null;
          }
          
          try {
           
            const result = await dispatch(
              fetchEmployeeProjectWorkingTime(userId)
            ).unwrap();
            
            
            return { 
              employeeId: emp.id, 
              data: result.data || [] 
            };
          } catch (error) {
            console.error(`Failed to fetch for employee ${emp.id}:`, error);
            return { employeeId: emp.id, data: [] };
          }
        })
      );
      
      const dataMap = {};
      results.forEach(result => {
        if (result) {
          dataMap[result.employeeId] = result.data;
        }
      });
      
      setEmployeeWorkingData(dataMap);
      setHasLoaded(true);
      if (isInitialFetch) {
        setInitialFetchDone(true);
      }
    } catch (error) {
      console.error("Error fetching working time data:", error);
      showToast("Failed to load working hours data", "error");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Auto-fetch on mount - only once
  useEffect(() => {
    if (employees.length > 0 && projects.length > 0 && !initialFetchDone && !isFetchingRef.current) {
      fetchWorkingTimeData(true);
    }
  }, [employees, projects]);

  // Handle filter changes - debounced
  useEffect(() => {
    if (initialFetchDone && !isFetchingRef.current) {
      const timer = setTimeout(() => {
        fetchWorkingTimeData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedEmployee, selectedProject]);

  // Process working data for display
  const processedData = useMemo(() => {
    const allData = [];
    
    Object.keys(employeeWorkingData).forEach(employeeId => {
      const emp = employees.find(e => String(e.id) === String(employeeId));
      if (!emp) {
        return;
      }
      
      const projectTimes = employeeWorkingData[employeeId] || [];
      
      projectTimes.forEach(projectTime => {
        // Try to find project by ID, if not found, use the project_name from API
        const project = projects.find(p => String(p.id) === String(projectTime.project_id));
        const projectName = project?.name || projectTime.project_name || `Project #${projectTime.project_id}`;
        
        // Apply filters
        if (selectedProject && String(selectedProject) !== String(projectTime.project_id)) {
          return;
        }
        
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const empName = emp.name || emp.first_name || emp.user?.username || "";
          if (!empName.toLowerCase().includes(searchLower) && 
              !projectName.toLowerCase().includes(searchLower)) {
            return;
          }
        }
        
        allData.push({
          employeeId: emp.id,
          employeeName: emp.name || emp.first_name || emp.user?.username || `Employee #${emp.id}`,
          employeeAvatar: emp.avatar,
          designation: emp.designation || emp.user?.designation?.name || "-",
          department: emp.department || emp.user?.department?.name || "-",
          projectId: projectTime.project_id,
          projectName: projectName,
          totalMinutes: projectTime.total_working_time_minutes || 0,
          totalFormatted: projectTime.total_working_time_formatted || "0 hours 0 mins",
          dailyLogs: projectTime.daily_logs || [],
        });
      });
    });
    
    // Sort by total minutes (highest first)
    allData.sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    return allData;
  }, [employeeWorkingData, employees, projects, selectedProject, searchTerm]);

  // Pagination
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  const start = (currentPage - 1) * perPage;
  const pageData = processedData.slice(start, start + perPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedEmployee, selectedProject, perPage]);

  const toggleExpand = (key) => {
    setExpandedProjects(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "N";
  };

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return "0 hours 0 mins";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hours`;
    return `${hours} hours ${mins} mins`;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProjects = processedData.length;
    const totalHours = processedData.reduce((sum, item) => sum + item.totalMinutes, 0);
    const employeesWithTime = new Set(processedData.map(item => item.employeeId)).size;
    
    return {
      totalProjects,
      totalHoursFormatted: formatTime(totalHours),
      employeesWithTime,
    };
  }, [processedData]);

  return (
    <div className="w-full overflow-x-hidden">
      {/* Stats Cards */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-clock text-indigo-600 dark:text-indigo-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.totalHoursFormatted}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Total Working Hours
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-project-diagram text-green-600 dark:text-green-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.totalProjects}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            {PROJECT_MODULE_NAME}s Tracked
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-users text-blue-600 dark:text-blue-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.employeesWithTime}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Employees Active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-calendar-day text-purple-600 dark:text-purple-400 text-sm md:text-lg"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {processedData.reduce((sum, item) => sum + item.dailyLogs.length, 0)}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Total Log Entries
          </div>
        </div>
      </div>

      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Project Working Hours
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => fetchWorkingTimeData()}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs md:text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <EntriesSelector
          value={perPage}
          onChange={(val) => {
            setPerPage(val);
            setCurrentPage(1);
          }}
        />
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Employee Filter */}
          <select
            value={selectedEmployee || ""}
            onChange={(e) => {
              setSelectedEmployee(e.target.value || null);
            }}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name || emp.first_name || `Employee #${emp.id}`}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProject || ""}
            onChange={(e) => setSelectedProject(e.target.value || null)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map(proj => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>

          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search employee or project..."
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
        <div className="min-w-[800px] md:min-w-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  S.L.NO.
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  EMPLOYEE
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  PROJECT
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  TOTAL HOURS
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  LOGS
                </th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                  DETAILS
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && pageData.length > 0 ? (
                pageData.map((item, idx) => {
                  const key = `${item.employeeId}-${item.projectId}`;
                  const isExpanded = expandedProjects[key] || false;
                  
                  return (
                    <React.Fragment key={key}>
                      <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                          {start + idx + 1}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            {item.employeeAvatar ? (
                              <img
                                src={getPhotoUrl(item.employeeAvatar)}
                                alt={item.employeeName}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm md:text-base font-semibold">
                                {getInitials(item.employeeName)}
                              </div>
                            )}
                            <div>
                              <span className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {item.employeeName}
                              </span>
                              <span className="text-[10px] text-gray-400 block">
                                {item.designation}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {item.projectName}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            item.totalMinutes === 0
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-500'
                          }`}>
                            <i className="fas fa-clock text-[9px]"></i>
                            {item.totalFormatted}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {item.dailyLogs.length} days
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <button
                            onClick={() => toggleExpand(key)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                          >
                            {isExpanded ? 'Hide' : 'View'} Logs
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-3 md:px-4 py-3 bg-gray-50/50 dark:bg-gray-700/10">
                            <div className="space-y-2">
                              {item.dailyLogs.length > 0 ? (
                                item.dailyLogs.map((log, logIdx) => (
                                  <div
                                    key={logIdx}
                                    className="flex items-center justify-between bg-white dark:bg-gray-800/60 rounded-lg px-4 py-2 border border-gray-100 dark:border-gray-700/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <i className="fas fa-calendar-day text-indigo-400 text-xs"></i>
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {new Date(log.date).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {log.working_time_minutes || 0} minutes
                                      </span>
                                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {log.working_time_formatted || formatTime(log.working_time_minutes)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
                                  No daily logs available
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {isLoading ? "Loading working hours..." : "No working hours data found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          itemsPerPage={perPage}
        />
      )}
    </div>
  );
};

export default ProjectWorkingHours;