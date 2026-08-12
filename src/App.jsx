import { lazy, useEffect, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useTheme } from "./admin/hooks/useTheme";
import Loader from "./admin/components/common/Loader";
import { initializeAuth } from "./store/slices/authSlice";
import "react-datepicker/dist/react-datepicker.css";

// Import shared components
import ProtectedRoute from "./shared/components/ProtectedRoute";

import Login from "./pages/Login";
import { ThemeProvider } from "./context/ThemeContext";
import NotFound from "./pages/NotFound";
import apiClient from "./utils/apiClient";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Lazy load layouts with prefetch
const AdminLayout = lazy(() => import("./shared/layouts/AdminLayout"));
const EmployeeLayout = lazy(() => import("./shared/layouts/EmployeeLayout"));

// Lazy load pages - Admin
const AdminDashboard = lazy(() => import("./admin/pages/Dashboard"));
const Projects = lazy(() => import("./admin/pages/Projects"));
const ProjectDetails = lazy(() => import("./admin/pages/ProjectDetails"));
const ProjectAssignments = lazy(
  () => import("./admin/pages/ProjectAssignments"),
);
const Employees = lazy(() => import("./admin/pages/Employees"));
const AddEmployee = lazy(() => import("./admin/pages/AddEmployee"));
const EditEmployee = lazy(() => import("./admin/pages/EditEmployee"));
const EmployeeDetails = lazy(() => import("./admin/pages/EmployeeDetails"));
const Organizations = lazy(() => import("./admin/pages/Organizations"));
const AddOrganization = lazy(() => import("./admin/pages/AddOrganization"));
const EditOrganization = lazy(() => import("./admin/pages/EditOrganization"));
const Companies = lazy(() => import("./admin/pages/Companies"));
const AddCompany = lazy(() => import("./admin/pages/AddCompany"));
const EditCompany = lazy(() => import("./admin/pages/EditCompany"));
const Agreements = lazy(() => import("./admin/pages/Agreements"));
const AddAgreement = lazy(() => import("./admin/pages/AddAgreement"));
const EditAgreement = lazy(() => import("./admin/pages/EditAgreement"));
const AddDocument = lazy(() => import("./admin/pages/AddDocument"));
const Attendances = lazy(() => import("./admin/pages/Attendances"));
const Leaves = lazy(() => import("./admin/pages/Leaves"));
const LeaveTypeManagement = lazy(
  () => import("./admin/pages/LeaveTypeManagement"),
);
const LeaveAllocations = lazy(() => import("./admin/pages/LeaveAllocations"));
const EditLeaveAllocation = lazy(
  () => import("./admin/pages/EditLeaveAllocation"),
);
const Designations = lazy(() => import("./admin/pages/Designations"));
const Departments = lazy(() => import("./admin/pages/Departments"));
const TaskReports = lazy(() => import("./admin/pages/TaskReports"));
const Reports = lazy(() => import("./admin/pages/Reports"));
const ModuleManagement = lazy(() => import("./admin/pages/ModuleManagement"));
const EmployeeDetailsReport = lazy(
  () => import("./admin/components/reports/EmployeeDetailsReport"),
);
const AttendanceReport = lazy(
  () => import("./admin/components/reports/AttendanceReport"),
);
const ProjectReport = lazy(
  () => import("./admin/components/reports/ProjectReport"),
);
const LeaveRequestReport = lazy(
  () => import("./admin/components/reports/LeaveRequestsReports"),
);
const PendingLeaveReport = lazy(
  () => import("./admin/components/reports/PendingLeavesReport"),
);
const EmployeeNearestExpiryReport = lazy(
  () => import("./admin/components/reports/EmployeeNearestExpiryReport"),
);
const EmployeeUpcomingRenewalReport = lazy(
  () => import("./admin/components/reports/EmployeeUpcomingRenewalsReport"),
);
const OrgNearestExpiryReport = lazy(
  () => import("./admin/components/reports/CompanyNearestExpiryReport"),
);
const OrgUpcomingRenewalReport = lazy(
  () => import("./admin/components/reports/CompanyUpcomingRenewalsReport"),
);
const EmployeeAttendancePage = lazy(
  () => import("./admin/components/reports/EmployeeAttendancePage"),
);
const AdminWFH = lazy(() => import("./admin/pages/WFH"));
const Settings = lazy(() => import("./admin/pages/Settings"));
const RoleManagement = lazy(() => import("./admin/pages/RoleManagement"));
const PayrollCalender = lazy(() => import("./admin/pages/PayrollCalender"));
const PayrollList = lazy(() => import("./admin/pages/PayrollList"));
const AddPayroll = lazy(() => import("./admin/pages/AddPayroll"));
const Onboarding = lazy(() => import("./admin/pages/Onboarding"));
const ProjectWorkingHours = lazy(
  () => import("./admin/pages/ProjectWorkingHours"),
);
const AdminAttendanceRequests = lazy(
  () => import("./admin/pages/AttendanceRequests"),
);
const PayrollDetails = lazy(() => import("./admin/pages/PayrollDetails"));
const EditPayroll = lazy(() => import("./admin/pages/EditPayroll"));

const Offboarding = lazy(() => import("./admin/pages/Offboarding"));
const OffboardingInitiation = lazy(
  () => import("./admin/components/offboarding/OffboardingInitiation"),
);
const OffboardingChecklistManager = lazy(
  () => import("./admin/components/offboarding/OffboardingChecklistManager"),
);
const AssetManagement = lazy(() => import("./admin/pages/AssetManagement"));
const AssetTypeManagement = lazy(
  () => import("./admin/pages/AssetTypeManagement"),
);
const VisaCancellationAndExit = lazy(
  () => import("./admin/components/offboarding/VisaCancellationAndExit"),
);
const OffboardingChecklist = lazy(
  () => import("./admin/components/offboarding/OffboardingChecklist"),
);
const AssetReturn = lazy(
  () => import("./admin/components/offboarding/AssetReturn"),
);
const ExitInterview = lazy(
  () => import("./admin/components/offboarding/ExitInterview"),
);
const FinalSettlement = lazy(
  () => import("./admin/components/offboarding/FinalSettlement"),
);
const LettersAndClearance = lazy(
  () => import("./admin/components/offboarding/LettersAndClearance"),
);
const ChecklistCategories = lazy(
  () => import("./admin/pages/ChecklistCategoriesManagement"),
);
const Notifications = lazy(
  () => import("./admin/pages/Notifications"),
);

// Lazy load pages - Employee
const EmployeeDashboard = lazy(() => import("./employee/pages/Dashboard"));
const EmployeeLeaves = lazy(() => import("./employee/pages/Leaves"));
const RequestLeave = lazy(() => import("./employee/pages/RequestLeave"));
const EmployeeProfile = lazy(() => import("./employee/pages/Profile"));
const EmployeeWFH = lazy(() => import("./employee/pages/WFH"));
const EmployeeTaskReports = lazy(() => import("./employee/pages/TaskReports"));
const AttendanceRequests = lazy(
  () => import("./employee/pages/AttendanceRequests"),
);
const RequestLeaveForEmployee = lazy(
  () => import("./employee/pages/RequestLeaveForEmployees"),
);
const EmployeeMyPayroll = lazy(() => import("./employee/pages/MyPayroll"));
const EmployeeMyDocuments = lazy(() => import("./employee/pages/MyDocuments"));

// Helper function to check if user is employee type (includes manager, team_lead, hr)
const isEmployeeType = (type) => {
  const employeeTypes = ['employee', 'manager', 'team_lead', 'hr'];
  return employeeTypes.includes(type);
};

// Helper function to check if user is admin type
const isAdminType = (type) => {
  return type === 'admin';
};

// Custom wrapper for lazy-loaded components
const LazyWrapper = ({ children }) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader fullScreen />}>{children}</Suspense>
    </ErrorBoundary>
  );
};
function App() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { loading: authLoading, user } = useSelector((state) => state.auth);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Handle initial app load
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  // In App.jsx - add this after the other useEffects

