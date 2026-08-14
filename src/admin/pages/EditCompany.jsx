import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../../components/common/Toast";
import {
  fetchCompanyById,
  updateCompany,
  clearError,
} from "../store/slices/companySlice";
import { fetchOrganizations } from "../store/slices/organizationSlice";

const EditCompany = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { organizationId, id } = useParams();
  const {
    currentCompany,
    loading: companyLoading,
    error,
  } = useSelector((state) => state.companies || {});
  const { organizations = [] } = useSelector(
    (state) => state.organizations || {},
  );

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState(null);
  const [, setLogoFile] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);

  const [formData, setFormData] = useState({
    company_name: "",
    phone: "",
    email: "",
    address: "",
    trade_license: "", // Added trade_license field
    organization_id: "",
  });

  // Fetch organizations
  useEffect(() => {
    if (organizations.length === 0) {
      dispatch(fetchOrganizations());
    }
  }, [dispatch, organizations.length]);

  // Find current organization
  useEffect(() => {
    if (organizations.length > 0 && organizationId) {
      const org = organizations.find((o) => o.id === parseInt(organizationId));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentOrganization(org);
    }
  }, [organizations, organizationId]);

  // Fetch company data
  useEffect(() => {
    if (organizationId && id) {
      dispatch(fetchCompanyById({ organizationId, companyId: id })).finally(
        () => {
          setInitialLoading(false);
        },
      );
    }
  }, [dispatch, organizationId, id]);

  const getBaseUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl.replace(/\/api$/, "");
    }
    return window.location.origin;
  };

  const getFullLogoUrl = (logoPath) => {
    if (!logoPath) return null;

    if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
      return logoPath;
    }

    const baseUrl = getBaseUrl();
    const cleanPath = logoPath.replace(/^\/+/, "");

    let fullUrl;
    if (cleanPath.startsWith("storage/")) {
      fullUrl = `${baseUrl}/${cleanPath}`;
    } else {
      fullUrl = `${baseUrl}/storage/${cleanPath}`;
    }

    return fullUrl;
  };

  // Set form data when company is loaded
  useEffect(() => {
    if (currentCompany) {
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        company_name: currentCompany.company_name || currentCompany.name || "",
        phone: currentCompany.phone || "",
        email: currentCompany.email || "",
        address: currentCompany.address || "",
        trade_license: currentCompany.raw?.trade_license || "", // Make sure this matches the API response
        organization_id: currentCompany.organization_id || organizationId,
      });
      
      
      if (currentCompany.logo) {
        setLogoPreview(getFullLogoUrl(currentCompany.logo));
      }
    }
  }, [currentCompany, organizationId]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Logo size must be less than 2MB", "error");
        return;
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) {
        showToast("Only JPG, PNG, and SVG files are allowed", "error");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_name) {
      showToast("Company name is required", "error");
      return;
    }

    setLoading(true);

    const companyData = {
      company_name: formData.company_name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      trade_license: formData.trade_license || null, // Send null if empty
      organization_id: parseInt(organizationId),
    };


    const result = await dispatch(
      updateCompany({ id: parseInt(id), data: companyData }),
    );
    setLoading(false);

    if (updateCompany.fulfilled.match(result)) {
      showToast(
        `✓ Company "${formData.company_name}" updated successfully!`,
        "success",
      );
      setTimeout(() => {
        navigate(`/admin/organizations/${organizationId}/companies`);
      }, 1200);
    } else {
      const errorMsg = result.payload || "Failed to update company";
      showToast(errorMsg, "error");
    }
  };

  if (initialLoading || companyLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link
          to="/admin/organizations"
          className="text-green-500 hover:text-green-600 font-medium"
        >
          Organizations
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <Link
          to={`/admin/organizations/${organizationId}/companies`}
          className="text-green-500 hover:text-green-600 font-medium"
        >
          {currentOrganization?.name || "Companies"}
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500 dark:text-gray-400">
          Edit Company
        </span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className="fas fa-edit mr-2"></i> Edit Company
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update company information
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 lg:p-8 shadow-soft">
        <form onSubmit={handleSubmit}>
          {/* Company Details Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-4 md:mb-6">
              <i className="fas fa-info-circle text-green-500 text-base md:text-lg"></i>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                Company Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Parent Organization - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-sitemap text-green-500 mr-1"></i>{" "}
                  Parent Organization
                </label>
                <input
                  type="text"
                  value={currentOrganization?.name || "Loading..."}
                  disabled
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm md:text-base text-gray-600 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Company Name - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-building text-green-500 mr-1"></i>{" "}
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Enter company name"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-phone text-green-500 mr-1"></i> Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-envelope text-green-500 mr-1"></i> Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Enter email address"
                />
              </div>

              {/* Trade License - New Field */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-certificate text-green-500 mr-1"></i> Trade License
                </label>
                <select
                  name="trade_license"
                  value={formData.trade_license || ""}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="">Select License Type</option>
                  <option value="freezone">Freezone</option>
                  <option value="mainland">Mainland</option>
                </select>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select the type of trade license (Freezone or Mainland)
                </p>
              </div>

              {/* Address - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-map-marker-alt text-green-500 mr-1"></i> Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-vertical"
                  placeholder="Enter full address"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Company Logo Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-4 md:mb-6">
              <i className="fas fa-image text-green-500 text-base md:text-lg"></i>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                Company Logo
              </h3>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 md:p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
              <input
                type="file"
                id="logoInput"
                accept="image/jpeg,image/png,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
              <label htmlFor="logoInput" className="cursor-pointer block">
                <div className="upload-icon mb-2 md:mb-3">
                  <i className="fas fa-cloud-upload-alt text-3xl md:text-5xl text-green-500"></i>
                </div>
                <div className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload new logo
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">
                  Max size: 2MB. Format: JPG, PNG, SVG
                </div>
              </label>
            </div>

            {logoPreview && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="max-w-[80px] md:max-w-[120px] max-h-[80px] md:max-h-[120px] rounded-xl border-2 border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-red-500 hover:text-red-600 text-xs md:text-sm flex items-center gap-1 transition-colors"
                >
                  <i className="fas fa-trash"></i> Remove Logo
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={`/admin/organizations/${organizationId}/companies`}
              className="px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <i className="fas fa-times text-xs md:text-sm"></i>
              <span>Cancel</span>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-70"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>{" "}
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save text-xs md:text-sm"></i>{" "}
                  <span>Update Company</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompany;