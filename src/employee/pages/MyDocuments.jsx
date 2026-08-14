import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiEye
} from "react-icons/fi";
import { FaPassport, FaIdCard, FaGraduationCap, FaFileContract } from "react-icons/fa";
import { fetchUserProfile } from "../../admin/store/slices/settingsSlice";
import apiClient from "../../utils/apiClient";

const MyDocuments = () => {
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);

  const [docs, setDocs] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Get fresh profile data on mount
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  // Fetch documents from API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoadingDocs(true);
        const response = await apiClient.get('/employee/my-documents');

        if (response.data?.status === 'success' && response.data?.data?.documents) {
          setDocs(response.data.data.documents);
        } else if (response.data?.documents) {
          setDocs(response.data.documents);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchDocuments();
  }, []);

  const employee = authUser?.employee || authUser || {};

  // Document fields definitions categorized
  const categories = [
    {
      id: "passport",
      title: "Passport Documents",
      icon: <FaPassport className="text-xl text-blue-500" />,
      description: "Official travel and international identity documents",
      fields: [
        { key: "passport_1st_page", label: "Passport 1st Page", icon: "fas fa-passport" },
        { key: "passport_2nd_page", label: "Passport 2nd Page", icon: "fas fa-passport" },
        { key: "passport_outer_page", label: "Passport Outer Page", icon: "fas fa-passport" },
        { key: "passport_id_page", label: "Passport ID Page", icon: "fas fa-id-card" }
      ],
      expiryKey: "passport_expiry_date",
      expiryLabel: "Passport Expiry Date"
    },
    {
      id: "visa",
      title: "Visa & Labor Documents",
      icon: <FaFileContract className="text-xl text-emerald-500" />,
      description: "Work permits, labor agreements, and residence authorization",
      fields: [
        { key: "visa_page", label: "Visa Page", icon: "fas fa-file-invoice" },
        { key: "labor_card", label: "Labor Card", icon: "fas fa-id-card" },
        { key: "labor_contract", label: "Labor Contract", icon: "fas fa-file-signature" }
      ],
      expiryKeys: {
        visa_page: "visa_expiry_date",
        labor_card: "labor_expiry_date",
        labor_contract: "labor_expiry_date"
      }
    },
    {
      id: "identity",
      title: "Identity & Residency",
      icon: <FaIdCard className="text-xl text-indigo-500" />,
      description: "Local identification cards and national proof documents",
      fields: [
        { key: "eid_1st_page", label: "Emirates ID Front Side", icon: "fas fa-id-card" },
        { key: "eid_2nd_page", label: "Emirates ID Back Side", icon: "fas fa-id-card" },
        { key: "home_country_id_proof", label: "Home Country ID / Aadhaar Card", icon: "fas fa-home" }
      ],
      expiryKeys: {
        eid_1st_page: "eid_expiry_date",
        eid_2nd_page: "eid_expiry_date"
      }
    },
    {
      id: "education",
      title: "Academic Certificates",
      icon: <FaGraduationCap className="text-xl text-violet-500" />,
      description: "Attested university degrees and educational credentials",
      fields: [
        { key: "educational_1st_page", label: "Educational Certificate (Front)", icon: "fas fa-graduation-cap" },
        { key: "educational_2nd_page", label: "Educational Certificate (Back)", icon: "fas fa-graduation-cap" }
      ]
    }
  ];

  // Flat list of all personal document fields
  const allFields = categories.flatMap(cat =>
    cat.fields.map(f => {
      let expiryKey = null;
      if (cat.expiryKey) expiryKey = cat.expiryKey;
      else if (cat.expiryKeys && cat.expiryKeys[f.key]) expiryKey = cat.expiryKeys[f.key];

      return {
        ...f,
        category: cat.title,
        expiryKey
      };
    })
  );

  // Helper to construct download/view URL
  const getDocumentUrl = (documentPath) => {
    if (!documentPath) return null;
    if (typeof documentPath === "string" && (documentPath.startsWith("http://") || documentPath.startsWith("https://"))) {
      return documentPath;
    }
    const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || window.location.origin;
    return `${baseUrl}/storage/${documentPath.replace(/^\/+/, "")}`;
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Expiry check helpers
  const getExpiryStatus = (expiryDateStr) => {
    if (!expiryDateStr) return { status: "valid", text: "No Expiry Date Set" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "expired", text: `Expired on ${formatDate(expiryDateStr)}`, colorClass: "text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30" };
    }
    if (diffDays <= 30) {
      return { status: "soon", text: `Expires soon (${diffDays} days left)`, colorClass: "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30" };
    }
    return { status: "valid", text: `Expires on ${formatDate(expiryDateStr)}`, colorClass: "text-green-600 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30" };
  };

  // Check all expiries
  const expiries = [];
  const expiryKeysToCheck = [
    { key: "passport_expiry_date", label: "Passport" },
    { key: "visa_expiry_date", label: "Visa Page" },
    { key: "labor_expiry_date", label: "Labor Card/Contract" },
    { key: "eid_expiry_date", label: "Emirates ID (EID)" }
  ];

  expiryKeysToCheck.forEach(({ key, label }) => {
    const date = employee[key];
    if (date) {
      const statusInfo = getExpiryStatus(date);
      if (statusInfo.status === "expired" || statusInfo.status === "soon") {
        expiries.push({
          label,
          date,
          ...statusInfo
        });
      }
    }
  });

  // Calculate quick stats
  const uploadedCount = allFields.filter(f => docs[f.key]).length;
  const pendingCount = allFields.length - uploadedCount;
  const expiredCount = expiries.filter(e => e.status === "expired").length;
  const soonCount = expiries.filter(e => e.status === "soon").length;

  if (loadingDocs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div>

      {/* Expiry Alerts Banner */}
      {expiries.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-red-500 text-2xl mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800 dark:text-red-400">
                Action Required: Expiring or Expired Documents
              </h4>
              <p className="text-xs text-red-700 dark:text-red-500 mt-1">
                The following official documents require renewal to keep your records current.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {expiries.map((exp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900/50 border border-red-100 dark:border-red-900/20 text-xs"
                  >
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{exp.label}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${exp.status === "expired" ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}>
                      {exp.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-5 md:mb-7">
        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiCheckCircle />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-green-500">
            {uploadedCount}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Uploaded
          </div>
        </div>

        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiClock />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-amber-500">
            {pendingCount}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Pending Upload
          </div>
        </div>

        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiAlertTriangle />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-red-500">
            {expiredCount}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Expired
          </div>
        </div>

        <div className="stat-card bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 md:p-5 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="stat-icon w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl md:text-2xl mx-auto mb-2 md:mb-3">
            <FiInfo />
          </div>
          <div className="stat-number text-2xl md:text-3xl font-extrabold text-blue-500">
            {soonCount}
          </div>
          <div className="stat-label text-[10px] md:text-xs text-[var(--muted)]">
            Expiring Soon
          </div>
        </div>
      </div>

      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-5 mb-5 md:mb-7">
        <h2 className="text-lg md:text-2xl font-semibold bg-gradient-to-r from-[var(--text)] to-green-600 bg-clip-text text-transparent">
          My Documents
        </h2>
      </div>
      {/* Document Categories */}
      <div className="flex flex-col gap-8">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 md:p-6 shadow-sm"
          >
            {/* Category Header */}
            <div className="flex items-center gap-3.5 mb-2 pb-4 border-b border-[var(--border)]">
              <div className="p-3 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl flex items-center justify-center">
                {cat.icon}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text)]">
                  {cat.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  {cat.description}
                </p>
              </div>
            </div>

            {/* Grid of Documents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-6">
              {cat.fields.map((field) => {
                const documentPath = docs[field.key];
                const hasDoc = !!documentPath;

                // Get expiry key for this specific field
                let expiryKey = cat.expiryKey;
                if (cat.expiryKeys && cat.expiryKeys[field.key]) {
                  expiryKey = cat.expiryKeys[field.key];
                }

                const expiryDateVal = expiryKey ? employee[expiryKey] : null;
                const expiryInfo = expiryDateVal ? getExpiryStatus(expiryDateVal) : null;

                return (
                  <div
                    key={field.key}
                    className="group flex flex-col justify-between p-4 md:p-5 rounded-xl border border-[var(--border)] hover:border-green-500/30 hover:bg-[var(--surface2)]/30 transition-all duration-300"
                  >
                    <div>
                      {/* Status Icon Header */}
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="w-10 h-10 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center flex-shrink-0">
                          <i className={`${field.icon} text-base`}></i>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${hasDoc
                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                          {hasDoc ? "Uploaded" : "Pending"}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h4 className="text-sm font-extrabold text-[var(--text)] group-hover:text-green-600 transition-colors">
                        {field.label}
                      </h4>

                      {/* Expiry Badge */}
                      {hasDoc && expiryInfo && (
                        <div className={`mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${expiryInfo.colorClass}`}>
                          <FiClock className="flex-shrink-0" />
                          <span>{expiryInfo.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex gap-2.5 mt-5 pt-3 border-t border-[var(--border)]/50">
                      {hasDoc ? (
                        <a
                          href={getDocumentUrl(documentPath)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                        >
                          <FiEye /> View Document
                        </a>
                      ) : (
                        <div className="w-full py-2 bg-[var(--surface2)] text-[var(--text-secondary)] rounded-xl text-xs font-bold text-center border border-dashed border-[var(--border)] flex items-center justify-center gap-1.5">
                          <FiInfo /> Not Uploaded
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default MyDocuments;