useEffect(() => {
  // Session recovery on app load
  const recoverSession = () => {
    const tokenKeys = ['admin-token', 'hr-token', 'employee-token', 'auth-token'];
    let foundToken = null;
    let foundType = null;
    
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token && token !== 'null' && token !== 'undefined') {
        foundToken = token;
        if (key !== 'auth-token') {
          foundType = key.replace('-token', '');
        }
        break;
      }
    }
    
    if (foundToken) {
      // Set active user type if not set
      if (!localStorage.getItem('active-user-type') && foundType) {
        localStorage.setItem('active-user-type', foundType);
        localStorage.setItem('user-type', foundType);
      }
      
      // Set authorization header
      apiClient.defaults.headers.common.Authorization = `Bearer ${foundToken}`;
      console.log(`🔄 Session recovered with token type: ${foundType || 'unknown'}`);
    }
  };
  
  recoverSession();
}, []);

  // Show only one loader during initial auth check
  if (authLoading && initialLoad) {
    return <Loader fullScreen />;
  }

  // Get user type for routing decisions
  const userType = user?.type || '';

  return (
    <ThemeProvider>
      <Routes>
        {/* Public Routes - No lazy loading for login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes - Layout wrapper */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredType="admin">
              <LazyWrapper>
                <AdminLayout />
              </LazyWrapper>
            </ProtectedRoute>
          }
        >
          {/* Admin nested routes - these will render inside AdminLayout */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetails />} />
          <Route path="project-assignments" element={<ProjectAssignments />} />
          <Route path="employees/add-employee" element={<AddEmployee />} />
          <Route path="employees/onboarding" element={<Onboarding />} />
          <Route path="employees/edit/:id" element={<EditEmployee />} />
          <Route path="employees/:id" element={<EmployeeDetails />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="notifications" element={<Notifications />} />
          <Route
            path="organizations/add-organization"
            element={<AddOrganization />}
          />
          <Route
            path="organizations/edit-organization/:id"
            element={<EditOrganization />}
          />
          <Route
            path="organizations/:organizationId/companies"
            element={<Companies />}
          />
          <Route
            path="organizations/:organizationId/add-company"
            element={<AddCompany />}
          />
          <Route
            path="organizations/:organizationId/edit-company/:id"
            element={<EditCompany />}
          />
          <Route path="agreements" element={<Agreements />} />
          <Route path="agreements/add-agreement" element={<AddAgreement />} />
          <Route path="agreements/add-document" element={<AddDocument />} />
          <Route
            path="agreements/edit-agreement/:id"
            element={<EditAgreement />}
          />
          <Route path="attendances" element={<Attendances />} />
          <Route path="designations" element={<Designations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="task-reports" element={<TaskReports />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="reports/employee-details"
            element={<EmployeeDetailsReport />}
          />
          <Route
            path="reports/attendance-reports"
            element={<AttendanceReport />}
          />
          <Route path="reports/project-report" element={<ProjectReport />} />
          <Route
            path="reports/leave-requests-reports"
            element={<LeaveRequestReport />}
          />
          <Route
            path="reports/pending-leaves-reports"
            element={<PendingLeaveReport />}
          />
          <Route
            path="reports/employee-near-expiry"
            element={<EmployeeNearestExpiryReport />}
          />
          <Route
            path="reports/employee-upcoming-renewals"
            element={<EmployeeUpcomingRenewalReport />}
          />
          <Route
            path="reports/organization-near-expiry"
            element={<OrgNearestExpiryReport />}
          />
          <Route
            path="reports/organization-upcoming-renewals"
            element={<OrgUpcomingRenewalReport />}
          />
          <Route
            path="reports/attendance/employee/:employeeId"
            element={<EmployeeAttendancePage />}
          />
          <Route path="leaves" element={<Leaves />} />
          <Route path="leaves/leave-types" element={<LeaveTypeManagement />} />
          <Route path="leaves/allocations" element={<LeaveAllocations />} />
          <Route
            path="leaves/allocations/:id"
            element={<EditLeaveAllocation />}
          />
          <Route path="payroll" element={<PayrollCalender />} />
          <Route path="payroll/list" element={<PayrollList />} />
          <Route path="payroll/add" element={<AddPayroll />} />
          <Route path="wfh" element={<AdminWFH />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="modules" element={<ModuleManagement />} />
          <Route path="payroll/:id" element={<PayrollDetails />} />
          <Route path="payroll/edit/:id" element={<EditPayroll />} />
          <Route
            path="project-working-hours"
            element={<ProjectWorkingHours />}
          />
          <Route
            path="attendance-requests"
            element={<AdminAttendanceRequests />}
          />

          <Route path="employees/offboarding" element={<Offboarding />} />
          <Route
            path="employees/offboarding-initiation"
            element={<OffboardingInitiation />}
          />
          <Route
            path="employees/offboarding-checklist-manager"
            element={<OffboardingChecklistManager />}
          />
          <Route
            path="employees/checklist-categories"
            element={<ChecklistCategories />}
          />
          <Route
            path="employees/asset-management"
            element={<AssetManagement />}
          />
          <Route
            path="employees/assets/types"
            element={<AssetTypeManagement />}
          />
          <Route
            path="employees/visa-cancellation"
            element={<VisaCancellationAndExit />}
          />
          <Route
            path="employees/offboarding-checklist"
            element={<OffboardingChecklist />}
          />
          <Route path="employees/asset-return" element={<AssetReturn />} />
          <Route path="employees/exit-interview" element={<ExitInterview />} />
          <Route
            path="employees/final-settlement"
            element={<FinalSettlement />}
          />
          <Route
            path="employees/letters-and-clearance"
            element={<LettersAndClearance />}
          />

          <Route
            path="request-leave-for-employee"
            element={<RequestLeaveForEmployee />}
          />
        </Route>

        {/* Employee Routes - Layout wrapper */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute requiredType="employee">
              <LazyWrapper>
                <EmployeeLayout />
              </LazyWrapper>
            </ProtectedRoute>
          }
        >
          {/* Employee nested routes - these will render inside EmployeeLayout */}
          <Route
            index
            element={<Navigate to="/employee/dashboard" replace />}
          />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="leaves" element={<EmployeeLeaves />} />
          <Route path="request-leave" element={<RequestLeave />} />
          <Route path="wfh" element={<EmployeeWFH />} />
          <Route path="task-reports" element={<TaskReports />} />
          <Route path="my-tasks" element={<EmployeeTaskReports />} />
          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="attendance-requests" element={<AttendanceRequests />} />
          <Route path="my-documents" element={<EmployeeMyDocuments />} />

          <Route path="onboarding" element={<Onboarding />} />
          <Route path="employees" element={<Employees />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetails />} />
          <Route path="project-assignments" element={<ProjectAssignments />} />
          <Route path="employees/add-employee" element={<AddEmployee />} />

          <Route path="employees/onboarding" element={<Onboarding />} />
          <Route path="employees/edit/:id" element={<EditEmployee />} />
          <Route path="employees/:id" element={<EmployeeDetails />} />
          <Route path="organizations" element={<Organizations />} />
          <Route
            path="organizations/add-organization"
            element={<AddOrganization />}
          />
          <Route
            path="organizations/edit-organization/:id"
            element={<EditOrganization />}
          />
          <Route
            path="organizations/:organizationId/companies"
            element={<Companies />}
          />
          <Route
            path="organizations/:organizationId/add-company"
            element={<AddCompany />}
          />
          <Route
            path="organizations/:organizationId/edit-company/:id"
            element={<EditCompany />}
          />
          <Route path="agreements" element={<Agreements />} />
          <Route path="agreements/add-agreement" element={<AddAgreement />} />
          <Route path="agreements/add-document" element={<AddDocument />} />
          <Route
            path="agreements/edit-agreement/:id"
            element={<EditAgreement />}
          />
          <Route path="attendance" element={<Attendances />} />
          <Route path="designations" element={<Designations />} />
          <Route path="departments" element={<Departments />} />
          <Route path="task-reports" element={<TaskReports />} />
          <Route path="reports" element={<Reports />} />
          <Route
            path="reports/employee-details"
            element={<EmployeeDetailsReport />}
          />
          <Route
            path="reports/attendance-reports"
            element={<AttendanceReport />}
          />
          <Route path="reports/project-report" element={<ProjectReport />} />
          <Route
            path="reports/leave-requests-reports"
            element={<LeaveRequestReport />}
          />
          <Route
            path="reports/pending-leaves-reports"
            element={<PendingLeaveReport />}
          />
          <Route
            path="reports/employee-near-expiry"
            element={<EmployeeNearestExpiryReport />}
          />
          <Route
            path="reports/employee-upcoming-renewals"
            element={<EmployeeUpcomingRenewalReport />}
          />
          <Route
            path="reports/organization-near-expiry"
            element={<OrgNearestExpiryReport />}
          />
          <Route
            path="reports/organization-upcoming-renewals"
            element={<OrgUpcomingRenewalReport />}
          />
          <Route
            path="reports/attendance/employee/:employeeId"
            element={<EmployeeAttendancePage />}
          />
          <Route path="leave-management" element={<Leaves />} />
          <Route path="leaves/leave-types" element={<LeaveTypeManagement />} />
          <Route path="leaves/allocations" element={<LeaveAllocations />} />
          <Route
            path="leaves/allocations/:id"
            element={<EditLeaveAllocation />}
          />

          <Route path="wfh" element={<AdminWFH />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="modules" element={<ModuleManagement />} />
          <Route
            path="project-working-hours"
            element={<ProjectWorkingHours />}
          />
          <Route path="payroll" element={<EmployeeMyPayroll />} />
          <Route
            path="request-leave-for-employee"
            element={<RequestLeaveForEmployee />}
          />
        </Route>

        {/* ============ REDIRECT ROUTES ============ */}

        {/* Redirect /admin/employees/add-employee to appropriate route */}
        <Route
          path="/admin/employees/add-employee"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/employees/add-employee" replace />
                ) : (
                  <Navigate to="/admin/employees/add-employee" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/employees/onboarding to appropriate route */}
        <Route
          path="/admin/employees/onboarding"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/employees/onboarding" replace />
                ) : (
                  <Navigate to="/admin/employees/onboarding" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/reports/* to appropriate route */}
        <Route
          path="/admin/reports/employee-details"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/reports/employee-details" replace />
                ) : (
                  <Navigate to="/admin/reports/employee-details" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/attendance-reports"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/reports/attendance-reports" replace />
                ) : (
                  <Navigate to="/admin/reports/attendance-reports" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/leave-requests-reports"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/leave-requests-reports"
                    replace
                  />
                ) : (
                  <Navigate
                    to="/admin/reports/leave-requests-reports"
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/pending-leaves-reports"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/pending-leaves-reports"
                    replace
                  />
                ) : (
                  <Navigate
                    to="/admin/reports/pending-leaves-reports"
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/employee-near-expiry"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/employee-near-expiry"
                    replace
                  />
                ) : (
                  <Navigate to="/admin/reports/employee-near-expiry" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/employee-upcoming-renewals"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/employee-upcoming-renewals"
                    replace
                  />
                ) : (
                  <Navigate
                    to="/admin/reports/employee-upcoming-renewals"
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/organization-near-expiry"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/organization-near-expiry"
                    replace
                  />
                ) : (
                  <Navigate
                    to="/admin/reports/organization-near-expiry"
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports/organization-upcoming-renewals"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/organization-upcoming-renewals"
                    replace
                  />
                ) : (
                  <Navigate
                    to="/admin/reports/organization-upcoming-renewals"
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/attendance/employee/:employeeId"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to="/employee/reports/attendance/employee/:employeeId"
                    replace
                  />
                ) : (
                  <Navigate
                    to="/admin/reports/attendance/employee/:employeeId"
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/modules to appropriate route */}
        <Route
          path="/admin/modules"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/modules" replace />
                ) : (
                  <Navigate to="/admin/modules" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/project-working-hours to appropriate route */}
        <Route
          path="/admin/project-working-hours"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/project-working-hours" replace />
                ) : (
                  <Navigate to="/admin/project-working-hours" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* ============ PAYROLL REDIRECT ROUTES ============ */}

        {/* Redirect /admin/payroll to appropriate route based on user type and permissions */}
        <Route
          path="/admin/payroll"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/payroll" replace />
                ) : (
                  <Navigate to="/admin/payroll" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/payroll/add to appropriate route */}
        <Route
          path="/admin/payroll/add"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate to="/employee/payroll/add" replace />
                ) : (
                  <Navigate to="/admin/payroll/add" replace />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/payroll/:id to appropriate route */}
        <Route
          path="/admin/payroll/:id"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to={`/employee/payroll/${window.location.pathname.split("/").pop()}`}
                    replace
                  />
                ) : (
                  <Navigate
                    to={`/admin/payroll/${window.location.pathname.split("/").pop()}`}
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Redirect /admin/payroll/edit/:id to appropriate route */}
        <Route
          path="/admin/payroll/edit/:id"
          element={
            <ProtectedRoute>
              <LazyWrapper>
                {isEmployeeType(userType) ? (
                  <Navigate
                    to={`/employee/payroll/edit/${window.location.pathname.split("/").pop()}`}
                    replace
                  />
                ) : (
                  <Navigate
                    to={`/admin/payroll/edit/${window.location.pathname.split("/").pop()}`}
                    replace
                  />
                )}
              </LazyWrapper>
            </ProtectedRoute>
          }
        />

        {/* Global 404 - No layout, full page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;