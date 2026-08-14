import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "../../components/common/Toast";
import {
  fetchDocumentFolders,
  fetchShareableUsers,
  fetchParties,
  fetchDocumentById,
  updateDocument,
  uploadToTemp,
} from "../store/slices/documentsSlice";
import { clearError } from "../store/slices/authSlice";
import AddFolderModal from "../components/documents/AddFolderModal";
import AddPartyModal from "../components/documents/AddPartyModal";
import DateInput from "../components/common/DateInput";

const EditAgreement = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const location = useLocation();
  
  // Determine if we're in admin or employee route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const documentsPath = isAdminRoute ? '/admin/agreements' : '/employee/agreements';
  const editPath = isAdminRoute ? `/admin/agreements/edit-agreement/${id}` : `/employee/agreements/edit-document/${id}`;
  
  const {
    shareableUsers = [],
    folders = [],
    parties = [],
    currentDocument,
    loading,
    error,
  } = useSelector(
    (state) =>
      state.documents || {
        shareableUsers: [],
        folders: [],
        parties: [],
        currentDocument: null,
      },
  );
  const [updating, setUpdating] = useState(false);
  const [uploadingToTemp, setUploadingToTemp] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tempFilePath, setTempFilePath] = useState(null);
  const [selectedShareWith, setSelectedShareWith] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [replaceFile, setReplaceFile] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [autoUpdateName, setAutoUpdateName] = useState(true);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Modal states
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [refreshParties, setRefreshParties] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    folder_id: "",
    party_id: "",
    expiryDate: "",
  });

  // Helper function to get filename without extension
  const getFileNameWithoutExtension = (filename) => {
    if (!filename) return "";
    return filename.replace(/\.[^/.]+$/, "");
  };

  // Upload file to temp storage
  const uploadFileToTemp = async (file) => {
    setUploadingToTemp(true);
    try {
      const result = await dispatch(uploadToTemp(file));
      if (uploadToTemp.fulfilled.match(result)) {
        const { path, filename } = result.payload;
        setTempFilePath(path);
        
        // Auto-populate name if autoUpdateName is true and name is empty OR user hasn't manually changed it
        if (autoUpdateName) {
          const nameWithoutExt = filename || getFileNameWithoutExtension(file.name);
          setFormData(prev => ({ ...prev, name: nameWithoutExt }));
          showToast(`Document name updated to: ${nameWithoutExt}`, "success");
        } else if (!formData.name) {
          // Only update if name is empty
          const nameWithoutExt = filename || getFileNameWithoutExtension(file.name);
          setFormData(prev => ({ ...prev, name: nameWithoutExt }));
        }
        
        showToast("File uploaded successfully", "success");
        return true;
      } else {
        showToast(result.payload || "Failed to upload file", "error");
        return false;
      }
    } catch (error) {
      showToast("Failed to upload file", error);
      return false;
    } finally {
      setUploadingToTemp(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchShareableUsers());
    dispatch(fetchDocumentFolders());
    dispatch(fetchParties());
    if (id) {
      dispatch(fetchDocumentById(id));
    }
  }, [dispatch, id]);

  // Set form data when currentDocument is loaded
  useEffect(() => {
    if (currentDocument) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: currentDocument.name || "",
        description: currentDocument.description || "",
        folder_id: currentDocument.folder_id || "",
        party_id: currentDocument.party_id || "",
        expiryDate: currentDocument.expiry_date || "",
      });

      // Set selected share with users/parties
      if (
        currentDocument.shared_users &&
        currentDocument.shared_users.length > 0
      ) {
        const shareNames = currentDocument.shared_users.map(
          (user) => user.name || user.email,
        );
        setSelectedShareWith(shareNames);
      } else if (
        currentDocument.share_with &&
        currentDocument.share_with.length > 0
      ) {
        setSelectedShareWith(currentDocument.share_with);
      }

      // Build file URL from file_path - FIXED to handle different data types
      if (currentDocument.file_path) {
        let filePath = currentDocument.file_path;

        // Handle array case
        if (Array.isArray(filePath)) {
          filePath = filePath[0] || "";
        }

        // Handle object case
        if (typeof filePath === "object" && filePath !== null) {
          filePath = filePath.path || filePath.file_path || "";
        }

        // Only proceed if we have a valid string
        if (typeof filePath === "string" && filePath.trim()) {
          let baseUrl = import.meta.env.VITE_API_URL || "";
          baseUrl = baseUrl.replace("/api", "").replace(/\/$/, "");

          if (!baseUrl) {
            baseUrl = window.location.origin;
          }

          // Clean up the path and encode properly
          const cleanPath = filePath.replace(/^\/+/, "");
          const encodedPath = cleanPath
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
          let fullUrl = `${baseUrl}/storage/${encodedPath}`;

          setFileUrl(fullUrl);
        } else {
          console.warn("Invalid file_path format:", currentDocument.file_path);
          setFileUrl(null);
        }
      }
    }
  }, [currentDocument]);

  // Refresh parties when refreshParties flag changes
  useEffect(() => {
    if (refreshParties) {
      dispatch(fetchParties()).then(() => {
        setRefreshParties(false);
      });
      dispatch(fetchShareableUsers());
    }
  }, [refreshParties, dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle date change for expiry date
  const handleDateChange = (dateValue) => {
    setFormData(prev => ({ ...prev, expiryDate: dateValue }));
  };

  const handleChange = (e) => {
    if (e.target.id === "party_id" && e.target.value === "__add_new__") {
      setFormData({ ...formData, party_id: "" });
      setShowPartyModal(true);
      return;
    }
    
    // If user manually changes the name, disable auto-update
    if (e.target.id === "name") {
      setAutoUpdateName(false);
    }
    
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileSize = file.size / 1024 / 1024;
      if (fileSize > 10) {
        showToast("File size must be less than 10MB", "error");
        return;
      }
      setSelectedFile(file);
      setReplaceFile(true);
      
      // Reset auto-update flag when selecting a new file
      setAutoUpdateName(true);
      
      // Upload to temp immediately
      await uploadFileToTemp(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setTempFilePath(null);
    setReplaceFile(false);
    setAutoUpdateName(true); // Reset auto-update flag
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleShareItem = (value) => {
    if (selectedShareWith.includes(value)) {
      setSelectedShareWith(selectedShareWith.filter((item) => item !== value));
    } else {
      setSelectedShareWith([...selectedShareWith, value]);
    }
  };

  const removeSelectedItem = (item) => {
    setSelectedShareWith(selectedShareWith.filter((i) => i !== item));
  };

  const handlePartyAdded = async (newParty) => {
    setRefreshParties(true);
    if (newParty && newParty.id) {
      setTimeout(() => {
        setFormData((prev) => ({ ...prev, party_id: String(newParty.id) }));
        showToast(`Party "${newParty.name}" added and selected`, "success");
      }, 500);
    }
  };

  const handleFolderAdded = async (newFolder) => {
    await dispatch(fetchDocumentFolders());
    if (newFolder && newFolder.id) {
      setFormData({ ...formData, folder_id: String(newFolder.id) });
      showToast(`Folder "${newFolder.name}" added and selected`, "success");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      showToast("Document name is required", "error");
      return;
    }
    if (selectedShareWith.length === 0) {
      showToast("Please select at least one recipient to share with", "error");
      return;
    }
    if (!formData.folder_id) {
      showToast("Please select a folder", "error");
      return;
    }
    
    // If replacing file, check if temp file is uploaded
    if (replaceFile && !tempFilePath) {
      showToast("Please wait for file upload to complete", "error");
      return;
    }

    setUpdating(true);

    const partiesList = Array.isArray(parties) ? parties : [];
    const usersList = Array.isArray(shareableUsers) ? shareableUsers : [];

    const shareWithIds = selectedShareWith.map((selectedName) => {
      const user = usersList.find((u) => (u.name || u.email) === selectedName);
      const party = partiesList.find((p) => p.name === selectedName);
      return user?.id || party?.id || selectedName;
    });

    const documentData = {
      name: formData.name,
      description: formData.description,
      share_with: shareWithIds,
      folder_id: formData.folder_id,
      type: "agreements",
      party_id: formData.party_id || null,
      expiry_date: formData.expiryDate || null,
    };

    // If replacing file, add the temp file path
    if (replaceFile && tempFilePath) {
      documentData.file_path = tempFilePath;
    }


    const result = await dispatch(
      updateDocument({
        id: id,
        formData: documentData,
        file: null,
      }),
    );

    setUpdating(false);

    if (updateDocument.fulfilled.match(result)) {
      showToast(
        `✓ Document "${formData.name}" updated successfully!`,
        "success",
      );
      setTimeout(() => {
        navigate(documentsPath);
      }, 1200);
    } else {
      const errorPayload = result.payload;
      console.error("Update failed with payload:", errorPayload);
      
      let errorMessage = "Failed to update agreement";
      
      if (errorPayload?.errors) {
        const errors = errorPayload.errors;
        const errorMessages = [];
        
        if (errors.name) errorMessages.push(`Name: ${errors.name.join(", ")}`);
        if (errors.type) errorMessages.push(`Type: ${errors.type.join(", ")}`);
        if (errors.folder_id) errorMessages.push(`Folder: ${errors.folder_id.join(", ")}`);
        if (errors.share_with) errorMessages.push(`Share with: ${errors.share_with.join(", ")}`);
        if (errors.file_path) errorMessages.push(`File: ${errors.file_path.join(", ")}`);
        if (errors.expiry_date) errorMessages.push(`Expiry date: ${errors.expiry_date.join(", ")}`);
        
        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join(" | ");
        } else {
          errorMessage = errorPayload.message || "Validation error occurred";
        }
      } else if (errorPayload?.message) {
        errorMessage = errorPayload.message;
      } else if (typeof errorPayload === "string") {
        errorMessage = errorPayload;
      }
      
      showToast(errorMessage, "error");
    }
  };

  const openFileInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      showToast("File URL not available", "error");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Get breadcrumb links based on route
  const getBreadcrumbs = () => {
    if (isAdminRoute) {
      return [
        { label: 'Agreements', path: '/admin/agreements' },
        { label: 'Edit Agreement', path: null }
      ];
    } else {
      return [
        { label: 'My Documents', path: '/employee/agreements' },
        { label: 'Edit Document', path: null }
      ];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  if (loading && !currentDocument) {
    return (
      <div className="w-full overflow-x-hidden px-4 md:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  // Get current file name from file_path
  const getCurrentFileName = () => {
    if (!currentDocument?.file_path) return "No file attached";

    let filePath = currentDocument.file_path;

    if (Array.isArray(filePath)) {
      filePath = filePath[0] || "";
    }

    if (typeof filePath === "object" && filePath !== null) {
      filePath = filePath.path || filePath.file_path || "";
    }

    if (typeof filePath !== "string") {
      console.warn("Unexpected file_path type:", typeof filePath, filePath);
      return "Invalid file path";
    }

    const pathParts = filePath.split("/");
    const fileName = decodeURIComponent(pathParts[pathParts.length - 1]);

    if (fileName.startsWith("php") && currentDocument.name) {
      return currentDocument.name;
    }

    return fileName || "No file attached";
  };

  // Get file icon based on file extension
  const getFileIcon = (filename) => {
    if (
      !filename ||
      filename === "No file attached" ||
      filename === "Invalid file path"
    ) {
      return "fas fa-file-alt";
    }
    const ext = filename.split(".").pop()?.toLowerCase();
    const iconMap = {
      pdf: "fas fa-file-pdf",
      doc: "fas fa-file-word",
      docx: "fas fa-file-word",
      xls: "fas fa-file-excel",
      xlsx: "fas fa-file-excel",
      jpg: "fas fa-file-image",
      jpeg: "fas fa-file-image",
      png: "fas fa-file-image",
      gif: "fas fa-file-image",
      txt: "fas fa-file-alt",
    };
    return iconMap[ext] || "fas fa-file-alt";
  };

  const currentFileName = getCurrentFileName();
  const fileIcon = getFileIcon(currentFileName);

  // Get page title based on route
  const pageTitle = isAdminRoute ? 'Edit Agreement' : 'Edit Document';
  const pageIcon = isAdminRoute ? 'fa-edit' : 'fa-edit';

  return (
    <div className="w-full overflow-x-hidden px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
        <Link
          to={breadcrumbs[0].path}
          className="text-green-500 hover:text-green-600 font-medium"
        >
          {breadcrumbs[0].label}
        </Link>
        <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
        <span className="text-gray-500 dark:text-gray-400">
          {breadcrumbs[1].label}
        </span>
      </div>

      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-green-600 dark:from-gray-200 dark:to-green-400 bg-clip-text text-transparent">
          <i className={`fas ${pageIcon} mr-2`}></i> {pageTitle}
        </h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update {isAdminRoute ? 'agreement' : 'document'} details
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 lg:p-8 shadow-soft">
        <form onSubmit={handleSubmit}>
          {/* Current File Section with Replace Button */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-4 md:mb-6">
              <i className="fas fa-file-alt text-green-500 text-base md:text-lg"></i>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                Current Document
              </h3>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <i
                    className={`${fileIcon} text-2xl md:text-3xl text-blue-500 flex-shrink-0`}
                  ></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-200 truncate">
                      {currentFileName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {isAdminRoute ? 'Agreement' : 'Document'} Name:{" "}
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formData.name || "Not set"}
                      </span>
                    </div>
                    {autoUpdateName && replaceFile && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        <i className="fas fa-sync-alt mr-1"></i>
                        Document name will auto-update when file is uploaded
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {fileUrl && (
                    <button
                      type="button"
                      onClick={openFileInNewTab}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <i className="fas fa-external-link-alt text-xs"></i>
                      <span>View</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={uploadingToTemp}
                    className="px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <i className="fas fa-sync-alt text-xs"></i>
                    <span>{uploadingToTemp ? "Uploading..." : "Replace"}</span>
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.png"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadingToTemp}
              />

              {/* Show selected file preview if replacing */}
              {selectedFile && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-file-pdf text-xl md:text-2xl text-green-500"></i>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        {tempFilePath && <span className="text-green-600 ml-2">✓ Uploaded</span>}
                        {uploadingToTemp && <span className="text-yellow-600 ml-2">Uploading...</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={uploadingToTemp}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-red-500 transition-colors self-start sm:self-center disabled:opacity-50"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}

              {!fileUrl && currentDocument && (
                <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                  <i className="fas fa-info-circle mr-1"></i>
                  File path: {currentDocument.file_path}
                </div>
              )}
            </div>
          </div>

          {/* Document Details Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-green-100 dark:border-green-900/30 mb-4 md:mb-6">
              <i className="fas fa-info-circle text-green-500 text-base md:text-lg"></i>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                {isAdminRoute ? 'Agreement' : 'Document'} Details
              </h3>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-tag text-green-500 mr-1"></i>{" "}
                  {isAdminRoute ? 'Agreement' : 'Document'} Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder={`Enter ${isAdminRoute ? 'agreement' : 'document'} name`}
                  required
                />
                {autoUpdateName && replaceFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    <i className="fas fa-info-circle mr-1"></i>
                    Name will be updated to match the new file. Edit manually to keep current name.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  <i className="fas fa-align-left text-green-500 mr-1"></i>{" "}
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-vertical"
                  placeholder="Enter description about this document"
                ></textarea>
              </div>

              {/* 2x2 Grid for Share With, Party, Folder, Expiry Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {/* Share With Dropdown */}
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                    <i className="fas fa-share-alt text-green-500 mr-1"></i>{" "}
                    Share with <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center justify-between p-2 md:p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-green-500 transition-colors"
                    >
                      <div className="flex flex-wrap gap-1 flex-1 max-h-20 overflow-y-auto">
                        {selectedShareWith.length === 0 ? (
                          <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                            Select users
                          </span>
                        ) : (
                          selectedShareWith.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs"
                            >
                              <span className="truncate max-w-[80px] md:max-w-none">
                                {item}
                              </span>
                              <i
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSelectedItem(item);
                                }}
                                className="fas fa-times cursor-pointer hover:text-red-500 text-[8px] md:text-xs"
                              ></i>
                            </span>
                          ))
                        )}
                      </div>
                      <i
                        className={`fas fa-chevron-down text-gray-400 text-xs md:text-sm transition-transform ml-2 flex-shrink-0 ${showDropdown ? "rotate-180" : ""}`}
                      ></i>
                    </div>

                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-soft-lg z-10 max-h-80 overflow-y-auto">
                        {shareableUsers.length > 0 && (
                          <div>
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                Users
                              </span>
                            </div>
                            {shareableUsers.map((user) => (
                              <div
                                key={user.id || user.name}
                                onClick={() =>
                                  toggleShareItem(user.name || user.email)
                                }
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedShareWith.includes(
                                    user.name || user.email,
                                  )}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 md:w-4 md:h-4 accent-green-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                                    {user.name || user.email}
                                  </span>
                                  {user.designation && (
                                    <span className="hidden sm:inline text-[10px] md:text-xs text-gray-500 ml-1">
                                      ({user.designation})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Party Field */}
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                    <i className="fas fa-building text-green-500 mr-1"></i>{" "}
                    Party
                  </label>
                  <div>
                    <select
                      id="party_id"
                      value={formData.party_id}
                      onChange={handleChange}
                      className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 appearance-none pr-10"
                    >
                      <option value="">Select Party (Optional)</option>
                      {Array.isArray(parties) && parties.length > 0 ? (
                        parties.map((party) => (
                          <option key={party.id} value={party.id}>
                            {party.name}{" "}
                            {party.company_name
                              ? `(${party.company_name})`
                              : ""}
                          </option>
                        ))
                      ) : (
                        <option disabled>No parties available</option>
                      )}
                      <option value="__add_new__">+ Add New Party</option>
                    </select>
                  </div>
                  {formData.party_id &&
                    formData.party_id !== "__add_new__" &&
                    (() => {
                      const selectedParty = Array.isArray(parties)
                        ? parties.find(
                            (p) => String(p.id) === String(formData.party_id),
                          )
                        : null;
                      return selectedParty ? (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <i className="fas fa-building text-green-500 text-sm flex-shrink-0"></i>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {selectedParty.name}
                                </div>
                                {selectedParty.company_name && (
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                    {selectedParty.company_name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, party_id: "" })
                              }
                              className="text-red-400 hover:text-red-600 transition-colors p-1 flex-shrink-0"
                            >
                              <i className="fas fa-times text-xs"></i>
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                </div>

                {/* Folder Field */}
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                    <i className="fas fa-folder text-green-500 mr-1"></i> Folder{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="folder_id"
                      value={formData.folder_id}
                      onChange={handleChange}
                      className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base text-gray-800 dark:text-gray-200 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 appearance-none pr-10"
                      required
                    >
                      <option value="">Select Folder</option>
                      {folders.length > 0 ? (
                        folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))
                      ) : (
                        <option disabled>No folders available</option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowFolderModal(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 hover:text-green-600"
                      title="Create New Folder"
                    >
                      <i className="fas fa-plus-circle text-lg"></i>
                    </button>
                  </div>
                </div>

                {/* Expiry Date Field */}
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                    <i className="fas fa-calendar-times text-green-500 mr-1"></i>{" "}
                    Expiry Date
                  </label>
                  <DateInput
                    value={formData.expiryDate}
                    onChange={handleDateChange}
                    placeholder="dd/mm/yyyy"
                    type="general"
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    <i className="fas fa-info-circle mr-1"></i>
                    Expiry date must be a future date
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={documentsPath}
              className="px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <i className="fas fa-times text-xs md:text-sm"></i>
              <span>Cancel</span>
            </Link>
            <button
              type="submit"
              disabled={updating || loading || (replaceFile && !tempFilePath && uploadingToTemp)}
              className="px-4 md:px-6 py-2 md:py-2.5 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600 transition-all flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-70"
            >
              {updating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>{" "}
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save text-xs md:text-sm"></i>{" "}
                  <span>{isAdminRoute ? 'Update Agreement' : 'Update Document'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <AddPartyModal
        isOpen={showPartyModal}
        onClose={() => {
          setShowPartyModal(false);
        }}
        onPartyAdded={handlePartyAdded}
      />

      <AddFolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onFolderAdded={handleFolderAdded}
      />
    </div>
  );
};

export default EditAgreement;