import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PROJECT_MODULE_NAME } from "../../utils/constants";
import EmptyState from "./EmptyState";

const ProjectTable = ({
  projects,
  employees = [],
  loading,
  onEdit,
  onDelete,
  onAddNew,
  onStatusChange,
  onViewDetails,
}) => {
  const getEmployeeName = (id) => {
    if (!id)
      return (
        <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">
          Not Assigned
        </span>
      );

    let emp = employees.find((e) => String(e.user_id) === String(id));
    if (!emp) {
      emp = employees.find((e) => String(e.id) === String(id));
    }

    return emp ? (
      emp.name
    ) : (
      <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">
        Not Assigned
      </span>
    );
  };

  const formatCurrency = (amount, currency = "AED") => {
    if (!amount) return "-";
    return `${currency} ${Number(amount).toFixed(2)}`;
  };
  
  const formatHours = (hours) => {
    if (!hours || hours === 0) return "-";
    return `${hours.toFixed(1)} hrs`;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdDate");
  const [sortDirection, setSortDirection] = useState("desc"); // Default to newest first
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter & Search Logic
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const nameMatch = project.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const descMatch = (project.description || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return nameMatch || descMatch;
    });
  }, [projects, searchTerm]);

  // Sorting Logic
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle date fields specially
      if (sortField === "createdDate" || sortField === "updatedDate") {
        const dateA = new Date(valA);
        const dateB = new Date(valB);
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    });
    return sorted;
  }, [filteredProjects, sortField, sortDirection]);

  // Pagination Logic
  const totalItems = sortedProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProjects.slice(start, start + itemsPerPage);
  }, [sortedProjects, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  // Sort options for dropdown
  const sortOptions = [
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
    { value: "createdDate_desc", label: "Newest First" },
    { value: "createdDate_asc", label: "Oldest First" },
    { value: "totalHours_desc", label: "Most Hours" },
    { value: "totalHours_asc", label: "Least Hours" },
    { value: "totalCost_desc", label: "Highest Cost" },
    { value: "totalCost_asc", label: "Lowest Cost" },
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-soft overflow-hidden">
      {/* Header Utilities */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Entries select & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
            Show
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 text-xs font-semibold focus:outline-none focus:border-green-500 transition-colors"
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

          {/* Search */}
          <div className="relative w-full md:w-56">
            <input
              type="text"
              placeholder={`Search projects...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
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

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/55 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700/60">
              <th
                onClick={() => handleSort("name")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Project Name{" "}
                {sortField === "name" && (
                  <i
                    className={`fas fa-sort-amount-${sortDirection === "asc" ? "up" : "down"} text-green-500 ml-1.5`}
                  ></i>
                )}
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none whitespace-nowrap">
                Description
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none whitespace-nowrap">
                Leadership
              </th>
              <th
                onClick={() => handleSort("totalHours")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Total Hours{" "}
                {sortField === "totalHours" && (
                  <i
                    className={`fas fa-sort-amount-${sortDirection === "asc" ? "up" : "down"} text-green-500 ml-1.5`}
                  ></i>
                )}
              </th>
              <th
                onClick={() => handleSort("totalCost")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Total Cost{" "}
                {sortField === "totalCost" && (
                  <i
                    className={`fas fa-sort-amount-${sortDirection === "asc" ? "up" : "down"} text-green-500 ml-1.5`}
                  ></i>
                )}
              </th>
              <th
                onClick={() => handleSort("createdDate")}
                className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 select-none whitespace-nowrap transition-colors"
              >
                Created Date{" "}
                {sortField === "createdDate" && (
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
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-1"></div>
                    <div className="h-3 bg-gray-150 dark:bg-gray-700/60 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1.5"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10">
                  <EmptyState
                    message={
                      searchTerm
                        ? "No Match Found"
                        : `No ${PROJECT_MODULE_NAME} Defined`
                    }
                    description={
                      searchTerm
                        ? "We couldn't find any results matching your search queries. Try modifying your filter term."
                        : `Start by building your first project directory so employees can be assigned.`
                    }
                    onAction={searchTerm ? null : onAddNew}
                    actionText={
                      searchTerm ? null : `Create ${PROJECT_MODULE_NAME}`
                    }
                  />
                </td>
              </tr>
            ) : (
              paginatedProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {project.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {project.description || (
                        <span className="italic text-gray-300 dark:text-gray-600">
                          No description provided
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 tracking-wider">
                          PM
                        </span>
                        <span className="font-medium">
                          {getEmployeeName(project.managerId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-bold text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 dark:text-purple-400 tracking-wider">
                          TL
                        </span>
                        <span className="font-medium">
                          {getEmployeeName(project.teamLeadId)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {formatHours(project.totalHours)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(project.totalCost)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      <i className="far fa-calendar-alt text-gray-400 mr-1.5"></i>
                      {project.createdDate}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end items-center gap-2">
                      {/* View Details Button */}
                      <button
                        onClick={() => onViewDetails(project)}
                        title="View Details"
                        className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                      >
                        <i className="fas fa-eye text-xs"></i>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => onEdit(project)}
                        title="Edit Project"
                        className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                      >
                        <i className="fas fa-pencil-alt text-xs"></i>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDelete(project)}
                        title="Delete Project"
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
            {/* Previous */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-transparent hover:bg-green-500 hover:text-white hover:border-green-500 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-600 transition-all select-none"
            >
              <i className="fas fa-angle-left"></i>
            </button>

            {/* Pages list */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNo = idx + 1;
              return (
                <button
                  key={pageNo}
                  onClick={() => handlePageChange(pageNo)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all select-none ${
                    currentPage === pageNo
                      ? "bg-green-500 text-white shadow-soft"
                      : "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 bg-transparent hover:bg-green-500/10 hover:border-green-500 hover:text-green-500"
                  }`}
                >
                  {pageNo}
                </button>
              );
            })}

            {/* Next */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-transparent hover:bg-green-500 hover:text-white hover:border-green-500 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:hover:border-gray-200 dark:disabled:hover:border-gray-600 transition-all select-none"
            >
              <i className="fas fa-angle-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTable;