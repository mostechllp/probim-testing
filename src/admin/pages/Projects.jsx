import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PROJECT_MODULE_NAME } from "../utils/constants";
import { showToast } from "../../components/common/Toast";

// Redux Actions
import {
  fetchProjects,
  addProject,
  updateProject,
  patchProjectInline,
  deleteProject,
  clearProjectError
} from "../store/slices/projectSlice";
import { fetchEmployees } from "../store/slices/employeeSlice";

// Components
import ProjectStatsCards from "../components/projects/ProjectStatsCards";
import ProjectTable from "../components/projects/ProjectTable";
import AddProjectModal from "../components/projects/AddProjectModal";
import ConfirmModal from "../components/common/ConfirmModal";
import ProjectDetailsModal from "../components/projects/ProjectDetailsModal";

const Projects = () => {
  const dispatch = useDispatch();

  // Redux Selectors
  const { projects, loading, actionLoading, error, stats, validationErrors } = useSelector(
    (state) => state.projects
  );
  const { employees } = useSelector((state) => state.employees);

  // Local UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  // Load Initial Data on Mount
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Error Listening
  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearProjectError());
    }
  }, [error, dispatch]);

  // Open Actions
  const handleAddNew = () => {
    setSelectedProject(null);
    setIsAddOpen(true);
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setIsAddOpen(true);
  };

  const handleDeleteTrigger = (project) => {
    setSelectedProject(project);
    setIsDeleteOpen(true);
  };

  // Submit Operations
  const handleSaveProject = async (projectData) => {
  
  try {
    if (projectData.id) {
      // Send the data as-is (it already has the correct field names)
      await dispatch(updateProject(projectData)).unwrap();
      showToast(`${PROJECT_MODULE_NAME} updated successfully!`, "success");
    } else {
      // Send the data as-is (it already has the correct field names)
      await dispatch(addProject(projectData)).unwrap();
      showToast(`${PROJECT_MODULE_NAME} created successfully!`, "success");
    }
    setIsAddOpen(false);
    setSelectedProject(null);
  } catch (e) {
    console.error("Save error:", e);
  }
};

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    try {
      await dispatch(deleteProject(selectedProject.id)).unwrap();
      showToast(`${PROJECT_MODULE_NAME} deleted successfully!`, "success");
      setIsDeleteOpen(false);
      setSelectedProject(null);
    } catch (e) {
      // Handled by error listener
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold gradient-heading bg-clip-text text-transparent tracking-tight">
            {PROJECT_MODULE_NAME}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Manage corporate projects and track operational activities.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="px-5 py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 transition-all self-start md:self-auto"
        >
          <i className="fas fa-plus-circle text-sm"></i>
          Add {PROJECT_MODULE_NAME}
        </button>
      </div>

      {/* Top statistics widgets */}
      <ProjectStatsCards stats={stats} loading={loading} />

      {/* Main projects data table */}
      <ProjectTable
        projects={projects}
        employees={employees}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteTrigger}
        onAddNew={handleAddNew}
        onViewDetails={(proj) => {
          setViewingProject(proj);
          setIsDetailsOpen(true);
        }}
        onStatusChange={async (projectId, newStatus) => {
          try {
            await dispatch(patchProjectInline({ id: projectId, data: { status: newStatus } })).unwrap();
            showToast("Status updated inline successfully!", "success");
          } catch (e) {
            // Handled
          }
        }}
      />

      {/* Add / Edit Modal Drawer */}
      <AddProjectModal
        isOpen={isAddOpen}
        employees={employees}
        onClose={() => {
          setIsAddOpen(false);
          setSelectedProject(null);
          dispatch(clearProjectError());
        }}
        onSave={handleSaveProject}
        project={selectedProject}
        actionLoading={actionLoading}
        validationErrors={validationErrors}
      />

      {/* Project Details Modal */}
      <ProjectDetailsModal
        isOpen={isDetailsOpen}
        project={viewingProject}
        employees={employees}
        onClose={() => {
          setIsDetailsOpen(false);
          setViewingProject(null);
        }}
      />

      {/* Cascading Deletion Modal Dialog */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedProject(null);
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete ${PROJECT_MODULE_NAME}`}
        message={`Are you sure you want to permanently delete project "${selectedProject?.name}"? All assigned employee mappings will be unlinked. This action is irreversible.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={actionLoading}
      />
    </div>
  );
};

export default Projects;
