import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { showToast } from "../../../components/common/Toast";
import apiClient from "../../../utils/apiClient";
import { clearUpdateSuccess, fetchUserProfile, updateProfile } from "../../store/slices/settingsSlice";

const ProfileTab = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { profile, loading, updateSuccess, error } = useSelector((state) => state.settings);
  const fileInputRef = useRef(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [, setAvatarFile] = useState(null);
  const [avatarTempPath, setAvatarTempPath] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [lastUpdatedAvatar, setLastUpdatedAvatar] = useState(null); // Store last updated avatar

  const [profileData, setProfileData] = useState({
    email: "",
    username: "",
  });

  const getAvatarUrl = () => {
    if (avatarPreview) {
      return avatarPreview;
    }
    if (avatarError) {
      return null;
    }
    
    // First check if we have a recently updated avatar
    if (lastUpdatedAvatar) {
      return lastUpdatedAvatar;
    }
    
    const avatar = user?.avatar || profile?.avatar;
    
    if (!avatar) {
      return null;
    }
    
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
      return `${baseUrl}/storage/${avatar}`;
    }
    
    return null;
  };

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const result = await dispatch(fetchUserProfile());
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };
  
  fetchUser();
}, [dispatch]);

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user?.email || "",
        username: user?.username || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (updateSuccess) {
      showToast("Profile updated successfully!", "success");
      dispatch(clearUpdateSuccess());
      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarTempPath(null);
      setAvatarError(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [updateSuccess, dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearUpdateSuccess());
    }
  }, [error, dispatch]);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

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

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/admin/employees/upload-temp", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      
      if (result.status && result.path) {
        setAvatarTempPath(result.path);
        setAvatarFile(file);
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
    setAvatarFile(null);
    setAvatarTempPath(null);
    setAvatarError(false);
    setLastUpdatedAvatar(null); // Clear the stored avatar
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!profileData.email.trim()) {
      showToast("Email is required", "error");
      return;
    }

    if (!profileData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setProfileLoading(true);

    const formData = new FormData();
    formData.append("email", profileData.email.trim());

    if (profileData.username && profileData.username.trim()) {
      formData.append("username", profileData.username.trim());
    }

    let constructedAvatarUrl = null;
    
    if (avatarTempPath) {
      formData.append("avatar", avatarTempPath);
      
      // Construct the permanent avatar URL based on your backend pattern
      const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || window.location.origin;
      const avatarFileName = avatarTempPath.replace('temp/', '');
      constructedAvatarUrl = `${baseUrl}/storage/avatars/${avatarFileName}`;
      
      // Store the constructed URL to display immediately
      setLastUpdatedAvatar(constructedAvatarUrl);
    }

    const result = await dispatch(updateProfile({ formData, constructedAvatarUrl }));
    
    setProfileLoading(false);
  };

  const avatarUrl = getAvatarUrl();
  const userInitials = (profileData.username || profileData.email || "U").charAt(0).toUpperCase();


  return (
    <div>
      <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-6">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
          <i className="fas fa-user text-green-600 dark:text-green-400 text-base md:text-xl"></i>
        </div>
        <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
          Profile Information
        </h3>
      </div>

      {/* Avatar Section - Centered */}
      <div className="mb-8 flex flex-col items-center">
        <div className="relative mb-4">
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-green-500 shadow-md"
              onError={(e) => {
                console.error("❌ Image failed to load:", avatarUrl);
                setAvatarError(true);
              }}
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-5xl font-bold shadow-md">
              {userInitials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full shadow-md hover:bg-green-600 transition-colors disabled:opacity-50"
            title="Change avatar"
          >
            {uploadingAvatar ? (
              <i className="fas fa-spinner fa-spin text-sm"></i>
            ) : (
              <i className="fas fa-camera text-sm"></i>
            )}
          </button>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <i className="fas fa-info-circle text-green-500 mr-1"></i>
            Supported formats: JPEG, PNG, GIF, WEBP (Max 2MB)
          </div>
          {(avatarPreview || avatarTempPath) && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="text-sm text-red-500 hover:text-red-600 transition-colors mt-2"
            >
              <i className="fas fa-trash mr-1"></i>
              Remove selected image
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl mx-auto">
        {/* Email Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <i className="fas fa-envelope text-green-500 mr-2"></i>
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={profileData.email}
            onChange={handleProfileChange}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-base text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="Enter your email address"
          />
        </div>

        {/* Username Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <i className="fas fa-at text-green-500 mr-2"></i>
            Username <span className="text-gray-400 text-xs">(Optional)</span>
          </label>
          <input
            type="text"
            name="username"
            value={profileData.username}
            onChange={handleProfileChange}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-base text-gray-800 dark:text-gray-200 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="Enter a unique username"
          />
          <p className="text-xs text-gray-400 mt-2">
            <i className="fas fa-info-circle mr-1"></i>
            Username is optional. If left blank, email will be used as username.
          </p>
        </div>

        {/* Update Button - Centered */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={profileLoading || loading}
            className="px-6 py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-70 min-w-[160px]"
          >
            {profileLoading ? (
              <><i className="fas fa-spinner fa-spin"></i> <span>Saving...</span></>
            ) : (
              <><i className="fas fa-save text-sm"></i> <span>Update Profile</span></>
            )}
          </button>
        </div>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleAvatarChange}
        className="hidden"
      />
    </div>
  );
};

export default ProfileTab;