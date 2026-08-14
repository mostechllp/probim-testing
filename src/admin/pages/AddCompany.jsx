import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link, useParams } from "react-router-dom";
import { addCompany, clearError } from "../store/slices/companySlice";
import { fetchOrganizations } from "../store/slices/organizationSlice";
import { showToast } from "../../components/common/Toast";

const AddCompany = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { organizationId } = useParams(); // Get organizationId from URL
  const { organizations = [], loading: orgLoading } = useSelector(
    (state) => state.organizations || {},
  );
  const { loading: companyLoading, error: companyError } = useSelector(
    (state) => state.companies || {},
  );
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organization_id: organizationId || "", // Pre-fill from URL
    company_name: "",
    phone: "",
    email: "",
    address: "",
    trade_license: "", // Added trade_license field
    logo: null,
  });
  const [previewLogo, setPreviewLogo] = useState(null);

  useEffect(() => {
    if (!organizations || organizations.length === 0) {
      dispatch(fetchOrganizations());
    }
  }, [dispatch, organizations]);

  // Handle company error
  useEffect(() => {
    if (companyError) {

      // Handle validation errors
      if (companyError && typeof companyError === "object") {
        if (companyError.errors) {
          // Display specific field errors
          Object.keys(companyError.errors).forEach((field) => {
            const messages = companyError.errors[field];
            if (Array.isArray(messages)) {
              messages.forEach((msg) => showToast(`${field}: ${msg}`, "error"));
            } else {
              showToast(`${field}: ${messages}`, "error");
            }
          });
        } else if (companyError.message) {
          showToast(companyError.message, "error");
        } else {
          showToast("Validation error", "error");
        }
      } else if (typeof companyError === "string") {
        showToast(companyError, "error");
      } else {
        showToast("Failed to create company", "error");
      }
      dispatch(clearError());
    }
  }, [companyError, dispatch]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // Allow: digits, spaces, +, -, (, )
      const cleanedValue = value.replace(/[^\d\s()+-]/g, "");

      setFormData({
        ...formData,
        [name]: cleanedValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast("File size must be less than 2MB", "error");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/gif",
        "image/svg+xml",
      ];
      if (!allowedTypes.includes(file.type)) {
        showToast("Only JPG, PNG, GIF, and SVG files are allowed", "error");
        return;
      }

      setFormData({ ...formData, logo: file });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.organization_id) {
      showToast("Organization is required", "error");
      return;
    }

    if (!formData.company_name.trim()) {
      showToast("Company name is required", "error");
      return;
    }

    setLoading(true);

    try {
      // Create FormData for file upload - matching Postman exactly
      const submitData = new FormData();
      submitData.append("organization_id", formData.organization_id);
      submitData.append("company_name", formData.company_name.trim());

      if (formData.phone) submitData.append("phone", formData.phone);
      if (formData.email) submitData.append("email", formData.email);
      if (formData.address) submitData.append("address", formData.address);
      if (formData.trade_license) submitData.append("trade_license", formData.trade_license); // Added trade_license

      // Only append logo if it exists
      if (formData.logo) {
        submitData.append("logo", formData.logo);
      }

      const result = await dispatch(addCompany(submitData));

      if (addCompany.fulfilled.match(result)) {
        showToast(
          `Company "${formData.company_name}" created successfully!`,
          "success",
        );
        setTimeout(() => {
          navigate(
            `/admin/organizations/${formData.organization_id}/companies`,
          );
        }, 1500);
      } else {
        console.error("Failed result:", result);
        if (result.payload && result.payload.message) {
          showToast(result.payload.message, "error");
        } else if (typeof result.payload === "string") {
          showToast(result.payload, "error");
        } else {
          showToast("Failed to create company", "error");
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      showToast("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  // Get selected organization name
  const selectedOrg = organizations.find(
    (org) => org.id === parseInt(formData.organization_id),
  );

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

        {selectedOrg ? (
          <>
            <Link
              to={`/admin/organizations/${selectedOrg.id}/companies`}
              className="text-green-500 hover:text-green-600 font-medium"
            >
              {selectedOrg.name}
            </Link>
            <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
            <span className="text-gray-500 dark:text-gray-400">
              Add Company
            </span>
          </>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Add Company</span>
        )}
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className="fas fa-building mr-2"></i> Add New Company
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Add a company under your organization
        </p>
      </div>

      {(orgLoading || companyLoading) && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-4 md:p-6"
      >
        {/* Organization */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Organization *
          </label>
          <select
            name="organization_id"
            value={formData.organization_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            required
            disabled={!!organizationId} // Disable if coming from URL
          >
            <option value="">Select Organization</option>
            {organizations &&
              organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {organizationId
              ? "Organization is fixed for this company"
              : "Select the organization this company belongs to"}
          </p>
        </div>

        {/* Company Name */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter company name"
            required
          />
        </div>

        {/* Phone */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter phone number"
          />
        </div>

        {/* Email */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter email address"
          />
        </div>

        {/* Address */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter company address"
          />
        </div>

        {/* Trade License - New Field */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Trade License
          </label>
          <select
            name="trade_license"
            value={formData.trade_license}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select License Type</option>
            <option value="freezone">Freezone</option>
            <option value="mainland">Mainland</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Select the type of trade license (Freezone or Mainland)
          </p>
        </div>

        {/* Company Logo */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Company Logo (Optional)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-green-500 transition-colors">
            <div className="space-y-1 text-center">
              {previewLogo ? (
                <div className="mb-3">
                  <img
                    src={previewLogo}
                    alt="Preview"
                    className="mx-auto h-24 w-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, logo: null });
                      setPreviewLogo(null);
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="logo-upload"
                      className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="logo-upload"
                        name="logo"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JPG, PNG, GIF, SVG up to 2MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Creating...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Create Company
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCompany;