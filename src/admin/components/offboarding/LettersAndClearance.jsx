import React, { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, Check, Download, Loader, Plus, X, Upload, File, Printer, Sparkles } from "lucide-react";
import { showToast } from "../common/Toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import OffboardingHeader from "./OffboardingHeader";
import OffboardingProgressBox from "./OffboardingProgressBox";
import { fetchOffboardingById, generateLetters, fetchOffboardingProgress, updateOffboarding } from "../../store/slices/offboardingSlice";
import { fetchEmployeeById } from "../../store/slices/employeeSlice";
import apiClient, { getStorageUrl } from "../../../utils/apiClient";

const LettersAndClearance = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const offboardingId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [uploading, setUploading] = useState({});
  const [generatingLetter, setGeneratingLetter] = useState(null);
  
  // Redux state
  const { currentOffboarding, loading: offboardingLoading, currentProgress } = useSelector((state) => state.offboarding);
  const { currentEmployee } = useSelector((state) => state.employees);
  
  // Letters to generate section
  const [lettersToGenerate, setLettersToGenerate] = useState([
    {
      id: "resignation_acceptance",
      title: "Resignation Acceptance",
      description: "Official acceptance of the employee's resignation",
      type: "resignation_acceptance",
      required: true,
      generated: false,
      file_path: null
    },
    {
      id: "relieving_letter",
      title: "Relieving Letter",
      description: "Official confirmation of employment end date and role",
      type: "relieving_letter",
      required: true,
      generated: false,
      file_path: null
    },
    {
      id: "experience_letter",
      title: "Experience Certificate",
      description: "Detailed record of employment period, role, and responsibilities",
      type: "experience_letter",
      required: true,
      generated: false,
      file_path: null
    },
    {
      id: "noc",
      title: "No-Dues Certificate",
      description: "Clearance certificate confirming no pending dues",
      type: "noc",
      required: true,
      generated: false,
      file_path: null
    },
    {
      id: "final_settlement",
      title: "Final Settlement",
      description: "Final salary breakdown including all settlements",
      type: "final_settlement",
      required: true,
      generated: false,
      file_path: null
    }
  ]);

  // Upload documents section (proof of signatures, receipts, etc.)
  const [uploadDocuments, setUploadDocuments] = useState([
    {
      id: "signed_resignation_acceptance",
      title: "Signed Resignation Acceptance",
      document_type: "signed_resignation_acceptance",
      status: "Pending",
      file: null,
      file_name: "",
      uploaded_at: null,
      required: true
    },
    {
      id: "signed_relieving",
      title: "Signed Relieving Letter",
      document_type: "signed_relieving",
      status: "Pending",
      file: null,
      file_name: "",
      uploaded_at: null,
      required: true
    },
    {
      id: "signed_experience",
      title: "Signed Experience Certificate",
      document_type: "signed_experience",
      status: "Pending",
      file: null,
      file_name: "",
      uploaded_at: null,
      required: true
    },
    {
      id: "signed_noc",
      title: "Signed No-Dues Certificate",
      document_type: "signed_noc",
      status: "Pending",
      file: null,
      file_name: "",
      uploaded_at: null,
      required: true
    },
    {
      id: "signed_settlement",
      title: "Signed Final Settlement",
      document_type: "signed_settlement",
      status: "Pending",
      file: null,
      file_name: "",
      uploaded_at: null,
      required: true
    }
  ]);

  // Fetch offboarding details on component mount
  useEffect(() => {
    if (offboardingId) {
      dispatch(fetchOffboardingById(offboardingId));
      dispatch(fetchOffboardingProgress(offboardingId));
    } else {
      const storedOffboardingId = localStorage.getItem("offboarding_id");
      if (storedOffboardingId) {
        dispatch(fetchOffboardingById(storedOffboardingId));
        dispatch(fetchOffboardingProgress(storedOffboardingId));
      } else {
        setLoading(false);
        showToast("No offboarding session found. Please start from initiation.", "warning");
      }
    }
  }, [dispatch, offboardingId]);

  // Load data from API
  useEffect(() => {
    if (currentOffboarding && !offboardingLoading) {
      // Load employee name
      if (currentOffboarding.employee_name) {
        setEmployeeName(currentOffboarding.employee_name);
      } else if (currentOffboarding.employee_id) {
        dispatch(fetchEmployeeById(currentOffboarding.employee_id));
      }
      
      // Load generated letters from API if available
      const apiLetters = currentOffboarding.letters || currentOffboarding.generated_letters || currentOffboarding.offboarding_letters || [];
      if (apiLetters && Array.isArray(apiLetters) && apiLetters.length > 0) {
        setLettersToGenerate(prev => prev.map(l => {
          const apiLetter = apiLetters.find(al => al.letter_type === l.type || al.type === l.type);
          if (apiLetter && (apiLetter.status === 'generated' || apiLetter.status === 'success' || apiLetter.document_path || apiLetter.document_url || apiLetter.file_path)) {
            return {
              ...l,
              generated: true,
              file_path: apiLetter.document_url || apiLetter.document_path || apiLetter.file_path || apiLetter.url
            };
          }
          return l;
        }));
      }
      
      // Load uploaded documents from API if available
      const apiDocs = currentOffboarding.uploaded_documents || currentOffboarding.documents || currentOffboarding.proof_documents || apiLetters || [];
      if (apiDocs && Array.isArray(apiDocs) && apiDocs.length > 0) {
        setUploadDocuments(prev => prev.map(d => {
          const apiDoc = apiDocs.find(ad => ad.document_type === d.document_type || ad.letter_type === d.document_type);
          if (apiDoc && (apiDoc.status === 'Uploaded' || apiDoc.status === 'uploaded' || apiDoc.file_path || apiDoc.document_path || apiDoc.document_url)) {
            return {
              ...d,
              status: "Uploaded",
              file_name: apiDoc.file_name || apiDoc.title || "Uploaded Document",
              file_path: apiDoc.document_url || apiDoc.document_path || apiDoc.file_path || apiDoc.url,
              uploaded_at: apiDoc.uploaded_at || apiDoc.updated_at || apiDoc.created_at
            };
          }
          return d;
        }));
      }
      
      setLoading(false);
    }
  }, [currentOffboarding, offboardingLoading, dispatch]);

  // Update employee name when fetched
  useEffect(() => {
    if (currentEmployee) {
      setEmployeeName(`${currentEmployee.first_name} ${currentEmployee.last_name}`);
    }
  }, [currentEmployee]);

  const pendingUploads = uploadDocuments.filter((doc) => doc.status === "Pending").length;
  const allLettersGenerated = lettersToGenerate.every(letter => letter.generated);
  
  // Calculate progress from API
  const apiProgressPercentage = currentProgress?.progress_percentage || 0;
  const completedStepsFromApi = currentProgress?.completed_steps || 0;
  const totalStepsFromApi = currentProgress?.total_steps || 7;

  // Extract file path robustly from response
  const extractPathFromResponse = (resData, type) => {
    if (!resData) return null;
    
    // Direct string match if files object exists at root
    if (resData.files && resData.files[type]) return resData.files[type];
    
    if (resData.data) {
      // Data object has type as key
      if (typeof resData.data[type] === 'string') return resData.data[type];
      
      // Data object has files object
      if (resData.data.files && typeof resData.data.files[type] === 'string') return resData.data.files[type];
      
      // Data is an array of letters
      if (Array.isArray(resData.data)) {
        const letterObj = resData.data.find(l => l.type === type || l.letter_type === type);
        if (letterObj && letterObj.file_path) return letterObj.file_path;
        if (letterObj && letterObj.document_url) return letterObj.document_url;
        if (letterObj && letterObj.document_path) return letterObj.document_path;
        if (letterObj && letterObj.url) return letterObj.url;
      }
      
      // Data is a single letter object
      if (typeof resData.data === 'object' && !Array.isArray(resData.data)) {
        if (resData.data.file_path) return resData.data.file_path;
        if (resData.data.document_url) return resData.data.document_url;
        if (resData.data.document_path) return resData.data.document_path;
        if (resData.data.url) return resData.data.url;
      }
    }
    
    return null;
  };

  // Generate individual letter
  const handleGenerateLetter = async (letter) => {
    setGeneratingLetter(letter.id);
    
    try {
      const actualOffboardingId = offboardingId || localStorage.getItem("offboarding_id");

      const payload = {
        letter_type: letter.type,
        employee_id: currentOffboarding?.employee_id,
        employee_name: employeeName,
        offboarding_id: actualOffboardingId,
        status: "generated"
      };
      
      const response = await apiClient.post(`/admin/offboarding/${actualOffboardingId}/letters`, payload, { params: payload });
      
      if (response.data.status === "success" || response.status === 200) {
        // Update local state
        setLettersToGenerate(lettersToGenerate.map(l => 
          l.id === letter.id 
            ? { ...l, generated: true, file_path: extractPathFromResponse(response.data, letter.type) || response.data.document_url || response.data.document_path || response.data.file_path || response.data.url || response.data.data?.file_path || response.data.data?.url }
            : l
        ));
        showToast(`${letter.title} generated successfully`, "success");
      } else {
        showToast(response.data.message || "Failed to generate letter", "error");
      }
    } catch (error) {
      console.error("Generate letter error:", error);
      showToast(error.response?.data?.message || "Failed to generate letter", "error");
    } finally {
      setGeneratingLetter(null);
    }
  };

  // Generate all letters at once
  const handleGenerateAllLetters = async () => {
    setIsGenerating(true);
    
    try {
      const actualOffboardingId = offboardingId || localStorage.getItem("offboarding_id");

      const updatedLetters = [...lettersToGenerate];
      let successCount = 0;
      
      for (let i = 0; i < updatedLetters.length; i++) {
        const letter = updatedLetters[i];
        if (letter.generated || letter.isCustom) continue;

        const payload = {
          letter_type: letter.type,
          employee_id: currentOffboarding?.employee_id,
          employee_name: employeeName,
          offboarding_id: actualOffboardingId,
          status: "generated"
        };
        
        try {
          const response = await apiClient.post(`/admin/offboarding/${actualOffboardingId}/letters`, payload, { params: payload });
          if (response.data.status === "success") {
            updatedLetters[i] = {
              ...letter,
              generated: true,
              file_path: extractPathFromResponse(response.data, letter.type) || response.data.document_url || response.data.document_path || response.data.file_path || response.data.url
            };
            successCount++;
          }
        } catch (e) {
          console.error(`Failed to generate ${letter.title}:`, e);
        }
      }
      
      setLettersToGenerate(updatedLetters);
      if (successCount > 0) {
        showToast(`Successfully generated ${successCount} letters`, "success");
      } else {
        showToast("No new letters were generated", "info");
      }
    } catch (error) {
      console.error("Generate all letters error:", error);
      showToast(error.response?.data?.message || "Failed to generate letters", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download generated letter
  const handleDownloadLetter = async (letter) => {
    if (!letter.file_path) {
      showToast("No file available for download", "info");
      return;
    }

    try {
      const fileUrl = getStorageUrl(letter.file_path);
      
      // Fetch the file as a blob to force download
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Extract filename from the URL or use a fallback
      const fileNameMatch = fileUrl.match(/\/([^\/?#]+)[^\/]*$/);
      const fileName = fileNameMatch ? fileNameMatch[1] : `${letter.title.replace(/\s+/g, '_')}.pdf`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed, falling back to new tab:", error);
      // Fallback to opening in a new tab if fetch fails (e.g. CORS issues)
      window.open(getStorageUrl(letter.file_path), '_blank');
    }
  };

  // Add custom letter to generate
  const handleAddCustomLetter = () => {
    const newId = `custom_letter_${Date.now()}`;
    setLettersToGenerate([
      ...lettersToGenerate,
      {
        id: newId,
        title: "New Letter",
        description: "Custom letter description",
        type: "custom",
        required: false,
        generated: false,
        file_path: null,
        isCustom: true
      }
    ]);
  };

  // Update custom letter title
  const handleCustomLetterTitleChange = (letterId, newTitle) => {
    setLettersToGenerate(lettersToGenerate.map(letter =>
      letter.id === letterId ? { ...letter, title: newTitle } : letter
    ));
  };

  // Remove custom letter
  const handleRemoveCustomLetter = (letterId) => {
    setLettersToGenerate(lettersToGenerate.filter(letter => letter.id !== letterId));
  };

  // Add custom upload document
  const handleAddCustomUpload = () => {
    const newId = `custom_upload_${Date.now()}`;
    setUploadDocuments([
      ...uploadDocuments,
      {
        id: newId,
        title: "New Document",
        document_type: "custom",
        status: "Pending",
        file: null,
        file_name: "",
        uploaded_at: null,
        required: false,
        isCustom: true
      }
    ]);
  };

  // Update custom upload title
  const handleCustomUploadTitleChange = (docId, newTitle) => {
    setUploadDocuments(uploadDocuments.map(doc =>
      doc.id === docId ? { ...doc, title: newTitle } : doc
    ));
  };

  // Remove custom upload
  const handleRemoveCustomUpload = (docId) => {
    setUploadDocuments(uploadDocuments.filter(doc => doc.id !== docId));
  };

  // Handle file upload for proof documents
  const handleFileUpload = async (docId, file) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size should be less than 5MB", "error");
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showToast("Only PDF, JPEG, PNG files are allowed", "error");
      return;
    }

    setUploading(prev => ({ ...prev, [docId]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('letter_type', uploadDocuments.find(d => d.id === docId)?.document_type || 'custom');
      formData.append('title', uploadDocuments.find(d => d.id === docId)?.title || 'Document');

      const actualOffboardingId = offboardingId || localStorage.getItem("offboarding_id");
      const response = await apiClient.post(`/admin/offboarding/${actualOffboardingId}/letters/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status === "success") {
        setUploadDocuments(uploadDocuments.map(doc => 
          doc.id === docId ? { 
            ...doc, 
            file_name: file.name,
            file_path: response.data.file_path,
            status: "Uploaded",
            uploaded_at: new Date().toISOString()
          } : doc
        ));
        showToast(`Document uploaded successfully`, "success");
      } else {
        showToast(response.data.message || "Upload failed", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Failed to upload document", "error");
    } finally {
      setUploading(prev => ({ ...prev, [docId]: false }));
    }
  };

  // Download uploaded document
  const handleDownloadUploadedDoc = (doc) => {
    if (doc.file_path) {
      window.open(doc.file_path, '_blank');
    } else {
      showToast("No file available for download", "info");
    }
  };

  // Submit all documents and complete offboarding
  const handleSubmitAll = async () => {
    // Validate all required letters are generated
    const missingRequiredLetters = lettersToGenerate.filter(l => l.required && !l.generated);
    if (missingRequiredLetters.length > 0) {
      showToast(`Please generate all required letters first: ${missingRequiredLetters.map(l => l.title).join(", ")}`, "error");
      return;
    }

    // Validate all required documents are uploaded
    const missingRequiredDocs = uploadDocuments.filter(doc => doc.required && doc.status !== "Uploaded");
    if (missingRequiredDocs.length > 0) {
      showToast(`Please upload all required documents: ${missingRequiredDocs.map(d => d.title).join(", ")}`, "error");
      return;
    }

    setIsGenerating(true);
    
    try {
      // The letters are already generated (via POST /admin/offboarding/{id}/letters)
      // The documents are already uploaded (via POST /admin/offboarding/{id}/letters/upload)
      // The backend already has this state, so we simply refresh the progress and navigate.
      
      await dispatch(fetchOffboardingProgress(offboardingId || localStorage.getItem("offboarding_id")));
      
      showToast("Letters completed. Proceeding to Checklist.", "success");
      
      setTimeout(() => {
        navigate("/admin/employees/offboarding-checklist?id=" + (offboardingId || localStorage.getItem("offboarding_id")));
      }, 2000);
    } catch (error) {
      console.error("Submit error:", error);
      showToast(error || "Failed to complete offboarding. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Loading state
  if (loading || offboardingLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <OffboardingHeader currentStep={6} />
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading documents...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* SaaS Offboarding Header */}
        <OffboardingHeader currentStep={6} />
        
        {/* Progress Box */}
        <OffboardingProgressBox currentStep={6} />

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-soft p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Letters & Clearance
              </h1>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                {employeeName || "Employee"}
              </p>
              {currentOffboarding && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Offboarding ID: {currentOffboarding.id}
                </p>
              )}
            </div>
            {pendingUploads > 0 && (
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60 rounded text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {pendingUploads} pending
              </span>
            )}
          </div>


          {/* SECTION 1: Generate Letters */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FileText className="text-green-500" size={20} />
                  Generate Letters
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Generate official offboarding letters and certificates
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAllLetters}
                  disabled={isGenerating || allLettersGenerated}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    allLettersGenerated
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : allLettersGenerated ? (
                    <>
                      <CheckCircle size={14} />
                      All Generated
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate All
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {lettersToGenerate.map((letter) => (
                <div
                  key={letter.id}
                  className={`border rounded-xl p-4 transition-all ${
                    letter.generated 
                      ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {letter.isCustom ? (
                        <input
                          type="text"
                          value={letter.title}
                          onChange={(e) => handleCustomLetterTitleChange(letter.id, e.target.value)}
                          className="text-base font-semibold text-gray-800 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-green-500 outline-none px-0 py-0"
                          placeholder="Enter letter name"
                        />
                      ) : (
                        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                          {letter.title}
                        </h3>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {letter.description}
                      </p>
                      {letter.required && (
                        <span className="inline-block mt-1 text-[10px] text-red-500">Required</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {letter.generated && (
                        <button
                          onClick={() => handleDownloadLetter(letter)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateLetter(letter)}
                        disabled={generatingLetter === letter.id || letter.generated}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                          letter.generated
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {generatingLetter === letter.id ? (
                          <>
                            <Loader size={14} className="animate-spin" />
                            Generating...
                          </>
                        ) : letter.generated ? (
                          <>
                            <CheckCircle size={14} />
                            Generated
                          </>
                        ) : (
                          <>
                            <File size={14} />
                            Generate
                          </>
                        )}
                      </button>
                      {letter.isCustom && !letter.required && (
                        <button
                          onClick={() => handleRemoveCustomLetter(letter.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Upload Proof Documents */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Upload className="text-green-500" size={20} />
                  Upload Proof Documents
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload signed copies and acknowledgment receipts
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {uploadDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    {/* Document Title */}
                    <div className="flex-1">
                      {doc.isCustom ? (
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => handleCustomUploadTitleChange(doc.id, e.target.value)}
                          placeholder="Enter document name"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                      ) : (
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {doc.title}
                            {doc.required && <span className="ml-1 text-xs text-red-500">*</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Upload signed copy as PDF or image
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex items-center gap-2">
                      <label className={`cursor-pointer ${uploading[doc.id] ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">
                          {uploading[doc.id] ? (
                            <Loader size={16} className="animate-spin text-green-500" />
                          ) : (
                            <Upload size={16} className="text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {doc.file_name ? "Change" : "Upload"}
                          </span>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(doc.id, e.target.files[0]);
                            }
                          }}
                          disabled={uploading[doc.id]}
                        />
                      </label>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                          doc.status === "Uploaded"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {doc.status === "Uploaded" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : uploading[doc.id] ? (
                          <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </span>

                      {/* Download Button */}
                      {doc.status === "Uploaded" && doc.file_path && (
                        <button
                          onClick={() => handleDownloadUploadedDoc(doc)}
                          className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Download document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button for custom docs */}
                      {doc.isCustom && (
                        <button
                          onClick={() => handleRemoveCustomUpload(doc.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File info */}
                  {doc.file_name && (
                    <div className="mt-2 pl-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {doc.file_name}
                      </p>
                      {doc.uploaded_at && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          Uploaded: {formatDate(doc.uploaded_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Completion Progress */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Letters Generated</span>
                  <span className="text-green-600 dark:text-green-400">
                    {lettersToGenerate.filter(l => l.generated).length}/{lettersToGenerate.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ width: `${(lettersToGenerate.filter(l => l.generated).length / lettersToGenerate.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Documents Uploaded</span>
                  <span className="text-green-600 dark:text-green-400">
                    {uploadDocuments.filter(d => d.status === "Uploaded").length}/{uploadDocuments.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500" 
                    style={{ width: `${(uploadDocuments.filter(d => d.status === "Uploaded").length / uploadDocuments.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {!allLettersGenerated 
                ? `Generate all required letters to continue` 
                : pendingUploads === 0 
                  ? "All documents ready. Ready to complete offboarding!" 
                  : `${pendingUploads} document(s) pending upload`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => navigate("/admin/employees/offboarding")}
              className="px-6 py-2.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={isGenerating || !allLettersGenerated || pendingUploads > 0}
              className={`px-6 py-2.5 rounded-full font-semibold transition-all flex items-center justify-center gap-2 ${
                !allLettersGenerated || pendingUploads > 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500"
                  : "bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md"
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : !allLettersGenerated ? (
                <>
                  <FileText className="w-4 h-4" />
                  Generate All Letters First
                </>
              ) : pendingUploads > 0 ? (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Pending Documents
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Proceed to Checklist Verification
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LettersAndClearance;