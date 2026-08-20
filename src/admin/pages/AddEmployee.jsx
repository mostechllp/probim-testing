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

// ─── HELPER COMPONENTS ──────────────────────────────────────────────────

// Theme-aware Form Input
const FormInput = ({
  label,
  icon,
  required,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className="form-group">
      <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
        <i className={`${icon} text-green-500 mr-1`}></i> {label}
        {required && <span className="text-[var(--form-error)] ml-1">*</span>}
      </label>
      <input
        {...props}
        className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 placeholder:text-[var(--form-placeholder)] ${
          error
            ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
            : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
        } ${className}`}
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--form-error)]">{error}</p>
      )}
    </div>
  );
};

// Theme-aware Form Select
// Theme-aware Form Select - UPDATED
const FormSelect = ({
  label,
  icon,
  required,
  error,
  options,
  placeholder,
  ...props
}) => {
  return (
    <div className="form-group">
      <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
        <i className={`${icon} text-green-500 mr-1`}></i> {label}
        {required && <span className="text-[var(--form-error)] ml-1">*</span>}
      </label>
      <select
        {...props}
        className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 ${
          error
            ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
            : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
        } disabled:opacity-50 disabled:cursor-not-allowed appearance-none`}
        style={{
          // Ensure dropdown options inherit dark theme
          colorScheme: 'dark',
        }}
      >
        <option value="" className="bg-[var(--form-surface)] text-[var(--form-text)]">
          {placeholder}
        </option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-[var(--form-surface)] text-[var(--form-text)] hover:bg-[var(--form-surface-hover)]"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-[var(--form-error)]">{error}</p>
      )}
    </div>
  );
};

// Theme-aware Document Upload
const DocumentUpload = ({
  fieldKey,
  label,
  icon,
  accept = "image/*,.pdf",
  documents,
  documentPreviews,
  uploadingFiles,
  handleFileChange,
  setDocuments,
  setDocumentPreviews,
}) => {
  const fileInputId = `doc_${fieldKey}`;
  const isUploading = uploadingFiles[fieldKey];

  return (
    <div className="border border-[var(--form-border)] rounded-lg p-4 bg-[var(--form-surface)]/30">
      <label className="block text-sm font-semibold text-[var(--form-label)] mb-3">
        <i className={`${icon} text-green-500 mr-2`}></i>
        {label}
        <span className="text-xs text-[var(--form-text-muted)] ml-2">
          (Optional)
        </span>
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
        <span className="text-sm text-[var(--form-text-secondary)] truncate flex-1">
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
            className="h-20 w-20 object-cover rounded-lg border border-[var(--form-border)]"
          />
          <button
            type="button"
            onClick={() => {
              setDocuments({ ...documents, [fieldKey]: null });
              setDocumentPreviews({ ...documentPreviews, [fieldKey]: null });
            }}
            className="mt-2 text-xs text-[var(--form-error)] hover:text-[var(--form-error)]/80 flex items-center gap-1"
          >
            <i className="fas fa-trash"></i> Remove
          </button>
        </div>
      )}
      {documentPreviews[fieldKey] === "pdf" && (
        <div className="mt-3">
          <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center border border-[var(--form-border)]">
            <i className="fas fa-file-pdf text-red-500 text-3xl"></i>
          </div>
          <button
            type="button"
            onClick={() => {
              setDocuments({ ...documents, [fieldKey]: null });
              setDocumentPreviews({ ...documentPreviews, [fieldKey]: null });
            }}
            className="mt-2 text-xs text-[var(--form-error)] hover:text-[var(--form-error)]/80 flex items-center gap-1"
          >
            <i className="fas fa-trash"></i> Remove
          </button>
        </div>
      )}
      <p className="text-xs text-[var(--form-text-muted)] mt-2">
        <i className="fas fa-info-circle mr-1"></i> Max size: 5MB. Allowed: JPG,
        PNG, PDF
      </p>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

