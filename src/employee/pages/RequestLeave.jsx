import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  addLeaveRequest,
  fetchEmployeeLeaves,
  fetchLeaveBalance,
  fetchLeaveTypes,
} from "../store/slices/leavesSlice";
import {
  FiCalendar,
  FiMessageSquare,
  FiPaperclip,
  FiSend,
  FiX,
  FiAlertCircle,
  FiList,
  FiClock,
} from "react-icons/fi";
import { MdCalculate } from "react-icons/md";
import DateInput from "../../admin/components/common/DateInput";

// Color mapping for leave types
const getLeaveTypeColor = (typeName) => {
  const name = typeName?.toLowerCase() || "";

  if (name.includes("sick"))
    return {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      icon: "fa-thermometer-half",
    };
  if (name.includes("annual") || name.includes("vacation"))
    return {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
      icon: "fa-suitcase",
    };
  if (name.includes("casual"))
    return {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      icon: "fa-umbrella-beach",
    };
  if (name.includes("maternity"))
    return {
      bg: "bg-pink-50 dark:bg-pink-900/20",
      border: "border-pink-200 dark:border-pink-800",
      text: "text-pink-700 dark:text-pink-300",
      icon: "fa-baby",
    };
  if (name.includes("paternity"))
    return {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-700 dark:text-purple-300",
      icon: "fa-baby",
    };
  if (name.includes("unpaid"))
    return {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-300",
      icon: "fa-clock",
    };

  return {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-700 dark:text-teal-300",
    icon: "fa-calendar-alt",
  };
};

