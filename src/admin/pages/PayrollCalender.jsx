import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/common/Toast";

// Redux Actions
import {
  fetchPayrolls,
  fetchPayrollStats,
  clearPayrollError,
  clearPayrollSuccess,
  clearPayrollList,
} from "../store/slices/payrollSlice";

const PayrollCalendar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get user role and permissions from Redux
  const { user } = useSelector((state) => state.auth || {});
  const permissions = user?.permissions || {};
  const userType = user?.type || "";
  const roleName = user?.role?.name || "";

  // Check if user has payroll permissions
  const hasPayrollRead = permissions?.payroll?.read || false;

  // Check if user is admin
  const isAdmin =
    userType === "admin" || roleName === "admin" || roleName === "Admin";
  const canView = isAdmin || hasPayrollRead;

  // State
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  
  // Redux state
  const stats = useSelector((state) => state.payroll.stats);
  const payrolls = useSelector((state) => state.payroll.payrolls);
  const loading = useSelector((state) => state.payroll.loading);
  const error = useSelector((state) => state.payroll.error);
  const successMessage = useSelector((state) => state.payroll.successMessage);

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Get month abbreviation
  const getMonthAbbr = (monthIndex) => {
    return monthNames[monthIndex].substring(0, 3);
  };

  // Fetch data for the year - both stats and payroll list
  const fetchYearData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear previous payroll list
      dispatch(clearPayrollList());
      
      // Fetch payrolls for the entire year (all months)
      const payrollParams = {
        page: 1,
        per_page: 1000, // Fetch all payrolls for the year
        year: viewYear,
      };
      
      // Fetch stats for the year
      const statsParams = {
        year: viewYear,
      };
      
      // Dispatch both actions
      await Promise.all([
        dispatch(fetchPayrolls(payrollParams)),
        dispatch(fetchPayrollStats(statsParams)),
      ]);
    } catch (error) {
      console.error("Error fetching year data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, viewYear]);

  useEffect(() => {
    fetchYearData();
  }, [fetchYearData]);

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

  // Get payroll count for a month
  const getMonthPayrollCount = (monthIndex) => {
    const monthNumber = monthIndex + 1;
    return payrolls.filter(p => p.month === monthNumber && p.year === viewYear).length;
  };

  // Check if month has payroll
  const hasPayroll = (monthIndex) => {
    return getMonthPayrollCount(monthIndex) > 0;
  };

  // Get card color based on whether it has payroll
  const getMonthCardColor = (hasPayrollData) => {
    return hasPayrollData
      ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:border-green-600"
      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600";
  };

  // Handle month click - navigate to list view with params
  const handleMonthClick = (monthIndex) => {
    const monthNumber = monthIndex + 1;
    const monthPadded = String(monthNumber).padStart(2, "0");
    navigate(`/admin/payroll/list?month=${monthPadded}&year=${viewYear}`);
  };

  // Handle year change
  const handleYearChange = (direction) => {
    setViewYear(prev => prev + direction);
  };

  // Format currency
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

  // Get currency data from stats
  const currencies = stats?.amounts_by_currency || {};
  const aedData = currencies?.AED || { total_amount: 0, total_paid: 0 };
  const inrData = currencies?.INR || { total_amount: 0, total_paid: 0 };

  // Check if user has permission
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

  // Get base path
  const basePath = isAdmin ? "/admin" : "/employee";

  // Show loading state
  const showLoading = loading || isLoading;

  return (
    <div className="w-full overflow-x-hidden px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent flex items-center gap-2">
            <i className="fas fa-calendar-alt text-green-500"></i>
            Payroll Calendar
            <span className="text-[10px] md:text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
              <i className="fas fa-calendar-check mr-1"></i> {viewYear}
            </span>
          </h2>
        </div>
        {(isAdmin || permissions?.payroll?.edit) && (
          <button
            onClick={() => navigate(`${basePath}/payroll/add`)}
            className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm font-bold flex items-center gap-2 shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 transition-all"
          >
            <i className="fas fa-plus text-xs md:text-sm"></i>
            Add Payroll
          </button>
        )}
      </div>

      {/* Year Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleYearChange(-1)}
          className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg md:text-2xl font-bold text-gray-800 dark:text-gray-200">
            {viewYear}
          </span>
        </div>
        <button
          onClick={() => handleYearChange(1)}
          className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* Month Grid */}
      {showLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-green-500 mb-3"></i>
          <p className="text-gray-500 dark:text-gray-400">
            Loading payroll data for {viewYear}...
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {monthNames.map((month, index) => {
              const count = getMonthPayrollCount(index);
              const hasPayrollData = count > 0;
              
              return (
                <button
                  key={index}
                  onClick={() => handleMonthClick(index)}
                  className={`
                    relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200
                    ${getMonthCardColor(hasPayrollData)}
                    hover:shadow-lg hover:-translate-y-1
                    bg-white dark:bg-gray-800
                    group
                  `}
                >
                  {/* Month Name */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {getMonthAbbr(index)}
                    </div>
                    <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200">
                      {month}
                    </div>
                  </div>

                  {/* Payroll Count */}
                  <div className="flex items-center justify-center mt-2">
                    {hasPayrollData ? (
                      <span className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                        {count}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        No Payroll
                      </span>
                    )}
                  </div>

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-green-400 dark:group-hover:border-green-600 transition-all pointer-events-none"></div>
                </button>
              );
            })}
          </div>

          {/* Legend - Simplified */}
          <div className="mt-6 flex flex-wrap items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50 dark:bg-green-900/20"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">Has Payroll</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">No Payroll</span>
            </div>
          </div>

          {/* Quick Stats - Now with AED and INR */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Payrolls</div>
              <div className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.total_generated || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">Months with Payroll</div>
              <div className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                {monthNames.filter((_, index) => getMonthPayrollCount(index) > 0).length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-bold text-green-600 dark:text-green-400">AED</span> Total
              </div>
              <div className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(aedData.total_amount || 0, "AED")}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-bold text-blue-600 dark:text-blue-400">INR</span> Total
              </div>
              <div className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(inrData.total_amount || 0, "INR")}
              </div>
            </div>
          </div>

          {/* Optional: Show currency breakdown with paid amounts */}
          {(aedData.total_amount > 0 || inrData.total_amount > 0) && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {aedData.total_amount > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">AED Breakdown</div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Total: {formatCurrency(aedData.total_amount, "AED")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Paid</div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(aedData.total_paid || 0, "AED")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {inrData.total_amount > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">INR Breakdown</div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        Total: {formatCurrency(inrData.total_amount, "INR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Paid</div>
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(inrData.total_paid || 0, "INR")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PayrollCalendar;