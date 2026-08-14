import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";
import SearchBar from "../components/common/SearchBar";
import EntriesSelector from "../components/common/EntriesSelector";
import { showToast } from "../../components/common/Toast";
import {
  fetchCompanies,
  deleteCompany,
  clearCompanies,
  setCurrentOrganization,
} from "../store/slices/companySlice";
import Pagination from "../components/common/Paginations";
import ConfirmModal from "../components/common/ConfirmModal";

const Companies = () => {
  const dispatch = useDispatch();
  const { organizationId } = useParams();
  const location = useLocation();
  const { companies, loading, currentOrganizationName } = useSelector(
    (state) => state.companies || {},
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [organization] = useState(location.state?.organization || null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  // Get the base URL from environment or use the current origin
  const getBaseUrl = () => {
    // First try to get from env
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      // Remove /api from the end if present
      return apiUrl.replace(/\/api$/, "");
    }
    // Fallback to current origin
    return window.location.origin;
  };

  const getFullLogoUrl = (logoPath) => {
    if (!logoPath) return null;

    // If it's already a full URL, return it
    if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
      return logoPath;
    }

    const baseUrl = getBaseUrl();

    // Remove any leading slashes
    const cleanPath = logoPath.replace(/^\/+/, "");

    // Construct the full URL
    let fullUrl;
    if (cleanPath.startsWith("storage/")) {
      fullUrl = `${baseUrl}/${cleanPath}`;
    } else {
      fullUrl = `${baseUrl}/storage/${cleanPath}`;
    }


    return fullUrl;
  };

  useEffect(() => {
    if (organizationId) {
      if (organization) {
        dispatch(
          setCurrentOrganization({
            id: organization.id,
            name: organization.name,
          }),
        );
      }
      dispatch(fetchCompanies(parseInt(organizationId)));
    }

    return () => {
      dispatch(clearCompanies());
    };
  }, [dispatch, organizationId, organization]);

  const getFilteredCompanies = () => {
    let filtered = companies || [];
    if (searchTerm) {
      filtered = filtered.filter(
        (company) =>
          (company.name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (company.email || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (company.phone || "").includes(searchTerm),
      );
    }
    return filtered;
  };

  const filteredCompanies = getFilteredCompanies();
  const totalFiltered = filteredCompanies.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const start = (currentPage - 1) * perPage;
  const pageCompanies = filteredCompanies.slice(start, start + perPage);

  const handleDeleteClick = (company) => {
    setSelectedCompany(company);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCompany) return;

    setDeleteLoading(true);

    const result = await dispatch(deleteCompany(selectedCompany.id));

    if (deleteCompany.fulfilled.match(result)) {
      showToast(`${selectedCompany.name} deleted successfully`, "success");
      setConfirmOpen(false);
      setSelectedCompany(null);
      // Refresh the list
      dispatch(fetchCompanies(parseInt(organizationId)));
    } else {
      showToast("Failed to delete company", "error");
    }

    setDeleteLoading(false);
  };

  const handleImageError = (companyId) => {
    setFailedImages((prev) => ({ ...prev, [companyId]: true }));
  };

  const totalCompanies = companies?.length || 0;

  return (
    <div className="w-full overflow-x-hidden">
      <main className="content px-4 py-4 md:px-6 md:py-6 w-full overflow-x-hidden">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
          <Link
            to="/admin/organizations"
            className="text-green-500 hover:text-green-600 font-medium"
          >
            Organizations
          </Link>
          <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
          <span className="text-gray-500 dark:text-gray-400">
            {currentOrganizationName || organization?.name || "Companies"}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
          <div>
            <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
              Company
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Managing companies under{" "}
              {currentOrganizationName || organization?.name}
            </p>
          </div>
          <Link
            to={`/admin/organizations/${organizationId}/add-company`}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm rounded-full font-semibold flex items-center gap-1.5 md:gap-2 transition-all shadow-md hover:shadow-lg"
          >
            <i className="fas fa-plus-circle text-xs md:text-sm"></i>
            <span className="hidden sm:inline">Add Company</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-5 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex justify-between items-start mb-2 md:mb-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-building text-green-600 dark:text-green-400 text-base md:text-xl"></i>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-green-600 dark:text-green-400">
              {totalCompanies}
            </div>
            <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Total Companies
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-5 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex justify-between items-start mb-2 md:mb-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-line text-blue-600 dark:text-blue-400 text-base md:text-xl"></i>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              Active
            </div>
            <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Company Status
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
          <EntriesSelector value={perPage} onChange={setPerPage} />
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, email..."
            />
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="min-w-[800px] md:min-w-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Logo
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Company Name
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Phone
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Address
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Created At
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageCompanies.map((company) => {
                    const hasValidLogo =
                      company.logo && !failedImages[company.id];
                    const logoUrl = hasValidLogo
                      ? getFullLogoUrl(company.logo)
                      : null;

                    return (
                      <tr
                        key={company.id}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {hasValidLogo && logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={company.name}
                              className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover"
                              onError={() => handleImageError(company.id)}
                            />
                          ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
                              <i className="fas fa-building text-sm md:text-lg"></i>
                            </div>
                          )}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {company.name}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {company.phone !== "-" ? company.phone : "—"}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {company.email !== "-" ? company.email : "—"}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {company.address !== "-" ? company.address : "—"}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {company.createdAt}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="flex gap-1 md:gap-2">
                            <Link
                              to={`/admin/organizations/${organizationId}/edit-company/${company.id}`}
                              state={{
                                organizationName:
                                  currentOrganizationName || organization?.name,
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500 transition-colors"
                              title="Edit"
                            >
                              <i className="fas fa-edit text-xs md:text-sm"></i>
                            </Link>
                            <button
                              onClick={() => handleDeleteClick(company)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-xs md:text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageCompanies.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        No companies found. Click "Add Company" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalCompanies > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalFiltered}
            itemsPerPage={perPage}
          />
        )}
        <ConfirmModal
          isOpen={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setSelectedCompany(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Company"
          message={`Are you sure you want to delete "${selectedCompany?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          loading={deleteLoading}
        />
      </main>
    </div>
  );
};

export default Companies;
