import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SearchBar from "../common/SearchBar";
import EntriesSelector from "../common/EntriesSelector";
import { showToast } from "../../../components/common/Toast";
import Pagination from "../common/Paginations";
import {
  fetchEmployeeNearestExpiryReport,
  selectEmployeeNearestExpiry,
  selectEmployeeNearestExpiryLoading,
  selectEmployeeNearestExpiryPagination,
} from "../../store/slices/reportSlice";
import ExportModal from "../../../components/common/ExportModal";
import { exportToCSV, formatDate } from "../../../utils/reportUtils";
import apiClient from "../../../utils/apiClient";

const EmployeeNearestExpiryReport = () => {
  const dispatch = useDispatch();
  const rawEmployees = useSelector(selectEmployeeNearestExpiry) || [];
  const loading = useSelector(selectEmployeeNearestExpiryLoading);
  const pagination = useSelector(selectEmployeeNearestExpiryPagination);
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];

  // Local state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter states
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [expiryDays, setExpiryDays] = useState(30); // Default to 30 days

  useEffect(() => {
    dispatch(
      fetchEmployeeNearestExpiryReport({
        page: currentPage,
        per_page: perPage,
        expiry_days: expiryDays,
        company: selectedCompany !== "all" ? selectedCompany : undefined,
        department:
          selectedDepartment !== "all" ? selectedDepartment : undefined,
        search: searchTerm || undefined,
      }),
    );
  }, [
    dispatch,
    currentPage,
    perPage,
    expiryDays,
    selectedCompany,
    selectedDepartment,
    searchTerm,
  ]);

  // Reset to first page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, selectedCompany, selectedDepartment, expiryDays, perPage]);

  // Transform employee data to extract document expiry fields
  const transformEmployee = (emp) => {
    const raw = emp.raw || emp;
    const user = raw?.user || emp?.user || emp;
    const company = user?.company || emp?.company;
    const department = user?.department || emp?.department;

    return {
      id: emp.id,
      emp_id: raw?.employee_id || emp?.emp_id || "-",
      name:
        emp.name || raw?.first_name
          ? `${raw.first_name} ${raw.last_name || ""}`.trim()
          : "-",
      company_name: company?.company_name || company?.name || "-",
      department_name: department?.name || "-",
      passport_expiry: raw?.passport_expiry_date,
      visa_expiry: raw?.visa_expiry_date,
      labor_expiry: raw?.labor_expiry_date,
      eid_expiry: raw?.eid_expiry_date,
      // Additional fields for better export
      email: raw?.company_email || raw?.personal_email || user?.email || "-",
      phone: raw?.company_mobile_number || raw?.personal_number || "-",
    };
  };

  // Check if a date is within expiry days
  const isWithinExpiry = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(dateStr);
    if (isNaN(expiryDate.getTime())) return false;

    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= expiryDays;
  };

  // Get the earliest expiry date among all documents
  const getEarliestExpiry = (employee) => {
    const expiryDates = [
      employee.passport_expiry,
      employee.visa_expiry,
      employee.labor_expiry,
      employee.eid_expiry,
    ].filter((date) => date);

    if (expiryDates.length === 0) return null;

    const earliest = new Date(
      Math.min(...expiryDates.map((date) => new Date(date))),
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((earliest - today) / (1000 * 60 * 60 * 24));

    return {
      date: earliest,
      daysLeft: diffDays,
      isExpired: diffDays < 0,
    };
  };

  // Get employees with nearest expiry
  const getEmployeesWithNearestExpiry = () => {
    const transformedEmps = Array.isArray(employees)
      ? employees.map(transformEmployee)
      : [];

    let filtered = [...transformedEmps];

    // Apply company filter
    if (selectedCompany !== "all") {
      filtered = filtered.filter((emp) => emp.company_name === selectedCompany);
    }

    // Apply department filter
    if (selectedDepartment !== "all") {
      filtered = filtered.filter(
        (emp) => emp.department_name === selectedDepartment,
      );
    }

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          (emp.emp_id || "").toLowerCase().includes(searchLower) ||
          (emp.name || "").toLowerCase().includes(searchLower) ||
          (emp.company_name || "").toLowerCase().includes(searchLower) ||
          (emp.department_name || "").toLowerCase().includes(searchLower) ||
          (emp.email || "").toLowerCase().includes(searchLower) ||
          (emp.phone || "").toLowerCase().includes(searchLower),
      );
    }

    // Sort by earliest expiry date
    filtered.sort((a, b) => {
      const expiryA = getEarliestExpiry(a);
      const expiryB = getEarliestExpiry(b);

      if (!expiryA && !expiryB) return 0;
      if (!expiryA) return 1;
      if (!expiryB) return -1;

      return expiryA.date - expiryB.date;
    });

    return filtered;
  };

  // Transform data for export
  const getExportData = () => {
    const filteredEmployees = getEmployeesWithNearestExpiry();
    return filteredEmployees.map((emp) => {
      const earliest = getEarliestExpiry(emp);
      return {
        emp_id: emp.emp_id,
        name: emp.name,
        company_name: emp.company_name,
        department_name: emp.department_name,
        passport_expiry: formatDate(emp.passport_expiry),
        visa_expiry: formatDate(emp.visa_expiry),
        labor_expiry: formatDate(emp.labor_expiry),
        eid_expiry: formatDate(emp.eid_expiry),
        days_left: earliest ? `${earliest.daysLeft} days` : "-",
        email: emp.email,
        phone: emp.phone,
        expiry_period: `${expiryDays} days`,
      };
    });
  };

  // Backend returns only current page data
  const filteredEmployees = getEmployeesWithNearestExpiry();
  const totalFiltered = pagination?.total || filteredEmployees.length;
  const totalPages = pagination?.lastPage || Math.ceil(totalFiltered / perPage);
  const start = 0; // backend handles pagination
  const pageEmployees = filteredEmployees;

  const handleResetFilters = () => {
    setSelectedCompany("all");
    setSelectedDepartment("all");
    setExpiryDays(30);
    setSearchTerm("");
    setCurrentPage(1);
    showToast("Filters reset successfully", "success");
  };

  const handleExport = async (format) => {
    const exportData = getExportData();

    if (exportData.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    const headers = [
      { key: "emp_id", label: "Employee ID" },
      { key: "name", label: "Name" },
      { key: "company_name", label: "Company" },
      { key: "department_name", label: "Department" },
      { key: "passport_expiry", label: "Passport Expiry" },
      { key: "visa_expiry", label: "Visa Expiry" },
      { key: "labor_expiry", label: "Labor Expiry" },
      { key: "eid_expiry", label: "EID Expiry" },
      { key: "days_left", label: "Days Left" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "expiry_period", label: "Expiry Period" },
    ];

    const filename = `employee_nearest_expiry_${expiryDays}days_${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      exportToCSV(exportData, headers, `${filename}.csv`);
      showToast("Employee expiry data exported successfully!", "success");
    } else if (format === "pdf") {
      try {
        const response = await apiClient.post(
          "/admin/reports/export",
          { report_type: "employee_nearest_expiry", format: "pdf" },
          { responseType: "blob" },
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${filename}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("PDF report generated successfully!", "success");
      } catch (error) {
        showToast("Failed to download PDF report", "error");
      }
    }
  };

  const getExpiryClass = (expiryDate) => {
    if (!expiryDate) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return "";

    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold";
    if (diffDays <= 7)
      return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-semibold";
    if (diffDays <= 15)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (diffDays <= 30)
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "";
  };

  // Get unique companies and departments for filters
  const transformedEmps = Array.isArray(employees)
    ? employees.map(transformEmployee)
    : [];
  const uniqueCompanies = [
    ...new Set(
      transformedEmps.map((emp) => emp.company_name).filter((c) => c !== "-"),
    ),
  ];
  const uniqueDepartments = [
    ...new Set(
      transformedEmps
        .map((emp) => emp.department_name)
        .filter((d) => d !== "-"),
    ),
  ];

  // Calculate stats
  // Calculate stats
  const expiringWithin7Days = filteredEmployees.filter((emp) => {
    const earliest = getEarliestExpiry(emp);
    return earliest && earliest.daysLeft >= 0 && earliest.daysLeft <= 7;
  }).length;

  const expiringWithin15Days = filteredEmployees.filter((emp) => {
    const earliest = getEarliestExpiry(emp);
    return earliest && earliest.daysLeft >= 8 && earliest.daysLeft <= 15;
  }).length;

  const expiringWithin30Days = filteredEmployees.filter((emp) => {
    const earliest = getEarliestExpiry(emp);
    return earliest && earliest.daysLeft >= 16 && earliest.daysLeft <= 30;
  }).length;

  const expiredCount = filteredEmployees.filter((emp) => {
    const earliest = getEarliestExpiry(emp);
    return earliest && earliest.isExpired;
  }).length;

  // Get document type stats
  const getDocumentStats = () => {
    let passportExpiring = 0;
    let visaExpiring = 0;
    let laborExpiring = 0;
    let eidExpiring = 0;

    filteredEmployees.forEach((emp) => {
      if (isWithinExpiry(emp.passport_expiry)) passportExpiring++;
      if (isWithinExpiry(emp.visa_expiry)) visaExpiring++;
      if (isWithinExpiry(emp.labor_expiry)) laborExpiring++;
      if (isWithinExpiry(emp.eid_expiry)) eidExpiring++;
    });

    return { passportExpiring, visaExpiring, laborExpiring, eidExpiring };
  };

  const docStats = getDocumentStats();

  return (
    <div className="w-full overflow-x-hidden">
      <main className="content px-4 py-4 md:px-6 md:py-6 w-full overflow-x-hidden">
        {/* Page Header with Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
            <Link
              to="/admin/reports"
              className="text-green-500 hover:text-green-600 font-medium"
            >
              Reports
            </Link>
            <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
            <span className="text-gray-500">
              Employee Nearest Expiry Report
            </span>
          </div>
          <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 bg-clip-text text-transparent">
            Employee Nearest Expiry Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Employees with documents expiring within {expiryDays} days
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expired Documents
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {expiredCount}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expiring in 7 days
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {expiringWithin7Days}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-circle text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expiring in 15 days
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {expiringWithin15Days}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-amber-600 dark:text-amber-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expiring in {expiryDays} days
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {expiringWithin30Days}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-day text-yellow-600 dark:text-yellow-400"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Document Type Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Passport Expiring
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {docStats.passportExpiring}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-passport text-blue-600 dark:text-blue-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Visa Expiring
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {docStats.visaExpiring}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-id-card text-purple-600 dark:text-purple-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Labor Expiring
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {docStats.laborExpiring}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-briefcase text-orange-600 dark:text-orange-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  EID Expiring
                </p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {docStats.eidExpiring}
                </p>
              </div>
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-id-card text-teal-600 dark:text-teal-400"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Company Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-building mr-1"></i> Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500"
              >
                <option value="all">All Companies</option>
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-diagram-project mr-1"></i> Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Days Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-hourglass-half mr-1"></i> Expiry Period
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500"
              >
                <option value="7">Next 7 days</option>
                <option value="15">Next 15 days</option>
                <option value="30">Next 30 days</option>
                <option value="60">Next 60 days</option>
                <option value="90">Next 90 days</option>
              </select>
            </div>

            {/* Filter Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                <i className="fas fa-undo-alt"></i> Reset
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <i className="fas fa-info-circle mr-1"></i>
            Showing employees with documents expiring within {expiryDays} days
            from today
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
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder="Search by name, emp ID, company, email, phone..."
            />
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
            >
              <i className="fas fa-download"></i> Export Report
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && filteredEmployees.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <i className="fas fa-spinner fa-spin text-3xl text-green-500 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">
              Loading employee expiry data...
            </p>
          </div>
        ) : (
          <>
            {/* Nearest Expiry Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
              <div className="min-w-[1000px] lg:min-w-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        S.No
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        EMP ID
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        NAME
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        COMPANY
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        DEPARTMENT
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        PASSPORT EXPIRY
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        VISA EXPIRY
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        LABOR EXPIRY
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        EID EXPIRY
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        DAYS LEFT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEmployees.length > 0 ? (
                      pageEmployees.map((emp, idx) => {
                        const earliest = getEarliestExpiry(emp);
                        return (
                          <tr
                            key={emp.id}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                              {(currentPage - 1) * perPage + idx + 1}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-mono text-gray-700 dark:text-gray-300">
                              {emp.emp_id}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {emp.name}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                              {emp.company_name}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                              {emp.department_name}
                            </td>
                            <td
                              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${getExpiryClass(emp.passport_expiry)}`}
                            >
                              {formatDate(emp.passport_expiry)}
                            </td>
                            <td
                              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${getExpiryClass(emp.visa_expiry)}`}
                            >
                              {formatDate(emp.visa_expiry)}
                            </td>
                            <td
                              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${getExpiryClass(emp.labor_expiry)}`}
                            >
                              {formatDate(emp.labor_expiry)}
                            </td>
                            <td
                              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${getExpiryClass(emp.eid_expiry)}`}
                            >
                              {formatDate(emp.eid_expiry)}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                              {earliest ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                    earliest.isExpired
                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      : earliest.daysLeft <= 7
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : earliest.daysLeft <= 15
                                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}
                                >
                                  <i
                                    className={`fas ${earliest.isExpired ? "fa-exclamation-triangle" : "fa-hourglass-half"} text-[10px]`}
                                  ></i>
                                  {earliest.isExpired
                                    ? `Expired ${Math.abs(earliest.daysLeft)} days ago`
                                    : `${earliest.daysLeft} days left`}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="10"
                          className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <i className="fas fa-calendar-check text-4xl text-gray-300 dark:text-gray-600"></i>
                            <p>No employees with expiring documents found</p>
                            <p className="text-xs">
                              Try changing the expiry period or filters
                            </p>
                          </div>
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
          </>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        title="Export Employee Expiry Report"
        totalRecords={getExportData().length}
        formats={["csv", "pdf"]}
        defaultFormat="csv"
      />
    </div>
  );
};

export default EmployeeNearestExpiryReport;