const AddEmployee = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, setVisitedSteps] = useState([0]);
  const [stepErrors, setStepErrors] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
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

  const [idGenerationMethod, setIdGenerationMethod] = useState("manual");
  const [idPrefix, setIdPrefix] = useState("EMP");
  const [idFormat, setIdFormat] = useState("prefix+year+month+day+random");
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

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
    setValue,
  } = useForm({
    defaultValues: {
      first_name: "",
      last_name: "",
      organization_id: "",
      company_id: "",
      designation_id: "",
      department_id: "",
      type: "employee",
      role: "",
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
      passport_full_name: "",
      passport_number: "",
      passport_issued_date: "",
      passport_expiry_date: "",
      father_name: "",
      mother_name: "",
      address: "",
      passport_issued_from: "",
      place_of_birth: "",
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

  // ─── ID GENERATION FUNCTIONS ──────────────────────────────────────────

  const generateEmployeeIdWithOptions = (dob, joiningDate, prefix, format) => {
    if (
      (format !== "manual" && (!dob || !joiningDate)) ||
      format === "manual"
    ) {
      return "";
    }

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
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    let generatedId = format;
    generatedId = generatedId.replace(/prefix/g, prefix || "EMP");

    if (generatedId.includes("year")) {
      const year = joiningDateObj
        ? joiningDateObj.getFullYear()
        : new Date().getFullYear();
      generatedId = generatedId.replace(/year/g, year);
    }

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

    if (generatedId.includes("dob_ddmm") && dobDate) {
      const dobDay = String(dobDate.getDate()).padStart(2, "0");
      const dobMonth = String(dobDate.getMonth() + 1).padStart(2, "0");
      generatedId = generatedId.replace(/dob_ddmm/g, `${dobDay}${dobMonth}`);
    }

    if (generatedId.includes("timestamp")) {
      generatedId = generatedId.replace(/timestamp/g, timestamp);
    }

    if (generatedId.includes("random")) {
      generatedId = generatedId.replace(/random/g, random);
    }

    if (generatedId.includes("sequence")) {
      generatedId = generatedId.replace(/sequence/g, "001");
    }

    generatedId = generatedId.replace(/\+/g, "-");
    return generatedId;
  };

  // ─── EFFECTS ────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (idGenerationMethod === "manual") {
      setValue("employee_id", manualEmployeeId);
    }
  }, [manualEmployeeId, idGenerationMethod, setValue]);

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

  const [customFormat, setCustomFormat] = useState(
    "prefix+year+month+day+timestamp",
  );

  // ─── HANDLERS ──────────────────────────────────────────────────────────

  const handleAddDepartment = async (data) => {
    setDepartmentModalLoading(true);
    try {
      const result = await dispatch(addDepartment(data));
      if (addDepartment.fulfilled.match(result)) {
        showToast("Department added successfully", "success");
        setIsDepartmentModalOpen(false);
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

  // ─── FETCH DATA ────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchOrganizations());
    dispatch(fetchDesignations());
    dispatch(fetchDepartments());
    dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    if (watchOrganizationId) {
      const org = organizations.find(
        (org) => org.id === parseInt(watchOrganizationId),
      );
      setSelectedOrgDetails(org || null);
      if (org && org.multi_company === "Yes") {
        dispatch(fetchCompanies(watchOrganizationId));
      } else {
        setValue("company_id", "");
        setSelectedCompanyDetails(null);
      }
    } else {
      setSelectedOrgDetails(null);
      setSelectedCompanyDetails(null);
    }
  }, [watchOrganizationId, organizations, dispatch, setValue]);

  useEffect(() => {
    if (watchCompanyId && companies.length > 0) {
      const company = companies.find(
        (comp) => comp.id === parseInt(watchCompanyId),
      );
      setSelectedCompanyDetails(company || null);
      if (company && company.raw?.trade_license === "freezone") {
        setValue("labor_number", "");
        setValue("labor_issued_date", "");
        setValue("labor_expiry_date", "");
      }
    } else {
      setSelectedCompanyDetails(null);
    }
  }, [watchCompanyId, companies, setValue]);

  // ─── STEP CONFIGURATION ───────────────────────────────────────────────

  const steps = [
    { number: 1, title: "Basic Info", icon: "fas fa-user-circle" },
    { number: 2, title: "Passport", icon: "fas fa-passport" },
    { number: 3, title: "Visa, Labor & EID", icon: "fas fa-file-contract" },
    { number: 4, title: "Contact", icon: "fas fa-address-card" },
  ];

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
          "role",
          "dob",
          "joining_date",
          "employee_id",
        ];
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
        return ["company_email", "personal_email"];
      default:
        return [];
    }
  };

  // ─── FILE HANDLING ─────────────────────────────────────────────────────

  const handleFileChange = async (fieldKey, file) => {
    if (!file) return;

    const fileSize = file.size / 1024 / 1024;
    const maxSize = fieldKey === "avatar" ? 2 : 5;
    if (fileSize > maxSize) {
      showToast(`File must be less than ${maxSize}MB`, "error");
      return;
    }

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

  // ─── NAVIGATION ────────────────────────────────────────────────────────

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

  // ─── FORM SUBMISSION ──────────────────────────────────────────────────

  const onSubmit = async (data) => {
    setLoading(true);

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

    formData.append("first_name", data.first_name);
    formData.append("last_name", data.last_name || "");

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

    if (data.probation_start_date)
      formData.append(
        "probation_start_date",
        convertDateToBackend(data.probation_start_date),
      );
    if (data.probation_end_date)
      formData.append(
        "probation_end_date",
        convertDateToBackend(data.probation_end_date),
      );
    if (data.confirmation_date)
      formData.append(
        "confirmation_date",
        convertDateToBackend(data.confirmation_date),
      );
    if (data.contract_start_date)
      formData.append(
        "contract_start_date",
        convertDateToBackend(data.contract_start_date),
      );
    if (data.contract_end_date)
      formData.append(
        "contract_end_date",
        convertDateToBackend(data.contract_end_date),
      );
    if (data.notice_period_start_date)
      formData.append(
        "notice_period_start_date",
        convertDateToBackend(data.notice_period_start_date),
      );
    if (data.last_working_day)
      formData.append(
        "last_working_day",
        convertDateToBackend(data.last_working_day),
      );
    if (data.resignation_date)
      formData.append(
        "resignation_date",
        convertDateToBackend(data.resignation_date),
      );
    if (data.relieving_date)
      formData.append(
        "relieving_date",
        convertDateToBackend(data.relieving_date),
      );

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

    if (selectedCompanyDetails?.raw?.trade_license === "mainland") {
      formData.append("labor_number", data.labor_number || "");
      const laborIssuedConverted = convertDateToBackend(data.labor_issued_date);
      formData.append("labor_issued_date", laborIssuedConverted);
      const laborExpiryConverted = convertDateToBackend(data.labor_expiry_date);
      formData.append("labor_expiry_date", laborExpiryConverted);
    } else {
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

    if (documents.avatar) {
      formData.append("avatar", documents.avatar);
    }

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

    if (additionalDocuments.length > 0) {
      additionalDocuments.forEach((doc, index) => {
        if (doc.file_path) {
          formData.append(
            `additional_documents[${index}][file_path]`,
            doc.file_path,
          );
        }
        if (doc.file) {
          formData.append(`additional_documents[${index}][file]`, doc.file);
        }
        if (doc.document_name || doc.name) {
          formData.append(
            `additional_documents[${index}][document_name]`,
            doc.document_name || doc.name,
          );
        }
        if (doc.filename) {
          formData.append(
            `additional_documents[${index}][filename]`,
            doc.filename,
          );
        }
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

  // ─── DOCUMENT MODAL HANDLER ───────────────────────────────────────────

  const handleAddDocument = async (docData) => {
    setUploadingDoc(true);

    try {
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

        let preview = null;
        if (docData.file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setAdditionalDocuments((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                name: docData.name,
                document_name: docData.name,
                filename: filename,
                file_path: result.path,
                file: docData.file,
                preview: e.target.result,
                expiry_date: docData.expiry_date || null,
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
              file_path: result.path,
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

  // ─── VALIDATION RULES ─────────────────────────────────────────────────

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

  // ─── DATE VALIDATION ──────────────────────────────────────────────────

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

  // ─── RENDER ─────────────────────────────────────────────────────────────

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
        <i className="fas fa-chevron-right text-[var(--form-text-muted)] text-[10px] md:text-xs"></i>
        <span className="text-[var(--form-text-secondary)]">Add Employee</span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 bg-clip-text text-transparent dark:from-gray-200 dark:to-green-400">
          <i className="fas fa-user-plus mr-2"></i> Add New Employee
        </h2>
        <p className="text-sm text-[var(--form-text-secondary)] mt-1">
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
                    ? "bg-[var(--form-error-bg)] text-[var(--form-error)] border border-[var(--form-error-border)]"
                    : index < currentStep
                      ? "text-green-500"
                      : "bg-[var(--form-surface)] text-[var(--form-text-secondary)] border border-[var(--form-border)]"
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
      <div className="bg-[var(--form-bg)] border border-[var(--form-border)] rounded-xl p-4 md:p-6 lg:p-8 shadow-[var(--form-shadow)]">
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
              <div className="rounded-lg border border-[var(--form-error-border)] bg-[var(--form-error-bg)] px-3 py-2">
                <p className="text-xs md:text-sm text-[var(--form-error)]">
                  <i className="fas fa-exclamation-circle mr-1"></i>
                  Please complete required fields in this section.
                </p>
              </div>
            )}

            {/* ─── STEP 0: BASIC INFO ────────────────────────────────────── */}
            <div className={currentStep === 0 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-user-circle text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-[var(--form-text)]">
                    Basic Information
                  </h3>
                </div>
                {stepErrors[0] && (
                  <p className="text-xs md:text-sm text-[var(--form-error)] mb-4">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    Please fill all mandatory fields in this section.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <Controller
                    name="first_name"
                    control={control}
                    rules={validationRules.first_name}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="First Name"
                        icon="fas fa-user"
                        required
                        error={errors.first_name?.message}
                        placeholder="Enter first name"
                      />
                    )}
                  />

                  <Controller
                    name="last_name"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Last Name"
                        icon="fas fa-user"
                        placeholder="Enter last name"
                      />
                    )}
                  />

                  <Controller
                    name="organization_id"
                    control={control}
                    rules={validationRules.organization_id}
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        label="Organization"
                        icon="fas fa-building"
                        required
                        error={errors.organization_id?.message}
                        options={organizations.map((org) => ({
                          value: org.id,
                          label: org.name,
                        }))}
                        placeholder="Select Organization"
                      />
                    )}
                  />

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
                      <FormSelect
                        {...field}
                        label="Company"
                        icon="fas fa-building"
                        required={selectedOrgDetails?.multi_company === "Yes"}
                        error={errors.company_id?.message}
                        options={
                          companies.map((company) => ({
                            value: company.id,
                            label: `${company.company_name || company.name}${
                              company.raw?.trade_license
                                ? ` (${company.raw?.trade_license})`
                                : ""
                            }`,
                          })) || []
                        }
                        placeholder={
                          selectedOrgDetails?.multi_company === "Yes"
                            ? "Select Company"
                            : selectedOrgDetails
                              ? "No multiple companies"
                              : "Select organization first"
                        }
                        disabled={selectedOrgDetails?.multi_company !== "Yes"}
                      />
                    )}
                  />

                  {/* Trade License Info */}
                  {selectedCompanyDetails &&
                    selectedCompanyDetails.raw?.trade_license && (
                      <div className="md:col-span-2">
                        <div
                          className={`p-3 rounded-lg ${
                            selectedCompanyDetails.raw?.trade_license ===
                            "mainland"
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                              : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <i
                              className={`fas ${
                                selectedCompanyDetails.raw?.trade_license ===
                                "mainland"
                                  ? "fa-building"
                                  : "fa-globe"
                              } ${
                                selectedCompanyDetails.raw?.trade_license ===
                                "mainland"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-yellow-600 dark:text-yellow-400"
                              }`}
                            ></i>
                            <span className="text-sm font-semibold text-[var(--form-text)]">
                              Company Trade License:{" "}
                              <span
                                className={
                                  selectedCompanyDetails.raw?.trade_license ===
                                  "mainland"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-yellow-600 dark:text-yellow-400"
                                }
                              >
                                {selectedCompanyDetails.raw?.trade_license.toUpperCase()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  <Controller
                    name="department_id"
                    control={control}
                    rules={validationRules.department_id}
                    render={({ field }) => (
                      <div>
                        <div className="flex items-center justify-between mb-1 md:mb-2">
                          <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)]">
                            <i className="fas fa-diagram-project text-green-500 mr-1"></i>{" "}
                            Department{" "}
                            <span className="text-[var(--form-error)]">*</span>
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
                        <select
                          {...field}
                          className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 ${
                            errors.department_id
                              ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                              : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                          }`}
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {errors.department_id && (
                          <p className="mt-1 text-xs text-[var(--form-error)]">
                            {errors.department_id.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="designation_id"
                    control={control}
                    rules={validationRules.designation_id}
                    render={({ field }) => (
                      <div>
                        <div className="flex items-center justify-between mb-1 md:mb-2">
                          <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)]">
                            <i className="fas fa-briefcase text-green-500 mr-1"></i>{" "}
                            Designation{" "}
                            <span className="text-[var(--form-error)]">*</span>
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
                        <select
                          {...field}
                          className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 ${
                            errors.designation_id
                              ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                              : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                          }`}
                        >
                          <option value="">Select Designation</option>
                          {designations.map((desig) => (
                            <option key={desig.id} value={desig.id}>
                              {desig.name}
                            </option>
                          ))}
                        </select>
                        {errors.designation_id && (
                          <p className="mt-1 text-xs text-[var(--form-error)]">
                            {errors.designation_id.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="type"
                    control={control}
                    rules={validationRules.type}
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        label="User Type"
                        icon="fas fa-user-tag"
                        required
                        error={errors.type?.message}
                        options={userTypeOptions}
                        placeholder="Select User Type"
                      />
                    )}
                  />

                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        label="Gender"
                        icon="fas fa-venus-mars"
                        options={genderOptions}
                        placeholder="Select Gender"
                      />
                    )}
                  />

                  <Controller
                    name="nationality"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        label="Nationality"
                        icon="fas fa-globe-asia"
                        options={nationalityOptions.map((n) => ({
                          value: n,
                          label: n,
                        }))}
                        placeholder="Select Nationality"
                      />
                    )}
                  />

                  <Controller
                    name="marital_status"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        {...field}
                        label="Marital Status"
                        icon="fas fa-user-friends"
                        options={maritalStatusOptions.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                        placeholder="Select Marital Status"
                      />
                    )}
                  />

                  <Controller
                    name="role"
                    control={control}
                    rules={validationRules.role}
                    render={({ field, fieldState: { error } }) => (
                      <FormSelect
                        {...field}
                        label="Role"
                        icon="fas fa-user-tag"
                        required
                        error={error?.message || errors.role?.message}
                        options={roles.map((role) => ({
                          value: role.id,
                          label: role.name,
                        }))}
                        placeholder="Select Role"
                      />
                    )}
                  />

                  {/* Special Days */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-2">
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
                                    className={`w-full px-3 py-2 bg-[var(--form-surface)] border rounded-lg text-sm text-[var(--form-text)] focus:outline-none focus:ring-2 ${
                                      errors?.special_days?.[index]?.name
                                        ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                        : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                                    }`}
                                  />
                                  {errors?.special_days?.[index]?.name && (
                                    <p className="mt-1 text-xs text-[var(--form-error)]">
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
                                    <p className="mt-1 text-xs text-[var(--form-error)]">
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
                              className="p-2 text-[var(--form-error)] hover:text-[var(--form-error)]/80 transition-colors"
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
                    <p className="text-xs text-[var(--form-text-muted)] mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Add special
                      occasions like birthday, anniversary, etc.
                    </p>
                  </div>

                  {/* Employee ID Generation */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-2">
                      <i className="fas fa-id-card text-green-500 mr-1"></i>
                      Employee ID Generation{" "}
                      <span className="text-[var(--form-error)]">*</span>
                    </label>

                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center text-[var(--form-text)]">
                        <input
                          type="radio"
                          checked={idGenerationMethod === "manual"}
                          onChange={() => setIdGenerationMethod("manual")}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm">Manual Entry</span>
                      </label>
                      <label className="flex items-center text-[var(--form-text)]">
                        <input
                          type="radio"
                          checked={idGenerationMethod === "auto"}
                          onChange={() => setIdGenerationMethod("auto")}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm">Auto-Generate</span>
                      </label>
                    </div>

                    {idGenerationMethod === "manual" ? (
                      <div>
                        <input
                          type="text"
                          value={manualEmployeeId}
                          onChange={(e) =>
                            setManualEmployeeId(e.target.value.toUpperCase())
                          }
                          placeholder="Enter Employee ID (e.g., EMP001, STAFF-001)"
                          className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 placeholder:text-[var(--form-placeholder)] ${
                            errors.employee_id
                              ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                              : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                          }`}
                        />
                        <p className="text-xs text-[var(--form-text-muted)] mt-1">
                          <i className="fas fa-info-circle mr-1"></i>
                          You can enter any unique ID format
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--form-label)] mb-1">
                            Prefix
                          </label>
                          <input
                            type="text"
                            value={idPrefix}
                            onChange={(e) =>
                              setIdPrefix(e.target.value.toUpperCase())
                            }
                            placeholder="e.g., EMP, STAFF, ENG"
                            className="w-full px-3 py-2 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--form-label)] mb-1">
                            ID Format
                          </label>
                          <select
                            value={idFormat}
                            onChange={(e) => setIdFormat(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)]"
                          >
                            {formatOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        {idFormat === "custom" && (
                          <div>
                            <label className="block text-xs font-semibold text-[var(--form-label)] mb-1">
                              Custom Format Pattern
                            </label>
                            <input
                              type="text"
                              value={customFormat}
                              onChange={(e) => setCustomFormat(e.target.value)}
                              placeholder="e.g., prefix+year+month+day+random"
                              className="w-full px-3 py-2 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm font-mono text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)]"
                            />
                            <div className="mt-2 text-xs text-[var(--form-text-muted)]">
                              <p className="font-semibold mb-1 text-[var(--form-text-secondary)]">
                                Available placeholders:
                              </p>
                              <div className="grid grid-cols-2 gap-1">
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    prefix
                                  </code>{" "}
                                  - Your prefix
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    year
                                  </code>{" "}
                                  - Joining year
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    month
                                  </code>{" "}
                                  - Joining month
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    day
                                  </code>{" "}
                                  - Joining day
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    dob_ddmm
                                  </code>{" "}
                                  - DOB (DDMM)
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    timestamp
                                  </code>{" "}
                                  - Unix timestamp
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    random
                                  </code>{" "}
                                  - Random string
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">
                                    sequence
                                  </code>{" "}
                                  - Sequence number
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {watchDob && watchJoiningDate && generatedPreview && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">
                              Preview:
                            </p>
                            <p className="text-sm font-mono font-bold text-green-800 dark:text-green-300">
                              {generatedPreview}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              <i className="fas fa-check-circle mr-1"></i>
                              ID will be generated based on DOB and Joining Date
                            </p>
                          </div>
                        )}

                        {(!watchDob || !watchJoiningDate) && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-xs text-yellow-700 dark:text-yellow-400">
                              <i className="fas fa-info-circle mr-1"></i>
                              Please enter DOB and Joining Date to see ID
                              preview
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <Controller
                      name="employee_id"
                      control={control}
                      rules={{ required: "Employee ID is required" }}
                      render={({ field }) => <input {...field} type="hidden" />}
                    />

                    {errors.employee_id && (
                      <p className="mt-1 text-xs text-[var(--form-error)]">
                        {errors.employee_id.message}
                      </p>
                    )}
                  </div>

                  <Controller
                    name="dob"
                    control={control}
                    rules={{ required: "Date of Birth is required" }}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar text-green-500 mr-1"></i>{" "}
                          Date of Birth{" "}
                          <span className="text-[var(--form-error)]">*</span>
                        </label>
                        <DateInput
                          type="dob"
                          {...field}
                          placeholder="dd/mm/yyyy"
                          error={!!errors.dob}
                        />
                        {errors.dob && (
                          <p className="mt-1 text-xs text-[var(--form-error)]">
                            {errors.dob.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="joining_date"
                    control={control}
                    rules={{ required: "Joining Date is required" }}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-alt text-green-500 mr-1"></i>{" "}
                          Joining Date{" "}
                          <span className="text-[var(--form-error)]">*</span>
                        </label>
                        <DateInput
                          {...field}
                          placeholder="dd/mm/yyyy"
                          error={!!errors.joining_date}
                        />
                        {errors.joining_date && (
                          <p className="mt-1 text-xs text-[var(--form-error)]">
                            {errors.joining_date.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  {/* Employment Timeline */}
                  <div className="md:col-span-2 mt-6 mb-2">
                    <h3 className="text-lg font-bold text-[var(--form-text)] flex items-center">
                      <i className="fas fa-calendar-alt text-green-500 mr-2"></i>
                      Employment Timeline & Dates
                    </h3>
                  </div>

                  <Controller
                    name="probation_start_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-plus text-green-500 mr-1"></i>
                          Probation Start Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="probation_end_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-minus text-green-500 mr-1"></i>
                          Probation End Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="confirmation_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-user-check text-green-500 mr-1"></i>
                          Confirmation Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="contract_start_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-file-signature text-green-500 mr-1"></i>
                          Contract Start Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="contract_end_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-file-contract text-green-500 mr-1"></i>
                          Contract End Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="resignation_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-sign-out-alt text-green-500 mr-1"></i>
                          Resignation Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="notice_period_start_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-hourglass-start text-green-500 mr-1"></i>
                          Notice Period Start Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="last_working_day"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-briefcase text-green-500 mr-1"></i>
                          Last Working Day (LWD)
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  <Controller
                    name="relieving_date"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-door-open text-green-500 mr-1"></i>
                          Relieving Date
                        </label>
                        <DateInput {...field} placeholder="dd/mm/yyyy" />
                      </div>
                    )}
                  />

                  {/* Avatar Upload */}
                  <div className="md:col-span-2">
                    <div className="border border-[var(--form-border)] rounded-lg p-4 bg-[var(--form-surface)]/30 mb-4">
                      <label className="block text-sm font-semibold text-[var(--form-label)] mb-3">
                        <i className="fas fa-camera text-green-500 mr-2"></i>
                        Passport Size Photo
                        <span className="text-xs text-[var(--form-text-muted)] ml-2">
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
                          className="h-40 w-32 border-2 border-dashed border-[var(--form-border)] rounded-xl bg-[var(--form-surface)] hover:border-green-400 transition-colors flex items-center justify-center overflow-hidden"
                          aria-label="Upload passport size photo"
                        >
                          {documentPreviews.avatar ? (
                            <img
                              src={documentPreviews.avatar}
                              alt="Passport size"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-[var(--form-text-muted)]">
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
                            className="px-4 py-2 bg-white dark:bg-[var(--form-surface)] border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-full text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-2"
                          >
                            <i className="fas fa-upload"></i> Upload Photo
                          </button>
                          <p className="text-sm text-[var(--form-text-secondary)] mt-2 truncate">
                            {documents.avatar
                              ? documents.avatar.name || "Photo selected"
                              : "No photo chosen"}
                          </p>
                          <p className="text-xs text-[var(--form-text-muted)] mt-2">
                            <i className="fas fa-info-circle mr-1"></i>{" "}
                            Accepted: JPG, PNG, GIF. Max 2MB.
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
                          className="mt-2 text-xs text-[var(--form-error)] hover:text-[var(--form-error)]/80 flex items-center gap-1"
                        >
                          <i className="fas fa-trash"></i> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Employee Category */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-2">
                      <i className="fas fa-graduation-cap text-green-500 mr-1"></i>
                      Employee Category{" "}
                      <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center text-[var(--form-text)]">
                        <input
                          type="radio"
                          name="skillStatus"
                          value="skilled"
                          checked={isSkilled === true}
                          onChange={() => setIsSkilled(true)}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm">Skilled</span>
                      </label>
                      <label className="flex items-center text-[var(--form-text)]">
                        <input
                          type="radio"
                          name="skillStatus"
                          value="unskilled"
                          checked={isSkilled === false}
                          onChange={() => setIsSkilled(false)}
                          className="mr-2 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-sm">Unskilled</span>
                      </label>
                    </div>
                    <p className="text-xs text-[var(--form-text-muted)] mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Skilled employees need to provide educational documents
                    </p>
                  </div>

                  {/* Educational Documents - Skilled only */}
                  {isSkilled === true && (
                    <>
                      <div className="md:col-span-2">
                        <div className="border-t border-[var(--form-border)] pt-4 mt-2">
                          <h4 className="text-sm font-semibold text-[var(--form-label)] mb-3 flex items-center">
                            <i className="fas fa-graduation-cap text-green-500 mr-2"></i>
                            Educational Documents
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DocumentUpload
                              fieldKey="educational_1st_page"
                              label="Educational Certificate (Front)"
                              icon="fas fa-graduation-cap"
                              documents={documents}
                              documentPreviews={documentPreviews}
                              uploadingFiles={uploadingFiles}
                              handleFileChange={handleFileChange}
                              setDocuments={setDocuments}
                              setDocumentPreviews={setDocumentPreviews}
                            />
                            <DocumentUpload
                              fieldKey="educational_2nd_page"
                              label="Educational Certificate (Back)"
                              icon="fas fa-graduation-cap"
                              documents={documents}
                              documentPreviews={documentPreviews}
                              uploadingFiles={uploadingFiles}
                              handleFileChange={handleFileChange}
                              setDocuments={setDocuments}
                              setDocumentPreviews={setDocumentPreviews}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <DocumentUpload
                          fieldKey="home_country_id_proof"
                          label="Home Country ID Proof"
                          icon="fas fa-home"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                      </div>
                    </>
                  )}

                  {/* Additional Documents */}
                  <div className="md:col-span-2">
                    <div className="border-t border-[var(--form-border)] pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-[var(--form-label)] flex items-center">
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

                      {additionalDocuments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                          {additionalDocuments.map((doc, index) => (
                            <div
                              key={doc.id || index}
                              className="border border-[var(--form-border)] rounded-lg p-3 bg-[var(--form-surface)]/30"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-[var(--form-text)] truncate">
                                    {doc.document_name || doc.name}
                                  </p>
                                  <p className="text-xs text-[var(--form-text-secondary)] mt-1">
                                    {doc.filename ||
                                      doc.file?.name ||
                                      "Document uploaded"}
                                  </p>
                                  {doc.expiry_date && (
                                    <p className="text-xs text-[var(--form-error)] mt-1">
                                      <i className="fas fa-calendar-times mr-1"></i>
                                      Expires: {doc.expiry_date}
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
                                  className="text-[var(--form-error)] hover:text-[var(--form-error)]/80 ml-2"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                              {doc.preview && doc.preview !== "pdf" && (
                                <img
                                  src={doc.preview}
                                  alt={doc.name}
                                  className="mt-2 h-16 w-16 object-cover rounded-lg border border-[var(--form-border)]"
                                />
                              )}
                              {doc.preview === "pdf" && (
                                <div className="mt-2 h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center border border-[var(--form-border)]">
                                  <i className="fas fa-file-pdf text-red-500 text-2xl"></i>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-[var(--form-surface)]/30 rounded-lg border-2 border-dashed border-[var(--form-border)]">
                          <i className="fas fa-file-upload text-[var(--form-text-muted)] text-4xl mb-2"></i>
                          <p className="text-sm text-[var(--form-text-secondary)]">
                            No additional documents added
                          </p>
                          <p className="text-xs text-[var(--form-text-muted)] mt-1">
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

            {/* ─── STEP 1: PASSPORT ────────────────────────────────────── */}
            <div className={currentStep === 1 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-passport text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-[var(--form-text)]">
                    Passport Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="md:col-span-2">
                    <Controller
                      name="passport_full_name"
                      control={control}
                      render={({ field }) => (
                        <FormInput
                          {...field}
                          label="Passport Full Name"
                          icon="fas fa-user-tag"
                          placeholder="Enter name as per passport"
                        />
                      )}
                    />
                  </div>

                  <Controller
                    name="passport_number"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Passport Number"
                        icon="fas fa-hashtag"
                        placeholder="Enter passport number"
                      />
                    )}
                  />

                  <Controller
                    name="passport_issued_from"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Issued From"
                        icon="fas fa-globe"
                        placeholder="Enter issuing country/city"
                      />
                    )}
                  />

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
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                          Issued Date
                        </label>
                        <DateInput
                          {...field}
                          placeholder="dd/mm/yyyy"
                          error={!!errors.passport_issued_date}
                        />
                        {errors.passport_issued_date && (
                          <p className="mt-1 text-xs text-[var(--form-error)]">
                            {errors.passport_issued_date.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

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
                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                          Expiry Date
                        </label>
                        <DateInput
                          {...field}
                          placeholder="dd/mm/yyyy"
                          error={!!errors.passport_expiry_date}
                        />
                        {errors.passport_expiry_date && (
                          <p className="mt-1 text-xs text-[var(--form-error)]">
                            {errors.passport_expiry_date.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name="place_of_birth"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Place of Birth"
                        icon="fas fa-map-pin"
                        placeholder="Enter place of birth"
                      />
                    )}
                  />

                  <Controller
                    name="father_name"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Father's Name"
                        icon="fas fa-father"
                        placeholder="Enter father's name"
                      />
                    )}
                  />

                  <Controller
                    name="mother_name"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Mother's Name"
                        icon="fas fa-mother"
                        placeholder="Enter mother's name"
                      />
                    )}
                  />

                  <div className="md:col-span-2">
                    <Controller
                      name="address"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                            <i className="fas fa-map-marker-alt text-green-500 mr-1"></i>{" "}
                            Address
                          </label>
                          <textarea
                            {...field}
                            rows="2"
                            className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                            placeholder="Enter full address"
                          ></textarea>
                        </div>
                      )}
                    />
                  </div>

                  {/* Passport Documents */}
                  <div className="md:col-span-2">
                    <div className="border-t border-[var(--form-border)] pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-[var(--form-label)] mb-3 flex items-center">
                        <i className="fas fa-passport text-green-500 mr-2"></i>
                        Passport Documents
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DocumentUpload
                          fieldKey="passport_1st_page"
                          label="Passport 1st Page"
                          icon="fas fa-passport"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                        <DocumentUpload
                          fieldKey="passport_2nd_page"
                          label="Passport 2nd Page"
                          icon="fas fa-passport"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                        <DocumentUpload
                          fieldKey="passport_outer_page"
                          label="Passport Outer Page"
                          icon="fas fa-passport"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                        <DocumentUpload
                          fieldKey="passport_id_page"
                          label="Passport ID Page"
                          icon="fas fa-id-card"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── STEP 2: VISA, LABOR & EID ───────────────────────────── */}
            <div className={currentStep === 2 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-file-contract text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-[var(--form-text)]">
                    Visa, Labor & Emirates ID
                  </h3>
                </div>
                <div className="space-y-6">
                  {/* Labor Section - Mainland only */}
                  {selectedCompanyDetails?.raw?.trade_license ===
                    "mainland" && (
                    <div className="border border-[var(--form-border)] rounded-lg p-4 md:p-5">
                      <h4 className="text-sm font-semibold text-[var(--form-label)] mb-4 flex items-center">
                        <i className="fas fa-briefcase text-green-500 mr-2"></i>
                        Labor Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        <Controller
                          name="labor_number"
                          control={control}
                          render={({ field }) => (
                            <FormInput
                              {...field}
                              label="Labor Number"
                              icon="fas fa-briefcase"
                              placeholder="Enter Labor Number"
                            />
                          )}
                        />

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
                            <div>
                              <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                                <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                                Labor Issued Date
                              </label>
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.labor_issued_date}
                              />
                              {errors.labor_issued_date && (
                                <p className="mt-1 text-xs text-[var(--form-error)]">
                                  {errors.labor_issued_date.message}
                                </p>
                              )}
                            </div>
                          )}
                        />

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
                            <div>
                              <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                                <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                                Labor Expiry Date
                              </label>
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.labor_expiry_date}
                              />
                              {errors.labor_expiry_date && (
                                <p className="mt-1 text-xs text-[var(--form-error)]">
                                  {errors.labor_expiry_date.message}
                                </p>
                              )}
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Visa Section */}
                  <div className="border border-[var(--form-border)] rounded-lg p-4 md:p-5">
                    <h4 className="text-sm font-semibold text-[var(--form-label)] mb-4 flex items-center">
                      <i className="fas fa-passport text-green-500 mr-2"></i>
                      Visa Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="md:col-span-2">
                        <Controller
                          name="visa_type"
                          control={control}
                          render={({ field }) => (
                            <FormSelect
                              {...field}
                              label="Type of Visa"
                              icon="fas fa-list"
                              options={visaTypeOptions}
                              placeholder="Select Type of Visa"
                            />
                          )}
                        />
                      </div>

                      <Controller
                        name="visa_number"
                        control={control}
                        render={({ field }) => (
                          <FormInput
                            {...field}
                            label="Visa Number"
                            icon="fas fa-id-card"
                            placeholder="Enter Visa Number"
                          />
                        )}
                      />

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
                          <div>
                            <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                              <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                              Visa Issued Date
                            </label>
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.visa_issued_date}
                            />
                            {errors.visa_issued_date && (
                              <p className="mt-1 text-xs text-[var(--form-error)]">
                                {errors.visa_issued_date.message}
                              </p>
                            )}
                          </div>
                        )}
                      />

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
                          <div>
                            <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                              <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                              Visa Expiry Date
                            </label>
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.visa_expiry_date}
                            />
                            {errors.visa_expiry_date && (
                              <p className="mt-1 text-xs text-[var(--form-error)]">
                                {errors.visa_expiry_date.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* EID Section */}
                  <div className="border border-[var(--form-border)] rounded-lg p-4 md:p-5">
                    <h4 className="text-sm font-semibold text-[var(--form-label)] mb-4 flex items-center">
                      <i className="fas fa-id-card text-green-500 mr-2"></i>
                      Emirates ID (EID)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="md:col-span-2">
                        <Controller
                          name="eid_number"
                          control={control}
                          render={({ field }) => (
                            <FormInput
                              {...field}
                              label="EID Number"
                              icon="fas fa-qrcode"
                              placeholder="Enter EID number (e.g., 784-2024-1234567-8)"
                            />
                          )}
                        />
                      </div>

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
                          <div>
                            <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                              <i className="fas fa-calendar-plus text-green-500 mr-1"></i>{" "}
                              EID Issued Date
                            </label>
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.eid_issued_date}
                            />
                            {errors.eid_issued_date && (
                              <p className="mt-1 text-xs text-[var(--form-error)]">
                                {errors.eid_issued_date.message}
                              </p>
                            )}
                          </div>
                        )}
                      />

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
                          <div>
                            <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                              <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                              EID Expiry Date
                            </label>
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.eid_expiry_date}
                            />
                            {errors.eid_expiry_date && (
                              <p className="mt-1 text-xs text-[var(--form-error)]">
                                {errors.eid_expiry_date.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  <div>
                    <div className="border-t border-[var(--form-border)] pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-[var(--form-label)] mb-3 flex items-center">
                        <i className="fas fa-file-contract text-green-500 mr-2"></i>
                        Supporting Documents
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DocumentUpload
                          fieldKey="visa_page"
                          label="Visa Page Copy"
                          icon="fas fa-file-contract"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                        {selectedCompanyDetails?.raw?.trade_license ===
                          "mainland" && (
                          <>
                            <DocumentUpload
                              fieldKey="labor_card"
                              label="Labor Card Copy"
                              icon="fas fa-id-card"
                              documents={documents}
                              documentPreviews={documentPreviews}
                              uploadingFiles={uploadingFiles}
                              handleFileChange={handleFileChange}
                              setDocuments={setDocuments}
                              setDocumentPreviews={setDocumentPreviews}
                            />
                            <DocumentUpload
                              fieldKey="labor_contract"
                              label="Attach Labor Contract"
                              icon="fas fa-file-signature"
                              documents={documents}
                              documentPreviews={documentPreviews}
                              uploadingFiles={uploadingFiles}
                              handleFileChange={handleFileChange}
                              setDocuments={setDocuments}
                              setDocumentPreviews={setDocumentPreviews}
                            />
                          </>
                        )}
                        <DocumentUpload
                          fieldKey="eid_1st_page"
                          label="EID Front Side"
                          icon="fas fa-id-card"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                        <DocumentUpload
                          fieldKey="eid_2nd_page"
                          label="EID Back Side"
                          icon="fas fa-id-card"
                          documents={documents}
                          documentPreviews={documentPreviews}
                          uploadingFiles={uploadingFiles}
                          handleFileChange={handleFileChange}
                          setDocuments={setDocuments}
                          setDocumentPreviews={setDocumentPreviews}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── STEP 3: CONTACT ──────────────────────────────────────── */}
            <div className={currentStep === 3 ? "block" : "hidden"}>
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-address-card text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-[var(--form-text)]">
                    Contact Information & Others
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <Controller
                    name="dependents"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Dependents"
                        icon="fas fa-users"
                        type="number"
                        min="0"
                        placeholder="Number of dependents"
                      />
                    )}
                  />

                  <Controller
                    name="company_mobile_number"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Company Mobile Number"
                        icon="fas fa-phone"
                        type="tel"
                        placeholder="Enter company mobile number"
                      />
                    )}
                  />

                  <Controller
                    name="personal_number"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Personal Number"
                        icon="fas fa-phone"
                        type="tel"
                        placeholder="Enter personal phone number"
                      />
                    )}
                  />

                  <Controller
                    name="other_number"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Other Number"
                        icon="fas fa-phone-alt"
                        type="tel"
                        placeholder="Enter alternate number"
                      />
                    )}
                  />

                  <Controller
                    name="home_country_number"
                    control={control}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Home Country Number"
                        icon="fas fa-globe"
                        type="tel"
                        placeholder="Enter home country number"
                      />
                    )}
                  />

                  <Controller
                    name="company_email"
                    control={control}
                    rules={validationRules.company_email}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Company Email"
                        icon="fas fa-envelope"
                        type="email"
                        placeholder="name@company.com"
                        error={errors.company_email?.message}
                      />
                    )}
                  />

                  <Controller
                    name="personal_email"
                    control={control}
                    rules={validationRules.personal_email}
                    render={({ field }) => (
                      <FormInput
                        {...field}
                        label="Personal Email"
                        icon="fas fa-envelope"
                        type="email"
                        required
                        placeholder="name@gmail.com"
                        error={errors.personal_email?.message}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── NAVIGATION BUTTONS ────────────────────────────────────── */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-[var(--form-border)]">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2.5 rounded-full font-semibold bg-[var(--form-surface)] text-[var(--form-text)] border border-[var(--form-border)] hover:bg-[var(--form-surface-hover)] transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Previous</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>Next</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
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

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      <DocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSave={handleAddDocument}
        uploading={uploadingDoc}
      />

      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        onSubmit={handleAddDepartment}
        isLoading={departmentModalLoading}
      />

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
