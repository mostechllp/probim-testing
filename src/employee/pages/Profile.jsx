import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCamera,
  FiLock,
  FiSave,
  FiRefreshCw,
  FiEdit2,
  FiCheckCircle,
  FiLoader,
  FiInfo,
} from "react-icons/fi";
import { changePassword, clearUpdateSuccess, fetchUserProfile, updateProfile } from "../../admin/store/slices/settingsSlice";
import apiClient from "../../utils/apiClient";
import { showToast } from "../../components/common/Toast";

const Profile = () => {
  const dispatch = useDispatch();
  const { user: authUser } = useSelector((state) => state.auth);
  const { profile, loading, updateSuccess, error } = useSelector((state) => state.settings);
  const fileInputRef = useRef(null);
  
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarTempPath, setAvatarTempPath] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [lastUpdatedAvatar, setLastUpdatedAvatar] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    personalEmail: "",
    personalNumber: "",
    address: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [activeTab, setActiveTab] = useState("personal");

  // Get employee data from auth
  const employee = authUser?.employee || authUser;

  // Helper to get the correct phone number - handles both 'phone_number' and 'personal_number'
  const getPhoneNumber = () => {
    // Check employee object first (from auth response)
    if (employee) {
      // The backend uses 'phone_number' in the response
      if (employee.phone_number) return employee.phone_number;
      if (employee.personal_number) return employee.personal_number;
      if (employee.phone) return employee.phone;
    }
    
    // Check authUser directly
    if (authUser) {
      if (authUser.phone_number) return authUser.phone_number;
      if (authUser.personal_number) return authUser.personal_number;
      if (authUser.phone) return authUser.phone;
    }
    
    // Check profile (from settings slice)
    if (profile) {
      if (profile.phone_number) return profile.phone_number;
      if (profile.personal_number) return profile.personal_number;
      if (profile.phone) return profile.phone;
    }
    
    return "";
  };

  // Helper to get the correct address
  const getAddress = () => {
    if (employee?.address) return employee.address;
    if (authUser?.address) return authUser.address;
    if (profile?.address) return profile.address;
    return "";
  };

  // Helper to get the correct name
  const getFullName = () => {
    if (employee?.name) return employee.name;
    if (employee?.first_name && employee?.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    if (authUser?.name) return authUser.name;
    if (profile?.name) return profile.name;
    return "";
  };

  // Helper to get the correct personal email
  const getPersonalEmail = () => {
    if (employee?.personal_email) return employee.personal_email;
    if (authUser?.personal_email) return authUser.personal_email;
    if (profile?.personal_email) return profile.personal_email;
    if (employee?.email) return employee.email;
    if (authUser?.email) return authUser.email;
    return "";
  };

  // Initialize form data from auth
  useEffect(() => {
    if (authUser || employee) {
      const phoneNumber = getPhoneNumber();
      const address = getAddress();
      const fullName = getFullName();
      const personalEmail = getPersonalEmail();
      
      
      setFormData({
        fullName: fullName,
        personalEmail: personalEmail,
        personalNumber: phoneNumber,
        address: address,
      });
    }
  }, [authUser, employee]);

  // Fetch fresh profile data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await dispatch(fetchUserProfile());
        if (result.payload) {
          const userData = result.payload;
          const empData = userData?.employee || userData;
          
          // Try to get phone from multiple possible field names
          const phoneNumber = empData?.phone_number || 
                             empData?.personal_number || 
                             userData?.phone_number || 
                             userData?.personal_number || 
                             userData?.phone || 
                             "";
          
          const address = empData?.address || userData?.address || "";
          
          setFormData({
            fullName: userData.name || empData?.name || `${empData?.first_name || ''} ${empData?.last_name || ''}`.trim() || "",
            personalEmail: empData?.personal_email || userData.personal_email || userData.email || "",
            personalNumber: phoneNumber,
            address: address,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    
    fetchUser();
  }, [dispatch]);

  // Handle update success
  useEffect(() => {
    if (updateSuccess) {
      showToast("Profile updated successfully!", "success");
      dispatch(clearUpdateSuccess());
      
      // Refetch fresh profile data
      const refetchProfile = async () => {
        const result = await dispatch(fetchUserProfile());
        if (result.payload) {
          const userData = result.payload;
          const empData = userData?.employee || userData;
          
          const phoneNumber = empData?.phone_number || 
                             empData?.personal_number || 
                             userData?.phone_number || 
                             userData?.personal_number || 
                             userData?.phone || 
                             "";
          
          const address = empData?.address || userData?.address || "";
          
          setFormData({
            fullName: userData.name || empData?.name || `${empData?.first_name || ''} ${empData?.last_name || ''}`.trim() || "",
            personalEmail: empData?.personal_email || userData.personal_email || userData.email || "",
            personalNumber: phoneNumber,
            address: address,
          });
        }
      };
      refetchProfile();
      
      // Reset avatar states
      setAvatarPreview(null);
      setAvatarTempPath(null);
      setAvatarError(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUpdating(false);
    }
  }, [updateSuccess, dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearUpdateSuccess());
      setUpdating(false);
    }
  }, [error, dispatch]);

  // Get avatar URL
  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (avatarError) return null;
    if (lastUpdatedAvatar) return lastUpdatedAvatar;
    
    let avatar = authUser?.avatar;
    if (!avatar && profile?.avatar) {
      avatar = profile.avatar;
    }
    if (!avatar && employee?.avatar) {
      avatar = employee.avatar;
    }
    
    if (!avatar) return null;
    
    if (typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://'))) {
      return avatar;
    }
    
    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || window.location.origin;
    
    if (typeof avatar === "object" && avatar.path) {
      return `${baseUrl}/storage/${avatar.path}`;
    }
    
    if (typeof avatar === "string") {
      if (avatar.startsWith("/storage/")) return `${baseUrl}${avatar}`;
      if (avatar.startsWith("storage/")) return `${baseUrl}/${avatar}`;
      if (avatar.startsWith("avatars/")) return `${baseUrl}/storage/${avatar}`;
      return `${baseUrl}/storage/${avatar}`;
    }
    
    return null;
  };

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Please upload a valid image file (JPEG, PNG, GIF, or WEBP)", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be less than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await apiClient.post("/admin/employees/upload-temp", uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      if (result.status && result.path) {
        setAvatarTempPath(result.path);
        showToast("Avatar uploaded successfully", "success");
      } else {
        showToast("Failed to upload avatar", "error");
        setAvatarPreview(null);
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      showToast(`Upload failed: ${error.response?.data?.message || error.message}`, "error");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarTempPath(null);
    setAvatarError(false);
    setLastUpdatedAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      showToast("Full name is required", "error");
      return;
    }
    
    setUpdating(true);
    
    const profileFormData = new FormData();
    
    const nameParts = formData.fullName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    profileFormData.append("name", formData.fullName);
    profileFormData.append("first_name", firstName);
    profileFormData.append("last_name", lastName);
    
    const currentPhone = getPhoneNumber();
    const currentAddress = getAddress();
    
    // Send phone if it has changed - use both field names for compatibility
    if (formData.personalNumber && formData.personalNumber !== currentPhone) {
      profileFormData.append("phone_number", formData.personalNumber);
      profileFormData.append("personal_number", formData.personalNumber);
      profileFormData.append("phone", formData.personalNumber);
    } 
    
    if (formData.address && formData.address !== currentAddress) {
      profileFormData.append("address", formData.address);
    } 
    
    let constructedAvatarUrl = null;
    
    if (avatarTempPath) {
      profileFormData.append("avatar", avatarTempPath);
      
      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || window.location.origin;
      const avatarFileName = avatarTempPath.replace('temp/', '');
      constructedAvatarUrl = `${baseUrl}/storage/avatars/${avatarFileName}`;
      
      setLastUpdatedAvatar(constructedAvatarUrl);
    }
    
    const hasChanges = profileFormData.has('phone_number') || 
                       profileFormData.has('personal_number') || 
                       profileFormData.has('phone') || 
                       profileFormData.has('address') || 
                       avatarTempPath ||
                       profileFormData.has('name') ||
                       profileFormData.has('first_name') ||
                       profileFormData.has('last_name');
    
    if (!hasChanges) {
      showToast("No changes to update", "info");
      setUpdating(false);
      return;
    }
    
    const result = await dispatch(updateProfile({ formData: profileFormData, constructedAvatarUrl }));
    
    if (!updateProfile.fulfilled.match(result)) {
      setUpdating(false);
      if (avatarTempPath) {
        setAvatarPreview(null);
        setAvatarTempPath(null);
        setLastUpdatedAvatar(null);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      showToast("Please enter current password", "error");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast("New password must be at least 8 characters", "error");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    setUpdating(true);

    const result = await dispatch(changePassword({
      current_password: passwordData.currentPassword,
      password: passwordData.newPassword,
      password_confirmation: passwordData.confirmPassword,
    }));

    if (changePassword.fulfilled.match(result)) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showToast("Password changed successfully!", "success");
    }
    
    setUpdating(false);
  };

  const handleReset = () => {
    setFormData({
      fullName: getFullName(),
      personalEmail: getPersonalEmail(),
      personalNumber: getPhoneNumber(),
      address: getAddress(),
    });
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    handleRemoveAvatar();
  };

  const avatarUrl = getAvatarUrl();
  const userInitials = (formData.fullName || employee?.name || "U").charAt(0).toUpperCase();


  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-10 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="bg-[var(--surface)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden mb-6">
        {/* Green Banner */}
        <div className="h-32 md:h-48 bg-gradient-to-r from-[#22c55e] to-[#10b981] w-full"></div>

        {/* White Area */}
        <div className="relative px-6 md:px-12 pb-8 bg-[var(--surface)] flex flex-col md:flex-row justify-between md:items-end">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8">
            {/* Avatar */}
            <div className="relative -mt-16 md:-mt-24 group z-10">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-black flex items-center justify-center overflow-hidden shadow-lg relative">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("❌ Image failed to load:", avatarUrl);
                      setAvatarError(true);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-5xl font-bold">
                    {userInitials}
                  </div>
                )}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <FiLoader className="text-white text-3xl animate-spin" />
                  ) : (
                    <FiCamera className="text-white text-3xl" />
                  )}
                </div>
              </div>
              <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 w-5 h-5 md:w-6 md:h-6 bg-green-500 border-[3px] border-white rounded-full z-20"></div>
              <input
                ref={fileInputRef}
                type="file"
                id="profilePhoto"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name and Designation */}
            <div className="text-center md:text-left mb-2 md:mb-1">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text)] tracking-tight">
                {formData.fullName || employee?.name || "User Name"}
              </h2>
              <div className="text-green-600 font-bold text-sm flex items-center justify-center md:justify-start gap-2 mt-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                {authUser?.type || "employee"}
                <span className="text-gray-300 mx-1">•</span>
                <span className="text-green-600">
                  {employee?.employee_id || authUser?.id || "1"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats on Right */}
          <div className="flex justify-center md:justify-end gap-10 mt-6 md:mt-0 mb-2">
            <div className="text-center">
              <div className="text-[var(--text)] font-extrabold text-xl">
                Active
              </div>
              <div className="text-gray-400 text-xs font-semibold tracking-wide uppercase mt-0.5">
                Status
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-900 font-extrabold text-xl">
                {employee?.joining_date
                  ? new Date(employee.joining_date).getFullYear()
                  : new Date().getFullYear()}
              </div>
              <div className="text-gray-400 text-xs font-semibold tracking-wide uppercase mt-0.5">
                Joined
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left Sidebar Menu */}
        <div className="flex flex-col gap-6">
          <div className="bg-[var(--surface)] rounded-3xl shadow-sm border border-[var(--border)] p-6">
            <h3 className="text-xs font-bold text-[var(--muted)] mb-5 tracking-wider uppercase ml-2">
              SETTINGS MENU
            </h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === "personal"
                    ? "bg-[var(--surface2)] text-[var(--text)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
                }`}
              >
                <FiUser className="text-lg" />
                Personal Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === "security"
                    ? "bg-[var(--surface2)] text-[var(--text)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
                }`}
              >
                <FiLock className="text-lg" />
                Security & Password
              </button>
            </div>

            <div className="mt-8 bg-[var(--surface2)] rounded-2xl p-5 border border-[var(--border)]">
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--muted)]">
                  <FiCheckCircle className="text-sm" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text)] text-sm mb-1.5">
                    Profile Complete
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                    Your profile is up to date and verified by the HR
                    administration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="bg-[var(--surface)] rounded-3xl shadow-sm border border-[var(--border)] p-6 md:p-10">
          {activeTab === "personal" && (
            <form onSubmit={handleUpdateProfile}>
              <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2 mb-2">
                <FiEdit2 className="text-green-500" /> Personal Information
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-8 font-medium">
                Update your personal details, email, and home address.
              </p>

              {(avatarPreview || avatarTempPath) && (
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    <FiCamera className="inline mr-2" />
                    New avatar selected
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="form-field md:col-span-2 flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiUser className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="form-field flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Company Email{" "}
                    <span className="text-gray-400 font-medium">
                      (Read-only)
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="email"
                      value={authUser?.email || profile?.email || "your company email"}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)]/70 border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--muted)] cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="form-field flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Personal Email{" "}
                    <span className="text-gray-400 font-medium">
                      (Cannot be changed)
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="email"
                      value={formData.personalEmail}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)]/70 border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--muted)] cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    <FiInfo className="inline mr-1" />
                    Personal email cannot be changed. Contact HR for updates.
                  </p>
                </div>

                <div className="form-field flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiPhone className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="tel"
                      value={formData.personalNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personalNumber: e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="form-field flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Home Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                      <FiMapPin className="text-gray-400 text-lg" />
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows="3"
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all resize-none"
                      placeholder="Enter full address"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-8 rounded-full font-bold bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface2)] hover:border-[var(--border)] transition-all flex items-center justify-center gap-2"
                >
                  <FiRefreshCw /> Reset
                </button>
                <button
                  type="submit"
                  disabled={updating || loading}
                  className="py-3 px-10 rounded-full font-bold bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-md shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {(updating || loading) ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiSave />
                  )}
                  {(updating || loading) ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <form onSubmit={handleChangePassword}>
              <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2 mb-2">
                <FiLock className="text-green-500" /> Security & Password
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-8 font-medium">
                Update your account password to stay secure.
              </p>

              <div className="grid grid-cols-1 gap-6 mb-8 max-w-lg">
                <div className="form-field flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div className="form-field flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                </div>

                <div className="form-field flex flex-col gap-2">
                  <label className="text-xs font-extrabold text-[var(--text-secondary)] ml-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiCheckCircle className="text-gray-400 text-lg" />
                    </div>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3.5 bg-[var(--surface2)] border border-[var(--border)] rounded-2xl text-sm font-semibold text-[var(--text)] focus:bg-[var(--surface)] focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={updating || loading}
                  className="py-3 px-10 rounded-full font-bold bg-[#22c55e] text-white hover:bg-[#16a34a] shadow-md shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {(updating || loading) ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiLock />
                  )}
                  {(updating || loading) ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;