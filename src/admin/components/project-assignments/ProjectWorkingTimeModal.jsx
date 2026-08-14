// src/admin/components/project-assignments/ProjectWorkingTimeModal.jsx

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployeeProjectWorkingTime } from "../../store/slices/projectAssignmentSlice";

const ProjectWorkingTimeModal = ({
  isOpen,
  onClose,
  project,
  employeeName,
  userId,
}) => {
  const dispatch = useDispatch();
  const { employeeWorkingTime, loading } = useSelector(
    (state) => state.projectAssignments || { employeeWorkingTime: {}, loading: false }
  );

  const [workingTimeData, setWorkingTimeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId && project) 
      
      // Check if we already have the data in Redux
      if (employeeWorkingTime && employeeWorkingTime[userId]) {
        
        const projectTime = employeeWorkingTime[userId].find(
          (item) => String(item.project_id) === String(project.id)
        );
        
        if (projectTime) {
          setWorkingTimeData(projectTime);
          setError(null);
          return;
        }
      }

      // Fetch working time if not available
      const fetchWorkingTime = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await dispatch(
            fetchEmployeeProjectWorkingTime(userId)
          ).unwrap();
          
          
          // Find the specific project's working time
          const projectTime = result.data.find(
            (item) => String(item.project_id) === String(project.id)
          );
          
          if (projectTime) {
            setWorkingTimeData(projectTime);
          } else {
            setWorkingTimeData(null);
          }
        } catch (error) {
          console.error("Failed to fetch working time:", error);
          setError(error.message || "Failed to load working hours");
        } finally {
          setIsLoading(false);
        }
      };

      fetchWorkingTime();
    }
  }, [isOpen, userId, project, dispatch, employeeWorkingTime]);

  if (!isOpen || !project) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const dailyLogs = workingTimeData?.daily_logs || [];
  const totalTime = workingTimeData?.total_working_time_formatted || "0 hours 0 mins";
  const totalMinutes = workingTimeData?.total_working_time_minutes || 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-[1300] flex items-center justify-center p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-2xl rounded-3xl w-full max-w-lg md:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-start bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-md">
                Daily Working Hours
              </span>
              {userId && (
                <span className="text-[9px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                  ID: {userId}
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-gray-850 dark:text-gray-100 leading-tight">
              {project.name}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold mt-1">
              Employee: {employeeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/10 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Loading working hours...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-4 text-red-500">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Error Loading Data
              </h4>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                {error}
              </p>
              <button
                onClick={() => {
                  // Retry fetching
                  const fetchWorkingTime = async () => {
                    setIsLoading(true);
                    setError(null);
                    try {
                      const result = await dispatch(
                        fetchEmployeeProjectWorkingTime(userId)
                      ).unwrap();
                      const projectTime = result.data.find(
                        (item) => String(item.project_id) === String(project.id)
                      );
                      setWorkingTimeData(projectTime || null);
                    } catch (error) {
                      setError(error.message || "Failed to load working hours");
                    } finally {
                      setIsLoading(false);
                    }
                  };
                  fetchWorkingTime();
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white text-xs font-bold transition-all duration-200"
              >
                <i className="fas fa-redo mr-2"></i>
                Retry
              </button>
            </div>
          ) : !workingTimeData ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-4 text-indigo-500">
                <i className="fas fa-clock text-2xl"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                No Working Time Data
              </h4>
              <p className="text-xs text-gray-400 mt-2 max-w-[280px] leading-relaxed">
                No working hours have been tracked for this project yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Total Summary */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/5 dark:to-purple-500/5 rounded-2xl p-5 border border-indigo-500/20 dark:border-indigo-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Working Time
                    </span>
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                      {totalTime}
                    </p>
                    {totalMinutes > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {totalMinutes} minutes total
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <i className="fas fa-hourglass-half text-indigo-600 dark:text-indigo-400 text-xl"></i>
                  </div>
                </div>
              </div>

              {/* Daily Logs */}
              {dailyLogs.length > 0 ? (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <i className="fas fa-calendar-day text-indigo-500"></i>
                    Daily Breakdown
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      ({dailyLogs.length} days)
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {dailyLogs.map((log, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 hover:shadow-sm transition-all duration-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-calendar-check text-indigo-500 text-xs"></i>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {formatDate(log.date)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {log.working_time_minutes || 0} minutes
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {log.working_time_formatted || formatWorkingTime(log)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <i className="fas fa-chart-line text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No daily logs available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-55 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-750 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function for formatting time in the modal
const formatWorkingTime = (workingTimeObj) => {
  if (!workingTimeObj) return "0 mins";
  
  const totalMinutes = workingTimeObj.working_time_minutes || 0;
  if (totalMinutes === 0) return "0 mins";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} mins`;
  if (minutes === 0) return `${hours} hours`;
  return `${hours} hours ${minutes} mins`;
};

export default ProjectWorkingTimeModal;