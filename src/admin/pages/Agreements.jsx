import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import SearchBar from '@admin/components/common/SearchBar';
import EntriesSelector from '@admin/components/common/EntriesSelector';
import { showToast } from '../../components/common/Toast';
import Pagination from '@admin/components/common/Paginations';
import ConfirmModal from '@admin/components/common/ConfirmModal';
import { fetchDocuments, deleteDocument, clearError, fetchDocumentFolders } from '@admin/store/slices/documentsSlice';

const Agreements = () => {
  const dispatch = useDispatch();
  const { documents: documentsState = [], folders = [], error = null } = useSelector(
    (state) => state.documents || { documents: [], folders: [], loading: false, error: null }
  );
  
  // Ensure documents is always an array
  const documents = Array.isArray(documentsState) ? documentsState : [];
  
  const [currentFolder, setCurrentFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchDocuments());
    dispatch(fetchDocumentFolders());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Build folder list from API or use defaults
  const folderList = [
    { name: 'All Files', value: 'all', icon: 'fas fa-folder-open' },
    ...(folders && folders.length > 0
      ? folders.map(folder => ({
        name: folder.name || folder,
        value: folder.id || folder.name || folder,
        icon: 'fas fa-folder'
      }))
      : [
        { name: 'Agreements', value: 'agreements', icon: 'fas fa-file-signature' },
        { name: 'HR', value: 'hr', icon: 'fas fa-users' },
        { name: 'IT', value: 'it', icon: 'fas fa-code' },
        { name: 'Finance', value: 'finance', icon: 'fas fa-chart-line' },
        { name: 'Legal', value: 'legal', icon: 'fas fa-gavel' },
      ]
    )
  ];

  const getFilteredDocuments = () => {
    // Ensure documents is an array
    const docsArray = Array.isArray(documents) ? documents : [];
    let filtered = docsArray;

    if (currentFolder !== 'all') {
      filtered = filtered.filter(doc => {
        const folderIdMatch = doc.folder_id && String(doc.folder_id) === String(currentFolder);
        const folderNameMatch = (doc.folder_name || doc.folder || doc.type || '').toLowerCase() === String(currentFolder).toLowerCase();
        return folderIdMatch || folderNameMatch;
      });
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        (doc.name || '').toLowerCase().includes(searchLower) ||
        (doc.description || '').toLowerCase().includes(searchLower) ||
        (doc.folder_name || doc.folder || '').toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();
  const totalFiltered = filteredDocuments.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const start = (currentPage - 1) * perPage;
  const pageDocuments = filteredDocuments.slice(start, start + perPage);

  const handleDeleteClick = (document) => {
    setSelectedDocument(document);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDocument) return;

    setDeleteLoading(true);
    const result = await dispatch(deleteDocument(selectedDocument.id));

    if (deleteDocument.fulfilled.match(result)) {
      showToast(`${selectedDocument.name} deleted successfully`, 'success');
      setConfirmOpen(false);
      setSelectedDocument(null);
      dispatch(fetchDocuments());
    } else {
      showToast('Failed to delete document', 'error');
    }

    setDeleteLoading(false);
  };

  const handleViewDocument = (filePath) => {
    if (filePath) {
      // Construct full URL for file access
      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || window.location.origin;
      const fileUrl = `${baseUrl}/storage/${filePath.replace(/^\/+/, '')}`;
      window.open(fileUrl, '_blank');
    } else {
      showToast('No document file available', 'info');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No Expiry';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getExpiryClass = (expiryDate) => {
    if (!expiryDate) return '';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-red-500 font-semibold';
    if (diffDays <= 30) return 'text-amber-500 font-semibold';
    return '';
  };

  const getFolderClass = (folder) => {
    const classes = {
      'agreements': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      'hr': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'it': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      'finance': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      'legal': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
    return classes[folder?.toLowerCase()] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  };

  const total = documents.length;

  // Calculate expiry stats
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  let expiringSoon = 0;
  let expired = 0;

  documents.forEach(doc => {
    if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date);
      if (expiryDate < today) {
        expired++;
      } else if (expiryDate <= thirtyDaysFromNow) {
        expiringSoon++;
      }
    }
  });

  return (
    <div className="w-full overflow-x-hidden">
      {/* Stats Cards */}
      <div className="stats-grid grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-5 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-file-alt text-green-600 dark:text-green-400 text-base md:text-xl"></i>
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-green-600 dark:text-green-400">{total}</div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Total Documents</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-5 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-clock text-amber-600 dark:text-amber-400 text-base md:text-xl"></i>
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400">{expiringSoon}</div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Expiring Soon (30 days)</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-5 border border-gray-200 dark:border-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-soft">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <i className="fas fa-calendar-times text-red-600 dark:text-red-400 text-base md:text-xl"></i>
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-red-600 dark:text-red-400">{expired}</div>
          <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Expired</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
          Agreements
        </h2>
      </div>

      {/* Folder Tabs */}
      <div className="overflow-x-auto pb-2 mb-4 md:mb-5 -mx-4 px-4">
        <div className="flex gap-2 min-w-max border-b border-gray-200 dark:border-gray-700 pb-3">
          {folderList.map((folder) => (
            <button
              key={folder.value}
              onClick={() => {
                setCurrentFolder(folder.value);
                setCurrentPage(1);
              }}
              className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${currentFolder === folder.value
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              <i className={`${folder.icon} mr-1 text-[10px] md:text-xs`}></i>
              <span className="hidden sm:inline">{folder.name}</span>
              <span className="sm:hidden">{folder.name === 'All Files' ? 'All' : folder.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <EntriesSelector value={perPage} onChange={setPerPage} />
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search documents..." />
          <Link
            to="/admin/agreements/add-agreement"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            <i className="fas fa-plus-circle"></i> Upload Agreement
          </Link>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
        <div className="min-w-[800px] md:min-w-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Sl.No.</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Folder</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Description</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Share With</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Expiry Date</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageDocuments.length > 0 ? (
                pageDocuments.map((document, idx) => (
                  <tr key={document.id || idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">{start + idx + 1}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                      <button
                        onClick={() => handleViewDocument(document.file_path)}
                        className="hover:text-green-500 transition-colors text-left"
                      >
                        {document.name || 'Untitled'}
                      </button>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${getFolderClass(document.folder || document.type)} whitespace-nowrap`}>
                        {document.folder_name || document.folder || document.type || '-'}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={document.description}>
                      {document.description || '-'}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className="inline-flex items-center gap-1 md:gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs whitespace-nowrap">
                        <i className="fas fa-share-alt text-gray-500 text-[8px] md:text-xs"></i>
                        <span>
                          {document.shared_users?.length > 0
                            ? document.shared_users.map(u => u.name).join(', ')
                            : document.share_with?.length > 0
                              ? document.share_with.join(', ')
                              : '-'}
                        </span>
                      </span>
                    </td>
                    <td className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${getExpiryClass(document.expiry_date)} whitespace-nowrap`}>
                      {formatDate(document.expiry_date)}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="flex gap-1 md:gap-2">
                        <button
                          onClick={() => handleViewDocument(document.file_path)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                          title="View"
                        >
                          <i className="fas fa-eye text-xs md:text-sm"></i>
                        </button>
                        <Link
                          to={`/admin/agreements/edit-agreement/${document.id}`}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500 transition-colors"
                          title="Edit"
                        >
                          <i className="fas fa-edit text-xs md:text-sm"></i>
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(document)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <i className="fas fa-trash text-xs md:text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No documents found. Click "Upload Agreement" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalFiltered > 0 && (
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
          setSelectedDocument(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${selectedDocument?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleteLoading}
      />
    </div>
  );
};

export default Agreements;