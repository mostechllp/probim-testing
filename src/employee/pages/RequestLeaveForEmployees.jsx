import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  addLeaveRequestForEmployee,
  fetchLeaveTypes,
  fetchEmployeesForLeave,
  clearLeaveError,
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
  FiUser,
  FiSearch,
  FiCheck,
  FiFile,
} from "react-icons/fi";
import { MdCalculate } from "react-icons/md";
import DateInput from "../../admin/components/common/DateInput";
import { showToast } from "../../components/common/Toast";

const RequestLeaveForEmployee = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  
  // Determine base path from current route
  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/employee')) return '/employee';
    return '';
  };
  const basePath = getBasePath();

  const leavesState = useSelector((state) => state.EmpLeaves);
  const leaveTypes = leavesState?.leaveTypes || [];
  const submitting = leavesState?.submitting || false;
  const error = leavesState?.error || null;
  const loadingLeaveTypes = leavesState?.loading || false;
  const employeesList = Array.isArray(leavesState?.employeesList)
    ? leavesState.employeesList
    : [];

  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    claim_salary: "0",
    start_session: "morning",
    end_session: "afternoon",
  });
  const [totalDays, setTotalDays] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
  const [fileError, setFileError] = useState("");
  const [apiError, setApiError] = useState("");

  // Clear API error when form changes
  useEffect(() => {
    if (apiError) {
      setApiError("");
    }
  }, [formData, selectedFile]);

  // Reset error from Redux store on unmount
  useEffect(() => {
    return () => {
      dispatch(clearLeaveError());
    };
  }, [dispatch]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch leave types and employees on mount
  useEffect(() => {
    dispatch(fetchLeaveTypes());
    dispatch(fetchEmployeesForLeave());
  }, [dispatch]);

  // Update selected leave type when leave_type_id changes
  useEffect(() => {
    if (formData.leave_type_id) {
      const type = leaveTypes.find(t => t.id === parseInt(formData.leave_type_id));
      setSelectedLeaveType(type || null);
      // Clear file error when leave type changes
      setFileError("");
    } else {
      setSelectedLeaveType(null);
    }
  }, [formData.leave_type_id, leaveTypes]);

  // Filter employees based on search
  const filteredEmployees = employeesList.filter((emp) => {
    const searchLower = searchEmployee.toLowerCase();
    const fullName =
      emp.first_name && emp.last_name
        ? `${emp.first_name} ${emp.last_name}`
        : emp.name || "";
    return (
      (emp.first_name || "").toLowerCase().includes(searchLower) ||
      (emp.last_name || "").toLowerCase().includes(searchLower) ||
      fullName.toLowerCase().includes(searchLower) ||
      (emp.employee_id || "").toLowerCase().includes(searchLower) ||
      (emp.email || emp.company_email || "").toLowerCase().includes(searchLower)
    );
  });

  // Calculate days when dates change
  useEffect(() => {
    calculateDays();
  }, [
    formData.start_date,
    formData.end_date,
    formData.start_session,
    formData.end_session,
  ]);

  const getWorkingDays = (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (current > end) return 0;
    while (current <= end) {
      if (current.getDay() !== 0) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

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

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const from = new Date(formData.start_date);
      const to = new Date(formData.end_date);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      if (to >= from) {
        let days = getWorkingDays(from, to);
        if (days === 0) {
          setTotalDays(0);
          return;
        }
        if (formData.start_session === "afternoon") {
          days = days - 0.5;
        }
        if (formData.end_session === "morning") {
          days = days - 0.5;
        }
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

  const handleEmployeeSelect = (employee) => {
    const fullName = employee.first_name && employee.last_name 
      ? `${employee.first_name} ${employee.last_name}` 
      : employee.name || '';
    setFormData({ ...formData, employee_id: employee.id });
    setSearchEmployee(fullName);
    setShowDropdown(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size should be less than 5MB");
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFileError("Please upload PDF, DOC, DOCX, JPG, or PNG file");
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      
      setFileError("");
      setSelectedFile(file);
    }
  };

  const validateForm = () => {
    // Reset errors
    setLocalError("");
    setFileError("");
    setApiError("");

    if (!formData.employee_id) {
      setLocalError("Please select an employee");
      return false;
    }
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

    // Check if document is required for sick leave
    if (selectedLeaveType) {
      const isSickLeave = selectedLeaveType.name?.toLowerCase() === 'sick leave' || 
                          selectedLeaveType.name?.toLowerCase().includes('sick');
      
      if (isSickLeave && !selectedFile) {
        setFileError("Medical certificate is required for sick leave");
        setLocalError("Medical certificate is required for sick leave");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setFileError("");
    setApiError("");

    if (!validateForm()) {
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("employee_id", formData.employee_id);
    formDataToSend.append("leave_type_id", formData.leave_type_id);
    formDataToSend.append("start_date", formData.start_date);
    formDataToSend.append("end_date", formData.end_date);
    formDataToSend.append("reason", formData.reason);
    formDataToSend.append("claim_salary", formData.claim_salary);
    formDataToSend.append("session1", formData.start_session);
    formDataToSend.append("session2", formData.end_session);
    formDataToSend.append("year", new Date().getFullYear().toString());

    if (selectedFile) {
      formDataToSend.append("document", selectedFile);
    }

    try {
      const result = await dispatch(addLeaveRequestForEmployee(formDataToSend));

      if (addLeaveRequestForEmployee.fulfilled.match(result)) {
        showToast("Leave request submitted successfully!", "success");
        if(user?.type === "admin") navigate(`${basePath}/leaves`);
        if(user?.role?.name === "HR Manager") navigate(`${basePath}/leave-management`);
      } else if (addLeaveRequestForEmployee.rejected.match(result)) {
        // Handle rejected action
        const errorPayload = result.payload;
        
        // Extract error message from various possible formats
        let errorMessage = "Failed to submit leave request. Please try again.";
        
        if (errorPayload) {
          // Check for message in different formats
          if (typeof errorPayload === 'string') {
            errorMessage = errorPayload;
          } else if (errorPayload.message) {
            errorMessage = errorPayload.message;
          } else if (errorPayload.error) {
            errorMessage = errorPayload.error;
          } else if (errorPayload.data?.message) {
            errorMessage = errorPayload.data.message;
          } else if (errorPayload.data?.error) {
            errorMessage = errorPayload.data.error;
          }
        }
        
        setApiError(errorMessage);
        showToast(errorMessage, "error");
      }
    } catch (err) {
      console.error("Submit error:", err);
      const errorMessage = err?.message || "An unexpected error occurred";
      setApiError(errorMessage);
      showToast(errorMessage, "error");
    }
  };

  if (loadingLeaveTypes) {
    return (
      <div className="w-full px-4 md:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  // Check if selected leave type is sick leave
  const isSickLeave = selectedLeaveType?.name?.toLowerCase() === 'sick leave' || 
                      selectedLeaveType?.name?.toLowerCase().includes('sick');

  return (
    <div className="w-full px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link
          to={`${basePath}/dashboard`}
          className="text-green-500 hover:text-green-600 font-medium"
        >
          Dashboard
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <Link
          to={`${basePath}/leaves`}
          className="text-green-500 hover:text-green-600 font-medium"
        >
          Leaves
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500 dark:text-gray-400">
          Request Leave for Employee
        </span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className="fas fa-calendar-plus mr-2"></i> Request Leave for
          Employee
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Submit a leave request on behalf of an employee
        </p>
      </div>

      {/* Error Display - Combined for all errors */}
      {(localError || apiError || error || fileError) && (
        <div className="error-message mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <div className="flex items-start gap-3 text-red-600">
            <FiAlertCircle className="text-xl flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {localError && <p className="text-sm">{localError}</p>}
              {apiError && <p className="text-sm font-medium">{apiError}</p>}
              {error && (
                <p className="text-sm">
                  {typeof error === 'string' ? error : error.message || 'An error occurred'}
                </p>
              )}
              {fileError && !localError && !apiError && !error && (
                <p className="text-sm">{fileError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="split-container grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        {/* Form */}
        <div className="form-container bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="form-section-title text-lg font-bold text-green-600 mb-6 pb-3 border-b-2 border-green-100 dark:border-green-900/30 flex items-center gap-2.5">
              <FiCalendar /> Leave Details
            </div>

            {/* Employee Selection */}
            <div className="form-field flex flex-col gap-2 mb-5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FiUser className="text-green-500" /> Select Employee{" "}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchEmployee}
                    onChange={(e) => {
                      setSearchEmployee(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) {
                        setFormData({ ...formData, employee_id: "" });
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search employee by name or ID..."
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                {showDropdown && filteredEmployees.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredEmployees.map((emp) => {
                      const fullName = emp.first_name && emp.last_name 
                        ? `${emp.first_name} ${emp.last_name}` 
                        : emp.name || '';
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleEmployeeSelect(emp)}
                          className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                            {(emp.first_name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {fullName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {emp.employee_id} •{" "}
                              {emp.email || emp.company_email}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showDropdown &&
                  filteredEmployees.length === 0 &&
                  searchEmployee && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center">
                      <p className="text-sm text-gray-500">
                        No employees found
                      </p>
                    </div>
                  )}
                {formData.employee_id && (
                  <p className="text-xs text-green-600 mt-1">
                    <FiCheck className="inline mr-1" /> Employee selected
                  </p>
                )}
              </div>
            </div>

            {/* Leave Type */}
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
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {isSickLeave && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <FiAlertCircle className="text-xs" />
                  Medical certificate is required for sick leave
                </p>
              )}
            </div>

            {/* Date Inputs with Sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
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
                <div className="total-days-box p-3 rounded-lg text-center bg-green-500/10">
                  <span className="text-2xl md:text-3xl font-extrabold text-green-600 block">
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
                  {isSickLeave ? (
                    <span className="text-red-500 text-[10px] ml-1">*</span>
                  ) : (
                    <span className="text-gray-400 text-[10px] ml-1">
                      (Optional)
                    </span>
                  )}
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  className={`py-2.5 px-3.5 bg-gray-50 dark:bg-gray-900 border ${
                    fileError || (isSickLeave && !selectedFile && formData.leave_type_id)
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-200 dark:border-gray-700'
                  } rounded-lg text-sm text-gray-800 dark:text-gray-200 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-500 file:text-white file:cursor-pointer hover:file:bg-green-600 w-full`}
                />
                {fileError && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <FiAlertCircle className="text-xs" />
                    {fileError}
                  </p>
                )}
                {isSickLeave && selectedFile && !fileError && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <FiCheck className="text-xs" />
                    Medical certificate uploaded: {selectedFile.name}
                  </p>
                )}
                {isSickLeave && !selectedFile && formData.leave_type_id && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <FiAlertCircle className="text-xs" />
                    Medical certificate is required
                  </p>
                )}
                {selectedFile && !isSickLeave && !fileError && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <FiCheck className="text-xs" />
                    Document uploaded: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Reason */}
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
                placeholder="Please describe the reason for leave (min 10 characters)..."
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

            <div className="form-actions flex flex-col sm:flex-row justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to={`${basePath}/leaves`}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
              >
                <FiX /> Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiSend /> Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="balance-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm sticky top-24">
          <div className="balance-header text-center pb-5 border-b border-gray-200 dark:border-gray-700 mb-5">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Leave Request Info
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Request leave on behalf of an employee
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <FiAlertCircle className="text-sm mt-0.5 flex-shrink-0" />
                <span>
                  This request will be submitted as an admin/HR action and will
                  appear in the employee's leave history.
                </span>
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <FiClock className="text-sm mt-0.5 flex-shrink-0" />
                <span>
                  Sundays are automatically excluded from the leave count.
                </span>
              </p>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400 flex items-start gap-2">
                <FiCheck className="text-sm mt-0.5 flex-shrink-0" />
                <span>
                  The employee will be notified about this leave request.
                </span>
              </p>
            </div>

            {isSickLeave && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <FiFile className="text-sm mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Note:</strong> Medical certificate is required for
                    sick leave requests.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestLeaveForEmployee;