import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import { showToast } from "../../components/common/Toast";
import { addEmployee } from "../store/slices/employeeSlice";
import { fetchOrganizations } from "../store/slices/organizationSlice";
import { fetchCompanies } from "../store/slices/companySlice";
import { fetchRoles } from "../store/slices/roleSlice";
import apiClient from "../../utils/apiClient";
import DateInput from "../components/common/DateInput";
import DocumentModal from "../components/common/DocumentModal";
import DepartmentModal from "../components/department/DepartmentModal";
import DesignationModal from "../components/designations/designationModal";
import {
  addDepartment,
  fetchDepartments,
} from "../store/slices/departmentSlice";
import {
  addDesignation,
  fetchDesignations,
} from "../store/slices/designationSlice";

const AddEmployee = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, setVisitedSteps] = useState([0]);
  const [stepErrors, setStepErrors] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
  // Document file states
  const [documents, setDocuments] = useState({
    avatar: null,
    avatarFile: null,
    passport_size_photo: null,
    passport_1st_page: null,
    passport_2nd_page: null,
    passport_outer_page: null,
    passport_id_page: null,
    visa_page: null,
    labor_card: null,
    labor_contract: null,
    eid_1st_page: null,
    eid_2nd_page: null,
    educational_1st_page: null,
    educational_2nd_page: null,
    home_country_id_proof: null,
  });

  const [documentPreviews, setDocumentPreviews] = useState({});
  const [, setUploadedTempFiles] = useState({});

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [additionalDocuments, setAdditionalDocuments] = useState([]);
  const [isSkilled, setIsSkilled] = useState(false);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null);

  const [idGenerationMethod, setIdGenerationMethod] = useState("manual"); // manual, auto
  const [idPrefix, setIdPrefix] = useState("EMP");
  const [idFormat, setIdFormat] = useState("prefix+year+month+day+random"); // template
  const [manualEmployeeId, setManualEmployeeId] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState("");

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);
  const [departmentModalLoading, setDepartmentModalLoading] = useState(false);
  const [designationModalLoading, setDesignationModalLoading] = useState(false);

  // Fetch data from slices
  const { organizations = [] } = useSelector(
    (state) => state.organizations || {},
  );
  const { companies = [] } = useSelector((state) => state.companies || {});
  const { designations = [] } = useSelector(
    (state) => state.designations || {},
  );
  const { departments = [] } = useSelector((state) => state.departments || {});
  const { roles = [] } = useSelector((state) => state.roles || {});

  // Initialize useForm with updated validation
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
    setValue,
  } = useForm({
    defaultValues: {
      // Step 1: Basic Info
      first_name: "",
      last_name: "",
      organization_id: "",
      company_id: "",
      designation_id: "",
      department_id: "",
      type: "employee",
      joining_date: "",
      dob: "",
      probation_start_date: "",
      probation_end_date: "",
      confirmation_date: "",
      contract_start_date: "",
      contract_end_date: "",
      notice_period_start_date: "",
      last_working_day: "",
      resignation_date: "",
      relieving_date: "",
      gender: "male",
      nationality: "",
      marital_status: "",
      special_days: [{ name: "", date: "" }],

      // Step 2: Passport Details
      passport_full_name: "",
      passport_number: "",
      passport_issued_date: "",
      passport_expiry_date: "",
      father_name: "",
      mother_name: "",
      address: "",
      passport_issued_from: "",
      place_of_birth: "",

      // Step 3: Visa, Labor & EID Details (Merged)
      visa_number: "",
      visa_type: "",
      visa_issued_date: "",
      visa_expiry_date: "",
      labor_number: "",
      labor_issued_date: "",
      labor_expiry_date: "",
      eid_number: "",
      eid_issued_date: "",
      eid_expiry_date: "",

      // Step 5: Contact & Others
      dependents: 0,
      company_email: "",
      company_mobile_number: "",
      personal_number: "",
      personal_email: "",
      other_number: "",
      home_country_number: "",
      role: "",
    },
    shouldUnregister: false,
    mode: "onChange",
  });

  // UseFieldArray for special days
  const { fields, append, remove } = useFieldArray({
    control,
    name: "special_days",
  });

  const watchOrganizationId = watch("organization_id");
  const watchCompanyId = watch("company_id");
  const watchDob = watch("dob");
  const watchJoiningDate = watch("joining_date");
  const passportIssued = watch("passport_issued_date");
  const passportExpiry = watch("passport_expiry_date");
  const visaIssued = watch("visa_issued_date");
  const visaExpiry = watch("visa_expiry_date");
  const laborIssued = watch("labor_issued_date");
  const laborExpiry = watch("labor_expiry_date");
  const eidIssued = watch("eid_issued_date");
  const eidExpiry = watch("eid_expiry_date");

  const generateEmployeeIdWithOptions = (dob, joiningDate, prefix, format) => {
    if (
      (format !== "manual" && (!dob || !joiningDate)) ||
      format === "manual"
    ) {
      return "";
    }

    // Parse dates
    let dobFormatted = dob;
    let joiningFormatted = joiningDate;

    if (dob && dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dob.split("/");
      dobFormatted = `${year}-${month}-${day}`;
    }

    if (joiningDate && joiningDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = joiningDate.split("/");
      joiningFormatted = `${year}-${month}-${day}`;
    }

    const dobDate = dob ? new Date(dobFormatted) : null;
    const joiningDateObj = joiningDate ? new Date(joiningFormatted) : null;

    // Get current timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    // Replace placeholders in format
    let generatedId = format;

    // Replace prefix
    generatedId = generatedId.replace(/prefix/g, prefix || "EMP");

    // Replace year (joining or current)
    if (generatedId.includes("year")) {
      const year = joiningDateObj
        ? joiningDateObj.getFullYear()
        : new Date().getFullYear();
      generatedId = generatedId.replace(/year/g, year);
    }

    // Replace month (from joining date or DOB or current)
    if (generatedId.includes("month")) {
      let month;
      if (generatedId.includes("dob_month") && dobDate) {
        month = String(dobDate.getMonth() + 1).padStart(2, "0");
        generatedId = generatedId.replace(/dob_month/g, month);
      } else if (generatedId.includes("joining_month") && joiningDateObj) {
        month = String(joiningDateObj.getMonth() + 1).padStart(2, "0");
        generatedId = generatedId.replace(/joining_month/g, month);
      } else {
        month = String(new Date().getMonth() + 1).padStart(2, "0");
        generatedId = generatedId.replace(/month/g, month);
      }
    }

    // Replace day (from DOB or joining date or current)
    if (generatedId.includes("day")) {
      let day;
      if (generatedId.includes("dob_day") && dobDate) {
        day = String(dobDate.getDate()).padStart(2, "0");
        generatedId = generatedId.replace(/dob_day/g, day);
      } else if (generatedId.includes("joining_day") && joiningDateObj) {
        day = String(joiningDateObj.getDate()).padStart(2, "0");
        generatedId = generatedId.replace(/joining_day/g, day);
      } else {
        day = String(new Date().getDate()).padStart(2, "0");
        generatedId = generatedId.replace(/day/g, day);
      }
    }

    // Replace DOB day+month (DDMM)
    if (generatedId.includes("dob_ddmm") && dobDate) {
      const dobDay = String(dobDate.getDate()).padStart(2, "0");
      const dobMonth = String(dobDate.getMonth() + 1).padStart(2, "0");
      generatedId = generatedId.replace(/dob_ddmm/g, `${dobDay}${dobMonth}`);
    }

    // Replace timestamp
    if (generatedId.includes("timestamp")) {
      generatedId = generatedId.replace(/timestamp/g, timestamp);
    }

    // Replace random
    if (generatedId.includes("random")) {
      generatedId = generatedId.replace(/random/g, random);
    }

    // Replace sequence (you can implement DB check for uniqueness)
    if (generatedId.includes("sequence")) {
      generatedId = generatedId.replace(/sequence/g, "001");
    }

    generatedId = generatedId.replace(/\+/g, "-");

    return generatedId;
  };

  // Preview generated ID when user selects auto-generation
  useEffect(() => {
    if (idGenerationMethod === "auto" && watchDob && watchJoiningDate) {
      const preview = generateEmployeeIdWithOptions(
        watchDob,
        watchJoiningDate,
        idPrefix,
        idFormat,
      );
      setGeneratedPreview(preview);
      setValue("employee_id", preview);
    } else if (idGenerationMethod === "manual") {
      setValue("employee_id", manualEmployeeId);
    }
  }, [
    idGenerationMethod,
    idPrefix,
    idFormat,
    watchDob,
    watchJoiningDate,
    manualEmployeeId,
    setValue,
  ]);

  // When manual ID changes
  useEffect(() => {
    if (idGenerationMethod === "manual") {
      setValue("employee_id", manualEmployeeId);
    }
  }, [manualEmployeeId, idGenerationMethod, setValue]);

  // Format templates for user to choose from
  const formatOptions = [
    {
      value: "prefix+year+month+day+random",
      label: "EMP20241225001",
      description: "Prefix + Year + Month + Day + Random",
    },
    {
      value: "prefix+year+dob_ddmm+random",
      label: "EMP20242512001",
      description: "Prefix + Year + DOB(DDMM) + Random",
    },
    {
      value: "prefix+timestamp",
      label: "EMP170351234567",
      description: "Prefix + Timestamp",
    },
    {
      value: "prefix+year+sequence",
      label: "EMP2024001",
      description: "Prefix + Year + Sequence",
    },
    {
      value: "year+month+day+random",
      label: "20241225001",
      description: "Year + Month + Day + Random (No Prefix)",
    },
    {
      value: "custom",
      label: "Custom Format",
      description: "Create your own format",
    },
  ];

  // Custom format builder helper
  const [customFormat, setCustomFormat] = useState(
    "prefix+year+month+day+timestamp",
  );

  // Add these handler functions
  const handleAddDepartment = async (data) => {
    setDepartmentModalLoading(true);
    try {
      const result = await dispatch(addDepartment(data));
      if (addDepartment.fulfilled.match(result)) {
        showToast("Department added successfully", "success");
        setIsDepartmentModalOpen(false);
        // Refresh departments list
        dispatch(fetchDepartments());
      } else {
        showToast(result.payload || "Failed to add department", "error");
      }
    } catch (error) {
      showToast("An error occurred", "error");
    } finally {
      setDepartmentModalLoading(false);
    }
  };

  const handleAddDesignation = async (data) => {
    setDesignationModalLoading(true);
    try {
      const result = await dispatch(addDesignation(data));
      if (addDesignation.fulfilled.match(result)) {
        showToast("Designation added successfully", "success");
        setIsDesignationModalOpen(false);
        // Refresh designations list
        dispatch(fetchDesignations());
      } else {
        showToast(result.payload || "Failed to add designation", "error");
      }
    } catch (error) {
      showToast("An error occurred", "error");
    } finally {
      setDesignationModalLoading(false);
    }
  };

  const getFormatPreview = (format) => {
    if (format === "custom") return customFormat;
    return format;
  };

  // Generate Employee ID function
  const generateEmployeeId = (dob, joiningDate) => {
    if (!dob || !joiningDate) return "";

    // Parse DOB (dd/mm/yyyy)
    let dobFormatted = dob;
    let joiningFormatted = joiningDate;

    // Convert from DD/MM/YYYY to YYYY-MM-DD for parsing
    if (dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dob.split("/");
      dobFormatted = `${year}-${month}-${day}`;
    }

    if (joiningDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = joiningDate.split("/");
      joiningFormatted = `${year}-${month}-${day}`;
    }

    const dobDate = new Date(dobFormatted);
    const joiningDateObj = new Date(joiningFormatted);

    if (isNaN(dobDate.getTime()) || isNaN(joiningDateObj.getTime())) {
      return "";
    }

    // Get Joining Year (4 digits)
    const joiningYear = joiningDateObj.getFullYear();

    // Get DOB Day and Month (2 digits each)
    const dobDay = String(dobDate.getDate()).padStart(2, "0");
    const dobMonth = String(dobDate.getMonth() + 1).padStart(2, "0");
    const dobDayMonth = `${dobDay}${dobMonth}`; // DDMM format

    // Use last 4 digits of timestamp
    const timestamp = Date.now().toString().slice(-4);

    return `EMP${joiningYear}${dobDayMonth}${timestamp}`;
  };

  // Auto-generate employee ID when DOB or Joining Date changes
  useEffect(() => {
    if (watchDob && watchJoiningDate) {
      const generatedId = generateEmployeeId(watchDob, watchJoiningDate);
      if (generatedId) {
        setValue("employee_id", generatedId);
      }
    }
  }, [watchDob, watchJoiningDate, setValue]);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchOrganizations());
    dispatch(fetchDesignations());
    dispatch(fetchDepartments());
    dispatch(fetchRoles());
  }, [dispatch]);

  // Fetch companies when organization changes
  useEffect(() => {
    if (watchOrganizationId) {
      const org = organizations.find(
        (org) => org.id === parseInt(watchOrganizationId),
      );

      setSelectedOrgDetails(org || null);

      // Fetch companies only if organization has multiple companies (multi_company === "Yes")
      if (org && org.multi_company === "Yes") {
        dispatch(fetchCompanies(watchOrganizationId));
      } else {
        // Clear company selection if organization doesn't have multiple companies
        setValue("company_id", "");
        setSelectedCompanyDetails(null);
      }
    } else {
      setSelectedOrgDetails(null);
      setSelectedCompanyDetails(null);
    }
  }, [watchOrganizationId, organizations, dispatch, setValue]);

  // Get company details when company_id changes
  useEffect(() => {
    if (watchCompanyId && companies.length > 0) {
      const company = companies.find(
        (comp) => comp.id === parseInt(watchCompanyId),
      );
      setSelectedCompanyDetails(company || null);

      // Clear labor fields if company has freezone trade license
      if (company && company.raw?.trade_license === "freezone") {
        setValue("labor_number", "");
        setValue("labor_issued_date", "");
        setValue("labor_expiry_date", "");
      }
    } else {
      setSelectedCompanyDetails(null);
    }
  }, [watchCompanyId, companies, setValue]);

  const steps = [
    { number: 1, title: "Basic Info", icon: "fas fa-user-circle" },
    { number: 2, title: "Passport", icon: "fas fa-passport" },
    { number: 3, title: "Visa, Labor & EID", icon: "fas fa-file-contract" },
    { number: 4, title: "Contact", icon: "fas fa-address-card" },
  ];

  // Only employee and admin user types
  const userTypeOptions = [
    { value: "employee", label: "Employee" },
    { value: "admin", label: "Admin" },
    { value: "hr", label: "HR" },
    { value: "manager", label: "Manager" },
    { value: "team_lead", label: "Team Lead" },
  ];

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];

  const nationalityOptions = [
    "Indian",
    "Nepali",
    "Bangladeshi",
    "Pakistani",
    "Sri Lankan",
    "Filipino",
    "Other",
  ];

  const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed"];
  const visaTypeOptions = [
    { value: "company_visa", label: "Company Visa" },
    { value: "family_visa", label: "Family Visa" },
    { value: "other_visa", label: "Other Visa" },
  ];

  const getStepFields = (stepIndex) => {
    switch (stepIndex) {
      case 0: {
        const fields = [
          "first_name",
          "organization_id",
          "designation_id",
          "department_id",
          "type",
          "dob",
          "joining_date",
        ];
        // Only add company_id to validation if multi_company is "Yes"
        if (selectedOrgDetails?.multi_company === "Yes") {
          fields.push("company_id");
        }
        return fields;
      }
      case 1:
        return ["passport_issued_date", "passport_expiry_date"];
      case 2: {
        return [
          "visa_type",
          "visa_number",
          "visa_issued_date",
          "visa_expiry_date",
          "eid_number",
          "eid_issued_date",
          "eid_expiry_date",
        ];
      }
      case 3:
        return ["company_email", "personal_email", "type", "role"];
      default:
        return [];
    }
  };

  // Document upload component
  const DocumentUpload = ({
    fieldKey,
    label,
    icon,
    accept = "image/*,.pdf",
  }) => {
    const fileInputId = `doc_${fieldKey}`;
    const isUploading = uploadingFiles[fieldKey];

    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/30">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          <i className={`${icon} text-green-500 mr-2`}></i>
          {label}
          <span className="text-xs text-gray-400 ml-2">(Optional)</span>
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            id={fileInputId}
            accept={accept}
            onChange={(e) => {
              e.stopPropagation();
              handleFileChange(fieldKey, e.target.files[0]);
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => document.getElementById(fileInputId).click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i> Choose File
              </>
            )}
          </button>
          <span className="text-sm text-gray-500 truncate flex-1">
            {isUploading
              ? "Uploading file..."
              : documents[fieldKey]
                ? "File uploaded ✓"
                : "No file chosen"}
          </span>
        </div>
        {documentPreviews[fieldKey] && documentPreviews[fieldKey] !== "pdf" && (
          <div className="mt-3">
            <img
              src={documentPreviews[fieldKey]}
              alt={label}
              className="h-20 w-20 object-cover rounded-lg border border-gray-200"
            />
            <button
              type="button"
              onClick={() => {
                setDocuments({ ...documents, [fieldKey]: null });
                setDocumentPreviews({ ...documentPreviews, [fieldKey]: null });
              }}
              className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <i className="fas fa-trash"></i> Remove
            </button>
          </div>
        )}
        {documentPreviews[fieldKey] === "pdf" && (
          <div className="mt-3">
            <div className="h-20 w-20 bg-red-100 rounded-lg flex items-center justify-center border border-gray-200">
              <i className="fas fa-file-pdf text-red-500 text-3xl"></i>
            </div>
            <button
              type="button"
              onClick={() => {
                setDocuments({ ...documents, [fieldKey]: null });
                setDocumentPreviews({ ...documentPreviews, [fieldKey]: null });
              }}
              className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <i className="fas fa-trash"></i> Remove
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          <i className="fas fa-info-circle mr-1"></i> Max size: 5MB. Allowed:
          JPG, PNG, PDF
        </p>
      </div>
    );
  };

  const handleFileChange = async (fieldKey, file) => {
    if (!file) return;

    const fileSize = file.size / 1024 / 1024;
    const maxSize = fieldKey === "avatar" ? 2 : 5;
    if (fileSize > maxSize) {
      showToast(`File must be less than ${maxSize}MB`, "error");
      return;
    }

    // Create preview for display
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocumentPreviews((prev) => ({
          ...prev,
          [fieldKey]: e.target.result,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setDocumentPreviews((prev) => ({ ...prev, [fieldKey]: "pdf" }));
    }

    setUploadingFiles((prev) => ({ ...prev, [fieldKey]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        "/admin/employees/upload-temp",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const result = response.data;
      if (result.status && result.path) {
        // Store the temp path for ALL files (including avatar)
        setDocuments((prev) => ({ ...prev, [fieldKey]: result.path }));
        setUploadedTempFiles((prev) => ({ ...prev, [fieldKey]: true }));
        showToast(`File uploaded successfully`, "success");
      } else {
        showToast(`Failed to upload`, "error");
        setDocumentPreviews((prev) => ({ ...prev, [fieldKey]: null }));
      }
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, "error");
      setDocumentPreviews((prev) => ({ ...prev, [fieldKey]: null }));
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleNext = async () => {
    const fieldsToValidate = getStepFields(currentStep);

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: false }));
      setVisitedSteps((prev) => [...new Set([...prev, currentStep + 1])]);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStepErrors((prev) => ({ ...prev, [currentStep]: true }));
      showToast("Please fill the required fields", "error");
    }
  };

  const handleStepClick = async (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await trigger(fieldsToValidate);

    if (!isValid) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: true }));
      showToast("Please fix required fields before changing section", "error");
      return;
    }

    setStepErrors((prev) => ({ ...prev, [currentStep]: false }));
    setCurrentStep(targetStep);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);


    // Helper function to convert date from dd/mm/yyyy to YYYY-MM-DD
    const convertDateToBackend = (dateString) => {
      if (!dateString) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateString.split("/");
        return `${year}-${month}-${day}`;
      }
      return dateString;
    };

    const formData = new FormData();

    // Basic required fields
    formData.append("first_name", data.first_name);
    formData.append("last_name", data.last_name || "");

    // Use auto-generated employee ID
    const employeeId = data.employee_id;
    if (!employeeId) {
      showToast("Please wait, Employee ID is being generated", "error");
      setLoading(false);
      return;
    }
    formData.append("employee_id", employeeId);

    formData.append("organization_id", parseInt(data.organization_id));
    if (selectedOrgDetails?.multi_company === "Yes") {
      if (!data.company_id) {
        showToast("Please select a company", "error");
        setLoading(false);
        return;
      }
      formData.append("company_id", parseInt(data.company_id));
    } else {
      formData.append("company_id", "");
    }
    const isSkilledValue = isSkilled !== null ? (isSkilled ? 1 : 0) : 0;
    formData.append("is_skilled", isSkilledValue);

    if (data.designation_id) {
      formData.append("designation_id", parseInt(data.designation_id));
    }
    if (data.department_id) {
      formData.append("department_id", parseInt(data.department_id));
    }

    formData.append("type", data.type);
    formData.append("gender", data.gender || "");
    formData.append("nationality", data.nationality || "");
    formData.append("marital_status", data.marital_status || "");

    // DOB and Joining Date - required
    const dob = convertDateToBackend(data.dob);
    const joiningDate = convertDateToBackend(data.joining_date);

    if (!dob) {
      showToast("Date of Birth is required", "error");
      setLoading(false);
      return;
    }
    if (!joiningDate) {
      showToast("Joining Date is required", "error");
      setLoading(false);
      return;
    }

    formData.append("dob", dob);
    formData.append("joining_date", joiningDate);

    if (data.probation_start_date) formData.append("probation_start_date", convertDateToBackend(data.probation_start_date));
    if (data.probation_end_date) formData.append("probation_end_date", convertDateToBackend(data.probation_end_date));
    if (data.confirmation_date) formData.append("confirmation_date", convertDateToBackend(data.confirmation_date));
    if (data.contract_start_date) formData.append("contract_start_date", convertDateToBackend(data.contract_start_date));
    if (data.contract_end_date) formData.append("contract_end_date", convertDateToBackend(data.contract_end_date));
    if (data.notice_period_start_date) formData.append("notice_period_start_date", convertDateToBackend(data.notice_period_start_date));
    if (data.last_working_day) formData.append("last_working_day", convertDateToBackend(data.last_working_day));
    if (data.resignation_date) formData.append("resignation_date", convertDateToBackend(data.resignation_date));
    if (data.relieving_date) formData.append("relieving_date", convertDateToBackend(data.relieving_date));

    // Special days - Send as arrays
    if (data.special_days && data.special_days.length > 0) {
      const validSpecialDays = data.special_days.filter(
        (day) => day.name && day.name.trim() !== "" && day.date,
      );

      if (validSpecialDays.length > 0) {
        const specialDaysName = validSpecialDays.map((day) => day.name.trim());
        const specialDaysDate = validSpecialDays.map((day) => {
          let formattedDate = day.date;
          if (day.date && day.date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [dayVal, month, year] = day.date.split("/");
            formattedDate = `${year}-${month}-${dayVal}`;
          }
          return formattedDate;
        });

        specialDaysName.forEach((name) => {
          formData.append("special_days_name[]", name);
        });

        specialDaysDate.forEach((date) => {
          formData.append("special_days_date[]", date);
        });
      }
    }

    formData.append("passport_full_name", data.passport_full_name || "");
    formData.append("passport_number", data.passport_number || "");
    formData.append(
      "passport_issued_date",
      convertDateToBackend(data.passport_issued_date) || "",
    );
    formData.append(
      "passport_expiry_date",
      convertDateToBackend(data.passport_expiry_date) || "",
    );
    formData.append("passport_issued_from", data.passport_issued_from || "");
    formData.append("place_of_birth", data.place_of_birth || "");
    formData.append("father_name", data.father_name || "");
    formData.append("mother_name", data.mother_name || "");
    formData.append("address", data.address || "");

    formData.append("visa_number", data.visa_number || "");

    formData.append("visa_type", data.visa_type || "");

    const visaIssuedConverted = convertDateToBackend(data.visa_issued_date);
    formData.append("visa_issued_date", visaIssuedConverted);

    const visaExpiryConverted = convertDateToBackend(data.visa_expiry_date);
    formData.append("visa_expiry_date", visaExpiryConverted);

    // Only send labor data if company trade license is "mainland"
    if (selectedCompanyDetails?.raw?.trade_license === "mainland") {
      formData.append("labor_number", data.labor_number || "");

      const laborIssuedConverted = convertDateToBackend(data.labor_issued_date);
      formData.append("labor_issued_date", laborIssuedConverted);

      const laborExpiryConverted = convertDateToBackend(data.labor_expiry_date);
      formData.append("labor_expiry_date", laborExpiryConverted);
    } else {
      // Send empty strings for freezone companies
      formData.append("labor_number", "");
      formData.append("labor_issued_date", "");
      formData.append("labor_expiry_date", "");
    }

    formData.append("eid_number", data.eid_number || "");

    const eidIssuedConverted = convertDateToBackend(data.eid_issued_date);
    formData.append("eid_issued_date", eidIssuedConverted);

    const eidExpiryConverted = convertDateToBackend(data.eid_expiry_date);
    formData.append("eid_expiry_date", eidExpiryConverted);

    formData.append(
      "dependents",
      data.dependents ? String(data.dependents) : "0",
    );
    formData.append("company_email", data.company_email || "");
    formData.append("company_mobile_number", data.company_mobile_number || "");
    formData.append("personal_number", data.personal_number || "");
    formData.append("personal_email", data.personal_email || "");
    formData.append("other_number", data.other_number || "");
    formData.append("home_country_number", data.home_country_number || "");
    formData.append("role_id", data.role || "");

    // ============ Documents - send temp paths ============

    // Avatar
    if (documents.avatar) {
      formData.append("avatar", documents.avatar);
    }

    // All document fields
    const documentFields = [
      "passport_1st_page",
      "passport_2nd_page",
      "passport_outer_page",
      "passport_id_page",
      "visa_page",
      "labor_card",
      "labor_contract",
      "eid_1st_page",
      "eid_2nd_page",
      "educational_1st_page",
      "educational_2nd_page",
      "home_country_id_proof",
    ];

    documentFields.forEach((field) => {
      if (documents[field]) {
        formData.append(field, documents[field]);
      }
    });

    // Additional documents
    // Additional documents - FIXED with correct field names and file paths
    if (additionalDocuments.length > 0) {
      // Send each additional document as separate fields with indices
      additionalDocuments.forEach((doc, index) => {
        // Send the file path (temp path from server)
        if (doc.file_path) {
          formData.append(
            `additional_documents[${index}][file_path]`,
            doc.file_path,
          );
        }
        // Send the file (as backup)
        if (doc.file) {
          formData.append(`additional_documents[${index}][file]`, doc.file);
        }
        // Send the document name
        if (doc.document_name || doc.name) {
          formData.append(
            `additional_documents[${index}][document_name]`,
            doc.document_name || doc.name,
          );
        }
        // Send the filename
        if (doc.filename) {
          formData.append(
            `additional_documents[${index}][filename]`,
            doc.filename,
          );
        }
        // Send expiry date if exists
        if (doc.expiry_date) {
          formData.append(
            `additional_documents[${index}][expiry_date]`,
            doc.expiry_date,
          );
        }
      });
    }

    const result = await dispatch(addEmployee(formData));

    if (addEmployee.fulfilled.match(result)) {
      showToast(`Employee added successfully!`, "success");
      navigate("/admin/employees");
    } else {
      console.error("8. Failed to add employee:", result.payload);
      const errorPayload = result.payload;
      if (errorPayload && errorPayload.errors) {
        const errorMessages = Object.entries(errorPayload.errors).map(
          ([field, messages]) =>
            `${field}: ${Array.isArray(messages) ? messages[0] : messages}`,
        );
        showToast(errorMessages.join("\n"), "error");
      } else if (typeof errorPayload === "string") {
        showToast(errorPayload, "error");
      } else {
        showToast("Failed to add employee", "error");
      }
    }
    setLoading(false);
  };

  const handleAddDocument = async (docData) => {
    setUploadingDoc(true);

    try {
      // Upload the file to temp storage
      const formData = new FormData();
      formData.append("file", docData.file);

      const response = await apiClient.post(
        "/admin/employees/upload-temp",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const result = response.data;

      if (result.status && result.path) {
        const extractFilename = (filePath) => {
          const parts = filePath.split("/");
          return parts[parts.length - 1];
        };

        const filename = extractFilename(result.path);

        // Create preview for display
        let preview = null;
        if (docData.file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setAdditionalDocuments((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(), // unique id
                name: docData.name,
                document_name: docData.name, // for backend compatibility
                filename: filename,
                file_path: result.path, // IMPORTANT: Store the temp path
                file: docData.file,
                preview: e.target.result,
                expiry_date: docData.expiry_date || null, // Add expiry date
              },
            ]);
          };
          reader.readAsDataURL(docData.file);
        } else {
          setAdditionalDocuments((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              name: docData.name,
              document_name: docData.name,
              filename: filename,
              file_path: result.path, // IMPORTANT: Store the temp path
              file: docData.file,
              preview: "pdf",
              expiry_date: docData.expiry_date || null,
            },
          ]);
        }

        showToast(`Document "${docData.name}" added successfully`, "success");
        setShowDocumentModal(false);
      } else {
        showToast("Failed to upload document", "error");
      }
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, "error");
    } finally {
      setUploadingDoc(false);
    }
  };
  // Validation rules
  const validationRules = {
    first_name: {
      required: "First name is required",
      minLength: {
        value: 2,
        message: "First name must be at least 2 characters",
      },
    },
    dob: {
      required: "Date of Birth is required",
    },
    joining_date: {
      required: "Joining Date is required",
    },
    organization_id: {
      required: "Organization is required",
    },
    designation_id: {
      required: "Designation is required",
    },
    department_id: {
      required: "Department is required",
    },
    type: {
      required: "User type is required",
    },
    role: {
      required: "Role is required",
    },
    company_email: {
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: "Invalid email address format",
      },
    },
    personal_email: {
      required: "Personal email is required",
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: "Invalid email address format",
      },
    },
  };

  // Date validation functions
  const validateIssueDate = (issueDate, expiryDate, fieldName) => {
    if (!issueDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const issue = new Date(issueDate);

    if (issue > today) {
      return `${fieldName} cannot be in the future`;
    }

    if (expiryDate && issue >= new Date(expiryDate)) {
      return `Issued date must be before expiry date`;
    }

    return true;
  };

  const validateExpiryDate = (expiryDate, issueDate, fieldName) => {
    if (!expiryDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);

    if (issueDate && expiry <= new Date(issueDate)) {
      return `Expiry date must be after issued date`;
    }

    return true;
  };

  return (
    <div className="w-full overflow-x-hidden px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link
          to="/admin/employees"
          className="text-green-500 hover:text-green-600 font-medium"
        >
          Employees
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500">Add Employee</span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 bg-clip-text text-transparent">
          <i className="fas fa-user-plus mr-2"></i> Add New Employee
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the employee details below
        </p>
      </div>

      {/* Step Indicator */}
      <div className="overflow-x-auto pb-2 mb-4 md:mb-8 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {steps.map((step, index) => (
            <button
              type="button"
              key={step.number}
              onClick={() => handleStepClick(index)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
                currentStep === index
                  ? "bg-green-500 text-white shadow-md"
                  : stepErrors[index]
                    ? "bg-red-50 text-red-600 border border-red-300"
                    : index < currentStep
                      ? "text-green-500"
                      : "text-gray-500 bg-gray-100"
              }`}
            >
              <i className={`${step.icon} mr-1 text-xs md:text-sm`}></i>
              <span className="hidden sm:inline">
                {step.number}. {step.title}
              </span>
              <span className="sm:hidden">{step.number}</span>
              {stepErrors[index] && (
                <i className="fas fa-exclamation-circle ml-1 text-xs"></i>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 lg:p-8 shadow-soft">
        <form
          onSubmit={(e) => {
            if (currentStep !== steps.length - 1) {
              e.preventDefault();
              return;
            }
            handleSubmit(onSubmit)(e);
          }}
        >
          <div className="space-y-8">
            {stepErrors[currentStep] && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-xs md:text-sm text-red-600">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  Please complete required fields in this section.
                </p>
              </div>
            )}

            {/* Step 0 - Basic Info */}
            <div className={currentStep === 0 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-user-circle text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-gray-800">
                    Basic Information
                  </h3>
                </div>
                {stepErrors[0] && (
                  <p className="text-xs md:text-sm text-red-500 mb-4">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    Please fill all mandatory fields in this section.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user text-green-500 mr-1"></i> First
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="first_name"
                      control={control}
                      rules={validationRules.first_name}
                      render={({ field }) => (
                        <>
                          <input
                            {...field}
                            type="text"
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 transition-all focus:outline-none focus:ring-2 ${errors.first_name ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-green-500 focus:ring-green-500/20"}`}
                            placeholder="Enter first name"
                          />
                          {errors.first_name && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.first_name.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user text-green-500 mr-1"></i> Last
                      Name
                    </label>
                    <Controller
                      name="last_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter last name"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-building text-green-500 mr-1"></i>{" "}
                      Organization <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="organization_id"
                      control={control}
                      rules={validationRules.organization_id}
                      render={({ field }) => (
                        <>
                          <select
                            {...field}
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 transition-all focus:outline-none focus:ring-2 ${errors.organization_id ? "border-red-500" : "border-gray-200 focus:border-green-500"}`}
                          >
                            <option value="">Select Organization</option>
                            {organizations.map((org) => (
                              <option key={org.id} value={org.id}>
                                {org.name}
                              </option>
                            ))}
                          </select>
                          {errors.organization_id && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.organization_id.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-building text-green-500 mr-1"></i>{" "}
                      Company
                      {selectedOrgDetails?.multi_company === "Yes" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <Controller
                      name="company_id"
                      control={control}
                      rules={{
                        required:
                          selectedOrgDetails?.multi_company === "Yes"
                            ? "Company is required"
                            : false,
                      }}
                      render={({ field }) => (
                        <>
                          <select
                            {...field}
                            disabled={
                              selectedOrgDetails?.multi_company !== "Yes"
                            }
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 transition-all focus:outline-none focus:ring-2 ${
                              selectedOrgDetails?.multi_company !== "Yes"
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            } ${errors.company_id ? "border-red-500" : "border-gray-200 focus:border-green-500"}`}
                          >
                            <option value="">
                              {selectedOrgDetails?.multi_company === "Yes"
                                ? "Select Company"
                                : selectedOrgDetails
                                  ? "No multiple companies"
                                  : "Select organization first"}
                            </option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.company_name || company.name}
                                {company.raw?.trade_license && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({company.raw?.trade_license})
                                  </span>
                                )}
                              </option>
                            ))}
                          </select>
                          {errors.company_id && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.company_id.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Show trade license info when company is selected */}
                  {selectedCompanyDetails &&
                    selectedCompanyDetails.raw?.trade_license && (
                      <div className="md:col-span-2">
                        <div
                          className={`p-3 rounded-lg ${selectedCompanyDetails.raw?.trade_license === "mainland" ? "bg-blue-50 border border-blue-200" : "bg-yellow-50 border border-yellow-200"}`}
                        >
                          <div className="flex items-center gap-2">
                            <i
                              className={`fas ${selectedCompanyDetails.raw?.trade_license === "mainland" ? "fa-building" : "fa-globe"} ${selectedCompanyDetails.raw?.trade_license === "mainland" ? "text-blue-600" : "text-yellow-600"}`}
                            ></i>
                            <span className="text-sm font-semibold text-gray-700">
                              Company Trade License:{" "}
                              <span
                                className={
                                  selectedCompanyDetails.raw?.trade_license ===
                                  "mainland"
                                    ? "text-blue-600"
                                    : "text-yellow-600"
                                }
                              >
                                {selectedCompanyDetails.raw?.trade_license.toUpperCase()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  <div>
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-700">
                        <i className="fas fa-diagram-project text-green-500 mr-1"></i>{" "}
                        Department <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDepartmentModalOpen(true)}
                        className="text-green-500 hover:text-green-600 text-xs font-normal transition-colors flex items-center gap-1"
                        title="Add new department"
                      >
                        <i className="fas fa-plus-circle text-sm"></i>
                      </button>
                    </div>
                    <Controller
                      name="department_id"
                      control={control}
                      rules={validationRules.department_id}
                      render={({ field }) => (
                        <>
                          <select
                            {...field}
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:ring-2 ${errors.department_id ? "border-red-500" : "border-gray-200 focus:border-green-500 focus:ring-green-500/20"}`}
                          >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                          {errors.department_id && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.department_id.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <label className="block text-xs md:text-sm font-semibold text-gray-700">
                        <i className="fas fa-briefcase text-green-500 mr-1"></i>{" "}
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDesignationModalOpen(true)}
                        className="text-green-500 hover:text-green-600 text-xs font-normal transition-colors flex items-center gap-1"
                        title="Add new designation"
                      >
                        <i className="fas fa-plus-circle text-sm"></i>
                      </button>
                    </div>
                    <Controller
                      name="designation_id"
                      control={control}
                      rules={validationRules.designation_id}
                      render={({ field }) => (
                        <>
                          <select
                            {...field}
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:ring-2 ${errors.designation_id ? "border-red-500" : "border-gray-200 focus:border-green-500 focus:ring-green-500/20"}`}
                          >
                            <option value="">Select Designation</option>
                            {designations.map((desig) => (
                              <option key={desig.id} value={desig.id}>
                                {desig.name}
                              </option>
                            ))}
                          </select>
                          {errors.designation_id && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.designation_id.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user-tag text-green-500 mr-1"></i>{" "}
                      User Type <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="type"
                      control={control}
                      rules={validationRules.type}
                      render={({ field }) => (
                        <>
                          <select
                            {...field}
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 transition-all focus:outline-none focus:ring-2 ${errors.type ? "border-red-500" : "border-gray-200 focus:border-green-500"}`}
                          >
                            <option value="">Select User Type</option>
                            {userTypeOptions.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {errors.type && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.type.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-venus-mars text-green-500 mr-1"></i>{" "}
                      Gender
                    </label>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        >
                          <option value="">Select Gender</option>
                          {genderOptions.map((gender) => (
                            <option key={gender.value} value={gender.value}>
                              {gender.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-globe-asia text-green-500 mr-1"></i>{" "}
                      Nationality
                    </label>
                    <Controller
                      name="nationality"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        >
                          <option value="">Select Nationality</option>
                          {nationalityOptions.map((nationality) => (
                            <option key={nationality} value={nationality}>
                              {nationality}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user-friends text-green-500 mr-1"></i>{" "}
                      Marital Status
                    </label>
                    <Controller
                      name="marital_status"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        >
                          <option value="">Select Marital Status</option>
                          {maritalStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user-tag text-green-500 mr-1"></i>{" "}
                      Role <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="role"
                      control={control}
                      rules={validationRules.role}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        >
                          <option value="">Select Role</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>

                  {/* Special Days - Array of name and date */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-gift text-green-500 mr-1"></i>{" "}
                      Special Days
                    </label>
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-3 items-start">
                          <div className="flex-1">
                            <Controller
                              name={`special_days.${index}.name`}
                              control={control}
                              render={({ field }) => (
                                <div>
                                  <input
                                    {...field}
                                    type="text"
                                    placeholder="e.g., Birthday / Anniversary"
                                    className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:outline-none ${
                                      errors?.special_days?.[index]?.name
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                    }`}
                                  />
                                  {errors?.special_days?.[index]?.name && (
                                    <p className="mt-1 text-xs text-red-500">
                                      {errors.special_days[index].name.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <Controller
                              name={`special_days.${index}.date`}
                              control={control}
                              render={({ field }) => (
                                <div>
                                  <DateInput
                                    type="special_day"
                                    {...field}
                                    placeholder="dd/mm/yyyy"
                                    error={
                                      !!errors?.special_days?.[index]?.date
                                    }
                                  />
                                  {errors?.special_days?.[index]?.date && (
                                    <p className="mt-1 text-xs text-red-500">
                                      {errors.special_days[index].date.message}
                                    </p>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 text-red-500 hover:text-red-600 transition-colors"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => append({ name: "", date: "" })}
                        className="text-green-500 hover:text-green-600 text-sm font-semibold flex items-center gap-2 mt-2"
                      >
                        <i className="fas fa-plus-circle"></i>
                        Add Special Day
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Add special
                      occasions like birthday, anniversary, etc.
                    </p>
                  </div>

                  {/* Auto-generated Employee ID - Display Only */}
                  {/* Enhanced Employee ID Generation */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-id-card text-green-500 mr-1"></i>
                      Employee ID Generation{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    {/* Generation Method Toggle */}
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={idGenerationMethod === "manual"}
                          onChange={() => setIdGenerationMethod("manual")}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Manual Entry
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={idGenerationMethod === "auto"}
                          onChange={() => setIdGenerationMethod("auto")}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          Auto-Generate
                        </span>
                      </label>
                    </div>

                    {idGenerationMethod === "manual" ? (
                      // Manual Entry
                      <div>
                        <input
                          type="text"
                          value={manualEmployeeId}
                          onChange={(e) =>
                            setManualEmployeeId(e.target.value.toUpperCase())
                          }
                          placeholder="Enter Employee ID (e.g., EMP001, STAFF-001)"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          <i className="fas fa-info-circle mr-1"></i>
                          You can enter any unique ID format (e.g., EMP001,
                          STAFF-2024-001)
                        </p>
                      </div>
                    ) : (
                      // Auto-Generation Options
                      <div className="space-y-4">
                        {/* Prefix */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Prefix
                          </label>
                          <input
                            type="text"
                            value={idPrefix}
                            onChange={(e) =>
                              setIdPrefix(e.target.value.toUpperCase())
                            }
                            placeholder="e.g., EMP, STAFF, ENG"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                          />
                        </div>

                        {/* Format Selection */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            ID Format
                          </label>
                          <select
                            value={idFormat}
                            onChange={(e) => setIdFormat(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                          >
                            {formatOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Custom Format Builder */}
                        {idFormat === "custom" && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Custom Format Pattern
                            </label>
                            <input
                              type="text"
                              value={customFormat}
                              onChange={(e) => setCustomFormat(e.target.value)}
                              placeholder="e.g., prefix+year+month+day+random"
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-green-500"
                            />
                            <div className="mt-2 text-xs text-gray-500">
                              <p className="font-semibold mb-1">
                                Available placeholders:
                              </p>
                              <div className="grid grid-cols-2 gap-1">
                                <span>
                                  <code className="bg-gray-100 px-1">
                                    prefix
                                  </code>{" "}
                                  - Your prefix
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">year</code>{" "}
                                  - Joining year
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">
                                    month
                                  </code>{" "}
                                  - Joining month
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">day</code>{" "}
                                  - Joining day
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">
                                    dob_ddmm
                                  </code>{" "}
                                  - DOB (DDMM)
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">
                                    timestamp
                                  </code>{" "}
                                  - Unix timestamp
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">
                                    random
                                  </code>{" "}
                                  - Random string
                                </span>
                                <span>
                                  <code className="bg-gray-100 px-1">
                                    sequence
                                  </code>{" "}
                                  - Sequence number
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Preview Section */}
                        {watchDob && watchJoiningDate && generatedPreview && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 font-semibold mb-1">
                              Preview:
                            </p>
                            <p className="text-sm font-mono font-bold text-green-800">
                              {generatedPreview}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              <i className="fas fa-check-circle mr-1"></i>
                              ID will be generated based on DOB and Joining Date
                            </p>
                          </div>
                        )}

                        {(!watchDob || !watchJoiningDate) && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-700">
                              <i className="fas fa-info-circle mr-1"></i>
                              Please enter DOB and Joining Date to see ID
                              preview
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Employee ID Field (Hidden/Disabled based on method) */}
                    <Controller
                      name="employee_id"
                      control={control}
                      rules={{ required: "Employee ID is required" }}
                      render={({ field }) => <input {...field} type="hidden" />}
                    />

                    {errors.employee_id && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.employee_id.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-calendar text-green-500 mr-1"></i>{" "}
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="dob"
                      control={control}
                      rules={{ required: "Date of Birth is required" }}
                      render={({ field }) => (
                        <>
                          <DateInput
                            type="dob"
                            {...field}
                            placeholder="dd/mm/yyyy"
                            error={!!errors.dob}
                          />
                          {errors.dob && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.dob.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-calendar-alt text-green-500 mr-1"></i>{" "}
                      Joining Date <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="joining_date"
                      control={control}
                      rules={{ required: "Joining Date is required" }}
                      render={({ field }) => (
                        <>
                          <DateInput
                            {...field}
                            placeholder="dd/mm/yyyy"
                            error={!!errors.joining_date}
                          />
                          {errors.joining_date && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.joining_date.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Employment Timeline & Dates Section */}
                  <div className="md:col-span-2 mt-6 mb-2">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                      <i className="fas fa-calendar-alt text-green-500 mr-2"></i>
                      Employment Timeline & Dates
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-calendar-plus text-green-500 mr-1"></i>
                      Probation Start Date
                    </label>
                    <Controller
                      name="probation_start_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-calendar-minus text-green-500 mr-1"></i>
                      Probation End Date
                    </label>
                    <Controller
                      name="probation_end_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user-check text-green-500 mr-1"></i>
                      Confirmation Date
                    </label>
                    <Controller
                      name="confirmation_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-file-signature text-green-500 mr-1"></i>
                      Contract Start Date
                    </label>
                    <Controller
                      name="contract_start_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-file-contract text-green-500 mr-1"></i>
                      Contract End Date
                    </label>
                    <Controller
                      name="contract_end_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-sign-out-alt text-green-500 mr-1"></i>
                      Resignation Date
                    </label>
                    <Controller
                      name="resignation_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-hourglass-start text-green-500 mr-1"></i>
                      Notice Period Start Date
                    </label>
                    <Controller
                      name="notice_period_start_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-briefcase text-green-500 mr-1"></i>
                      Last Working Day (LWD)
                    </label>
                    <Controller
                      name="last_working_day"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-door-open text-green-500 mr-1"></i>
                      Relieving Date
                    </label>
                    <Controller
                      name="relieving_date"
                      control={control}
                      render={({ field }) => (
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      )}
                    />
                  </div>

                  {/* Passport Size Photo - OUTSIDE isSkilled, visible for all employees */}
                  <div className="md:col-span-2">
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/30 mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <i className="fas fa-camera text-green-500 mr-2"></i>
                        Passport Size Photo
                        <span className="text-xs text-gray-400 ml-2">
                          (Optional)
                        </span>
                      </label>
                      <div className="flex items-start gap-4 flex-wrap">
                        <input
                          type="file"
                          id="doc_avatar"
                          accept="image/png,image/jpeg,image/jpg,image/gif"
                          onChange={(e) => {
                            e.stopPropagation();
                            const file = e.target.files[0];
                            if (!file) return;
                            const fileSize = file.size / 1024 / 1024;
                            if (fileSize > 2) {
                              showToast(
                                "Passport size photo must be less than 2MB",
                                "error",
                              );
                              return;
                            }
                            handleFileChange("avatar", file);
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            document.getElementById("doc_avatar").click()
                          }
                          className="h-40 w-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:border-green-400 transition-colors flex items-center justify-center overflow-hidden"
                          aria-label="Upload passport size photo"
                        >
                          {documentPreviews.avatar ? (
                            <img
                              src={documentPreviews.avatar}
                              alt="Passport size"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-gray-400">
                              <i className="far fa-user text-3xl mb-2"></i>
                              <p className="text-lg leading-none">Photo</p>
                            </div>
                          )}
                        </button>
                        <div className="flex-1 min-w-[220px]">
                          <button
                            type="button"
                            onClick={() =>
                              document.getElementById("doc_avatar").click()
                            }
                            className="px-4 py-2 bg-white border border-green-200 text-green-600 rounded-full text-sm font-semibold hover:bg-green-50 transition-colors flex items-center gap-2"
                          >
                            <i className="fas fa-upload"></i> Upload Photo
                          </button>
                          <p className="text-sm text-gray-500 mt-2 truncate">
                            {documents.avatar
                              ? documents.avatar.name || "Photo selected"
                              : "No photo chosen"}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            <i className="fas fa-info-circle mr-1"></i>{" "}
                            Accepted: JPG, PNG, GIF. Max 2MB. Recommended size:
                            35mm x 45mm (passport size).
                          </p>
                        </div>
                      </div>
                      {documentPreviews.avatar && (
                        <button
                          type="button"
                          onClick={() => {
                            setDocuments({ ...documents, avatar: null });
                            setDocumentPreviews({
                              ...documentPreviews,
                              avatar: null,
                            });
                          }}
                          className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <i className="fas fa-trash"></i> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Skilled/Unskilled Dropdown */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-graduation-cap text-green-500 mr-1"></i>
                      Employee Category <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="skillStatus"
                          value="skilled"
                          checked={isSkilled === true}
                          onChange={() => setIsSkilled(true)}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Skilled</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="skillStatus"
                          value="unskilled"
                          checked={isSkilled === false}
                          onChange={() => setIsSkilled(false)}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Unskilled</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Skilled employees need to provide educational documents
                    </p>
                  </div>

                  {/* Educational Documents - Only show if Skilled is selected */}
                  {isSkilled === true && (
                    <>
                      <div className="md:col-span-2">
                        <div className="border-t border-gray-200 pt-4 mt-2">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <i className="fas fa-graduation-cap text-green-500 mr-2"></i>
                            Educational Documents
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DocumentUpload
                              fieldKey="educational_1st_page"
                              label="Educational Certificate (Front)"
                              icon="fas fa-graduation-cap"
                            />
                            <DocumentUpload
                              fieldKey="educational_2nd_page"
                              label="Educational Certificate (Back)"
                              icon="fas fa-graduation-cap"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Home Country ID */}
                      <div className="md:col-span-2">
                        <DocumentUpload
                          fieldKey="home_country_id_proof"
                          label="Home Country ID Proof"
                          icon="fas fa-home"
                        />
                      </div>
                    </>
                  )}

                  {/* Additional Documents Section - Show for all employees */}
                  <div className="md:col-span-2">
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                          <i className="fas fa-folder-open text-green-500 mr-2"></i>
                          Additional Documents
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowDocumentModal(true)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i>
                          Add Document
                        </button>
                      </div>

                      {/* Display added documents */}
                      {additionalDocuments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                          {additionalDocuments.map((doc, index) => (
                            <div
                              key={doc.id || index}
                              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-700 truncate">
                                    {doc.document_name || doc.name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {doc.filename ||
                                      doc.file?.name ||
                                      "Document uploaded"}
                                  </p>
                                  {doc.expiry_date && (
                                    <p className="text-xs text-red-500 mt-1">
                                      <i className="fas fa-calendar-times mr-1"></i>
                                      Expires: {doc.expiry_date}
                                    </p>
                                  )}
                                  {doc.file_path && (
                                    <p className="text-xs text-gray-400 mt-1 truncate">
                                      Path: {doc.file_path}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedDocs =
                                      additionalDocuments.filter(
                                        (_, i) => i !== index,
                                      );
                                    setAdditionalDocuments(updatedDocs);
                                  }}
                                  className="text-red-500 hover:text-red-600 ml-2"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                              {doc.preview && doc.preview !== "pdf" && (
                                <img
                                  src={doc.preview}
                                  alt={doc.name}
                                  className="mt-2 h-16 w-16 object-cover rounded-lg"
                                />
                              )}
                              {doc.preview === "pdf" && (
                                <div className="mt-2 h-16 w-16 bg-red-100 rounded-lg flex items-center justify-center">
                                  <i className="fas fa-file-pdf text-red-500 text-2xl"></i>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <i className="fas fa-file-upload text-gray-400 text-4xl mb-2"></i>
                          <p className="text-sm text-gray-500">
                            No additional documents added
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click the "Add Document" button to upload additional
                            documents
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 - Passport */}
            <div className={currentStep === 1 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-passport text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-gray-800">
                    Passport Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-user-tag text-green-500 mr-1"></i>{" "}
                      Passport Full Name
                    </label>
                    <Controller
                      name="passport_full_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter name as per passport"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-hashtag text-green-500 mr-1"></i>{" "}
                      Passport Number
                    </label>
                    <Controller
                      name="passport_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter passport number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-globe text-green-500 mr-1"></i>{" "}
                      Issued From
                    </label>
                    <Controller
                      name="passport_issued_from"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter issuing country/city"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                      Issued Date
                    </label>
                    <Controller
                      name="passport_issued_date"
                      control={control}
                      rules={{
                        validate: (value) =>
                          validateIssueDate(
                            value,
                            passportExpiry,
                            "Passport issued date",
                          ),
                      }}
                      render={({ field }) => (
                        <>
                          <DateInput
                            {...field}
                            placeholder="dd/mm/yyyy"
                            error={!!errors.passport_issued_date}
                          />

                          {errors.passport_issued_date && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.passport_issued_date.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                      Expiry Date
                    </label>
                    <Controller
                      name="passport_expiry_date"
                      control={control}
                      rules={{
                        validate: (value) =>
                          validateExpiryDate(
                            value,
                            passportIssued,
                            "Passport expiry date",
                          ),
                      }}
                      render={({ field }) => (
                        <>
                          <DateInput
                            {...field}
                            placeholder="dd/mm/yyyy"
                            error={!!errors.passport_expiry_date}
                          />

                          {errors.passport_expiry_date && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.passport_expiry_date.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-map-pin text-green-500 mr-1"></i>{" "}
                      Place of Birth
                    </label>
                    <Controller
                      name="place_of_birth"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter place of birth"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-father text-green-500 mr-1"></i>{" "}
                      Father's Name
                    </label>
                    <Controller
                      name="father_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter father's name"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-mother text-green-500 mr-1"></i>{" "}
                      Mother's Name
                    </label>
                    <Controller
                      name="mother_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter mother's name"
                        />
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-map-marker-alt text-green-500 mr-1"></i>{" "}
                      Address
                    </label>
                    <Controller
                      name="address"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          {...field}
                          rows="2"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter full address"
                        ></textarea>
                      )}
                    />
                  </div>

                  {/* Passport Documents */}
                  <div className="md:col-span-2">
                    <div className="border-t border-gray-200 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <i className="fas fa-passport text-green-500 mr-2"></i>
                        Passport Documents
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DocumentUpload
                          fieldKey="passport_1st_page"
                          label="Passport 1st Page"
                          icon="fas fa-passport"
                        />
                        <DocumentUpload
                          fieldKey="passport_2nd_page"
                          label="Passport 2nd Page"
                          icon="fas fa-passport"
                        />
                        <DocumentUpload
                          fieldKey="passport_outer_page"
                          label="Passport Outer Page"
                          icon="fas fa-passport"
                        />
                        <DocumentUpload
                          fieldKey="passport_id_page"
                          label="Passport ID Page"
                          icon="fas fa-id-card"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 - Visa, Labor & EID (Merged from previous steps 2 and 3) */}
            {currentStep === 2 && (
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-file-contract text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-gray-800">
                    Visa, Labor & Emirates ID
                  </h3>
                </div>
                <div className="space-y-6">
                  {/* Labor Section - Only show for Mainland companies */}
                  {selectedCompanyDetails?.raw?.trade_license ===
                    "mainland" && (
                    <div className="border border-gray-200 rounded-lg p-4 md:p-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                        <i className="fas fa-briefcase text-green-500 mr-2"></i>
                        Labor Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                            <i className="fas fa-briefcase text-green-500 mr-1"></i>{" "}
                            Labor Number
                          </label>
                          <Controller
                            name="labor_number"
                            control={control}
                            render={({ field }) => (
                              <>
                                <input
                                  {...field}
                                  type="text"
                                  className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:ring-2 ${errors.labor_number ? "border-red-500" : "border-gray-200 focus:border-green-500"}`}
                                  placeholder="Enter Labor Number"
                                />
                                {errors.labor_number && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {errors.labor_number.message}
                                  </p>
                                )}
                              </>
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                            <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                            Labor Issued Date
                          </label>
                          <Controller
                            name="labor_issued_date"
                            control={control}
                            rules={{
                              validate: (value) =>
                                validateIssueDate(
                                  value,
                                  laborExpiry,
                                  "Labor issued date",
                                ),
                            }}
                            render={({ field }) => (
                              <>
                                <DateInput
                                  {...field}
                                  placeholder="dd/mm/yyyy"
                                  error={!!errors.labor_issued_date}
                                />
                                {errors.labor_issued_date && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {errors.labor_issued_date.message}
                                  </p>
                                )}
                              </>
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                            <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                            Labor Expiry Date
                          </label>
                          <Controller
                            name="labor_expiry_date"
                            control={control}
                            rules={{
                              validate: (value) =>
                                validateExpiryDate(
                                  value,
                                  laborIssued,
                                  "Labor expiry date",
                                ),
                            }}
                            render={({ field }) => (
                              <>
                                <DateInput
                                  {...field}
                                  placeholder="dd/mm/yyyy"
                                  error={!!errors.labor_expiry_date}
                                />
                                {errors.labor_expiry_date && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {errors.labor_expiry_date.message}
                                  </p>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visa Section */}
                  <div className="border border-gray-200 rounded-lg p-4 md:p-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <i className="fas fa-passport text-green-500 mr-2"></i>
                      Visa Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-list text-green-500 mr-1"></i>{" "}
                          Type of Visa
                        </label>
                        <Controller
                          name="visa_type"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                            >
                              <option value="">Select Type of Visa</option>
                              {visaTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-id-card text-green-500 mr-1"></i>{" "}
                          Visa Number
                        </label>
                        <Controller
                          name="visa_number"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                              placeholder="Enter Visa Number"
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                          Visa Issued Date
                        </label>
                        <Controller
                          name="visa_issued_date"
                          control={control}
                          rules={{
                            validate: (value) =>
                              validateIssueDate(
                                value,
                                visaExpiry,
                                "Visa issued date",
                              ),
                          }}
                          render={({ field }) => (
                            <>
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.visa_issued_date}
                              />
                              {errors.visa_issued_date && (
                                <p className="mt-1 text-xs text-red-500">
                                  {errors.visa_issued_date.message}
                                </p>
                              )}
                            </>
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                          Visa Expiry Date
                        </label>
                        <Controller
                          name="visa_expiry_date"
                          control={control}
                          rules={{
                            validate: (value) =>
                              validateExpiryDate(
                                value,
                                visaIssued,
                                "Visa expiry date",
                              ),
                          }}
                          render={({ field }) => (
                            <>
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.visa_expiry_date}
                              />
                              {errors.visa_expiry_date && (
                                <p className="mt-1 text-xs text-red-500">
                                  {errors.visa_expiry_date.message}
                                </p>
                              )}
                            </>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EID Section */}
                  <div className="border border-gray-200 rounded-lg p-4 md:p-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <i className="fas fa-id-card text-green-500 mr-2"></i>
                      Emirates ID (EID)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-qrcode text-green-500 mr-1"></i>{" "}
                          EID Number
                        </label>
                        <Controller
                          name="eid_number"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                              placeholder="Enter EID number (e.g., 784-2024-1234567-8)"
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                          EID Issued Date
                        </label>
                        <Controller
                          name="eid_issued_date"
                          control={control}
                          rules={{
                            validate: (value) =>
                              validateIssueDate(
                                value,
                                eidExpiry,
                                "EID issued date",
                              ),
                          }}
                          render={({ field }) => (
                            <>
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.eid_issued_date}
                              />
                              {errors.eid_issued_date && (
                                <p className="mt-1 text-xs text-red-500">
                                  {errors.eid_issued_date.message}
                                </p>
                              )}
                            </>
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                          <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                          EID Expiry Date
                        </label>
                        <Controller
                          name="eid_expiry_date"
                          control={control}
                          rules={{
                            validate: (value) =>
                              validateExpiryDate(
                                value,
                                eidIssued,
                                "EID expiry date",
                              ),
                          }}
                          render={({ field }) => (
                            <>
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.eid_expiry_date}
                              />
                              {errors.eid_expiry_date && (
                                <p className="mt-1 text-xs text-red-500">
                                  {errors.eid_expiry_date.message}
                                </p>
                              )}
                            </>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Supporting Documents Section */}
                  <div>
                    <div className="border-t border-gray-200 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <i className="fas fa-file-contract text-green-500 mr-2"></i>
                        Supporting Documents
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DocumentUpload
                          fieldKey="visa_page"
                          label="Visa Page Copy"
                          icon="fas fa-file-contract"
                        />
                        {/* Only show labor documents for Mainland companies */}
                        {selectedCompanyDetails?.raw?.trade_license ===
                          "mainland" && (
                          <>
                            <DocumentUpload
                              fieldKey="labor_card"
                              label="Labor Card Copy"
                              icon="fas fa-id-card"
                            />
                            <DocumentUpload
                              fieldKey="labor_contract"
                              label="Attach Labor Contract"
                              icon="fas fa-file-signature"
                            />
                          </>
                        )}
                        <DocumentUpload
                          fieldKey="eid_1st_page"
                          label="EID Front Side"
                          icon="fas fa-id-card"
                        />
                        <DocumentUpload
                          fieldKey="eid_2nd_page"
                          label="EID Back Side"
                          icon="fas fa-id-card"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 - Contact */}
            <div className={currentStep === 3 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-address-card text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-gray-800">
                    Contact Information & Others
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-users text-green-500 mr-1"></i>{" "}
                      Dependents
                    </label>
                    <Controller
                      name="dependents"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Number of dependents"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-phone text-green-500 mr-1"></i>{" "}
                      Company Mobile Number
                    </label>
                    <Controller
                      name="company_mobile_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter company mobile number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-phone text-green-500 mr-1"></i>{" "}
                      Personal Number
                    </label>
                    <Controller
                      name="personal_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter personal phone number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-phone-alt text-green-500 mr-1"></i>{" "}
                      Other Number
                    </label>
                    <Controller
                      name="other_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter alternate number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-globe text-green-500 mr-1"></i> Home
                      Country Number
                    </label>
                    <Controller
                      name="home_country_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm md:text-base text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                          placeholder="Enter home country number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-envelope text-green-500 mr-1"></i>{" "}
                      Company Email
                    </label>
                    <Controller
                      name="company_email"
                      control={control}
                      rules={validationRules.company_email}
                      render={({ field }) => (
                        <>
                          <input
                            {...field}
                            type="email"
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 transition-all focus:outline-none focus:ring-2 ${errors.company_email ? "border-red-500" : "border-gray-200 focus:border-green-500"}`}
                            placeholder="name@company.com (Optional)"
                          />
                          {errors.company_email && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.company_email.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                      <i className="fas fa-envelope text-green-500 mr-1"></i>{" "}
                      Personal Email <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="personal_email"
                      control={control}
                      rules={validationRules.personal_email}
                      render={({ field }) => (
                        <>
                          <input
                            {...field}
                            type="email"
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 border rounded-lg text-sm md:text-base text-gray-800 transition-all focus:outline-none focus:ring-2 ${errors.personal_email ? "border-red-500" : "border-gray-200 focus:border-green-500"}`}
                            placeholder="name@gmail.com"
                          />
                          {errors.personal_email && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.personal_email.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Previous</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <span>Next</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Save Employee
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
      <DocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSave={handleAddDocument}
        uploading={uploadingDoc}
      />
      {/* Department Modal */}
      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        onSubmit={handleAddDepartment}
        isLoading={departmentModalLoading}
      />

      {/* Designation Modal */}
      <DesignationModal
        isOpen={isDesignationModalOpen}
        onClose={() => setIsDesignationModalOpen(false)}
        onSubmit={handleAddDesignation}
        isLoading={designationModalLoading}
        editingDesignation={null}
      />
    </div>
  );
};

export default AddEmployee;
