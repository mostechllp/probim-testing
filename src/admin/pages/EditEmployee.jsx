import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import { showToast } from "../../components/common/Toast";
import {
  fetchEmployeeById,
  resetCurrentEmployee,
  updateEmployee,
} from "../store/slices/employeeSlice";
import { fetchOrganizations } from "../store/slices/organizationSlice";
import { fetchCompanies } from "../store/slices/companySlice";
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
import { fetchRoles } from "../store/slices/roleSlice";
import apiClient from "../../utils/apiClient";
import DateInput from "../components/common/DateInput";

// ─── THEME-AWARE DOCUMENT UPLOAD COMPONENT ──────────────────────────────

const DocumentUpload = ({
  fieldKey,
  label,
  icon,
  accept = "image/*,.pdf",
  uploadingFiles,
  documents,
  documentPreviews,
  existingDocuments,
  removedDocuments,
  handleFileChange,
  handleRemoveExistingDocument,
  handleCancelNewDocument,
}) => {
  const isUploading = uploadingFiles[fieldKey];
  const existingDoc = existingDocuments[fieldKey];
  const isRemoved = removedDocuments[fieldKey];
  const newFile = documents[fieldKey];
  const preview = documentPreviews[fieldKey];

  const getDocumentUrl = (path) => {
    if (!path) return null;
    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
    return `${baseUrl}/storage/${path}`;
  };

  return (
    <div className="border border-[var(--form-border)] rounded-lg p-4 bg-[var(--form-surface)]/30">
      <label className="block text-sm font-semibold text-[var(--form-label)] mb-3">
        <i className={`${icon} text-green-500 mr-2`}></i>
        {label}
        <span className="text-xs text-[var(--form-text-muted)] ml-2">(Optional)</span>
      </label>

      {existingDoc && !isRemoved && !newFile && (
        <div className="mb-3 p-2 bg-[var(--form-surface)] rounded-lg flex justify-between items-center border border-[var(--form-border)]">
          <span className="text-sm text-[var(--form-text-secondary)]">
            <i className="fas fa-file-alt mr-2"></i>Current file
          </span>
          <div className="flex gap-2">
            <a
              href={getDocumentUrl(existingDoc)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              <i className="fas fa-download"></i> View
            </a>
            <button
              type="button"
              onClick={() => handleRemoveExistingDocument(fieldKey)}
              className="text-[var(--form-error)] hover:text-[var(--form-error)]/80 text-sm"
            >
              <i className="fas fa-trash"></i> Remove
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="file"
          id={`doc_${fieldKey}`}
          accept={accept}
          onChange={(e) => handleFileChange(fieldKey, e.target.files[0])}
          className="hidden"
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => document.getElementById(`doc_${fieldKey}`).click()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Uploading...
            </>
          ) : (
            <>
              <i className="fas fa-upload"></i>{" "}
              {existingDoc && !isRemoved ? "Replace" : "Choose File"}
            </>
          )}
        </button>
        <span className="text-sm text-[var(--form-text-secondary)] truncate flex-1">
          {isUploading
            ? "Uploading..."
            : newFile
              ? "New file uploaded ✓"
              : existingDoc && !isRemoved
                ? "File available"
                : "No file chosen"}
        </span>
      </div>

      {newFile && preview && preview !== "pdf" && (
        <div className="mt-3">
          <img
            src={preview}
            alt={label}
            className="h-20 w-20 object-cover rounded-lg border border-[var(--form-border)]"
          />
          <button
            type="button"
            onClick={() => handleCancelNewDocument(fieldKey)}
            className="mt-2 text-xs text-[var(--form-error)] hover:text-[var(--form-error)]/80 flex items-center gap-1"
          >
            <i className="fas fa-trash"></i> Cancel
          </button>
        </div>
      )}
      {newFile && preview === "pdf" && (
        <div className="mt-3">
          <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center border border-[var(--form-border)]">
            <i className="fas fa-file-pdf text-red-500 text-3xl"></i>
          </div>
          <button
            type="button"
            onClick={() => handleCancelNewDocument(fieldKey)}
            className="mt-2 text-xs text-[var(--form-error)] hover:text-[var(--form-error)]/80 flex items-center gap-1"
          >
            <i className="fas fa-trash"></i> Cancel
          </button>
        </div>
      )}

      <p className="text-xs text-[var(--form-text-muted)] mt-2">
        Max size: {fieldKey === "avatar" ? "2MB" : "5MB"}. Allowed: JPG, PNG, PDF
      </p>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

const EditEmployee = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formInitialized, setFormInitialized] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);
  const [departmentModalLoading, setDepartmentModalLoading] = useState(false);
  const [designationModalLoading, setDesignationModalLoading] = useState(false);

  const [idGenerationMethod, setIdGenerationMethod] = useState("manual");
  const [idPrefix, setIdPrefix] = useState("EMP");
  const [idFormat, setIdFormat] = useState("prefix+year+month+day+random");
  const [manualEmployeeId, setManualEmployeeId] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState("");
  const [customFormat, setCustomFormat] = useState(
    "prefix+year+month+day+timestamp",
  );

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
  const [existingDocuments, setExistingDocuments] = useState({});
  const [removedDocuments, setRemovedDocuments] = useState({});

  // Additional Documents states
  const [additionalDocuments, setAdditionalDocuments] = useState([]);
  const [existingAdditionalDocuments, setExistingAdditionalDocuments] =
    useState([]);

  // Fetch data from slices
  const { currentEmployee, loading: employeeLoading } = useSelector(
    (state) => state.employees || {},
  );
  const { organizations = [] } = useSelector(
    (state) => state.organizations || {},
  );
  const { companies = [] } = useSelector((state) => state.companies || {});
  const { designations = [] } = useSelector(
    (state) => state.designations || {},
  );
  const { departments = [] } = useSelector((state) => state.departments || {});
  const { roles = [] } = useSelector((state) => state.roles || {});

  // Initialize useForm
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    defaultValues: {
      first_name: "",
      last_name: "",
      organization_id: "",
      company_id: "",
      designation_id: "",
      department_id: "",
      employee_id: "",
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
      is_skilled: false,
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

  // ─── FORMAT OPTIONS ───────────────────────────────────────────────────

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

  // ─── ID GENERATION ─────────────────────────────────────────────────────

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
    dispatch(fetchOrganizations());
    dispatch(fetchDesignations());
    dispatch(fetchDepartments());
    dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    setFormInitialized(false);
    setIsInitializing(true);
    setCurrentStep(0);
    setStepErrors({});

    setDocuments({
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
    setDocumentPreviews({});
    setExistingDocuments({});
    setRemovedDocuments({});
    setAdditionalDocuments([]);
    setExistingAdditionalDocuments([]);
    setSelectedOrgDetails(null);
    setSelectedCompanyDetails(null);

    if (id) {
      dispatch(fetchEmployeeById(id)).then(() => {
        setInitialLoading(false);
      });
    }

    return () => {
      dispatch(resetCurrentEmployee());
      setFormInitialized(false);
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (idGenerationMethod === "auto" && watchDob && watchJoiningDate) {
      const preview = generateEmployeeIdWithOptions(
        watchDob,
        watchJoiningDate,
        idPrefix,
        idFormat === "custom" ? customFormat : idFormat,
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
    customFormat,
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

  useEffect(() => {
    if (currentEmployee && formInitialized) {
      if (currentEmployee.employee_id) {
        setManualEmployeeId(currentEmployee.employee_id);
        setValue("employee_id", currentEmployee.employee_id);
      }
    }
  }, [currentEmployee, formInitialized, setValue]);

  // ─── ORGANIZATION/COMPANY EFFECTS ─────────────────────────────────────

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
    } else if (watchCompanyId && companies.length === 0) {
      if (currentEmployee?.user?.company) {
        setSelectedCompanyDetails(currentEmployee.user.company);
      }
    } else {
      setSelectedCompanyDetails(null);
    }
  }, [watchCompanyId, companies, setValue, currentEmployee]);

  useEffect(() => {
    if (
      companies.length > 0 &&
      currentEmployee &&
      !selectedCompanyDetails &&
      formInitialized
    ) {
      const companyId =
        currentEmployee.user?.company?.id || currentEmployee.user?.company_id;
      if (companyId) {
        const company = companies.find(
          (comp) => comp.id === parseInt(companyId),
        );
        if (company) {
          setSelectedCompanyDetails(company);
        }
      }
    }
  }, [companies, currentEmployee, selectedCompanyDetails, formInitialized]);

  useEffect(() => {
    if (id && !formInitialized) {
      dispatch(fetchEmployeeById(id)).then(() => {
        setInitialLoading(false);
      });
    }
  }, [dispatch, id, formInitialized]);

  // ─── HANDLERS ───────────────────────────────────────────────────────────

  const handleAddDepartment = async (data) => {
    setDepartmentModalLoading(true);
    try {
      const result = await dispatch(addDepartment(data));
      if (addDepartment.fulfilled.match(result)) {
        showToast("Department added successfully", "success");
        setIsDepartmentModalOpen(false);
        await dispatch(fetchDepartments());
        if (result.payload?.id) {
          setValue("department_id", String(result.payload.id));
        }
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
        await dispatch(fetchDesignations());
        if (result.payload?.id) {
          setValue("designation_id", String(result.payload.id));
        }
      } else {
        showToast(result.payload || "Failed to add designation", "error");
      }
    } catch (error) {
      showToast("An error occurred", "error");
    } finally {
      setDesignationModalLoading(false);
    }
  };

  // ─── CONVERT DATE HELPERS ─────────────────────────────────────────────

  const convertToDisplayDate = (dateString) => {
    if (!dateString) return "";
    if (dateString === "0000-00-00") return "";
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  const convertDateToBackend = (dateString) => {
    if (!dateString) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateString.split("/");
      return `${year}-${month}-${day}`;
    }
    return dateString;
  };

  // ─── FORM POPULATION ──────────────────────────────────────────────────

  useEffect(() => {
    if (currentEmployee && !formInitialized) {
      setIsInitializing(true);

      setValue("first_name", currentEmployee.first_name || "");
      setValue("last_name", currentEmployee.last_name || "");

      const orgId = currentEmployee.user?.organization_id || "";
      setValue("organization_id", orgId);

      const companyId =
        currentEmployee.user?.company?.id ||
        currentEmployee.user?.company_id ||
        "";
      setValue("company_id", companyId);

      setValue("designation_id", currentEmployee.user?.designation_id || "");
      setValue("department_id", currentEmployee.user?.department_id || "");
      setValue("employee_id", currentEmployee.employee_id || "");
      setValue(
        "type",
        currentEmployee.user?.type || currentEmployee.type || "employee",
      );
      setValue(
        "joining_date",
        convertToDisplayDate(currentEmployee.joining_date),
      );
      setValue("dob", convertToDisplayDate(currentEmployee.dob));
      setValue(
        "probation_start_date",
        convertToDisplayDate(currentEmployee.probation_start_date),
      );
      setValue(
        "probation_end_date",
        convertToDisplayDate(currentEmployee.probation_end_date),
      );
      setValue(
        "confirmation_date",
        convertToDisplayDate(currentEmployee.confirmation_date),
      );
      setValue(
        "contract_start_date",
        convertToDisplayDate(currentEmployee.contract_start_date),
      );
      setValue(
        "contract_end_date",
        convertToDisplayDate(currentEmployee.contract_end_date),
      );
      setValue(
        "notice_period_start_date",
        convertToDisplayDate(currentEmployee.notice_period_start_date),
      );
      setValue(
        "last_working_day",
        convertToDisplayDate(currentEmployee.last_working_day),
      );
      setValue(
        "resignation_date",
        convertToDisplayDate(currentEmployee.resignation_date),
      );
      setValue(
        "relieving_date",
        convertToDisplayDate(currentEmployee.relieving_date),
      );
      setValue("gender", currentEmployee.gender || "male");
      setValue("nationality", currentEmployee.nationality || "");
      setValue("marital_status", currentEmployee.marital_status || "");

      setValue(
        "is_skilled",
        currentEmployee.is_skilled === 1 || currentEmployee.is_skilled === true,
      );

      try {
        let parsedSpecialDays = [];
        if (currentEmployee.special_days) {
          if (Array.isArray(currentEmployee.special_days)) {
            parsedSpecialDays = currentEmployee.special_days.map((day) => ({
              name: day.name,
              date: convertToDisplayDate(day.date),
            }));
          } else if (typeof currentEmployee.special_days === "string") {
            parsedSpecialDays = JSON.parse(currentEmployee.special_days).map(
              (day) => ({
                name: day.name,
                date: convertToDisplayDate(day.date),
              }),
            );
          }
        }
        if (parsedSpecialDays.length === 0) {
          parsedSpecialDays = [{ name: "", date: "" }];
        }
        setValue("special_days", parsedSpecialDays);
      } catch (e) {
        console.error("Error parsing special days:", e);
        setValue("special_days", [{ name: "", date: "" }]);
      }

      setValue("passport_full_name", currentEmployee.passport_full_name || "");
      setValue("passport_number", currentEmployee.passport_number || "");
      setValue(
        "passport_issued_date",
        convertToDisplayDate(currentEmployee.passport_issued_date),
      );
      setValue(
        "passport_expiry_date",
        convertToDisplayDate(currentEmployee.passport_expiry_date),
      );
      setValue("father_name", currentEmployee.father_name || "");
      setValue("mother_name", currentEmployee.mother_name || "");
      setValue("address", currentEmployee.address || "");
      setValue(
        "passport_issued_from",
        currentEmployee.passport_issued_from || "",
      );
      setValue("place_of_birth", currentEmployee.place_of_birth || "");

      setValue("visa_number", currentEmployee.visa_number || "");
      setValue("visa_type", currentEmployee.visa_type || "");
      setValue(
        "visa_issued_date",
        convertToDisplayDate(currentEmployee.visa_issued_date),
      );
      setValue(
        "visa_expiry_date",
        convertToDisplayDate(currentEmployee.visa_expiry_date),
      );
      setValue("labor_number", currentEmployee.labor_number || "");
      setValue(
        "labor_issued_date",
        convertToDisplayDate(currentEmployee.labor_issued_date),
      );
      setValue(
        "labor_expiry_date",
        convertToDisplayDate(currentEmployee.labor_expiry_date),
      );
      setValue("eid_number", currentEmployee.eid_number || "");
      setValue(
        "eid_issued_date",
        convertToDisplayDate(currentEmployee.eid_issued_date),
      );
      setValue(
        "eid_expiry_date",
        convertToDisplayDate(currentEmployee.eid_expiry_date),
      );

      setValue("dependents", currentEmployee.dependents || 0);
      setValue("company_email", currentEmployee.company_email || "");
      setValue(
        "company_mobile_number",
        currentEmployee.company_mobile_number || "",
      );
      setValue("personal_number", currentEmployee.personal_number || "");
      setValue("personal_email", currentEmployee.personal_email || "");
      setValue("other_number", currentEmployee.other_number || "");
      setValue(
        "home_country_number",
        currentEmployee.home_country_number || "",
      );
      setValue("role", currentEmployee.user?.role_id || "");

      if (companyId && companies.length > 0) {
        const company = companies.find(
          (comp) => comp.id === parseInt(companyId),
        );
        if (company) {
          setSelectedCompanyDetails(company);
        }
      }

      const docs = {};
      const docFields = [
        "avatar",
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

      docFields.forEach((field) => {
        if (currentEmployee[field]) {
          docs[field] = currentEmployee[field];
        }
      });
      setExistingDocuments(docs);

      if (
        currentEmployee.additional_documents &&
        Array.isArray(currentEmployee.additional_documents)
      ) {
        setExistingAdditionalDocuments(currentEmployee.additional_documents);
        setAdditionalDocuments(
          currentEmployee.additional_documents.map((doc) => ({
            name: doc.document_name,
            filename: doc.filename || doc.document_name,
            isExisting: true,
            preview: null,
            file: null,
          })),
        );
      }

      setFormInitialized(true);
      setTimeout(() => {
        setIsInitializing(false);
      }, 100);
    }
  }, [currentEmployee, setValue, formInitialized, companies]);

  // ─── STEPS ─────────────────────────────────────────────────────────────

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

  // ─── VALIDATION FUNCTIONS ─────────────────────────────────────────────

  const validateDob = (value) => {
    if (!value) return true;
    if (isInitializing) return true;

    let date;
    try {
      if (typeof value === "string" && value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = value.split("/");
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(value);
      }

      if (isNaN(date.getTime())) {
        return true;
      }
    } catch (e) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date > today) {
      return "Date of Birth cannot be in the future";
    }

    return true;
  };

  const validateJoiningDate = (value, dobValue) => {
    if (!value) return true;
    if (isInitializing) return true;

    let date;
    let dob;

    try {
      if (typeof value === "string" && value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = value.split("/");
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(value);
      }

      if (isNaN(date.getTime())) {
        return true;
      }
    } catch (e) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date > today) {
      return "Joining Date cannot be in the future";
    }

    if (dobValue) {
      try {
        if (
          typeof dobValue === "string" &&
          dobValue.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          const [day, month, year] = dobValue.split("/");
          dob = new Date(year, month - 1, day);
        } else {
          dob = new Date(dobValue);
        }

        if (!isNaN(dob.getTime())) {
          dob.setHours(0, 0, 0, 0);
          if (date <= dob) {
            return "Joining Date must be after Date of Birth";
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return true;
  };

  const validateIssueDate = (issueDate, expiryDate, fieldName) => {
    if (isInitializing) return true;
    if (!issueDate) return true;

    let issue;
    try {
      if (
        typeof issueDate === "string" &&
        issueDate.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        const [day, month, year] = issueDate.split("/");
        issue = new Date(year, month - 1, day);
      } else {
        issue = new Date(issueDate);
      }

      if (isNaN(issue.getTime())) {
        return true;
      }
    } catch (e) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    issue.setHours(0, 0, 0, 0);

    if (issue > today) {
      return `${fieldName} cannot be in the future`;
    }

    if (expiryDate) {
      let expiry;
      try {
        if (
          typeof expiryDate === "string" &&
          expiryDate.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          const [day, month, year] = expiryDate.split("/");
          expiry = new Date(year, month - 1, day);
        } else {
          expiry = new Date(expiryDate);
        }
        expiry.setHours(0, 0, 0, 0);

        if (issue >= expiry) {
          return `Issued date must be before expiry date`;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return true;
  };

  const validateExpiryDate = (expiryDate, issueDate, fieldName) => {
    if (isInitializing) return true;
    if (!expiryDate) return true;

    let expiry;
    try {
      if (
        typeof expiryDate === "string" &&
        expiryDate.match(/^\d{2}\/\d{2}\/\d{4}$/)
      ) {
        const [day, month, year] = expiryDate.split("/");
        expiry = new Date(year, month - 1, day);
      } else {
        expiry = new Date(expiryDate);
      }

      if (isNaN(expiry.getTime())) {
        return true;
      }
    } catch (e) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    if (issueDate) {
      let issue;
      try {
        if (
          typeof issueDate === "string" &&
          issueDate.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          const [day, month, year] = issueDate.split("/");
          issue = new Date(year, month - 1, day);
        } else {
          issue = new Date(issueDate);
        }
        issue.setHours(0, 0, 0, 0);

        if (expiry <= issue) {
          return `Expiry date must be after issued date`;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return true;
  };

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
        const laborFields = [];

        if (selectedCompanyDetails?.raw?.trade_license === "mainland") {
          laborFields.push(
            "labor_number",
            "labor_issued_date",
            "labor_expiry_date",
          );
        }

        return [
          "visa_type",
          "visa_number",
          "visa_issued_date",
          "visa_expiry_date",
          ...laborFields,
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
        if (existingDocuments[fieldKey]) {
          setRemovedDocuments((prev) => ({ ...prev, [fieldKey]: true }));
        }
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

  const handleRemoveExistingDocument = (fieldKey) => {
    setRemovedDocuments({ ...removedDocuments, [fieldKey]: true });
    setExistingDocuments({ ...existingDocuments, [fieldKey]: null });
    setDocuments({ ...documents, [fieldKey]: null });
  };

  const handleCancelNewDocument = (fieldKey) => {
    setDocuments({ ...documents, [fieldKey]: null });
    setDocumentPreviews({ ...documentPreviews, [fieldKey]: null });
    setRemovedDocuments({ ...removedDocuments, [fieldKey]: false });
  };

  const handleAdditionalDocumentUpload = async (file) => {
    if (!file) return;

    const fileSize = file.size / 1024 / 1024;
    if (fileSize > 5) {
      showToast("File must be less than 5MB", "error");
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAdditionalDocuments((prev) => [
          ...prev,
          {
            name: file.name,
            file: file,
            preview: e.target.result,
            isExisting: false,
            filename: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else {
      setAdditionalDocuments((prev) => [
        ...prev,
        {
          name: file.name,
          file: file,
          preview: "pdf",
          isExisting: false,
          filename: file.name,
        },
      ]);
    }

    showToast(`Document "${file.name}" added`, "success");
  };

  const handleRemoveAdditionalDocument = (index, isExisting) => {
    if (isExisting) {
      const docToRemove = existingAdditionalDocuments[index];
      setExistingAdditionalDocuments((prev) =>
        prev.filter((_, i) => i !== index),
      );
      setAdditionalDocuments((prev) => prev.filter((_, i) => i !== index));
      setRemovedDocuments((prev) => ({
        ...prev,
        [`additional_document_${docToRemove.document_name || index}`]: true,
      }));
    } else {
      setAdditionalDocuments((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // ─── NAVIGATION ────────────────────────────────────────────────────────

  const handleNext = async () => {
    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: false }));
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

    const employeeIdValue = data.employee_id || manualEmployeeId;

    if (!employeeIdValue) {
      showToast("Employee ID is required", "error");
      setLoading(false);
      return;
    }

    const formData = new FormData();

    formData.append("first_name", data.first_name);
    formData.append("last_name", data.last_name || "");
    formData.append("employee_id", employeeIdValue);
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

    formData.append("type", data.type);
    formData.append("gender", data.gender || "");
    formData.append("nationality", data.nationality || "");
    formData.append("marital_status", data.marital_status || "");
    if (data.is_skilled !== undefined) {
      formData.append("is_skilled", data.is_skilled ? 1 : 0);
    }

    if (data.designation_id)
      formData.append("designation_id", parseInt(data.designation_id));
    if (data.department_id)
      formData.append("department_id", parseInt(data.department_id));

    const dob = convertDateToBackend(data.dob);
    const joiningDate = convertDateToBackend(data.joining_date);
    if (dob) formData.append("dob", dob);
    if (joiningDate) formData.append("joining_date", joiningDate);

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
        const specialDaysDate = validSpecialDays.map((day) =>
          convertDateToBackend(day.date),
        );

        specialDaysName.forEach((name) =>
          formData.append("special_days_name[]", name),
        );
        specialDaysDate.forEach((date) =>
          formData.append("special_days_date[]", date),
        );
      }
    }

    if (data.passport_full_name)
      formData.append("passport_full_name", data.passport_full_name);
    if (data.passport_number)
      formData.append("passport_number", data.passport_number);
    if (data.passport_issued_date)
      formData.append(
        "passport_issued_date",
        convertDateToBackend(data.passport_issued_date),
      );
    if (data.passport_expiry_date)
      formData.append(
        "passport_expiry_date",
        convertDateToBackend(data.passport_expiry_date),
      );
    if (data.passport_issued_from)
      formData.append("passport_issued_from", data.passport_issued_from);
    if (data.place_of_birth)
      formData.append("place_of_birth", data.place_of_birth);
    if (data.father_name) formData.append("father_name", data.father_name);
    if (data.mother_name) formData.append("mother_name", data.mother_name);
    if (data.address) formData.append("address", data.address);

    if (data.visa_number) formData.append("visa_number", data.visa_number);
    if (data.visa_type) formData.append("visa_type", data.visa_type);
    if (data.visa_issued_date)
      formData.append(
        "visa_issued_date",
        convertDateToBackend(data.visa_issued_date),
      );
    if (data.visa_expiry_date)
      formData.append(
        "visa_expiry_date",
        convertDateToBackend(data.visa_expiry_date),
      );

    if (selectedCompanyDetails?.raw?.trade_license === "mainland") {
      if (data.labor_number) formData.append("labor_number", data.labor_number);
      if (data.labor_issued_date)
        formData.append(
          "labor_issued_date",
          convertDateToBackend(data.labor_issued_date),
        );
      if (data.labor_expiry_date)
        formData.append(
          "labor_expiry_date",
          convertDateToBackend(data.labor_expiry_date),
        );
    } else {
      formData.append("labor_number", "");
      formData.append("labor_issued_date", "");
      formData.append("labor_expiry_date", "");
    }

    if (data.eid_number) formData.append("eid_number", data.eid_number);
    if (data.eid_issued_date)
      formData.append(
        "eid_issued_date",
        convertDateToBackend(data.eid_issued_date),
      );
    if (data.eid_expiry_date)
      formData.append(
        "eid_expiry_date",
        convertDateToBackend(data.eid_expiry_date),
      );

    if (data.dependents) formData.append("dependents", String(data.dependents));
    if (data.company_email)
      formData.append("company_email", data.company_email);
    if (data.company_mobile_number)
      formData.append("company_mobile_number", data.company_mobile_number);
    if (data.personal_number)
      formData.append("personal_number", data.personal_number);
    if (data.personal_email)
      formData.append("personal_email", data.personal_email);
    if (data.other_number) formData.append("other_number", data.other_number);
    if (data.home_country_number)
      formData.append("home_country_number", data.home_country_number);
    if (data.role) formData.append("role_id", data.role);

    if (documents.avatar) {
      formData.append("avatar", documents.avatar);
    }
    if (removedDocuments.avatar && existingDocuments.avatar) {
      formData.append("remove_avatar", "true");
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
      if (removedDocuments[field] && existingDocuments[field]) {
        formData.append(`remove_${field}`, "true");
      }
    });

    const removedAdditionalDocKeys = Object.keys(removedDocuments).filter(
      (key) => key.startsWith("additional_document_") && removedDocuments[key],
    );
    removedAdditionalDocKeys.forEach((key, index) => {
      formData.append(`remove_additional_document_${index}`, "true");
    });

    const newAdditionalDocs = additionalDocuments.filter(
      (doc) => !doc.isExisting,
    );
    if (newAdditionalDocs.length > 0) {
      newAdditionalDocs.forEach((doc, index) => {
        if (doc.file) {
          formData.append(`additional_documents[${index}][file]`, doc.file);
        }
        if (doc.name) {
          formData.append(
            `additional_documents[${index}][document_name]`,
            doc.name,
          );
        }
        if (doc.filename) {
          formData.append(
            `additional_documents[${index}][filename]`,
            doc.filename,
          );
        }
      });
    }

    formData.append("_method", "PUT");

    if (!formData.has("employee_id")) {
      console.error("ERROR: employee_id is missing from form data!");
      showToast("Employee ID is required", "error");
      setLoading(false);
      return;
    }

    const result = await dispatch(
      updateEmployee({ id: parseInt(id), data: formData }),
    );
    setLoading(false);

    if (updateEmployee.fulfilled.match(result)) {
      showToast(`✓ Employee updated successfully!`, "success");
      setTimeout(() => navigate("/admin/employees"), 1200);
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
        showToast("Failed to update employee", "error");
      }
    }
  };

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
    organization_id: { required: "Organization is required" },
    designation_id: { required: "Designation is required" },
    department_id: { required: "Department is required" },
    role: { required: "Role is required" },
    personal_email: {
      required: "Personal email is required",
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: "Invalid email address format",
      },
    },
  };

  if (initialLoading || employeeLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

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
        <span className="text-[var(--form-text-secondary)]">Edit Employee</span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 bg-clip-text text-transparent dark:from-gray-200 dark:to-green-400">
          <i className="fas fa-user-edit mr-2"></i> Edit Employee
        </h2>
        <p className="text-sm text-[var(--form-text-secondary)] mt-1">
          Update employee information
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
        <form onSubmit={handleSubmit(onSubmit)}>
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
            {currentStep === 0 && (
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
                  {/* First Name */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-user text-green-500 mr-1"></i> First Name <span className="text-[var(--form-error)]">*</span>
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
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 placeholder:text-[var(--form-placeholder)] ${
                              errors.first_name
                                ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                            }`}
                            placeholder="Enter first name"
                          />
                          {errors.first_name && (
                            <p className="mt-1 text-xs text-[var(--form-error)]">
                              {errors.first_name.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-user text-green-500 mr-1"></i> Last Name
                    </label>
                    <Controller
                      name="last_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter last name"
                        />
                      )}
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-building text-green-500 mr-1"></i> Organization <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <Controller
                      name="organization_id"
                      control={control}
                      rules={validationRules.organization_id}
                      render={({ field }) => (
                        <>
                          <select
                            {...field}
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 ${
                              errors.organization_id
                                ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                            }`}
                          >
                            <option value="">Select Organization</option>
                            {organizations.map((org) => (
                              <option key={org.id} value={org.id}>
                                {org.name}
                              </option>
                            ))}
                          </select>
                          {errors.organization_id && (
                            <p className="mt-1 text-xs text-[var(--form-error)]">
                              {errors.organization_id.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-building text-green-500 mr-1"></i> Company
                      {selectedOrgDetails?.multi_company === "Yes" && (
                        <span className="text-[var(--form-error)]">*</span>
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
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 ${
                              selectedOrgDetails?.multi_company !== "Yes"
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            } ${
                              errors.company_id
                                ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                            }`}
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
                                  <span className="text-xs text-[var(--form-text-muted)] ml-1">
                                    ({company.raw?.trade_license})
                                  </span>
                                )}
                              </option>
                            ))}
                          </select>
                          {errors.company_id && (
                            <p className="mt-1 text-xs text-[var(--form-error)]">
                              {errors.company_id.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Show trade license info */}
                  {selectedCompanyDetails &&
                    selectedCompanyDetails.raw?.trade_license && (
                      <div className="md:col-span-2">
                        <div
                          className={`p-3 rounded-lg ${
                            selectedCompanyDetails.raw?.trade_license === "mainland"
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                              : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <i
                              className={`fas ${
                                selectedCompanyDetails.raw?.trade_license === "mainland"
                                  ? "fa-building"
                                  : "fa-globe"
                              } ${
                                selectedCompanyDetails.raw?.trade_license === "mainland"
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
                            {selectedCompanyDetails.raw?.trade_license ===
                              "mainland" && (
                              <span className="text-xs text-[var(--form-text-muted)] ml-2">
                                <i className="fas fa-info-circle mr-1"></i>
                                Labor details are required for Mainland companies
                              </span>
                            )}
                            {selectedCompanyDetails.raw?.trade_license ===
                              "freezone" && (
                              <span className="text-xs text-[var(--form-text-muted)] ml-2">
                                <i className="fas fa-info-circle mr-1"></i>
                                Labor details are not required for Freezone companies
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Designation */}
                  <div>
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)]">
                        <i className="fas fa-briefcase text-green-500 mr-1"></i> Designation <span className="text-[var(--form-error)]">*</span>
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
                        </>
                      )}
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)]">
                        <i className="fas fa-diagram-project text-green-500 mr-1"></i> Department <span className="text-[var(--form-error)]">*</span>
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
                        </>
                      )}
                    />
                  </div>

                  {/* User Type */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-user-tag text-green-500 mr-1"></i> User Type <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <Controller
                      name="type"
                      control={control}
                      rules={{ required: "User type is required" }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20"
                        >
                          {userTypeOptions.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-venus-mars text-green-500 mr-1"></i> Gender
                    </label>
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20"
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

                  {/* Nationality */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-globe-asia text-green-500 mr-1"></i> Nationality
                    </label>
                    <Controller
                      name="nationality"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20"
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

                  {/* Marital Status */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-user-friends text-green-500 mr-1"></i> Marital Status
                    </label>
                    <Controller
                      name="marital_status"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20"
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

                  {/* Role */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-user-tag text-green-500 mr-1"></i> Role <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <Controller
                      name="role"
                      control={control}
                      rules={{ required: "Role is required" }}
                      render={({ field, fieldState: { error } }) => {
                        const hasError = error || errors.role;
                        return (
                          <>
                            <select
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                              }}
                              className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 ${
                                hasError
                                  ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                  : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                              }`}
                            >
                              <option value="">Select Role</option>
                              {roles.map((role) => (
                                <option key={role.id} value={role.id.toString()}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            {hasError && (
                              <p className="mt-1 text-xs text-[var(--form-error)]">
                                {hasError.message || errors.role?.message}
                              </p>
                            )}
                          </>
                        );
                      }}
                    />
                  </div>

                  {/* Special Days */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-2">
                      <i className="fas fa-gift text-green-500 mr-1"></i> Special Days
                    </label>
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-3 items-start">
                          <div className="flex-1">
                            <Controller
                              name={`special_days.${index}.name`}
                              control={control}
                              rules={{
                                required: "Name is required",
                              }}
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
                              rules={{
                                required: "Date is required",
                              }}
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
                        className="text-green-500 hover:text-green-600 text-sm font-semibold flex items-center gap-2"
                      >
                        <i className="fas fa-plus-circle"></i> Add Special Day
                      </button>
                    </div>
                    <p className="text-xs text-[var(--form-text-muted)] mt-2">
                      <i className="fas fa-info-circle mr-1"></i> Add special occasions like birthday, anniversary, etc.
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
                                  <code className="bg-[var(--form-surface)] px-1 rounded">prefix</code> - Your prefix
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">year</code> - Joining year
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">month</code> - Joining month
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">day</code> - Joining day
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">dob_ddmm</code> - DOB (DDMM)
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">timestamp</code> - Unix timestamp
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">random</code> - Random string
                                </span>
                                <span>
                                  <code className="bg-[var(--form-surface)] px-1 rounded">sequence</code> - Sequence number
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
                              Please enter DOB and Joining Date to see ID preview
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

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-calendar text-green-500 mr-1"></i> Date of Birth <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <Controller
                      name="dob"
                      control={control}
                      rules={{
                        required: "Date of Birth is required",
                        validate: validateDob,
                      }}
                      render={({ field }) => (
                        <>
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
                        </>
                      )}
                    />
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-calendar-alt text-green-500 mr-1"></i> Joining Date <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <Controller
                      name="joining_date"
                      control={control}
                      rules={{
                        required: "Joining Date is required",
                        validate: (value) =>
                          validateJoiningDate(value, watchDob),
                      }}
                      render={({ field }) => (
                        <>
                          <DateInput
                            type="general"
                            {...field}
                            placeholder="dd/mm/yyyy"
                            error={!!errors.joining_date}
                          />
                          {errors.joining_date && (
                            <p className="mt-1 text-xs text-[var(--form-error)]">
                              {errors.joining_date.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {/* Employment Timeline & Dates Section */}
                  <div className="md:col-span-2 mt-6 mb-2">
                    <h3 className="text-lg font-bold text-[var(--form-text)] flex items-center">
                      <i className="fas fa-calendar-alt text-green-500 mr-2"></i>
                      Employment Timeline & Dates
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
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

                  {/* Avatar Upload */}
                  <div className="md:col-span-2">
                    <div className="border border-[var(--form-border)] rounded-lg p-4 bg-[var(--form-surface)]/30 mb-4">
                      <label className="block text-sm font-semibold text-[var(--form-label)] mb-3">
                        <i className="fas fa-camera text-green-500 mr-2"></i>
                        Passport Size Photo
                        <span className="text-xs text-[var(--form-text-muted)] ml-2">(Optional)</span>
                      </label>
                      <DocumentUpload
                        fieldKey="avatar"
                        label="Passport Size Photo"
                        icon="fas fa-camera"
                        accept="image/*"
                        uploadingFiles={uploadingFiles}
                        documents={documents}
                        documentPreviews={documentPreviews}
                        existingDocuments={existingDocuments}
                        removedDocuments={removedDocuments}
                        handleFileChange={handleFileChange}
                        handleRemoveExistingDocument={handleRemoveExistingDocument}
                        handleCancelNewDocument={handleCancelNewDocument}
                      />
                    </div>
                  </div>

                  {/* Employee Category */}
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-2">
                      <i className="fas fa-graduation-cap text-green-500 mr-1"></i>
                      Employee Category <span className="text-[var(--form-error)]">*</span>
                    </label>
                    <Controller
                      name="is_skilled"
                      control={control}
                      render={({ field }) => (
                        <div className="flex gap-4">
                          <label className="flex items-center text-[var(--form-text)]">
                            <input
                              type="radio"
                              value="true"
                              checked={field.value === true}
                              onChange={() => field.onChange(true)}
                              className="mr-2 text-green-500 focus:ring-green-500"
                            />
                            <span className="text-sm">Skilled</span>
                          </label>
                          <label className="flex items-center text-[var(--form-text)]">
                            <input
                              type="radio"
                              value="false"
                              checked={field.value === false}
                              onChange={() => field.onChange(false)}
                              className="mr-2 text-green-500 focus:ring-green-500"
                            />
                            <span className="text-sm">Unskilled</span>
                          </label>
                        </div>
                      )}
                    />
                    <p className="text-xs text-[var(--form-text-muted)] mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Skilled employees need to provide educational documents
                    </p>
                  </div>

                  {/* Educational Documents - Skilled only */}
                  {watch("is_skilled") === true && (
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
                              uploadingFiles={uploadingFiles}
                              documents={documents}
                              documentPreviews={documentPreviews}
                              existingDocuments={existingDocuments}
                              removedDocuments={removedDocuments}
                              handleFileChange={handleFileChange}
                              handleRemoveExistingDocument={handleRemoveExistingDocument}
                              handleCancelNewDocument={handleCancelNewDocument}
                            />
                            <DocumentUpload
                              fieldKey="educational_2nd_page"
                              label="Educational Certificate (Back)"
                              icon="fas fa-graduation-cap"
                              uploadingFiles={uploadingFiles}
                              documents={documents}
                              documentPreviews={documentPreviews}
                              existingDocuments={existingDocuments}
                              removedDocuments={removedDocuments}
                              handleFileChange={handleFileChange}
                              handleRemoveExistingDocument={handleRemoveExistingDocument}
                              handleCancelNewDocument={handleCancelNewDocument}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <DocumentUpload
                          fieldKey="home_country_id_proof"
                          label="Home Country ID Proof"
                          icon="fas fa-home"
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                      </div>
                    </>
                  )}

                  {/* Additional Documents Section */}
                  <div className="md:col-span-2">
                    <div className="border-t border-[var(--form-border)] pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-[var(--form-label)] flex items-center">
                          <i className="fas fa-folder-open text-green-500 mr-2"></i>
                          Additional Documents
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*,.pdf";
                            input.onchange = (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleAdditionalDocumentUpload(file);
                              }
                            };
                            input.click();
                          }}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i> Add Document
                        </button>
                      </div>

                      {/* Existing additional documents */}
                      {existingAdditionalDocuments.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-[var(--form-text-secondary)] mb-2">
                            Existing Documents:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {existingAdditionalDocuments.map((doc, index) => (
                              <div
                                key={`existing-${index}`}
                                className="border border-[var(--form-border)] rounded-lg p-3 bg-[var(--form-surface)]"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-[var(--form-text)] truncate">
                                      {doc.document_name}
                                    </p>
                                    <p className="text-xs text-[var(--form-text-muted)] mt-1">
                                      {doc.filename || "Document"}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveAdditionalDocument(
                                        index,
                                        true,
                                      )
                                    }
                                    className="text-[var(--form-error)] hover:text-[var(--form-error)]/80 ml-2"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New additional documents */}
                      {additionalDocuments.filter((doc) => !doc.isExisting)
                        .length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-[var(--form-text-secondary)] mb-2">
                            New Documents:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {additionalDocuments
                              .filter((doc) => !doc.isExisting)
                              .map((doc, index) => {
                                const actualIndex =
                                  additionalDocuments.findIndex(
                                    (d) => d === doc,
                                  );
                                return (
                                  <div
                                    key={`new-${index}`}
                                    className="border border-[var(--form-border)] rounded-lg p-3 bg-green-50 dark:bg-green-900/10"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold text-[var(--form-text)] truncate">
                                          {doc.name || "Untitled"}
                                        </p>
                                        <p className="text-xs text-[var(--form-text-muted)] mt-1">
                                          {doc.file?.name || "New document"}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveAdditionalDocument(
                                            actualIndex,
                                            false,
                                          )
                                        }
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
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 1: PASSPORT ─────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-passport text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-[var(--form-text)]">
                    Passport Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-user-tag text-green-500 mr-1"></i> Passport Full Name
                    </label>
                    <Controller
                      name="passport_full_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter name as per passport"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-hashtag text-green-500 mr-1"></i> Passport Number
                    </label>
                    <Controller
                      name="passport_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter passport number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-globe text-green-500 mr-1"></i> Issued From
                    </label>
                    <Controller
                      name="passport_issued_from"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter issuing country/city"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-calendar-plus text-green-500 mr-1"></i> Issued Date
                    </label>
                    <Controller
                      name="passport_issued_date"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (!value) return true;
                          if (isInitializing) return true;
                          return validateIssueDate(
                            value,
                            passportExpiry,
                            "Passport issued date",
                          );
                        },
                      }}
                      render={({ field }) => (
                        <DateInput
                          {...field}
                          placeholder="dd/mm/yyyy"
                          error={!!errors.passport_issued_date}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-calendar-times text-green-500 mr-1"></i> Expiry Date
                    </label>
                    <Controller
                      name="passport_expiry_date"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (!value) return true;
                          if (isInitializing) return true;
                          return validateExpiryDate(
                            value,
                            passportIssued,
                            "Passport expiry date",
                          );
                        },
                      }}
                      render={({ field }) => (
                        <DateInput
                          {...field}
                          placeholder="dd/mm/yyyy"
                          error={!!errors.passport_expiry_date}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-map-pin text-green-500 mr-1"></i> Place of Birth
                    </label>
                    <Controller
                      name="place_of_birth"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter place of birth"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-father text-green-500 mr-1"></i> Father's Name
                    </label>
                    <Controller
                      name="father_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter father's name"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-mother text-green-500 mr-1"></i> Mother's Name
                    </label>
                    <Controller
                      name="mother_name"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter mother's name"
                        />
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-map-marker-alt text-green-500 mr-1"></i> Address
                    </label>
                    <Controller
                      name="address"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          {...field}
                          rows="2"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter full address"
                        ></textarea>
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
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                        <DocumentUpload
                          fieldKey="passport_2nd_page"
                          label="Passport 2nd Page"
                          icon="fas fa-passport"
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                        <DocumentUpload
                          fieldKey="passport_outer_page"
                          label="Passport Outer Page"
                          icon="fas fa-passport"
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                        <DocumentUpload
                          fieldKey="passport_id_page"
                          label="Passport ID Page"
                          icon="fas fa-id-card"
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 2: VISA, LABOR & EID ────────────────────────────────── */}
            {currentStep === 2 && (
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
                    <div className="border border-[var(--form-border)] rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-[var(--form-label)] mb-4 flex items-center">
                        <i className="fas fa-briefcase text-green-500 mr-2"></i>
                        Labor Details
                        <span className="text-xs text-[var(--form-error)] ml-2">
                          * Required for Mainland companies
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                            <i className="fas fa-briefcase text-green-500 mr-1"></i> Labor Number <span className="text-[var(--form-error)]">*</span>
                          </label>
                          <Controller
                            name="labor_number"
                            control={control}
                            rules={{
                              required:
                                selectedCompanyDetails?.raw?.trade_license ===
                                "mainland"
                                  ? "Labor number is required for Mainland companies"
                                  : false,
                            }}
                            render={({ field }) => (
                              <>
                                <input
                                  {...field}
                                  type="text"
                                  className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 placeholder:text-[var(--form-placeholder)] ${
                                    errors.labor_number
                                      ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                      : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                                  }`}
                                  placeholder="Enter Labor Number"
                                />
                                {errors.labor_number && (
                                  <p className="mt-1 text-xs text-[var(--form-error)]">
                                    {errors.labor_number.message}
                                  </p>
                                )}
                              </>
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                            <i className="fas fa-calendar-plus text-green-500 mr-1"></i> Labor Issued Date <span className="text-[var(--form-error)]">*</span>
                          </label>
                          <Controller
                            name="labor_issued_date"
                            control={control}
                            rules={{
                              required:
                                selectedCompanyDetails?.raw?.trade_license ===
                                "mainland"
                                  ? "Labor issued date is required for Mainland companies"
                                  : false,
                              validate: (value) =>
                                validateIssueDate(
                                  value,
                                  laborExpiry,
                                  "Labor issued date",
                                ),
                            }}
                            render={({ field }) => (
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.labor_issued_date}
                              />
                            )}
                          />
                        </div>

                        <div>
                          <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                            <i className="fas fa-calendar-times text-green-500 mr-1"></i> Labor Expiry Date <span className="text-[var(--form-error)]">*</span>
                          </label>
                          <Controller
                            name="labor_expiry_date"
                            control={control}
                            rules={{
                              required:
                                selectedCompanyDetails?.raw?.trade_license ===
                                "mainland"
                                  ? "Labor expiry date is required for Mainland companies"
                                  : false,
                              validate: (value) =>
                                validateExpiryDate(
                                  value,
                                  laborIssued,
                                  "Labor expiry date",
                                ),
                            }}
                            render={({ field }) => (
                              <DateInput
                                {...field}
                                placeholder="dd/mm/yyyy"
                                error={!!errors.labor_expiry_date}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visa Section */}
                  <div className="border border-[var(--form-border)] rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-[var(--form-label)] mb-4 flex items-center">
                      <i className="fas fa-passport text-green-500 mr-2"></i>
                      Visa Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-list text-green-500 mr-1"></i> Type of Visa
                        </label>
                        <Controller
                          name="visa_type"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              value={field.value || ""}
                              className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20"
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
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-id-card text-green-500 mr-1"></i> Visa Number
                        </label>
                        <Controller
                          name="visa_number"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                              placeholder="Enter Visa Number"
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-plus text-green-500 mr-1"></i> Visa Issued Date
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
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.visa_issued_date}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-times text-green-500 mr-1"></i> Visa Expiry Date
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
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.visa_expiry_date}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EID Section */}
                  <div className="border border-[var(--form-border)] rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-[var(--form-label)] mb-4 flex items-center">
                      <i className="fas fa-id-card text-green-500 mr-2"></i>
                      Emirates ID (EID)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-qrcode text-green-500 mr-1"></i> EID Number
                        </label>
                        <Controller
                          name="eid_number"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                              placeholder="Enter EID number (e.g., 784-2024-1234567-8)"
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-plus text-green-500 mr-1"></i> EID Issued Date
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
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.eid_issued_date}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                          <i className="fas fa-calendar-times text-green-500 mr-1"></i> EID Expiry Date
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
                            <DateInput
                              {...field}
                              placeholder="dd/mm/yyyy"
                              error={!!errors.eid_expiry_date}
                            />
                          )}
                        />
                      </div>
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
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                        {selectedCompanyDetails?.raw?.trade_license ===
                          "mainland" && (
                          <>
                            <DocumentUpload
                              fieldKey="labor_card"
                              label="Labor Card Copy"
                              icon="fas fa-id-card"
                              uploadingFiles={uploadingFiles}
                              documents={documents}
                              documentPreviews={documentPreviews}
                              existingDocuments={existingDocuments}
                              removedDocuments={removedDocuments}
                              handleFileChange={handleFileChange}
                              handleRemoveExistingDocument={handleRemoveExistingDocument}
                              handleCancelNewDocument={handleCancelNewDocument}
                            />
                            <DocumentUpload
                              fieldKey="labor_contract"
                              label="Attach Labor Contract"
                              icon="fas fa-file-signature"
                              uploadingFiles={uploadingFiles}
                              documents={documents}
                              documentPreviews={documentPreviews}
                              existingDocuments={existingDocuments}
                              removedDocuments={removedDocuments}
                              handleFileChange={handleFileChange}
                              handleRemoveExistingDocument={handleRemoveExistingDocument}
                              handleCancelNewDocument={handleCancelNewDocument}
                            />
                          </>
                        )}
                        <DocumentUpload
                          fieldKey="eid_1st_page"
                          label="EID Front Side"
                          icon="fas fa-id-card"
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                        <DocumentUpload
                          fieldKey="eid_2nd_page"
                          label="EID Back Side"
                          icon="fas fa-id-card"
                          uploadingFiles={uploadingFiles}
                          documents={documents}
                          documentPreviews={documentPreviews}
                          existingDocuments={existingDocuments}
                          removedDocuments={removedDocuments}
                          handleFileChange={handleFileChange}
                          handleRemoveExistingDocument={handleRemoveExistingDocument}
                          handleCancelNewDocument={handleCancelNewDocument}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: CONTACT ──────────────────────────────────────────── */}
            {currentStep === 3 && (
              <div>
                <div className="form-section-title mb-4 md:mb-6">
                  <i className="fas fa-address-card text-green-500 mr-2"></i>
                  <h3 className="text-base md:text-lg font-bold text-[var(--form-text)]">
                    Contact Information & Others
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-users text-green-500 mr-1"></i> Dependents
                    </label>
                    <Controller
                      name="dependents"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Number of dependents"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-phone text-green-500 mr-1"></i> Company Mobile Number
                    </label>
                    <Controller
                      name="company_mobile_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter company mobile number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-phone text-green-500 mr-1"></i> Personal Number
                    </label>
                    <Controller
                      name="personal_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter personal phone number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-phone-alt text-green-500 mr-1"></i> Other Number
                    </label>
                    <Controller
                      name="other_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter alternate number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-globe text-green-500 mr-1"></i> Home Country Number
                    </label>
                    <Controller
                      name="home_country_number"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          className="w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border border-[var(--form-border)] rounded-lg text-sm md:text-base text-[var(--form-text)] focus:outline-none focus:border-[var(--form-border-focus)] focus:ring-2 focus:ring-[var(--form-border-focus)]/20 placeholder:text-[var(--form-placeholder)]"
                          placeholder="Enter home country number"
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-envelope text-green-500 mr-1"></i> Company Email
                    </label>
                    <Controller
                      name="company_email"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input
                            {...field}
                            type="email"
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 placeholder:text-[var(--form-placeholder)] ${
                              errors.company_email
                                ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                            }`}
                            placeholder="name@company.com"
                          />
                          {errors.company_email && (
                            <p className="mt-1 text-xs text-[var(--form-error)]">
                              {errors.company_email.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-[var(--form-label)] mb-1 md:mb-2">
                      <i className="fas fa-envelope text-green-500 mr-1"></i> Personal Email <span className="text-[var(--form-error)]">*</span>
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
                            className={`w-full px-3 md:px-4 py-2 md:py-3 bg-[var(--form-surface)] border rounded-lg text-sm md:text-base text-[var(--form-text)] transition-all focus:outline-none focus:ring-2 placeholder:text-[var(--form-placeholder)] ${
                              errors.personal_email
                                ? "border-[var(--form-error)] focus:border-[var(--form-error)] focus:ring-[var(--form-error)]/20"
                                : "border-[var(--form-border)] focus:border-[var(--form-border-focus)] focus:ring-[var(--form-border-focus)]/20"
                            }`}
                            placeholder="name@gmail.com"
                          />
                          {errors.personal_email && (
                            <p className="mt-1 text-xs text-[var(--form-error)]">
                              {errors.personal_email.message}
                            </p>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── NAVIGATION BUTTONS ────────────────────────────────────────── */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-[var(--form-border)]">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2.5 rounded-full font-semibold bg-[var(--form-surface)] text-[var(--form-text)] border border-[var(--form-border)] hover:bg-[var(--form-surface-hover)] transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-arrow-left"></i> Previous
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                Next <i className="fas fa-arrow-right"></i>
              </button>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed ${
                currentStep === steps.length - 1 ? "inline-flex" : "hidden"
              }`}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Update Employee
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}
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

export default EditEmployee;