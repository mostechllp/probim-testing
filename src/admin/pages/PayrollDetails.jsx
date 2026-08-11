// src/admin/pages/PayrollView.js - Fixed currency rendering

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { showToast } from "../components/common/Toast";

import {
  fetchPayrollById,
  generatePayslip,
  clearPayrollError,
  clearPayrollSuccess,
  selectCurrentPayroll,
  selectPayrollLoading,
  selectPayrollActionLoading,
  selectPayrollError,
  selectPayrollSuccess,
  sendPayslip,
} from "../store/slices/payrollSlice";

import {
  fetchEmployeeById,
  resetCurrentEmployee,
} from "../store/slices/employeeSlice";

import { fetchEmployees } from "../store/slices/employeeSlice";

function PayrollView() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  // Get user from Redux to determine base path
  const { user } = useSelector((state) => state.auth || {});
  const isAdmin =
    user?.type === "admin" ||
    user?.role?.name === "admin" ||
    user?.role?.name === "Admin";
  const basePath = isAdmin ? "/admin" : "/employee";

  // Redux state
  const currentPayroll = useSelector(selectCurrentPayroll);
  const isLoading = useSelector(selectPayrollLoading);
  const actionLoading = useSelector(selectPayrollActionLoading);
  const error = useSelector(selectPayrollError);
  const successMessage = useSelector(selectPayrollSuccess);

  // Employee state
  const {
    employees,
    currentEmployee,
    loading: employeesLoading,
  } = useSelector((state) => state.employees);

  // Local state
  const [employeeDetails, setEmployeeDetails] = useState(null);

  // Fetch payroll data on mount
  useEffect(() => {
    if (id) {
      dispatch(fetchPayrollById(id));
    }
    return () => {
      dispatch(resetCurrentEmployee());
    };
  }, [dispatch, id]);

  // Fetch employees list to find employee by user_id
  useEffect(() => {
    if (!employees || employees.length === 0) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, employees]);

  // Find employee by user_id from the employees list
  useEffect(() => {
    if (currentPayroll?.employee_id && employees && employees.length > 0) {
      const foundEmployee = employees.find(
        (emp) =>
          emp.user_id === parseInt(currentPayroll.employee_id) ||
          emp.id === parseInt(currentPayroll.employee_id),
      );

      if (foundEmployee) {
        dispatch(fetchEmployeeById(foundEmployee.id))
          .unwrap()
          .then((data) => {
            setEmployeeDetails(data);
          })
          .catch(() => {
            setEmployeeDetails(null);
          });
      } else {
        dispatch(fetchEmployeeById(currentPayroll.employee_id))
          .unwrap()
          .then((data) => {
            setEmployeeDetails(data);
          })
          .catch(() => {
            setEmployeeDetails(null);
          });
      }
    }
  }, [currentPayroll, employees, dispatch]);

  // Also try to fetch using currentEmployee from Redux if available
  useEffect(() => {
    if (currentEmployee && !employeeDetails) {
      setEmployeeDetails(currentEmployee);
    }
  }, [currentEmployee, employeeDetails]);

  // Handle success/error messages
  useEffect(() => {
    if (successMessage) {
      showToast(successMessage, "success");
      dispatch(clearPayrollSuccess());
    }
    if (error) {
      showToast(error, "error");
      dispatch(clearPayrollError());
    }
  }, [successMessage, error, dispatch]);

  // Format currency
  const formatCurrency = (amount, currency = "INR") => {
    if (!amount && amount !== 0) return `${currency} 0.00`;
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  // Helper function to get currency code from currency object or string
  const getCurrencyCode = (currency) => {
    if (!currency) return "INR";
    if (typeof currency === "string") return currency;
    if (typeof currency === "object") {
      return currency.code || currency.symbol || "INR";
    }
    return "INR";
  };

  // Handle send payslip email
  const handleSendPayslip = async () => {
    if (!id) return;
    try {
      const result = await dispatch(sendPayslip(id)).unwrap();
      showToast(result.message || "Payslip sent successfully!", "success");
    } catch (error) {
      showToast(error || "Failed to send payslip", "error");
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
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

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusMap = {
      paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
      pending:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
      draft:
        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600",
      failed:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
      completed:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
      generated:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    };
    return statusMap[status?.toLowerCase()] || statusMap.draft;
  };

  // Handle payslip generation
  const handleGeneratePayslip = async () => {
    if (!id) return;
    try {
      await dispatch(generatePayslip(id)).unwrap();
      showToast("Payslip downloaded successfully!", "success");
    } catch (error) {
      // Error handled by slice
    }
  };

  // Get target currency from payroll
  const getTargetCurrency = () => {
    return currentPayroll?.currency || "INR";
  };

  if (isLoading) {
    return (
      <div className="w-full overflow-x-hidden px-4 md:px-6">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!currentPayroll) {
    return (
      <div className="w-full overflow-x-hidden px-4 md:px-6">
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <i className="fas fa-file-invoice text-6xl text-gray-300 dark:text-gray-600 mb-4 block"></i>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Payroll not found
          </h3>
          <button
            onClick={() => navigate(`${basePath}/payroll`)}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Back to Payroll
          </button>
        </div>
      </div>
    );
  }

  const payroll = currentPayroll;
  const stepData = payroll.step_data || {};
  const targetCurrency = payroll.currency || "INR";

  // Get data from step_5 (converted data) or fallback to step_2
  const step5 = stepData.step_5 || {};
  const step2 = stepData.step_2 || {};
  const step4 = stepData.step_4 || {};

  // Use step_5 location_breakdown if available, otherwise step_2
  const locationBreakdown =
    step5.location_breakdown || step2.location_breakdown || [];

  // Get totals from step_5 or step_2
  const totalEarnings =
    step5.gross_salary || step2.total_earnings || payroll.gross_salary || 0;
  const totalDeductions =
    step5.deductions || step4.total_deductions || payroll.deductions || 0;
  const netPay = step5.net_pay || payroll.net_pay || 0;

  // Get worked days from step_1
  const totalWorkedDays =
    stepData.step_1?.days_present || stepData.step_1?.total_working_days || 0;
  const totalDays = stepData.step_1?.total_working_days || 30;

  // Get overtime from step_5 or step_3
  const overtimeDetails =
    step5.overtime_details || stepData.step_3?.overtime_details || [];
  const totalOvertime =
    step5.overtime || stepData.step_3?.total_overtime_amount || 0;

  // Get deductions from step_5 or step_4
  const deductionsDetails = step5.deductions_details || step4.deductions || [];

  // ✅ Get leave details from payroll data
  const leaveDetails = payroll.leaveDetails || [];

  // Get conversion data
  const conversions = step5.summary?.conversions || {};
  const targetCurrencyDisplay = step5.target_currency || targetCurrency;

  const monthDisplay = getMonthName(payroll.month || 6);
  const yearDisplay = payroll.year || 2026;

  // Get employee details from payroll data
  const employeeName = payroll.employee_name || "Unknown Employee";
  const employeeId = payroll.employee_id || "-";
  const designation = payroll.designation?.name || "-";
  const department = payroll.department?.name || "-";

  // ✅ Get joining date from payroll data directly
  const joiningDate =
    payroll.joining_date ||
    employeeDetails?.joining_date ||
    employeeDetails?.date_of_joining ||
    "-";

  // ✅ Get bank details from payroll data (bank_details array) or employeeDetails
  const bankDetails =
    payroll.bank_details || employeeDetails?.bank_details || [];
  const primaryBank = bankDetails.length > 0 ? bankDetails[0] : null;

  const bankName = primaryBank?.bank_name || employeeDetails?.bank_name || "-";
  const accountNumber =
    primaryBank?.account_number || employeeDetails?.account_number || "-";
  const swiftCode =
    primaryBank?.swift_code ||
    employeeDetails?.swift_code ||
    employeeDetails?.ifsc_code ||
    "-";
  const branchName =
    primaryBank?.branch_name || employeeDetails?.branch || "N/A";
  const ibanNumber = primaryBank?.iban_number || "-";
  const bankCountry = primaryBank?.bank_country || "-";

  // ✅ Get employee avatar
  const avatarUrl = payroll.avatar || employeeDetails?.avatar || null;

  // Generate payslip reference number
  const payslipRef = `#PS${yearDisplay}${String(payroll.month || 6).padStart(2, "0")}${String(payroll.id || "").padStart(4, "0")}`;

  // Get organization name
  const orgName =
    employeeDetails?.organization?.name ||
    employeeDetails?.user?.organization?.name ||
    "Organization";

  return (
    <div className="w-full overflow-x-hidden px-4 md:px-6 py-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3 mb-6">
        {payroll.status === "completed" && (
          <>
            <button
              onClick={handleSendPayslip}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <i
                className={`fas ${actionLoading ? "fa-spinner fa-spin" : "fa-paper-plane"}`}
              ></i>
              {actionLoading ? "Sending..." : "Send Payslip"}
            </button>
            <button
              onClick={handleGeneratePayslip}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <i className="fas fa-download"></i> Download PDF
            </button>
          </>
        )}

        <Link
          to={`${basePath}/payroll/edit/${payroll.id}`}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
        >
          <i className="fas fa-edit"></i> Edit
        </Link>
        <button
          onClick={() => navigate(`${basePath}/payroll`)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
      </div>

      {/* Payslip Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden max-w-5xl mx-auto">
        {/* Top Stripe */}
        <div className="h-2 bg-gradient-to-r from-emerald-900 to-emerald-500"></div>

        {/* Header */}
        <div className="px-6 md:px-11 py-7 md:py-9 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-extrabold text-xl">
              P
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-emerald-800 dark:text-emerald-400 tracking-tight">
                {orgName}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                Payroll & HR Services
              </p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-gray-200 tracking-wide">
              PAYSLIP
            </h2>
            <div className="inline-block mt-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              {payslipRef}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 md:px-11 py-7 md:py-9">
          {/* Status Badge */}
          <div className="mb-6">
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusBadge(payroll.status)}`}
            >
              <i
                className={`fas ${
                  payroll.status === "completed" || payroll.status === "paid"
                    ? "fa-check-circle"
                    : payroll.status === "generated"
                    ? "fa-file-pdf"
                    : payroll.status === "pending"
                      ? "fa-clock"
                      : "fa-file"
                } mr-2`}
              ></i>
              Status:{" "}
              {payroll.status
                ? payroll.status.charAt(0).toUpperCase() +
                  payroll.status.slice(1)
                : "Draft"}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                Pay Period
              </span>
              <div className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 mt-1">
                {monthDisplay} {yearDisplay}
              </div>
            </div>
            <div>
              <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                Payment Date
              </span>
              <div className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 mt-1">
                {formatDate(payroll.payment_date) || "Not set"}
              </div>
            </div>
            <div>
              <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                Worked Days
              </span>
              <div className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 mt-1">
                {totalWorkedDays} / {totalDays} Days
              </div>
            </div>
            <div>
              <span className="text-[10px] md:text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                Net Disbursement
              </span>
              <div className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(netPay, targetCurrencyDisplay)}
              </div>
            </div>
          </div>

          {/* Employee & Banking Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Employee Info */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6">
              <div className="text-[10px] md:text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 pb-2 border-b-2 border-emerald-50 dark:border-emerald-900/30">
                Employee Profile
              </div>

              {/* Employee Avatar and Name Header */}
              <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={employeeName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200 dark:border-emerald-800"
                  />
                ) : (
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-extrabold text-2xl">
                    {employeeName?.charAt(0) || "E"}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                    {employeeName}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Employee #{employeeId}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Designation
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {designation}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Department
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {department}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Date of Joining
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {formatDate(joiningDate) || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Banking Info */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6">
              <div className="text-[10px] md:text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 pb-2 border-b-2 border-emerald-50 dark:border-emerald-900/30">
                Disbursement Info
              </div>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Bank Name
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {bankName}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Account Number
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {accountNumber}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      IBAN
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right text-xs">
                      {ibanNumber}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      SWIFT / IFSC
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {swiftCode}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Branch
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {branchName}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 font-medium">
                      Bank Country
                    </td>
                    <td className="py-1.5 text-gray-800 dark:text-gray-200 font-semibold text-right">
                      {bankCountry}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ Leave Details Section */}
          {leaveDetails && leaveDetails.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] md:text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Leave Details
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-emerald-700 dark:bg-emerald-800">
                      <th className="px-4 py-2.5 text-left text-white font-semibold text-xs tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-4 py-2.5 text-left text-white font-semibold text-xs tracking-wider">
                        Start Date
                      </th>
                      <th className="px-4 py-2.5 text-left text-white font-semibold text-xs tracking-wider">
                        End Date
                      </th>
                      <th className="px-4 py-2.5 text-center text-white font-semibold text-xs tracking-wider">
                        Days
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveDetails.map((leave, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {leave.leave_type || "Leave"}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {leave.start_date || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {leave.end_date || "-"}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-800 dark:text-gray-200 font-semibold">
                          {leave.days || 0}
                        </td>
                      </tr>
                    ))}
                    {/* Total Leave Days */}
                    {leaveDetails.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-gray-700/30 font-bold">
                        <td colSpan="3" className="px-4 py-2.5 text-gray-700 dark:text-gray-300 text-right">
                          Total Leave Days
                        </td>
                        <td className="px-4 py-2.5 text-center text-emerald-600 dark:text-emerald-400">
                          {leaveDetails.reduce((sum, leave) => sum + (leave.days || 0), 0)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Currency Conversion Info */}
          {conversions && Object.keys(conversions).length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <i className="fas fa-exchange-alt text-blue-500"></i>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Currency Conversion
                  </h4>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                    Converted from mixed currencies to {targetCurrencyDisplay}
                  </p>
                  {step5.conversion_rates && step5.conversion_rates.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(step5.conversion_rates).map(
                        ([currency, rate]) => (
                          <span
                            key={currency}
                            className="text-[10px] bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300"
                          >
                            {currency} → {targetCurrencyDisplay}: {rate}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Earnings Breakdown */}
          <div className="mb-6">
            <div className="text-[10px] md:text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
              Earnings Breakdown
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-emerald-700 dark:bg-emerald-800">
                    <th className="px-4 py-2.5 text-left text-white font-semibold text-xs tracking-wider">
                      Component
                    </th>
                    <th className="px-4 py-2.5 text-right text-white font-semibold text-xs tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locationBreakdown.length > 0 ? (
                    locationBreakdown.map((loc, locIndex) => {
                      // ✅ Fix: Get currency code safely
                      const locCurrency = getCurrencyCode(loc.currency);
                      const hasEarnings =
                        loc.salary_components &&
                        loc.salary_components.some((c) => c.amount > 0);

                      return (
                        <React.Fragment key={locIndex}>
                          <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                            <td
                              colSpan="2"
                              className="px-4 py-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs"
                            >
                              {loc.location_name || "Package"} (
                              {loc.worked_days || 0} Days) - {locCurrency}
                            </td>
                          </tr>
                          {loc.salary_components &&
                          loc.salary_components.length > 0 &&
                          hasEarnings ? (
                            loc.salary_components.map((comp, compIndex) => (
                              <tr
                                key={compIndex}
                                className="border-b border-gray-100 dark:border-gray-700/50"
                              >
                                <td className="px-4 py-2 pl-8 text-gray-600 dark:text-gray-400">
                                  {comp.name}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-800 dark:text-gray-200 font-semibold">
                                  {formatCurrency(comp.amount, locCurrency)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan="2"
                                className="px-4 py-2 pl-8 text-gray-400 dark:text-gray-500 italic"
                              >
                                No earnings recorded in this package
                              </td>
                            </tr>
                          )}
                          <tr className="bg-gray-50 dark:bg-gray-700/30 font-bold">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              Subtotal for {loc.location_name || "Package"}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-800 dark:text-gray-200">
                              {formatCurrency(loc.subtotal || 0, locCurrency)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                      >
                        <i className="fas fa-inbox text-2xl mb-2 block"></i>
                        No earnings data available
                      </td>
                    </tr>
                  )}
                  {locationBreakdown.length > 0 && (
                    <tr className="bg-emerald-100 dark:bg-emerald-900/30 font-bold">
                      <td className="px-4 py-2.5 text-emerald-800 dark:text-emerald-300">
                        Total Earnings
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-800 dark:text-emerald-300">
                        {formatCurrency(totalEarnings, targetCurrencyDisplay)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deductions */}
          <div className="mb-6">
            <div className="text-[10px] md:text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
              Deductions
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-emerald-700 dark:bg-emerald-800">
                    <th className="px-4 py-2.5 text-left text-white font-semibold text-xs tracking-wider">
                      Component
                    </th>
                    <th className="px-4 py-2.5 text-right text-white font-semibold text-xs tracking-wider">
                      Amount ({targetCurrencyDisplay})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deductionsDetails && deductionsDetails.length > 0 ? (
                    deductionsDetails.map((d, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                          {d.type || "Deduction"}
                        </td>
                        <td className="px-4 py-2 text-right text-red-600 dark:text-red-400 font-semibold">
                          {formatCurrency(
                            d.amount,
                            d.currency || targetCurrencyDisplay,
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
                      >
                        <i className="fas fa-minus-circle text-2xl mb-2 block"></i>
                        No deductions available
                      </td>
                    </tr>
                  )}
                  {deductionsDetails && deductionsDetails.length > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-700/30 font-bold">
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        Total Deductions
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(totalDeductions, targetCurrencyDisplay)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overtime (if any) */}
          {overtimeDetails &&
            overtimeDetails.length > 0 &&
            totalOvertime > 0 && (
              <div className="mb-6">
                <div className="text-[10px] md:text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                  Overtime Details
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-emerald-700 dark:bg-emerald-800">
                        <th className="px-4 py-2.5 text-left text-white font-semibold text-xs tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-2.5 text-center text-white font-semibold text-xs tracking-wider">
                          Hours
                        </th>
                        <th className="px-4 py-2.5 text-right text-white font-semibold text-xs tracking-wider">
                          Amount ({targetCurrencyDisplay})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overtimeDetails.map((ot, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-gray-700/50"
                        >
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {ot.date || "-"}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-800 dark:text-gray-200 font-semibold">
                            {ot.overtime_hours || 0}h
                          </td>
                          <td className="px-4 py-2 text-right text-orange-600 dark:text-orange-400 font-semibold">
                            {formatCurrency(
                              ot.amount || 0,
                              ot.currency || targetCurrencyDisplay,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Net Pay Hero Card */}
          <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 dark:from-emerald-800 dark:to-emerald-900 rounded-xl p-5 md:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
            <div>
              <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/80 font-bold">
                Final Net Payable Amount
              </div>
              <div className="text-xs text-white/60 mt-1">
                Disbursed to {bankName || "registered bank"} - Account{" "}
                {accountNumber || "registered account"}
              </div>
              <div className="text-xs text-white/50 mt-1">
                Status: <span className="capitalize">{payroll.status}</span>
              </div>
            </div>
            <div className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {formatCurrency(netPay, targetCurrencyDisplay)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayrollView;