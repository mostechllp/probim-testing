import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  X,
  ArrowRight,
  Save,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import DateInput from "../common/DateInput";
import { showToast } from "../common/Toast";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchEmployees } from "../../store/slices/employeeSlice";
import { fetchDepartments } from "../../store/slices/departmentSlice";
import { fetchDesignations } from "../../store/slices/designationSlice";
import {
  initiateOffboarding,
  saveOffboardingDraft,
  fetchOffboardingProgress,
  fetchOffboardingById,
  updateOffboarding,
  clearCurrentOffboarding,
} from "../../store/slices/offboardingSlice";
import apiClient from "../../../utils/apiClient";

// ----------------------------------------------------
// ZOD RESOLVER SCHEMA
// ----------------------------------------------------
// Update the Zod schema to accept both string and number
const offboardingSchema = z.object({
  employeeId: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .pipe(z.string().min(1, "Employee ID is required")),
  backendEmployeeId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? String(val) : "")),
  employeeName: z.string().min(1, "Employee name is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  reportingManager: z.string().min(1, "Reporting manager is required"),
  reportingManagerId: z
    .union([z.string(), z.number()])
    .optional(),
  resignationDate: z.string().min(1, "Resignation date is required"),
  noticeStartDate: z.string().min(1, "Notice start date is required"),
  noticePeriodDays: z.coerce.number().min(0, "Notice period must be 0 or more"),
  lastWorkingDay: z.string().min(1, "Last working day is required"),
  separationType: z.string().min(1, "Separation type is required"),
  visaSponsorship: z.string().min(1, "Visa sponsorship is required"),
  nationality: z.string().min(1, "Nationality is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  reasonForLeaving: z
    .string()
    .min(5, "Please enter a reason for leaving (min 5 chars)"),
});

