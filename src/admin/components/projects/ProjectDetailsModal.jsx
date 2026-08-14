import React from "react";
import { PROJECT_MODULE_NAME } from "../../utils/constants";
import { getPhotoUrl, getFallbackAvatar } from "../../../utils/imageHelper";

const ProjectDetailsModal = ({ isOpen, onClose, project, employees = [] }) => {
  if (!isOpen || !project) return null;

  // In ProjectDetailsModal.jsx - Updated getEmployeeDetails function
  const getEmployeeDetails = (empId) => {
    if (!empId) return { name: "Not Assigned", avatar: null, designation: "-" };


    // IMPORTANT: Search by user_id FIRST since that's what projects store
    let emp = employees.find((e) => String(e.user_id) === String(empId));

    // If not found by user_id, try by id
    if (!emp) {
      emp = employees.find((e) => String(e.id) === String(empId));
    }

    // If still not found, try by employee_id
    if (!emp) {
      emp = employees.find((e) => String(e.employee_id) === String(empId));
    }

    return emp
      ? {
          name: emp.name,
          avatar: getPhotoUrl(emp.avatar),
          designation: emp.designation,
        }
      : { name: "Not Assigned", avatar: null, designation: "-" };
  };

 const formatCurrency = (amount, currency = "AED") => {
  if (!amount) return "-";
  return `${currency} ${Number(amount).toFixed(2)}`;
};

  // Format hours
  const formatHours = (hours) => {
    if (!hours || hours === 0) return "-";
    return `${hours.toFixed(1)} hrs`;
  };

  const getInitials = (name) =>
    name && name !== "Not Assigned" ? name.charAt(0).toUpperCase() : "N";

  const pm = getEmployeeDetails(project.managerId);
  const tl = getEmployeeDetails(project.teamLeadId);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[1200] flex items-center justify-center p-4 sm:p-6 modal-overlay animate-fadeIn"
      >
        {/* Modal Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-2xl rounded-3xl w-full max-w-lg md:max-w-xl max-h-[85vh] flex flex-col overflow-hidden modal-card"
        >
          {/* Header area with elegant gradient, details and close button */}
          <div className="relative p-6 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-start bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-transparent flex-shrink-0">
            <div className="flex gap-4 items-center">
              {/* Folder Icon in Header */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-teal-500/20 dark:from-green-500/10 dark:to-teal-500/10 flex items-center justify-center border border-green-500/20 flex-shrink-0 shadow-sm text-green-600 dark:text-green-400">
                <i className="fas fa-folder-open text-2xl"></i>
              </div>

              <div>
                <span className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-500/10 px-2.5 py-1 rounded-md font-extrabold">
                  {PROJECT_MODULE_NAME} Details
                </span>
                <h3 className="text-base font-extrabold text-gray-850 dark:text-gray-105 mt-2.5 leading-tight">
                  {project.name}
                </h3>
                <p className="text-[10.5px] text-gray-400 dark:text-gray-500 font-semibold mt-1.5 leading-none">
                  Project Code: #{project.id} &bull; Created:{" "}
                  {project.createdDate}
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

          {/* Description & Leadership Hierarchy */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50 dark:bg-gray-900/10 scrollbar-thin text-left">
            {/* Description Card */}
            <div className="bg-white dark:bg-gray-805 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 space-y-3 shadow-sm">
              <h4 className="text-[9px] font-bold text-gray-405 dark:text-gray-500 uppercase tracking-widest block border-b border-gray-50 dark:border-gray-750 pb-2 font-extrabold">
                Project Description
              </h4>
              <p className="text-[12.5px] text-gray-650 dark:text-gray-300 leading-relaxed font-semibold">
                {project.description || (
                  <span className="italic text-gray-400 font-medium">
                    No project scope or description has been written for this
                    directory yet.
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Total Hours Card */}
              <div className="bg-white dark:bg-gray-805 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <i className="fas fa-clock"></i>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-500">
                    Total Hours
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  {formatHours(project.totalHours)}
                </p>
              </div>

              {/* Total Cost Card */}
              <div className="bg-white dark:bg-gray-805 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                    <i className="fas fa-dollar-sign"></i>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-green-500">
                    Total Cost
                  </span>
                </div>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(project.totalCost, project.currency)}
                </p>
              </div>
            </div>

            {/* Leadership Cards Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Manager Card */}
              <div className="bg-white dark:bg-gray-855 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 space-y-4 shadow-sm hover:shadow-soft transition-all duration-200">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
                  Project Manager
                </span>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-gray-100 dark:border-gray-750 flex-shrink-0 shadow-sm">
                    {pm.avatar ? (
                      <img
                        src={pm.avatar}
                        alt="PM Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackAvatar(pm.name);
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {getInitials(pm.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                      {pm.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold truncate leading-none mt-1">
                      {pm.designation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Lead Card */}
              <div className="bg-white dark:bg-gray-855 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 space-y-4 shadow-sm hover:shadow-soft transition-all duration-200">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                  Team Lead
                </span>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-gray-100 dark:border-gray-750 flex-shrink-0 shadow-sm">
                    {tl.avatar ? (
                      <img
                        src={tl.avatar}
                        alt="TL Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getFallbackAvatar(tl.name);
                        }}
                      />
                    ) : (
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {getInitials(tl.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                      {tl.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold truncate leading-none mt-1">
                      {tl.designation}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Project Metadata */}
            <div className="bg-white dark:bg-gray-805 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm grid grid-cols-2 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <div>
                <span className="text-gray-405 dark:text-gray-500 font-bold uppercase tracking-wider block text-[9px] font-extrabold">
                  Created Date
                </span>
                <span className="font-semibold text-gray-750 dark:text-gray-250 mt-1 block">
                  <i className="far fa-calendar-alt text-gray-400 mr-1.5"></i>
                  {project.createdDate || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-405 dark:text-gray-500 font-bold uppercase tracking-wider block text-[9px] font-extrabold">
                  Last Updated
                </span>
                <span className="font-semibold text-gray-750 dark:text-gray-250 mt-1 block">
                  <i className="far fa-clock text-gray-400 mr-1.5"></i>
                  {project.updatedDate || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer with elegant Close button */}
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

export default ProjectDetailsModal;
