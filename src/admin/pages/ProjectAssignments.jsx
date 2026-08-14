import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PROJECT_MODULE_NAME } from "../utils/constants";
import { showToast } from "../../components/common/Toast";

// Redux Selectors & Actions
import {
  fetchAssignments,
  saveAssignment,
  deleteAllEmployeeProjects,
  clearAssignmentError,
  fetchEmployeesForAssignments
} from "../store/slices/projectAssignmentSlice";
import { fetchProjects } from "../store/slices/projectSlice";

// Components
import AssignmentTable from "../components/project-assignments/AssignmentTable";
import AssignmentModal from "../components/project-assignments/AssignmentModal";
import ConfirmModal from "../components/common/ConfirmModal";

// ProjectAssignments.jsx
const getEmployeeById = (employees, employeeId) => {
  if (!employees || !Array.isArray(employees)) return undefined;
  
  const searchId = Number(employeeId);
  if (isNaN(searchId)) return undefined;
  
  // Only match on the employee record ID (primary key)
  return employees.find(emp => Number(emp.id) === searchId);
};
const ProjectAssignments = () => {
  const dispatch = useDispatch();

  // Redux States
  const { assignments, loading, actionLoading, error, employeesForAssignment  } = useSelector(
    (state) => state.projectAssignments,
  );
  const employees = employeesForAssignment;
  const { projects } = useSelector((state) => state.projects);

  // Local UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Load Initial Data on Mount
  useEffect(() => {
    dispatch(fetchAssignments());
    dispatch(fetchEmployeesForAssignments());
    dispatch(fetchProjects());
  }, [dispatch]);

  // Error Listening
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearAssignmentError());
    }
  }, [error, dispatch]);

  const handleAddNew = () => {
    setSelectedAssignment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (assign) => {
    setSelectedAssignment(assign);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (assign) => {
    setSelectedAssignment(assign);
    setIsDeleteOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAssignment(null);
  };

  // Submit operations
  const handleSaveForm = async ({ employeeId, projectIds }) => {
  try {
  
    const result = await dispatch(saveAssignment({ employeeId, projectIds })).unwrap();
    
    showToast("Project assignments saved successfully!", "success");
    handleCloseModal();
  } catch (e) {
    console.error('Save error:', e);
  }
};

  const handleConfirmDelete = async () => {
    if (!selectedAssignment) return;
    try {
      await dispatch(
        deleteAllEmployeeProjects(selectedAssignment.employeeId),
      ).unwrap();
      showToast("Employee project mappings removed successfully!", "success");
      setIsDeleteOpen(false);
      setSelectedAssignment(null);
    } catch (e) {
      // Handled by error listener
    }
  };


  const enrichedAssignments = assignments.map((assign) => {
    const employee = getEmployeeById(employees, assign.employeeId);

    return {
      ...assign,
      employeeCode:
        employee?.employee_id ||
        assign.employeeCode ||
        `EMP-${assign.employeeId}`,
      employeeName: employee
        ? employee.name ||
          `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
          `Employee #${employee.id}`
        : `Employee #${assign.employeeId}`,
      department:
        employee?.department?.name || employee?.user?.department?.name || "-",
      designation:
        employee?.designation?.name || employee?.user?.designation?.name || "-",
      avatar: employee?.avatar || null,
      userId: employee?.user_id || assign.userId || null,
    };
  });
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent tracking-tight">
            Project Assignments
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Map and coordinate multiple corporate {PROJECT_MODULE_NAME}s to
            employees in your organization.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="px-5 py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 transition-all self-start md:self-auto"
        >
          <i className="fas fa-user-plus text-sm"></i>
          Assign Projects
        </button>
      </div>

      {/* Main assignments listing table */}
      <AssignmentTable
        assignments={enrichedAssignments}
        employees={employees}
        projects={projects}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteTrigger}
        onAddNew={handleAddNew}
      />

      {/* Centered Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employees={employees}
        projects={projects}
        existingAssignments={assignments}
        selectedAssignment={selectedAssignment}
        onSave={handleSaveForm}
        actionLoading={actionLoading}
      />

      {/* Deletion confirmation dialog */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedAssignment(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Project Assignments"
        message={`Are you sure you want to completely remove all project mappings for "${selectedAssignment?.employeeName}"? The employee will no longer be assigned to operational projects.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={actionLoading}
      />
    </div>
  );
};

export default ProjectAssignments;