const OffboardingInitiation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: paramId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Try to get ID from various sources (params, state, query, or localStorage)
  const offboardingId = paramId || location.state?.id || searchParams.get('id') || localStorage.getItem("offboarding_id");

  // Determine if we're in edit mode based on URL, state, or localStorage
  const isEditMode = !!offboardingId || !!location.state?.offboardingData || !!location.state?.isEdit;

  const dropdownRef = useRef(null);
  const managerDropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [reportingManagers, setReportingManagers] = useState([]);
  const [offboardingEmployees, setOffboardingEmployees] = useState([]);
  const [offboardingEmployeesLoading, setOffboardingEmployeesLoading] = useState(true);

  // Redux state
  const { employees, loading: employeesLoading } = useSelector(
    (state) => state.employees,
  );
  const { departments } = useSelector((state) => state.departments);
  const { designations } = useSelector((state) => state.designations);
  const {
    loading: offboardingLoading,
    error: offboardingError,
    currentProgress,
  } = useSelector((state) => state.offboarding);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(offboardingSchema),
    mode: "onChange",
    defaultValues: {
      employeeId: "",
      backendEmployeeId: "",
      employeeName: "",
      department: "",
      designation: "",
      reportingManager: "",
      reportingManagerId: "",
      resignationDate: "",
      noticeStartDate: "",
      noticePeriodDays: 30,
      lastWorkingDay: "",
      separationType: "Resignation",
      visaSponsorship: "",
      nationality: "",
      email: "",
      reasonForLeaving: "",
    },
  });

  // Fetch employees, departments, designations on component mount
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchDepartments());
    dispatch(fetchDesignations());
    
    // Fetch offboarding employees specifically for this dropdown
    const fetchOffboardingEmployees = async () => {
      try {
        setOffboardingEmployeesLoading(true);
        const response = await apiClient.get('/admin/offboarding/employees');
        if (response.data?.status === 'success' && response.data?.data) {
          setOffboardingEmployees(response.data.data);
        } else if (Array.isArray(response.data?.data)) {
          setOffboardingEmployees(response.data.data);
        } else if (Array.isArray(response.data)) {
          setOffboardingEmployees(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch offboarding employees:", error);
      } finally {
        setOffboardingEmployeesLoading(false);
      }
    };
    fetchOffboardingEmployees();

    // Fetch reporting managers
    const fetchManagers = async () => {
      try {
        const response = await apiClient.get('/admin/offboarding/reporting-managers');
        if (response.data?.status === 'success' && response.data?.data) {
          setReportingManagers(response.data.data);
        } else if (Array.isArray(response.data?.data)) {
          setReportingManagers(response.data.data);
        } else if (Array.isArray(response.data)) {
          setReportingManagers(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch reporting managers:", error);
      }
    };
    fetchManagers();
  }, [dispatch]);

  // Load existing offboarding data when in edit mode
  // Load existing offboarding data when in edit mode
  useEffect(() => {
    const loadExistingOffboarding = async () => {
      setLoadingData(true);

      // Check if we have data from navigation state
      if (location.state?.offboardingData) {
        const data = location.state.offboardingData;
        
        let currentEmployees = employees;
        if (!currentEmployees || currentEmployees.length === 0) {
          try {
            const empPayload = await dispatch(fetchEmployees()).unwrap();
            currentEmployees = empPayload?.data?.data || empPayload?.data || [];
          } catch (e) {
            console.error("Failed to fetch employees", e);
          }
        }
        
        populateFormWithData(data, currentEmployees);
        if (data.id) {
          dispatch(fetchOffboardingProgress(data.id));
        }
        setLoadingData(false);
        return;
      }

      // Check if we have an ID in URL
      if (offboardingId) {
        try {
          const result = await dispatch(
            fetchOffboardingById(offboardingId),
          ).unwrap();
          if (result) {
            let currentEmployees = employees;
            if (!currentEmployees || currentEmployees.length === 0) {
              const empPayload = await dispatch(fetchEmployees()).unwrap();
              currentEmployees = empPayload?.data?.data || empPayload?.data || [];
            }
            populateFormWithData(result, currentEmployees);
            // Fetch progress to show current step info
            await dispatch(fetchOffboardingProgress(offboardingId));
          }
        } catch (error) {
          console.error("Failed to load offboarding data:", error);
          showToast("Failed to load offboarding data", "error");
        } finally {
          setLoadingData(false);
        }
      } else {
        setLoadingData(false);
      }
    };

    if (isEditMode) {
      loadExistingOffboarding();
    } else {
      dispatch(clearCurrentOffboarding());
    }
  }, [offboardingId, location.state, isEditMode, dispatch]);

  // Helper function to populate form with existing data
  // Helper function to populate form with existing data
  const populateFormWithData = (data, currentEmployees = employees) => {

    // Extract employee info from nested object
    let employeeData = data.employee || {};
    let foundFullEmployee = null;
    
    // The backend API might not return department, designation, or reporting_manager in the offboarding details response.
    // Try to find the full employee record from Redux state to get these details!
    if (currentEmployees && currentEmployees.length > 0) {
      foundFullEmployee = currentEmployees.find(emp => emp.id === employeeData.id || emp.id === data.employee_id || String(emp.employee_id) === String(data.employee_id) || String(emp.user_id) === String(employeeData.user_id));
      if (foundFullEmployee) {
        employeeData = { ...foundFullEmployee, ...employeeData }; // Merge, preferring any specific data returned by the API if present
      } 
    }

    // Set form values based on actual API response structure
    setValue("employeeId", employeeData.employee_id || data.employee_id || "", {
      shouldValidate: true,
    });
    setValue(
      "backendEmployeeId",
      String(employeeData.id || data.employee_id || ""),
      { shouldValidate: true },
    );

    // Employee name from employee object
    const employeeName =
      employeeData.first_name && employeeData.last_name
        ? `${employeeData.first_name} ${employeeData.last_name}`
        : data.employee_name || "";
    setValue("employeeName", employeeName, { shouldValidate: true });

    // Department from employee or direct
    const departmentName =
      employeeData.department?.name || employeeData.department || foundFullEmployee?.department?.name || foundFullEmployee?.department || data.department?.name || data.department || "";
    const finalDepartment = typeof departmentName === 'object' ? departmentName?.name || "" : departmentName;
    setValue("department", finalDepartment, { shouldValidate: true });

    // Designation from employee or direct
    const designationName =
      employeeData.designation?.name || employeeData.designation || foundFullEmployee?.designation?.name || foundFullEmployee?.designation || data.designation?.name || data.designation || "";
    const finalDesignation = typeof designationName === 'object' ? designationName?.name || "" : designationName;

    setValue("designation", finalDesignation, { shouldValidate: true });

    // Email from employee or direct
    const emailAddress =
      employeeData.company_email || employeeData.email || data.email || "";
    setValue("email", emailAddress, { shouldValidate: true });

    // Reporting manager (might not be in this response, keep from data or leave empty)
    let reportingManagerName = data.reporting_manager?.name || data.reporting_manager?.full_name || data.reporting_manager?.first_name ? `${data.reporting_manager.first_name} ${data.reporting_manager.last_name || ''}`.trim() : data.reporting_manager || data.reportingManager?.name || data.reportingManager || employeeData.reporting_manager?.name || employeeData.reporting_manager || employeeData.reportingManager?.name || employeeData.reportingManager || "";
    if (typeof reportingManagerName === 'object') {
      reportingManagerName = reportingManagerName?.name || reportingManagerName?.full_name || reportingManagerName?.first_name ? `${reportingManagerName.first_name} ${reportingManagerName.last_name || ''}`.trim() : "";
    }
    
    // If the backend only returned the ID (e.g., reporting_manager_id: 41) but no object, look it up in the employees list!
    if (!reportingManagerName && (data.reporting_manager_id || employeeData.reporting_manager_id)) {
      const managerId = data.reporting_manager_id || employeeData.reporting_manager_id;
      if (currentEmployees && currentEmployees.length > 0) {
        const foundManager = currentEmployees.find(emp => String(emp.id) === String(managerId) || String(emp.employee_id) === String(managerId));
        if (foundManager) {
          reportingManagerName = foundManager.name || foundManager.full_name || `${foundManager.first_name || ''} ${foundManager.last_name || ''}`.trim();
        }
      }
    }
    setValue(
      "reportingManager",
      reportingManagerName,
      { shouldValidate: true },
    );
    setValue(
      "reportingManagerId",
      data.reporting_manager_id || data.reportingManagerId || "",
      { shouldValidate: true },
    );

    // Dates
    setValue(
      "resignationDate",
      data.resignation_date || data.resignationDate || "",
      { shouldValidate: true },
    );
    setValue(
      "noticeStartDate",
      data.notice_start_date || data.noticeStartDate || "",
      { shouldValidate: true },
    );
    setValue(
      "noticePeriodDays",
      data.notice_period_days || data.noticePeriodDays || 30,
      { shouldValidate: true },
    );
    setValue(
      "lastWorkingDay",
      data.last_working_day || data.lastWorkingDay || "",
      { shouldValidate: true },
    );

    // Other fields
    setValue(
      "separationType",
      data.separation_type
        ? data.separation_type.charAt(0).toUpperCase() +
            data.separation_type.slice(1)
        : data.separationType || "Resignation",
      { shouldValidate: true },
    );
    setValue(
      "visaSponsorship",
      data.visa_sponsorship || data.visaSponsorship || "",
    );
    setValue(
      "nationality",
      data.nationality || employeeData.nationality || "",
    );
    setValue(
      "reasonForLeaving",
      data.reason_for_leaving || data.reasonForLeaving || "",
      { shouldValidate: true },
    );

    // Set search query values for display
    if (employeeName) setSearchQuery(employeeName);
    if (reportingManagerName) setManagerSearchQuery(reportingManagerName);

    showToast("Offboarding data loaded successfully", "success");
  };

  // Handle offboarding error
  useEffect(() => {
    if (offboardingError) {
      showToast(offboardingError, "error");
    }
  }, [offboardingError]);

  // Fetch progress when available
  useEffect(() => {
    if (currentProgress && currentProgress.offboarding_id && showProgress) {
      const timer = setTimeout(() => {
        navigate(
          `/admin/employees/asset-return?id=${currentProgress.offboarding_id}`,
        );
        setShowProgress(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentProgress, showProgress, navigate]);

  useEffect(() => {
    let fallbackTimer;
    if (showProgress && !currentProgress) {
      fallbackTimer = setTimeout(() => {
        const storedId = localStorage.getItem("offboarding_id");
        if (storedId) {
          navigate(`/admin/employees/asset-return?id=${storedId}`);
          setShowProgress(false);
        }
      }, 3000);
    }
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [showProgress, currentProgress, navigate]);

  // Handle click outside to close employee dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (
        managerDropdownRef.current &&
        !managerDropdownRef.current.contains(event.target)
      ) {
        setShowManagerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Watch notice start date and notice period days to auto-calculate last working day
  const watchedNoticeStartDate = watch("noticeStartDate");
  const watchedNoticePeriodDays = watch("noticePeriodDays");

  // Calculate last working day automatically when notice start date or notice period changes
  useEffect(() => {
    if (
      watchedNoticeStartDate &&
      watchedNoticePeriodDays !== undefined &&
      watchedNoticePeriodDays !== null &&
      watchedNoticePeriodDays >= 0
    ) {
      const [year, month, day] = watchedNoticeStartDate.split("-").map(Number);
      const startDate = new Date(year, month - 1, day);

      if (isNaN(startDate.getTime())) {
        console.error("Invalid date:", watchedNoticeStartDate);
        return;
      }

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + Number(watchedNoticePeriodDays));

      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
      const endDay = String(endDate.getDate()).padStart(2, "0");
      const formattedEndDate = `${endYear}-${endMonth}-${endDay}`;

      setValue("lastWorkingDay", formattedEndDate, { shouldValidate: true });
    }
  }, [watchedNoticeStartDate, watchedNoticePeriodDays, setValue]);

  // Filter employees based on search query
  const filteredEmployees = offboardingEmployees.filter((emp) => {
    const employeeId = emp.employee_id ? String(emp.employee_id).toLowerCase() : "";
    const employeeName = emp.full_name ? String(emp.full_name).toLowerCase() : "";
    const employeeEmail = emp.email ? String(emp.email).toLowerCase() : "";
    const searchLower = searchQuery.toLowerCase();

    return (
      employeeName.includes(searchLower) ||
      employeeId.includes(searchLower) ||
      employeeEmail.includes(searchLower)
    );
  });

  // Filter managers based on search query
  const filteredManagers = reportingManagers.filter((manager) => {
    const managerName = (manager.full_name || manager.name || "").toLowerCase();
    const managerDesignation = (manager.designation || "").toLowerCase();
    const managerDepartment = (manager.department || "").toLowerCase();
    const searchLower = (managerSearchQuery || "").toLowerCase();

    return (
      managerName.includes(searchLower) ||
      managerDesignation.includes(searchLower) ||
      managerDepartment.includes(searchLower)
    );
  });

  // Handle employee selection and auto-populate all form fields
  const handleSelectEmployee = (emp) => {
    setSearchQuery(emp.full_name);
    setShowDropdown(false);

    setValue("employeeId", emp.employee_id || String(emp.id), {
      shouldValidate: true,
    });
    setValue("employeeName", emp.full_name, { shouldValidate: true });
    setValue("department", emp.department || "", { shouldValidate: true });
    setValue("designation", emp.designation || "", { shouldValidate: true });
    setValue("email", emp.email || "", { shouldValidate: true });
    setValue("backendEmployeeId", String(emp.id), { shouldValidate: true });

    // Handle missing fields from new API (these might not be provided, so clear or keep empty to avoid validation errors if they are not strictly tied to API)
    setValue("nationality", emp.nationality || "", { shouldValidate: true });
    setValue("visaSponsorship", emp.visa_sponsorship || emp.visa_status || "", { shouldValidate: true });

    showToast(`Employee ${emp.full_name} loaded successfully!`, "success");
  };

  // Handle manager selection
  const handleSelectManager = (manager) => {
    setValue("reportingManager", manager.name || manager.full_name || `${manager.first_name || ''} ${manager.last_name || ''}`.trim(), { shouldValidate: true });
    // The backend expects the numeric table ID (e.g., 46) NOT the string EMP- identifier!
    setValue("reportingManagerId", manager.id, { shouldValidate: true });
    setManagerSearchQuery(manager.name || manager.full_name || `${manager.first_name || ''} ${manager.last_name || ''}`.trim());
    setShowManagerDropdown(false);
    showToast(`Reporting manager selected`, "success");
  };

  // Handle validation errors when form submit is attempted
  const onError = (errors) => {
    console.error("Form validation errors:", errors);
    showToast("Please fill all required fields. Ensure you select Employee and Manager from the dropdowns.", "error");
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);

    try {
      const payload = {
        employee_id: data.backendEmployeeId ? parseInt(data.backendEmployeeId, 10) : null,
        reporting_manager_id: data.reportingManagerId ? parseInt(data.reportingManagerId, 10) : null,
        last_working_day: data.lastWorkingDay,
        separation_type: data.separationType.toLowerCase(),
        resignation_date: data.resignationDate,
        notice_period_days: data.noticePeriodDays ? parseInt(data.noticePeriodDays, 10) : 0,
        notice_start_date: data.noticeStartDate,
        visa_sponsorship: data.visaSponsorship,
        nationality: data.nationality,
        reason_for_leaving: data.reasonForLeaving,
        is_draft: 0,
      };

      let result;

      if (isEditMode && offboardingId) {
        // Update existing offboarding
        result = await dispatch(
          updateOffboarding({ id: offboardingId, data: payload }),
        ).unwrap();
        showToast(
          <div className="text-sm">
            <span className="font-bold block text-green-800 dark:text-green-300">
              Offboarding Updated
            </span>
            <span>
              Successfully updated offboarding for {data.employeeName}
            </span>
          </div>,
          "success",
        );
      } else {
        // Create new offboarding
        result = await dispatch(initiateOffboarding(payload)).unwrap();

        if (result && result.id) {
          localStorage.setItem("offboarding_id", result.id);
          localStorage.setItem(
            "offboarding_employee_id",
            data.backendEmployeeId,
          );
          localStorage.setItem("offboarding_employee_name", data.employeeName);

          try {
            await dispatch(fetchOffboardingProgress(result.id)).unwrap();
          } catch (progressError) {
            console.log("Progress fetch failed:", progressError);
          }
          setShowProgress(true);
        }

        showToast(
          <div className="text-sm">
            <span className="font-bold block text-green-800 dark:text-green-300">
              Offboarding Initiated
            </span>
            <span>
              Successfully triggered offboarding workflows for{" "}
              {data.employeeName}
            </span>
          </div>,
          "success",
        );
      }

      localStorage.removeItem("offboarding_draft");
      reset();
      setSearchQuery("");
      setManagerSearchQuery("");

      // Redirect to asset return for both create and update
      setTimeout(() => {
        const targetId = (result && result.id) || offboardingId;
        if (targetId) {
          navigate(`/admin/employees/asset-return?id=${targetId}`);
        }
      }, 1000);
    } catch (error) {
      console.error("Offboarding submission error:", error);
      showToast(
        error || "Failed to process offboarding. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const data = watch();
    if (!data.backendEmployeeId || !data.reportingManagerId) {
      showToast("Please select Employee and Manager first.", "warning");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        employee_id: data.backendEmployeeId ? parseInt(data.backendEmployeeId, 10) : null,
        reporting_manager_id: data.reportingManagerId ? parseInt(data.reportingManagerId, 10) : null,
        last_working_day: data.lastWorkingDay,
        separation_type: data.separationType ? data.separationType.toLowerCase() : null,
        resignation_date: data.resignationDate,
        notice_period_days: data.noticePeriodDays ? parseInt(data.noticePeriodDays, 10) : 0,
        notice_start_date: data.noticeStartDate,
        visa_sponsorship: data.visaSponsorship,
        nationality: data.nationality,
        reason_for_leaving: data.reasonForLeaving,
        is_draft: 1,
      };

      if (isEditMode && offboardingId) {
        await dispatch(
          updateOffboarding({ id: offboardingId, data: payload }),
        ).unwrap();
        showToast("Draft updated successfully", "success");
      } else {
        const result = await dispatch(initiateOffboarding(payload)).unwrap();
        if (result && result.id) {
          localStorage.setItem("offboarding_id", result.id);
          localStorage.setItem("offboarding_employee_id", data.backendEmployeeId);
          localStorage.setItem("offboarding_employee_name", data.employeeName);
          
          navigate(`/admin/employees/offboarding-initiation?id=${result.id}`, { replace: true });
        }
        showToast("Draft saved successfully", "success");
      }
      localStorage.removeItem("offboarding_draft");
    } catch (error) {
      console.error("Save draft error:", error);
      localStorage.setItem("offboarding_draft", JSON.stringify(data));
      showToast("Failed to save draft to server. Data saved locally.", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load draft from localStorage on mount (only for new offboarding)
  useEffect(() => {
    if (!isEditMode) {
      const draft = localStorage.getItem("offboarding_draft");
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        Object.keys(parsedDraft).forEach((key) => {
          if (parsedDraft[key]) {
            setValue(key, parsedDraft[key]);
          }
        });
        if (parsedDraft.reportingManager) {
          setManagerSearchQuery(parsedDraft.reportingManager);
        }
        if (parsedDraft.employeeName) {
          setSearchQuery(parsedDraft.employeeName);
        }
      }
    }
  }, [setValue, isEditMode]);

  // Progress Modal Component
  const ProgressModal = () => {
    if (!showProgress) return null;

    const hasProgress = currentProgress && currentProgress.offboarding_id;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Offboarding Initiated!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Redirecting to next step...
              </p>
            </div>

            {hasProgress ? (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Overall Progress
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {currentProgress.progress_percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${currentProgress.progress_percentage || 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2">
                    <span>
                      Completed Steps: {currentProgress.completed_steps || 0}
                    </span>
                    <span>Total Steps: {currentProgress.total_steps || 7}</span>
                  </div>
                </div>

                {currentProgress.steps && currentProgress.steps.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Steps Status
                    </p>
                    <div className="space-y-2">
                      {currentProgress.steps.map((step, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {step.name}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              step.status === "completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : step.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {step.status === "completed"
                              ? "Completed"
                              : step.status === "in_progress"
                                ? "In Progress"
                                : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Loading offboarding progress...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* SaaS Offboarding Header */}
        <OffboardingHeader currentStep={1} />
        
        {/* Progress Box */}
        <OffboardingProgressBox currentStep={1} />

        {/* Form Container Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
            {/* Header Title with Draft Badge */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {isEditMode ? "Edit Offboarding" : "Initiate offboarding"}
              </h1>
              {!isEditMode && (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60 rounded text-xs font-bold uppercase tracking-wider">
                  Draft
                </span>
              )}
            </div>

            {/* Form Fields Grid - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Employee Name (Searchable Select Input) */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Employee name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or select employee..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={isEditMode}
                    className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:ring-2 ${
                      errors.employeeName
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-500/20"
                    } ${isEditMode ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                  {searchQuery && !isEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setValue("employeeName", "");
                        setValue("employeeId", "");
                        setValue("backendEmployeeId", "");
                        setValue("department", "");
                        setValue("designation", "");
                        setValue("nationality", "");
                        setValue("visaSponsorship", "");
                        setValue("email", "");
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Dropdown suggestions list */}
                {showDropdown && !isEditMode && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {offboardingEmployeesLoading ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Loading employees...
                      </div>
                    ) : filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectEmployee(emp)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {emp.full_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {emp.designation} • {emp.department}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400">
                        No employees found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
                {errors.employeeName && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.employeeName.message}
                  </p>
                )}
              </div>
              {/* Employee ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Employee ID
                </label>
                <input type="hidden" {...register("backendEmployeeId")} />
                <input
                  type="text"
                  placeholder="Auto-populated"
                  value={watch("employeeId") || ""}
                  onChange={(e) =>
                    setValue("employeeId", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none ${
                    errors.employeeId
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                  readOnly
                />
                {errors.employeeId && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.employeeId.message}
                  </p>
                )}
              </div>
              {/* Department */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="Auto-populated"
                  {...register("department")}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none"
                  readOnly
                />
                {errors.department && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.department.message}
                  </p>
                )}
              </div>
              {/* Designation */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="Auto-populated"
                  {...register("designation")}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none"
                  readOnly
                />
                {errors.designation && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.designation.message}
                  </p>
                )}
              </div>
              {/* Reporting Manager (Searchable Dropdown) */}
              <div className="space-y-1.5 relative" ref={managerDropdownRef}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Reporting manager <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or select reporting manager..."
                    value={managerSearchQuery}
                    onChange={(e) => {
                      setManagerSearchQuery(e.target.value);
                      setShowManagerDropdown(true);
                      if (e.target.value === "") {
                        setValue("reportingManager", "");
                        setValue("reportingManagerId", "");
                      }
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                    className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:ring-2 ${
                      errors.reportingManager
                        ? "border-red-500 focus:ring-red-500/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-500/20"
                    }`}
                  />
                  <ChevronDown
                    size={16}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 pointer-events-none top-1/2 -translate-y-1/2"
                  />
                  {managerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setManagerSearchQuery("");
                        setValue("reportingManager", "");
                        setValue("reportingManagerId", "");
                      }}
                      className="absolute inset-y-0 right-8 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showManagerDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredManagers.length > 0 ? (
                      filteredManagers.map((manager) => {
                        const managerName = manager.full_name || manager.name || "";
                        return (
                          <button
                            key={manager.id}
                            type="button"
                            onClick={() => handleSelectManager({
                              ...manager,
                              name: managerName
                            })}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {managerName}
                              </p>
                              {(manager.designation || manager.department) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {manager.designation || 'No Designation'} {manager.designation && manager.department ? '•' : ''} {manager.department || ''}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400">
                        No managers found matching "{managerSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
                {errors.reportingManager && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.reportingManager.message}
                  </p>
                )}
              </div>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Auto-populated"
                  value={watch("email") || ""}
                  onChange={(e) =>
                    setValue("email", e.target.value, { shouldValidate: true })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none"
                  readOnly
                />
                {errors.email && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* NOTICE START DATE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Notice start date <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="noticeStartDate"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      {...field}
                      placeholder="Select notice start date"
                      error={!!errors.noticeStartDate}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    />
                  )}
                />
                {errors.noticeStartDate && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.noticeStartDate.message}
                  </p>
                )}
              </div>
              {/* NOTICE PERIOD DAYS */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Notice period (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="30"
                  {...register("noticePeriodDays")}
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                    errors.noticePeriodDays
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700 focus:border-green-500"
                  }`}
                />
                {errors.noticePeriodDays && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.noticePeriodDays.message}
                  </p>
                )}
              </div>
              {/* LAST WORKING DAY (Auto-calculated) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Last working day <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="lastWorkingDay"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      {...field}
                      placeholder="Auto-calculated from notice period"
                      error={!!errors.lastWorkingDay}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      disabled={true}
                    />
                  )}
                />
                {errors.lastWorkingDay && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.lastWorkingDay.message}
                  </p>
                )}
              </div>
              {/* Separation Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Separation type <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("separationType")}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-semibold"
                >
                  <option value="Resignation">Resignation</option>
                  <option value="Termination">Termination</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Contract End">Contract End</option>
                </select>
                  {errors.separationType && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.separationType.message}
                  </p>
                )}
              </div>
              {/* DYNAMIC DATE BASED ON SEPARATION TYPE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {watch("separationType") ? `${watch("separationType")} Date` : "Date"} <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="resignationDate"
                  control={control}
                  render={({ field }) => (
                    <DateInput
                      {...field}
                      placeholder={`Select ${watch("separationType")?.toLowerCase() || "resignation"} date`}
                      error={!!errors.resignationDate}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    />
                  )}
                />
                {errors.resignationDate && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.resignationDate.message}
                  </p>
                )}
              </div>
              {/* Visa Sponsorship */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Visa sponsorship <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="visaSponsorship"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-semibold"
                    >
                      <option value="">Select Sponsorship</option>
                      <option value="Company sponsored">Company sponsored</option>
                      <option value="Self sponsored">Self sponsored</option>
                      <option value="Golden Visa">Golden Visa</option>
                      <option value="Family sponsored">Family sponsored</option>
                      <option value="Not Applicable">
                        Not Applicable (No visa required)
                      </option>
                    </select>
                  )}
                />
                {errors.visaSponsorship && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.visaSponsorship.message}
                  </p>
                )}
              </div>
              {/* Nationality */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="nationality"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="e.g. Indian"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-semibold focus:outline-none"
                    />
                  )}
                />
                {errors.nationality && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.nationality.message}
                  </p>
                )}
              </div>
              {/* Reason for Leaving - Full width spans both columns */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Reason for leaving <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Please provide the reason for employee's departure..."
                  {...register("reasonForLeaving")}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none transition-all focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-semibold ${
                    errors.reasonForLeaving
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                ></textarea>
                {errors.reasonForLeaving && (
                  <p className="text-xxs font-bold text-red-500 mt-1">
                    {errors.reasonForLeaving.message}
                  </p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={offboardingLoading}
                  className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  Save draft
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || offboardingLoading}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || offboardingLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isEditMode ? "Updating..." : "Initiating..."}
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    {isEditMode ? "Update Offboarding" : "Initiate offboarding"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Progress Modal - only show for new offboarding */}
      {!isEditMode && <ProgressModal />}
    </div>
  );
};

export default OffboardingInitiation;
