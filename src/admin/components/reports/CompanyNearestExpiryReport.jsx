import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import SearchBar from "../common/SearchBar";
import EntriesSelector from "../common/EntriesSelector";
import { showToast } from "../../../components/common/Toast";
import Pagination from "../common/Paginations";
import {
  fetchCompanyNearestExpiryReport,
  selectCompanyNearestExpiry,
  selectCompanyNearestExpiryLoading,
  selectCompanyNearestExpiryPagination
} from "../../store/slices/reportSlice";
import ExportModal from "../../../components/common/ExportModal";
import { exportToCSV, formatDate, getDaysDifference } from "../../../utils/reportUtils";
import apiClient from "../../../utils/apiClient";

const CompanyNearestExpiryReport = () => {
  const dispatch = useDispatch();
  const rawOrganizations = useSelector(selectCompanyNearestExpiry) || [];
  const loading = useSelector(selectCompanyNearestExpiryLoading);
  const pagination = useSelector(selectCompanyNearestExpiryPagination);
  const organizations = Array.isArray(rawOrganizations) ? rawOrganizations : [];

  // Local state
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  // Filter states
  const [expiryDays, setExpiryDays] = useState(30); // Default to 30 days

  useEffect(() => {
    dispatch(
      fetchCompanyNearestExpiryReport({
        page: currentPage,
        per_page: perPage,
        expiry_days: expiryDays,
        search: searchTerm || undefined,
      })
    );
  }, [dispatch, currentPage, perPage, expiryDays, searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, expiryDays, perPage]);

  // Transform organization data to extract document expiry fields
  const transformOrganization = (org) => {
    // Handle both organization and individual company structures
    const companies = org.companies || (org.id ? [org] : []);

    if (companies.length > 0) {
      return companies.map((company) => ({
        id: company.id,
        name: company.company_name || org.name || "-",
        organization_id: org.id,
        organization_name: org.name,
        trade_license_number:
          company.trade_license_number || org.trade_license_number,
        trade_license_expiry:
          company.trade_license_expiry || org.trade_license_expiry,
        establishment_card_number:
          company.establishment_card_number || org.establishment_card_number,
        establishment_card_expiry:
          company.establishment_card_expiry || org.establishment_card_expiry,
        expiry_date:
          company.expiry_date || org.expiry_date,
        // Additional fields that might be useful
        phone: company.phone || org.phone,
        email: company.email || org.email,
        address: company.address || org.address,
      }));
    }

    // Single organization/company
    return [
      {
        id: org.id,
        name: org.company_name || org.name || "-",
        trade_license_number: org.trade_license_number,
        trade_license_expiry: org.trade_license_expiry,
        establishment_card_number: org.establishment_card_number,
        establishment_card_expiry: org.establishment_card_expiry,
        expiry_date: org.expiry_date,
        phone: org.phone,
        email: org.email,
        address: org.address,
      },
    ];
  };

  // Check if a date is within expiry days
  const isWithinExpiry = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(dateStr);
    if (isNaN(expiryDate.getTime())) return false;

    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= expiryDays;
  };

  // Get companies with nearest expiry
  const getCompaniesWithNearestExpiry = () => {
    let allCompanies = [];

    if (Array.isArray(organizations)) {
      organizations.forEach((org) => {
        const companies = transformOrganization(org);
        allCompanies = [...allCompanies, ...companies];
      });
    }

    let filtered = [...allCompanies];

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          (company.name || "").toLowerCase().includes(searchLower) ||
          (company.trade_license_number || "")
            .toLowerCase()
            .includes(searchLower) ||
          (company.establishment_card_number || "")
            .toLowerCase()
            .includes(searchLower),
      );
    }

    // Sort by earliest expiry date
    filtered.sort((a, b) => {
      const getEarliestExpiry = (company) => {
        const expiryDates = [
          company.trade_license_expiry,
          company.establishment_card_expiry,
          company.expiry_date,
        ].filter((date) => date);

        if (expiryDates.length === 0) return null;
        return new Date(Math.min(...expiryDates.map((date) => new Date(date))));
      };

      const expiryA = getEarliestExpiry(a);
      const expiryB = getEarliestExpiry(b);

      if (!expiryA && !expiryB) return 0;
      if (!expiryA) return 1;
      if (!expiryB) return -1;

      return expiryA - expiryB;
    });

    return filtered;
  };

  // Transform data for export
  const getExportData = () => {
    const filteredCompanies = getCompaniesWithNearestExpiry();
    return filteredCompanies.map((company) => {
      const expiryDates = [
        company.trade_license_expiry,
        company.establishment_card_expiry,
        company.expiry_date,
      ].filter((date) => date);

      const earliestExpiry = expiryDates.length > 0
        ? expiryDates.reduce((earliest, current) =>
          new Date(current) < new Date(earliest) ? current : earliest
        )
        : null;

      const daysLeft = earliestExpiry ? getDaysDifference(earliestExpiry) : null;

      return {
        company_name: company.name,
        expiry_date: earliestExpiry ? formatDate(earliestExpiry) : "-",
        days_left: daysLeft !== null ? (daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`) : "-",
        // Additional fields for export
        phone: company.phone || "-",
        email: company.email || "-",
      };
    });
  };

  // Backend returns only current page data
  const filteredCompanies = getCompaniesWithNearestExpiry();
  const totalFiltered = pagination?.total || filteredCompanies.length;
  const totalPages = pagination?.lastPage || Math.ceil(totalFiltered / perPage);
  const start = 0; // backend handles pagination
  const pageCompanies = filteredCompanies;

  const handleResetFilters = () => {
    setExpiryDays(30);
    setSearchTerm("");
    setCurrentPage(1);
    showToast("Filters reset successfully", "success");
  };

  const handleExport = async (format) => {
    const exportData = getExportData();

    if (exportData.length === 0) {
      showToast("No data to export", "warning");
      return;
    }

    const headers = [
      { key: "company_name", label: "Document Name" },
      { key: "expiry_date", label: "Expiry Date" },
      { key: "days_left", label: "Days Left" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ];

    const filename = `company_expiry_report_${expiryDays}days_${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      exportToCSV(exportData, headers, `${filename}.csv`);
      showToast("Company expiry data exported successfully!", "success");
    } else if (format === "pdf") {
      try {
        const response = await apiClient.post('/admin/reports/export',
          { report_type: 'company_nearest_expiry', format: 'pdf' },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("PDF report generated successfully!", "success");
      } catch (error) {
        showToast("Failed to download PDF report", "error");
      }
    }
  };

  const getExpiryClass = (expiryDate) => {
    const daysLeft = getDaysDifference(expiryDate);
    if (daysLeft === null) return "";

    if (daysLeft < 0)
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold";
    if (daysLeft <= 7)
      return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-semibold";
    if (daysLeft <= 15)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (daysLeft <= expiryDays)
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "";
  };

  // Calculate stats
  const getDocumentStats = () => {
    let tradeLicenseExpiring = 0;
    let establishmentCardExpiring = 0;
    let totalCompanies = 0;

    let allCompanies = [];
    if (Array.isArray(organizations)) {
      organizations.forEach((org) => {
        const companies = transformOrganization(org);
        allCompanies = [...allCompanies, ...companies];
      });
    }

    allCompanies.forEach((company) => {
      totalCompanies++;
      if (isWithinExpiry(company.trade_license_expiry)) tradeLicenseExpiring++;
      if (isWithinExpiry(company.establishment_card_expiry))
        establishmentCardExpiring++;
      if (isWithinExpiry(company.expiry_date)) tradeLicenseExpiring++;
    });

    return { tradeLicenseExpiring, establishmentCardExpiring, totalCompanies };
  };

  const stats = getDocumentStats();

  const expiringWithin7Days = filteredCompanies.filter((company) => {
    const tlDays = getDaysDifference(company.trade_license_expiry);
    const ecDays = getDaysDifference(company.establishment_card_expiry);
    const docDays = getDaysDifference(company.expiry_date);
    return (
      (tlDays !== null && tlDays <= 7 && tlDays >= 0) ||
      (ecDays !== null && ecDays <= 7 && ecDays >= 0) ||
      (docDays !== null && docDays <= 7 && docDays >= 0)
    );
  }).length;

  const expiringWithin15Days =
    filteredCompanies.filter((company) => {
      const tlDays = getDaysDifference(company.trade_license_expiry);
      const ecDays = getDaysDifference(company.establishment_card_expiry);
      const docDays = getDaysDifference(company.expiry_date);
      return (
        (tlDays !== null && tlDays <= 15 && tlDays >= 0) ||
        (ecDays !== null && ecDays <= 15 && ecDays >= 0) ||
        (docDays !== null && docDays <= 15 && docDays >= 0)
      );
    }).length - expiringWithin7Days;

  const expiringWithin30Days =
    filteredCompanies.length - (expiringWithin7Days + expiringWithin15Days);

  return (
    <div className="w-full overflow-x-hidden">
      <main className="content px-4 py-4 md:px-6 md:py-6 w-full overflow-x-hidden">
        {/* Page Header with Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
            <Link
              to="/admin/reports"
              className="text-green-500 hover:text-green-600 font-medium"
            >
              Reports
            </Link>
            <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
            <span className="text-gray-500">Company Nearest Expiry Report</span>
          </div>
          <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 bg-clip-text text-transparent">
            Company Nearest Expiry Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Companies with documents expiring within {expiryDays} days
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expiring in 7 days
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {expiringWithin7Days}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-circle text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expiring in 15 days
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {expiringWithin15Days}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-amber-600 dark:text-amber-400"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expiring in {expiryDays} days
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {expiringWithin30Days}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-day text-yellow-600 dark:text-yellow-400"></i>
              </div>
            </div>
          </div>
        </div>


        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Expiry Days Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <i className="fas fa-hourglass-half mr-1"></i> Expiry Period
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500"
              >
                <option value="7">Next 7 days</option>
                <option value="15">Next 15 days</option>
                <option value="30">Next 30 days</option>
                <option value="60">Next 60 days</option>
                <option value="90">Next 90 days</option>
              </select>
            </div>

            {/* Filter Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                <i className="fas fa-undo-alt"></i> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
          <EntriesSelector
            value={perPage}
            onChange={(val) => {
              setPerPage(val);
              setCurrentPage(1);
            }}
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <SearchBar
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder="Search by document name, trade license, establishment card..."
            />
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
            >
              <i className="fas fa-download"></i> Export Report
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && filteredCompanies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <i className="fas fa-spinner fa-spin text-3xl text-green-500 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">
              Loading company expiry data...
            </p>
          </div>
        ) : (
          <>
            {/* Nearest Expiry Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
              <div className="min-w-[800px] md:min-w-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        S.No
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        DOCUMENT NAME
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        EXPIRY DATE
                      </th>
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                        DAYS LEFT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageCompanies.length > 0 ? (
                      pageCompanies.map((company, idx) => {
                        const expiryDates = [
                          company.trade_license_expiry,
                          company.establishment_card_expiry,
                          company.expiry_date,
                        ].filter((date) => date);

                        const earliestExpiry = expiryDates.length > 0
                          ? expiryDates.reduce((earliest, current) =>
                            new Date(current) < new Date(earliest) ? current : earliest
                          )
                          : null;

                        const daysLeft = earliestExpiry ? getDaysDifference(earliestExpiry) : null;

                        return (
                          <tr
                            key={company.id}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                              {(currentPage - 1) * perPage + idx + 1}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                              {company.name}
                            </td>
                            <td
                              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${earliestExpiry ? getExpiryClass(earliestExpiry) : ""
                                }`}
                            >
                              {earliestExpiry ? formatDate(earliestExpiry) : "-"}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                              {daysLeft !== null ? (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${daysLeft <= 7
                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      : daysLeft <= 15
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                                >
                                  <i className={`fas ${daysLeft < 0 ? "fa-exclamation-triangle" : "fa-hourglass-half"} text-[10px]`}></i>
                                  {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <i className="fas fa-building text-4xl text-gray-300 dark:text-gray-600"></i>
                            <p>No companies with expiring documents found</p>
                            <p className="text-xs">
                              Try changing the expiry period or search term
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalFiltered > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalFiltered}
                itemsPerPage={perPage}
              />
            )}
          </>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        title="Export Company Expiry Report"
        totalRecords={getExportData().length}
        formats={["csv", "pdf"]}
        defaultFormat="csv"
      />
    </div>
  );
};

export default CompanyNearestExpiryReport;