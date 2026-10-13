import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import SearchBar from "../components/common/SearchBar";
import EntriesSelector from "../components/common/EntriesSelector";
import Loader from "../components/common/Loader";
import LeaveTypeModal from "../components/leaves/LeaveTypeModal";
import { showToast } from "../../components/common/Toast";
import {
  fetchLeaveTypes,
  deleteLeaveType,
  toggleLeaveTypeStatus,
} from "../store/slices/LeaveSlice";
import Pagination from "../components/common/Paginations";
import ConfirmModal from "../components/common/ConfirmModal";

const LeaveTypeManagement = () => {
  const dispatch = useDispatch();
  const location = useLocation()
  const { leaveTypes, loading } = useSelector((state) => state.leaves);
  const { user } = useSelector((state) => state.auth || {});
  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/employee')) return '/employee';
    return '';
  };
  const basePath = getBasePath();

  const leavePath =
  basePath === '/employee' ? '/leave-management' : '/leaves';
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDelete, setSelectedDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  useEffect(() => {
    dispatch(fetchLeaveTypes());
  }, [dispatch]);

  const getFilteredTypes = () => {
    let filtered = leaveTypes;
    if (searchTerm) {
      filtered = filtered.filter((type) =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    return filtered;
  };

  const filteredTypes = getFilteredTypes();
  const totalFiltered = filteredTypes.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const start = (currentPage - 1) * perPage;
  const pageTypes = filteredTypes.slice(start, start + perPage);

  const handleAdd = () => {
    setEditingType(null);
    setShowModal(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setShowModal(true);
  };

  const handleToggleStatus = async (type) => {
    const newStatus = type.status ? 0 : 1;

    const result = await dispatch(
      toggleLeaveTypeStatus({ id: type.id, status: newStatus }),
    );

    if (toggleLeaveTypeStatus.fulfilled.match(result)) {
      showToast("Status updated", "success");
    } else {
      showToast("Failed to update status", "error");
    }
  };

  const handleDeleteClick = (id, name) => {
    setSelectedDelete({ id, name });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDelete) return;

    setDeleteLoading(true);

    const result = await dispatch(deleteLeaveType(selectedDelete.id));

    if (deleteLeaveType.fulfilled.match(result)) {
      showToast(`${selectedDelete.name} removed`, "success");
    } else {
      showToast("Failed to delete leave type", "error");
    }

    setDeleteLoading(false);
    setConfirmOpen(false);
    setSelectedDelete(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingType(null);
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full">
        <main className="content px-4 py-4 md:px-6 md:py-6 w-full overflow-x-hidden">
          {/* Breadcrumbs - Responsive */}
          <div className="flex items-center gap-2 text-xs md:text-sm mb-4 md:mb-6 flex-wrap">
            <Link
              to={`${basePath}${leavePath}`}
              className="text-green-500 hover:text-green-600 font-medium"
            >
              Leaves
            </Link>
            <i className="fas fa-chevron-right text-gray-400 text-[10px] md:text-xs"></i>
            <span className="text-gray-500 dark:text-gray-400">
              Leave Type Management
            </span>
          </div>

          {/* Header */}
          <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent">
              Leave Types List
            </h2>
          </div>

          {/* Actions Bar - Fully Responsive */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
            <EntriesSelector value={perPage} onChange={setPerPage} />
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search records..."
              />
              <button
                onClick={handleAdd}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                <i className="fas fa-plus-circle"></i>
                <span className="hidden sm:inline">Add New Type</span>
                <span className="sm:hidden">Add Type</span>
              </button>
            </div>
          </div>

          {/* Leave Types Table - Horizontal Scroll on Mobile */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-soft">
            <div className="min-w-[500px] md:min-w-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Sl.No.
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageTypes.map((type, idx) => (
                    <tr
                      key={type.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                        {start + idx + 1}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {type.name}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <button
                          onClick={() => handleToggleStatus(type)}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                            type.status ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              type.status ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex gap-1 md:gap-2">
                          <button
                            onClick={() => handleEdit(type)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-500 transition-colors"
                            title="Edit"
                          >
                            <i className="fas fa-edit text-xs md:text-sm"></i>
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteClick(type.id, type.name)
                            }
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <i className="fas fa-trash text-xs md:text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pageTypes.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        No leave types found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalFiltered}
            itemsPerPage={perPage}
          />
        </main>
      </div>

      {/* Add/Edit Leave Type Modal */}
      <LeaveTypeModal
        isOpen={showModal}
        editingType={editingType}
        onClose={handleModalClose}
      />
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setSelectedDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Leave Type"
        message={`Are you sure you want to delete "${selectedDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteLoading}
      />
    </div>
  );
};

export default LeaveTypeManagement;