const RequestLeave = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const leavesState = useSelector((state) => state.EmpLeaves);
  const employeeState = useSelector(
    (state) => state.employee || state.employees,
  );
  const authState = useSelector((state) => state.auth);

  const leaveBalances = leavesState?.leaveBalances || {};
  const leaveTypes = leavesState?.leaveTypes || [];
  const submitting = leavesState?.submitting || false;
  const error = leavesState?.error || null;
  const loadingLeaveTypes = leavesState?.loading || false;
  const loading = leavesState?.loading || false;

  // Get employee ID from employee state - with fallback
  const employeeId =
    authState?.user?.employee?.id ||
    authState?.user?.employee_id ||
    employeeState?.currentEmployee?.employee_id ||
    null;

  const [formData, setFormData] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    claim_salary: "0",
    start_session: "morning", // morning or afternoon
    end_session: "afternoon", // morning or afternoon
  });
  const [totalDays, setTotalDays] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const [isDataReady, setIsDataReady] = useState(false);

  // Fetch leave types on mount
  useEffect(() => {
    dispatch(fetchLeaveTypes());
  }, [dispatch]);

  // Fetch leaves and balance on mount
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch balance if we have an employee ID
      if (employeeId || authState?.user?.employee_id) {
        const result = await dispatch(fetchLeaveBalance());
      } else {
        console.warn("No employee ID available, skipping balance fetch");
      }
    };
    fetchData();
  }, [dispatch, employeeId, authState?.user?.employee_id]);

  // Check if data is ready
  useEffect(() => {
    // Data is ready when we have either employeeId OR we've loaded leave types
    if (employeeId || leaveTypes.length > 0) {
      setIsDataReady(true);
    }
  }, [employeeId, leaveTypes]);

  // Calculate days when dates change
  useEffect(() => {
    calculateDays();
  }, [formData.start_date, formData.end_date, formData.start_session, formData.end_session]);

  /**
   * Calculate working days excluding Sundays
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} Number of days excluding Sundays
   */
  const getWorkingDays = (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to avoid timezone issues
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // If start date is after end date, return 0
    if (current > end) return 0;
    
    while (current <= end) {
      // Sunday is 0, so exclude Sundays
      if (current.getDay() !== 0) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const from = new Date(formData.start_date);
      const to = new Date(formData.end_date);
      
      // Set time to avoid timezone issues
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      
      if (to >= from) {
        // Get working days excluding Sundays
        let days = getWorkingDays(from, to);
        
        // If no working days, set to 0
        if (days === 0) {
          setTotalDays(0);
          return;
        }
        
        // Adjust for sessions
        if (formData.start_session === "afternoon") {
          days = days - 0.5;
        }
        if (formData.end_session === "morning") {
          days = days - 0.5;
        }
        
        // Ensure minimum is 0.5 if there's any leave
        if (days < 0.5 && days > 0) {
          days = 0.5;
        }
        
        setTotalDays(days);
      } else {
        setTotalDays(0);
      }
    } else {
      setTotalDays(0);
    }
  };

  const handleStartDateChange = (dateValue) => {
    setFormData({ ...formData, start_date: dateValue });
    if (
      formData.end_date &&
      dateValue &&
      new Date(formData.end_date) < new Date(dateValue)
    ) {
      setFormData((prev) => ({ ...prev, end_date: "" }));
    }
  };

  const handleEndDateChange = (dateValue) => {
    setFormData({ ...formData, end_date: dateValue });
  };

  const validateForm = () => {
    if (!formData.leave_type_id) {
      setLocalError("Please select a leave type");
      return false;
    }
    if (!formData.start_date) {
      setLocalError("Please select start date");
      return false;
    }
    if (!formData.end_date) {
      setLocalError("Please select end date");
      return false;
    }
    if (totalDays <= 0) {
      setLocalError(
        "Please select valid dates (end date must be after start date)",
      );
      return false;
    }
    if (formData.reason.length < 10) {
      setLocalError("Please provide a reason (minimum 10 characters)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!validateForm()) {
      return;
    }

    // Check if selected leave type has enough balance
    const selectedLeaveType = leaveTypes.find(
      (lt) => lt.id === parseInt(formData.leave_type_id),
    );
    if (selectedLeaveType) {
      const balance = leaveBalances[selectedLeaveType.name] || { remaining: 0 };
      if (totalDays > balance.remaining && balance.remaining >= 0) {
        setLocalError(
          `Requested days (${totalDays}) exceed available ${selectedLeaveType.name} balance (${balance.remaining} days)`,
        );
        return;
      }
    }

    // Create FormData for the request
    const formDataToSend = new FormData();
    formDataToSend.append("leave_type_id", formData.leave_type_id);
    formDataToSend.append("start_date", formData.start_date);
    formDataToSend.append("end_date", formData.end_date);
    formDataToSend.append("reason", formData.reason);
    formDataToSend.append("claim_salary", formData.claim_salary);
    // Send session1 and session2
    formDataToSend.append("session1", formData.start_session);
    formDataToSend.append("session2", formData.end_session);
    formDataToSend.append("year", new Date().getFullYear().toString());

    if (selectedFile) {
      formDataToSend.append("document", selectedFile);
    }

    const result = await dispatch(addLeaveRequest(formDataToSend));

    if (addLeaveRequest.fulfilled.match(result)) {
      await dispatch(fetchEmployeeLeaves());
      await dispatch(fetchLeaveBalance());
      navigate("/employee/leaves");
    }
  };

  // In RequestLeave.jsx, the balance access should work like this:
const getSelectedLeaveBalance = () => {
  if (!formData.leave_type_id) {
    return { allocated: 0, used: 0, pending: 0, remaining: 0 };
  }

  const selectedType = leaveTypes.find(
    (lt) => lt.id === parseInt(formData.leave_type_id),
  );
  
  if (selectedType) {
    // Access by leave type name from the leaveBalances object
    const balance = leaveBalances[selectedType.name];
    if (balance) {
      return {
        allocated: balance.allocated || 0,
        used: balance.taken || balance.used || 0,
        pending: balance.pending || 0,
        remaining: balance.remaining || 0,
      };
    }
  }
  
  return { allocated: 0, used: 0, pending: 0, remaining: 0 };
};

  const selectedBalance = getSelectedLeaveBalance();
  const remaining = selectedBalance?.remaining ?? 0;
  const usedLeaves = selectedBalance?.taken ?? 0;
  const pendingLeaves = selectedBalance?.pending ?? 0;
  const allocatedLeaves = selectedBalance?.allocated ?? 0;
  const exceedsBalance = totalDays > remaining && remaining >= 0;

  const getMinEndDate = () => {
    if (formData.start_date) {
      return formData.start_date;
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Show loading state only if we're still loading and don't have data
  if (loading || loadingLeaveTypes) {
    return (
      <div className="w-full px-4 md:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link
          to="/employee/dashboard"
          className="text-green-500 hover:text-green-600 font-medium"
        >
          Dashboard
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <Link
          to="/employee/leaves"
          className="text-green-500 hover:text-green-600 font-medium"
        >
          My Leaves
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500 dark:text-gray-400">Request Leave</span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className="fas fa-calendar-plus mr-2"></i> Leave Application
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Submit a request for leave
        </p>
      </div>

      {/* Error Display */}
      {(localError || error) && (
        <div className="error-message mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-3 text-red-600">
          <FiAlertCircle className="text-xl" />
          <span className="text-sm">{localError || error}</span>
        </div>
      )}

      <div className="split-container grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        {/* Form */}
        <div className="form-container bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="form-section-title text-lg font-bold text-green-600 mb-6 pb-3 border-b-2 border-green-100 dark:border-green-900/30 flex items-center gap-2.5">
              <FiCalendar /> Leave Details
            </div>

            {/* Leave Type - Full Width */}
            <div className="form-field flex flex-col gap-2 mb-5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FiList className="text-green-500" /> Leave Type{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                value={formData.leave_type_id}
                onChange={(e) =>
                  setFormData({ ...formData, leave_type_id: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                disabled={loadingLeaveTypes}
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => {
                  const balance = leaveBalances[type.name] || {
                    remaining: 0,
                  };
                  return (
                    <option key={type.id} value={type.id}>
                      {type.name} (Available: {balance.remaining} days)
                    </option>
                  );
                })}
              </select>
              {loadingLeaveTypes && (
                <p className="text-xs text-gray-400">
                  Loading leave types...
                </p>
              )}
            </div>

            {/* Date Inputs with Sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
              {/* Start Date and Session */}
              <div className="form-field flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FiCalendar className="text-green-500" /> Start Date{" "}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <DateInput
                  value={formData.start_date}
                  onChange={handleStartDateChange}
                  type="general"
                  minDate={new Date()}
                  className="w-full"
                  placeholder="Select start date"
                />
              </div>

              <div className="form-field flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FiClock className="text-green-500" /> Start Session{" "}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={formData.start_session}
                  onChange={(e) =>
                    setFormData({ ...formData, start_session: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>

              {/* End Date and Session */}
              <div className="form-field flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FiCalendar className="text-green-500" /> End Date{" "}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <DateInput
                  value={formData.end_date}
                  onChange={handleEndDateChange}
                  type="general"
                  minDate={getMinEndDate()}
                  className="w-full"
                  placeholder="Select end date"
                />
              </div>

              <div className="form-field flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FiClock className="text-green-500" /> End Session{" "}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={formData.end_session}
                  onChange={(e) =>
                    setFormData({ ...formData, end_session: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>

              <div className="form-field flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <MdCalculate className="text-green-500" /> Total Days
                </label>
                <div
                  className={`total-days-box p-3 rounded-lg text-center ${exceedsBalance ? "bg-red-500/10" : "bg-green-500/10"}`}
                >
                  <span
                    className={`text-2xl md:text-3xl font-extrabold ${exceedsBalance ? "text-red-600" : "text-green-600"} block`}
                  >
                    {totalDays}
                  </span>
                  <small className="text-[11px] text-gray-500">
                    {totalDays === 1 ? "Day" : "Days"} (Excluding Sundays)
                  </small>
                </div>
              </div>

              <div className="form-field flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <FiPaperclip className="text-green-500" /> Supporting Document
                  <span className="text-gray-400 text-[10px] ml-1">
                    (Optional)
                  </span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className="py-2.5 px-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-500 file:text-white file:cursor-pointer hover:file:bg-green-600 w-full"
                />
              </div>
            </div>

            {/* Reason - Full width */}
            <div className="form-field flex flex-col gap-2 mb-6">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FiMessageSquare className="text-green-500" /> Reason for Leave{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows="4"
                placeholder="Please describe your reason for requesting leave (min 10 characters)..."
                className="w-full py-3 px-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
                required
              />
              <small
                className={`text-[11px] ${formData.reason.length >= 10 ? "text-green-500" : "text-red-500"}`}
              >
                {formData.reason.length}/10 characters minimum
              </small>
            </div>

            {/* Claim Salary */}
            <div className="form-field flex flex-row items-center gap-4 mb-6">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap">
                <i className="fas fa-money-bill-wave text-green-500" /> Claim
                Salary
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="claimSalary"
                    value="1"
                    checked={formData.claim_salary === "1"}
                    onChange={() =>
                      setFormData({ ...formData, claim_salary: "1" })
                    }
                    className="w-4 h-4 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Yes
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="claimSalary"
                    value="0"
                    checked={formData.claim_salary === "0"}
                    onChange={() =>
                      setFormData({ ...formData, claim_salary: "0" })
                    }
                    className="w-4 h-4 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    No
                  </span>
                </label>
              </div>
            </div>

            {exceedsBalance && (
              <div className="warning-message mb-6 p-3 bg-amber-500/10 border border-amber-500 rounded-lg text-amber-600 text-sm">
                ⚠️ Warning: Requested days ({totalDays}) exceed available
                balance ({remaining} days)
              </div>
            )}

            <div className="form-actions flex flex-col sm:flex-row justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/employee/leaves"
                className="px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
              >
                <FiX /> Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || exceedsBalance}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiSend /> Submit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Balance Card - Dynamic based on selected leave type */}
        <div className="balance-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm sticky top-24">
          <div className="balance-header text-center pb-5 border-b border-gray-200 dark:border-gray-700 mb-5">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {formData.leave_type_id ? (
                <>
                  {leaveTypes.find(
                    (lt) => lt.id === parseInt(formData.leave_type_id),
                  )?.name || "Leave"}{" "}
                  Balance
                </>
              ) : (
                "Leave Balance"
              )}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.leave_type_id ? (
                <>Current allocation for {new Date().getFullYear()}</>
              ) : (
                <>Select a leave type to view balance</>
              )}
            </p>
          </div>

          {formData.leave_type_id ? (
            <>
              <div className="balance-remaining text-center mb-6">
                <div
                  className={`remaining-number text-4xl md:text-5xl font-extrabold ${remaining < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {remaining}
                </div>
                <div className="remaining-label text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Days Remaining
                </div>
              </div>

              <div className="balance-stats flex gap-4 mb-6">
                <div className="balance-stat flex-1 text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="stat-value text-xl font-bold text-gray-800 dark:text-gray-200">
                    {allocatedLeaves}
                  </div>
                  <div className="stat-label text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    Allocated
                  </div>
                </div>
                <div className="balance-stat flex-1 text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="stat-value text-xl font-bold text-gray-800 dark:text-gray-200">
                    {usedLeaves}
                  </div>
                  <div className="stat-label text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    Used
                  </div>
                </div>
                <div className="balance-stat flex-1 text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="stat-value text-xl font-bold text-gray-800 dark:text-gray-200">
                    {remaining}
                  </div>
                  <div className="stat-label text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    Balance
                  </div>
                </div>
              </div>

              <div className="info-note mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  <FiAlertCircle className="inline mr-1" />
                  Leave requests require approval from HR/Admin
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl text-gray-300 dark:text-gray-600 mb-3">
                <i className="fas fa-calendar-check"></i>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a leave type to view your balance
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestLeave;