import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../../components/common/Toast";
import { format } from "date-fns";

// Redux Actions
import {
  fetchPayrolls,
  deletePayroll,
  generatePayslip,
  clearPayrollError,
  clearPayrollSuccess,
  fetchPayrollStats,
} from "../store/slices/payrollSlice";

// Components
import SearchBar from "../components/common/SearchBar";
import EntriesSelector from "../components/common/EntriesSelector";
import Pagination from "../components/common/Paginations";
import ConfirmModal from "../components/common/ConfirmModal";

const Payroll = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get user role and permissions from Redux
  const { user } = useSelector((state) => state.auth || {});
  const permissions = user?.permissions || {};
  const userType = user?.type || "";
  const roleName = user?.role?.name || "";

  // Check if user has payroll permissions
  const hasPayrollRead = permissions?.payroll?.read || false;
  const hasPayrollEdit = permissions?.payroll?.edit || false;
  const hasPayrollDelete = permissions?.payroll?.delete || false;

  // Check if user is admin (for base path and full access)
  const isAdmin =
    userType === "admin" || roleName === "admin" || roleName === "Admin";

  // Check if user has edit/delete permissions (admin or HR with payroll permissions)
  const canEdit = isAdmin || hasPayrollEdit;
  const canDelete = isAdmin || hasPayrollDelete;
  const canView = isAdmin || hasPayrollRead;

  // Use selectors from the payroll slice
  const payrolls = useSelector((state) => state.payroll.payrolls);
  const loading = useSelector((state) => state.payroll.loading);
  const actionLoading = useSelector((state) => state.payroll.actionLoading);
  const totalCount = useSelector((state) => state.payroll.totalCount);
  const currentPage = useSelector((state) => state.payroll.currentPage);
  const lastPage = useSelector((state) => state.payroll.lastPage);
  const perPage = useSelector((state) => state.payroll.perPage);
  const stats = useSelector((state) => state.payroll.stats);
  const error = useSelector((state) => state.payroll.error);
  const successMessage = useSelector((state) => state.payroll.successMessage);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [currentPageState, setCurrentPageState] = useState(1);

  // Generate month options (with month numbers)
  const monthOptions = [
    { value: "", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: "", label: "All Years" },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: String(currentYear - i),
      label: String(currentYear - i),
    })),
  ];

  // Function to fetch payrolls with current filters
  const fetchPayrollsData = useCallback(() => {
    const params = {
      page: currentPageState,
      per_page: perPage || 15,
      search: searchTerm || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    };

    // Add month parameter if selected (month only - 2 digit)
    if (selectedMonth) {
      const monthPadded = String(selectedMonth).padStart(2, "0");
      params.month = monthPadded;
    }

    // Add year parameter if selected
    if (selectedYear) {
      params.year = parseInt(selectedYear);
    }

    console.log("Fetching payrolls with params:", params);
    dispatch(fetchPayrolls(params));
  }, [
    dispatch,
    currentPageState,
    searchTerm,
    statusFilter,
    selectedMonth,
    selectedYear,
    perPage,
  ]);

  // Load payrolls on mount and when filters change
  useEffect(() => {
    fetchPayrollsData();
  }, [fetchPayrollsData]);

  // Fetch stats when filters change
  useEffect(() => {
    const params = {};
    
    if (selectedMonth) {
      const monthPadded = String(selectedMonth).padStart(2, "0");
      params.month = monthPadded;
    }
    
    if (selectedYear) {
      params.year = parseInt(selectedYear);
    }
    
    if (statusFilter && statusFilter !== "all") {
      params.status = statusFilter;
    }

    dispatch(fetchPayrollStats(params));
  }, [dispatch, selectedMonth, selectedYear, statusFilter]);

  // Handle errors and success messages
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearPayrollError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (successMessage) {
      showToast(successMessage, "success");
      dispatch(clearPayrollSuccess());
    }
  }, [successMessage, dispatch]);

  // Stats from API
  const totalPayrolls = stats?.total_generated || 0;
  const pendingCount = stats?.total_pending || 0;
  
  // Get paid count (total_generated - total_pending)
  const paidCount = totalPayrolls - pendingCount;

  // Get currencies and their amounts
  const currencies = stats?.amounts_by_currency || {};

  // Get specific currency data
  const aedData = currencies?.AED || { total_amount: 0, total_paid: 0 };
  const inrData = currencies?.INR || { total_amount: 0, total_paid: 0 };

  // Format currency with proper symbol
  const formatCurrency = (amount, currencyCode = "INR") => {
    const currencyMap = {
      AED: { locale: "en-AE", currency: "AED" },
      INR: { locale: "en-IN", currency: "INR" },
      USD: { locale: "en-US", currency: "USD" },
      EUR: { locale: "de-DE", currency: "EUR" },
      GBP: { locale: "en-GB", currency: "GBP" },
      SGD: { locale: "en-SG", currency: "SGD" },
      JPY: { locale: "ja-JP", currency: "JPY" },
      CNY: { locale: "zh-CN", currency: "CNY" },
    };

    const config = currencyMap[currencyCode] || currencyMap.INR;
    
    try {
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount || 0);
    } catch {
      return `${currencyCode} ${(amount || 0).toFixed(2)}`;
    }
  };

  // Get currency badge color
  const getCurrencyBadgeColor = (currency) => {
    const colors = {
      AED: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
      INR: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      USD: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      EUR: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      GBP: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
      SGD: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
      JPY: "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800",
      CNY: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    };
    return colors[currency] || "bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  };

  // Handlers
  const handlePageChange = (page) => {
    setCurrentPageState(page);
  };

  const handlePerPageChange = (value) => {
    setCurrentPageState(1);
    fetchPayrollsData();
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPageState(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPageState(1);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPageState(1);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setCurrentPageState(1);
  };

  const handleDeleteClick = (payroll) => {
    setSelectedPayroll(payroll);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPayroll) return;
    try {
      await dispatch(deletePayroll(selectedPayroll.id)).unwrap();
      setDeleteModalOpen(false);
      setSelectedPayroll(null);
      fetchPayrollsData();
    } catch (error) {
      // Error is handled by the slice
    }
  };

  const handleGeneratePayslip = async (payrollId) => {
    try {
      await dispatch(generatePayslip(payrollId)).unwrap();
      showToast("Payslip downloaded successfully!", "success");
    } catch (error) {
      showToast(error || "Failed to generate payslip", "error");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
      paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
      pending:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
      draft:
        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600",
      failed:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    };
    return statusMap[status?.toLowerCase()] || statusMap.draft;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return date;
    }
  };

  // Get month name from month number
  const getMonthName = (monthNumber) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthNumber - 1] || monthNumber;
  };

  // Get avatar URL
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
      return avatar;
    }
    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
    if (avatar.startsWith("/storage/")) {
      return `${baseUrl}${avatar}`;
    }
    return `${baseUrl}/storage/${avatar}`;
  };

  // Get the base path based on user role
  const basePath = isAdmin ? "/admin" : "/employee";

  // If user doesn't have read permission, show access denied
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <i className="fas fa-lock text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
            Access Denied
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to view payroll.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden px-4 md:px-6">
      {/* Stats Cards */}
      <div className="stats-grid grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-1 md:mb-2">
            <i className="fas fa-file-invoice text-blue-600 dark:text-blue-400 text-sm md:text-lg"></i>
          </div>
          <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalPayrolls}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            Total Payrolls
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-1 md:mb-2">
            <i className="fas fa-clock text-yellow-600 dark:text-yellow-400 text-sm md:text-lg"></i>
          </div>
          <div className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {pendingCount}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            Pending
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-1 md:mb-2">
            <span className="text-sm md:text-lg font-bold text-green-600 dark:text-green-400">AED</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(aedData.total_amount || 0, "AED")}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            AED Total Amount
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-1 md:mb-2">
            <span className="text-sm md:text-lg font-bold text-blue-600 dark:text-blue-400">INR</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(inrData.total_amount || 0, "INR")}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">
            INR Total Amount
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent flex items-center gap-2">
          <i className="fas fa-file-invoice-dollar text-green-500"></i>
          Payroll
          <span className="text-[10px] md:text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
            <i className="fas fa-calendar-check mr-1"></i> Monthly
          </span>
        </h2>
        {(isAdmin || hasPayrollEdit) && (
          <Link
            to={`${basePath}/payroll/add`}
            className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 transition-all"
          >
            <i className="fas fa-plus text-xs md:text-sm"></i>
            Add Payroll
          </Link>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <EntriesSelector
            value={perPage || 15}
            onChange={handlePerPageChange}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="failed">Failed</option>
          </select>

          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search employee or ID..."
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {/* Table */}
      {loading && payrolls.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-green-500 mb-3"></i>
          <p className="text-gray-500 dark:text-gray-400">
            Loading payroll records...
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
            <div className="min-w-[1200px] md:min-w-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 md:px-4 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      SL No
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Month / Year
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gross Salary
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Overtime
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Net Pay
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-center text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-right text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        <i className="fas fa-inbox text-3xl text-gray-300 dark:text-gray-600 mb-2 block"></i>
                        No payroll records found
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((payroll, index) => {
                      const avatarUrl = getAvatarUrl(payroll.avatar);
                      const employeeName =
                        payroll.employee_name ||
                        payroll.employee?.name ||
                        (payroll.employee?.first_name &&
                        payroll.employee?.last_name
                          ? `${payroll.employee.first_name} ${payroll.employee.last_name}`
                          : "-");
                      const monthDisplay = payroll.month
                        ? getMonthName(payroll.month)
                        : payroll.pay_period_month || "-";
                      const yearDisplay =
                        payroll.year || payroll.pay_period_year || "-";

                      // Calculate serial number based on pagination
                      const serialNumber =
                        (currentPageState - 1) * (perPage || 15) + index + 1;

                      const currency = payroll.currency || payroll.target_currency || "INR";

                      return (
                        <tr
                          key={payroll.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/10 transition-colors"
                        >
                          <td className="px-3 md:px-4 py-2 md:py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                            {serialNumber}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3">
                            <div className="flex items-center gap-2">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={employeeName}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.parentElement.querySelector(
                                      ".avatar-fallback",
                                    ).style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br from-green-500 to-green-600 avatar-fallback ${avatarUrl ? "hidden" : ""}`}
                              >
                                {employeeName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {employeeName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                            {`${monthDisplay} ${yearDisplay}`}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {formatCurrency(
                              payroll.gross_salary || 0,
                              currency
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(
                              payroll.overtime || 0,
                              currency
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(
                              payroll.deductions || 0,
                              currency
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(
                              payroll.net_pay || payroll.total_amount || 0,
                              currency
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${getCurrencyBadgeColor(currency)}`}
                            >
                              {currency}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold ${getStatusBadge(payroll.status)}`}
                            >
                              {payroll.status
                                ? payroll.status.charAt(0).toUpperCase() +
                                  payroll.status.slice(1)
                                : "Draft"}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(payroll.payment_date)}
                          </td>
                          <td className="px-3 md:px-4 py-2 md:py-3 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {/* View Button - Always show */}
                              <button
                                onClick={() =>
                                  navigate(`${basePath}/payroll/${payroll.id}`)
                                }
                                title="View Payroll"
                                className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                              >
                                <i className="fas fa-eye text-xs"></i>
                              </button>

                              {/* Edit Button - Show if user has edit permission */}
                              {(isAdmin || hasPayrollEdit) && (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `${basePath}/payroll/edit/${payroll.id}`,
                                    )
                                  }
                                  title="Edit Payroll"
                                  className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                                >
                                  <i className="fas fa-pencil-alt text-xs"></i>
                                </button>
                              )}

                              {/* Payslip Button - Always show with PDF icon */}
                              <button
                                onClick={() =>
                                  handleGeneratePayslip(payroll.id)
                                }
                                disabled={actionLoading}
                                title="Generate Payslip"
                                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <i className="fas fa-file-pdf text-xs"></i>
                              </button>

                              {/* Delete Button - Show if user has delete permission */}
                              {(isAdmin || hasPayrollDelete) && (
                                <button
                                  onClick={() => handleDeleteClick(payroll)}
                                  title="Delete Payroll"
                                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-soft"
                                >
                                  <i className="fas fa-trash-alt text-xs"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <Pagination
              currentPage={currentPageState}
              totalPages={lastPage || Math.ceil(totalCount / (perPage || 15))}
              onPageChange={handlePageChange}
              totalItems={totalCount}
              itemsPerPage={perPage || 15}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Modal - Show if user has delete permission */}
      {(isAdmin || hasPayrollDelete) && (
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedPayroll(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Payroll"
          message={`Are you sure you want to delete the payroll for "${selectedPayroll?.employee_name || "this employee"}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          loading={actionLoading}
          confirmButtonClass="bg-red-500 hover:bg-red-600"
        />
      )}
    </div>
  );
};

export default Payroll;