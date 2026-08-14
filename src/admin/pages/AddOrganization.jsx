import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showToast } from "../../components/common/Toast";
import { addOrganization } from "@admin/store/slices/organizationSlice";

const AddOrganization = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null); 

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    multi_company: "Yes",
  });

  const [phoneError, setPhoneError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle phone number validation
    if (name === "phone") {
      // Allow only digits, plus sign, spaces, hyphens, and parentheses
      let cleanedValue = value;
      
      // Remove any invalid characters (allow only digits, +, -, space, (, ))
      cleanedValue = cleanedValue.replace(/[^/[^\d+\-\s()]/g, "");
      
      setPhoneError("");
      
      // Optional: Validate length
      const digitsOnly = cleanedValue.replace(/\D/g, "");
      if (digitsOnly.length > 0 && (digitsOnly.length < 8 || digitsOnly.length > 15)) {
        setPhoneError("Phone number should be between 8 to 15 digits");
      }
      
      setFormData({ ...formData, [name]: cleanedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return false;
    
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "");
    
    // Check if phone number has valid length (8-15 digits)
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      return false;
    }
    
    return true;
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Logo size must be less than 2MB", "error");
        return;
      }

      // Store the actual file object
      setSelectedLogoFile(file);

      // Create preview only
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      showToast("Organization name is required", "error");
      return;
    }
    
    // Phone validation
    if (!formData.phone) {
      showToast("Phone number is required", "error");
      return;
    }
    
    if (!validatePhoneNumber(formData.phone)) {
      showToast("Please enter a valid phone number (8-15 digits)", "error");
      return;
    }
    
    if (!formData.email) {
      showToast("Email address is required", "error");
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setLoading(true);

    // Create FormData object for file upload
    const submitData = new FormData();
    submitData.append("name", formData.name);
    
    // Store only digits for phone number (or keep formatted version based on backend requirement)
    const phoneDigitsOnly = formData.phone.replace(/\D/g, "");
    submitData.append("phone", phoneDigitsOnly);
    
    submitData.append("email", formData.email);
    submitData.append("address", formData.address || "");
    const multiCompanyValue = formData.multi_company === "Yes" ? 1 : 0;
    submitData.append("has_multiple_companies", multiCompanyValue);

    // Append logo as file if selected
    if (selectedLogoFile) {
      submitData.append("logo", selectedLogoFile);
    }


    const result = await dispatch(addOrganization(submitData));
    setLoading(false);

    if (addOrganization.fulfilled.match(result)) {
      showToast(
        `✓ Organization "${formData.name}" added successfully!`,
        "success",
      );
      setTimeout(() => {
        navigate("/admin/organizations");
      }, 1200);
    } else {
      console.error("Add organization failed:", result.payload);
      // Show detailed error message
      const errorMsg =
        result.payload?.message ||
        result.payload ||
        "Failed to add organization";
      showToast(errorMsg, "error");
    }
  };

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
        <span className="text-gray-500 dark:text-gray-400">
          Add Organization
        </span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className="fas fa-building mr-2"></i> Add New Organization
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a parent organization to manage multiple companies under it
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 lg:p-8 shadow-soft">
        <form onSubmit={handleSubmit}>
          {/* Organization Details Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-4 md:mb-6">
              <i className="fas fa-info-circle text-green-500 text-base md:text-lg"></i>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                Organization Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Organization Name - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-building text-green-500 mr-1"></i>{" "}
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Enter organization name"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-phone text-green-500 mr-1"></i> Phone{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:ring-2 ${
                    phoneError 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" 
                      : "border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-500/20"
                  }`}
                  placeholder="+971 50 123 4567"
                  required
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500">{phoneError}</p>
                )}
                <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <i className="fas fa-info-circle mr-1"></i>
                  Enter phone number with country code (e.g., +971 50 123 4567)
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-envelope text-green-500 mr-1"></i> Email{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="Enter email address"
                  required
                />
              </div>

              {/* Address - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-map-marker-alt text-green-500 mr-1"></i>{" "}
                  Address
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

              {/* Has Multiple Companies? */}
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-sitemap text-green-500 mr-1"></i> Has
                  Multiple Companies?
                </label>
                <div className="flex gap-4 md:gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="multi_company"
                      value="Yes"
                      checked={formData.multi_company === "Yes"}
                      onChange={handleChange}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                      Yes
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="multi_company"
                      value="No"
                      checked={formData.multi_company === "No"}
                      onChange={handleChange}
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                      No
                    </span>
                  </label>
                </div>
                <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Select "Yes" if this organization will have multiple
                  subsidiary companies
                </p>
              </div>
            </div>
          </div>

          {/* Organization Logo Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-4 md:mb-6">
              <i className="fas fa-image text-green-500 text-base md:text-lg"></i>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                Organization Logo
              </h3>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 md:p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
              <input
                type="file"
                id="logoInput"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
              <label htmlFor="logoInput" className="cursor-pointer block">
                <div className="upload-icon mb-2 md:mb-3">
                  <i className="fas fa-cloud-upload-alt text-3xl md:text-5xl text-green-500"></i>
                </div>
                <div className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedLogoFile
                    ? selectedLogoFile.name
                    : "Click to upload logo"}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 md:mt-2">
                  Max size: 2MB. Format: JPG, PNG, SVG
                </div>
              </label>
            </div>

            {logoPreview && (
              <div className="mt-4 flex justify-center">
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="max-w-[80px] md:max-w-[120px] max-h-[80px] md:max-h-[120px] rounded-xl border-2 border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800 object-contain"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/admin/organizations"
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save text-xs md:text-sm"></i>{" "}
                  <span>Save Organization</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrganization;