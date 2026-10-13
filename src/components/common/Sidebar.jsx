import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchLeaves } from "../../admin/store/slices/LeaveSlice";
import { fetchAttendanceRequests } from "../../admin/store/slices/attendanceRequestSlice";
import { fetchAdminWFHRequests } from "../../admin/store/slices/wfhSlice";
import apiClient from "../../utils/apiClient";

// ────────────────────────────────────────────────────────────────
// ROUTE MAPS
// ────────────────────────────────────────────────────────────────

const ADMIN_ROUTE_MAP = {
  dashboard: "/admin/dashboard",
  "pending-requests": "/admin/pending-requests",
  onboarding: "/admin/employees/onboarding",
  offboarding: "/admin/employees/offboarding",
  employees: "/admin/employees",
  attendance: "/admin/attendances",
  "attendance-requests": "/admin/attendance-requests",
  "wfh-requests": "/admin/wfh",
  documents: "/admin/agreements",
  leaves: "/admin/leaves",
  "my-leaves": "/admin/my-leaves",
  "task-reports": "/admin/task-reports",
  reports: "/admin/reports",
  projects: "/admin/projects",
  "project-assignments": "/admin/project-assignments",
  timesheets: "/admin/timesheets",
  "project-cost": "/admin/project-cost",
  payroll: "/admin/payroll",
  "roles-permissions": "/admin/roles",
  settings: "/admin/settings",
  "my-tasks": "/admin/my-tasks",
  organizations: "/admin/organizations",
  agreements: "/admin/agreements",
  "role-management": "/admin/role-management",
  wfh: "/admin/wfh",
  "my-wfh-requests": "/admin/my-wfh-requests",
  "my-payroll": "/employee/my-payroll",
  "my-documents": "/employee/my-documents",
  "my-profile": "/employee/profile",
  "ticket-raise": "/admin/ticket-raise",
  "developer-tickets": "/admin/developer-tickets",
  "admin-tickets": "/admin/admin-tickets",
  "support-admin-dashboard": "/admin/support-admin-dashboard",
};

const EMPLOYEE_ROUTE_MAP = {
  dashboard: "/employee/dashboard",
  onboarding: "/employee/onboarding",
  offboarding: "/employee/employees/offboarding",
  employees: "/employee/employees",
  attendance: "/employee/attendance",
  "attendance-requests": "/employee/attendance-requests",
  "my-attendance-requests": "/employee/my-attendance-requests",
  documents: "/employee/agreements",
  "my-documents": "/employee/my-documents",
  "task-reports": "/employee/task-reports",
  reports: "/employee/reports",
  projects: "/employee/projects",
  settings: "/employee/settings",
  leaves: "/employee/leave-management",
  "my-leaves": "/employee/leaves",
  "my-wfh-requests": "/employee/my-wfh",
  "wfh-requests": "/employee/wfh",
  payroll: "/employee/payroll",
  "roles-permissions": "/employee/roles",
  "my-tasks": "/employee/my-tasks",
  "my-profile": "/employee/profile",
  "project-assignments": "/employee/project-assignments",
  organizations: "/employee/organizations",
  agreements: "/employee/agreements",
  "role-management": "/employee/role-management",
  wfh: "/employee/wfh",
  "my-payroll": "/employee/my-payroll",
  "ticket-raise": "/employee/ticket-raise",
  "developer-tickets": "/employee/developer-tickets",
  "admin-tickets": "/employee/admin-tickets",
  "support-admin-dashboard": "/employee/support-admin-dashboard",
};

// ────────────────────────────────────────────────────────────────
// ICON MAP
// ────────────────────────────────────────────────────────────────

const ICON_MAP = {
  dashboard: "fas fa-chart-line",
  "pending-requests": "fas fa-clock",
  onboarding: "fas fa-user-plus",
  offboarding: "fas fa-user-minus",
  employees: "fas fa-users",
  attendance: "fas fa-fingerprint",
  "attendance-requests": "fas fa-clock",
  "my-attendance-requests": "fas fa-clock",
  "wfh-requests": "fas fa-house-user",
  "my-wfh-requests": "fas fa-house-user",
  documents: "fas fa-file-signature",
  "my-documents": "fas fa-file-signature",
  leaves: "fas fa-calendar-check",
  "my-leaves": "fas fa-calendar-alt",
  "task-reports": "fas fa-tasks",
  reports: "fas fa-chart-bar",
  projects: "fas fa-folder",
  "project-assignments": "fas fa-user-check",
  timesheets: "fas fa-clock",
  "project-cost": "fas fa-dollar-sign",
  payroll: "fas fa-file-invoice-dollar",
  "roles-permissions": "fas fa-user-shield",
  settings: "fas fa-gear",
  "my-tasks": "fas fa-list-check",
  "my-profile": "fas fa-user-circle",
  organizations: "fas fa-building",
  agreements: "fas fa-file",
  "role-management": "fas fa-user-shield",
  wfh: "fas fa-house-user",
  "my-payroll": "fas fa-file-invoice-dollar",
  "ticket-raise": "fas fa-ticket-alt",
  "developer-tickets": "fas fa-ticket-alt",
  "admin-tickets": "fas fa-tags",
  "support-admin-dashboard": "fas fa-tachometer-alt",
};

// ────────────────────────────────────────────────────────────────
// PARENT MENU CONFIG
// ────────────────────────────────────────────────────────────────

const PARENT_MENU_CONFIG = {
  main_group: {
    label: "Main",
    icon: "fas fa-home",
    children: ["dashboard", "pending-requests"],
    roles: ["*"],
    order: 1,
  },

  people_group: {
    label: "People",
    icon: "fas fa-users",
    children: [
      "employees",
      "onboarding",
      "offboarding",
      "leaves",
      "attendance",
      "attendance-requests",
      "wfh-requests",
    ],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
      "Support Admin",
      "support_admin",
      "admin",
    ],
    order: 2,
  },

  projects_group: {
    label: "Projects",
    icon: "fas fa-project-diagram",
    children: [
      "projects",
      "project-assignments",
      "timesheets",
      "project-cost",
    ],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
      "Support Admin",
      "support_admin",
      "admin",
    ],
    order: 3,
  },

  administration_group: {
    label: "Administration",
    icon: "fas fa-cogs",
    children: [
      "documents",
      "payroll",
      "reports",
      "ticket-raise",
      "admin-tickets",
      "developer-tickets",
      "roles-permissions",
      "organizations",
      "settings",
      "task-reports",
    ],
    roles: [
      "HR Manager",
      "hr manager",
      "HR",
      "manager",
      "team_lead",
      "Team Lead",
      "BIM Manager",
      "Support Admin",
      "support_admin",
      "admin",
    ],
    order: 4,
  },
};

// Modules intentionally hidden because they are aliases / duplicates
const HIDDEN_MODULES = ["role-management", "agreements", "wfh"];

// Badge colors per module slug
const BADGE_COLORS = {
  leaves: "bg-red-500",
  "attendance-requests": "bg-red-500",
  "wfh-requests": "bg-red-500",
  "admin-tickets": "bg-red-500",
  "pending-requests": "bg-red-500",
};


// ────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // ────────────────────────────────────────────────────────────
  // Badge counts from Redux slices
  // ────────────────────────────────────────────────────────────

  const leaves = useSelector((state) => state.leaves?.leaves) || [];
  const leavesArray = Array.isArray(leaves) ? leaves : [];
  const pendingLeaveCount = leavesArray.filter(
    (l) => (l.status || "").toLowerCase() === "pending",
  ).length;

  const attendanceRequests =
    useSelector((state) => state.adminAttendance?.requests) || [];
  const attendanceArray = Array.isArray(attendanceRequests)
    ? attendanceRequests
    : [];
  const pendingAttendanceCount = attendanceArray.filter(
    (r) => (r.status || "").toLowerCase() === "pending",
  ).length;

  const wfhRequests = useSelector((state) => state.wfh?.requests) || [];
  const wfhArray = Array.isArray(wfhRequests) ? wfhRequests : [];
  const pendingWfhCount = wfhArray.filter(
    (r) => (r.status || "").toLowerCase() === "pending",
  ).length;

  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  const badgeCounts = {
    leaves: pendingLeaveCount,
    "attendance-requests": pendingAttendanceCount,
    "wfh-requests": pendingWfhCount,
    "admin-tickets": openTicketsCount,
  };

  // ────────────────────────────────────────────────────────────
  // Fetch badge data on mount
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const canSeeAdminModules =
      user?.type === "admin" ||
      user?.type === "hr" ||
      user?.type === "manager" ||
      user?.type === "team_lead" ||
      user?.role?.name?.toLowerCase().includes("hr") ||
      user?.role?.name?.toLowerCase().includes("manager") ||
      user?.permissions?.all === true;

    if (!canSeeAdminModules) return;

    dispatch(fetchLeaves());
    dispatch(fetchAttendanceRequests({}));
    dispatch(fetchAdminWFHRequests());
  }, [dispatch, user]);

  useEffect(() => {
    if (!user) return;
    const fetchOpenTicketsCount = async () => {
      try {
        const res = await apiClient.get("/admin/tickets");
        const list = res.data?.data?.data || res.data?.data || [];
        setOpenTicketsCount(
          list.filter((t) => (t.status || "").toLowerCase() === "open").length,
        );
      } catch (e) {
        // silent fail — badge just won't show
      }
    };
    fetchOpenTicketsCount();
  }, [user]);

  // ────────────────────────────────────────────────────────────
  // Responsive behaviour
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsOpen]);

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile, setIsOpen]);

  // ────────────────────────────────────────────────────────────
  // Role / permission helpers
  // ────────────────────────────────────────────────────────────

  const userRole = user?.role?.name || user?.role || "";
  const userType = user?.type || "";

  const isHR =
    userType === "hr" ||
    userRole === "HR Manager" ||
    userRole === "HR" ||
    userRole === "hr manager" ||
    userRole?.toLowerCase() === "hr";

  const isManager =
    userType === "manager" ||
    userType === "team_lead" ||
    userRole?.toLowerCase().includes("manager") ||
    userRole?.toLowerCase().includes("team lead") ||
    userRole?.toLowerCase().includes("team_lead") ||
    userRole === "Team Lead" ||
    userRole === "BIM Manager";

  const hasAllPermissions = user?.permissions?.all === true;
  const isAdmin = userType === "admin" || hasAllPermissions;

  const isSupportAdmin =
    userRole === "Support Admin" ||
    userRole === "support_admin" ||
    userRole?.toLowerCase().includes("support admin");

  const shouldShowParentMenus =
    isHR || isManager || isAdmin || isSupportAdmin;

// Only actual admins (or users with permissions.all) use the admin tree.
// HR / Manager / Team Lead live in the employee tree.
const activeRouteMap =
  userType === "admin" || hasAllPermissions
    ? ADMIN_ROUTE_MAP
    : EMPLOYEE_ROUTE_MAP;

  const permissions = user?.permissions || {};

  // ────────────────────────────────────────────────────────────
  // Permission check
  // ────────────────────────────────────────────────────────────

  const hasReadPermission = (slug) => {
    if (hasAllPermissions) return true;
    if (userType === "admin") return true;

    if (isSupportAdmin) {
      if (slug === "developer-tickets") {
        return permissions["developer-tickets"]?.read === true;
      }
      if (slug === "ticket-raise") return true;
      if (slug === "dashboard") return true;
      if (slug === "support-admin-dashboard") return true;
    }

    const modulePermission = permissions[slug];
    if (modulePermission) {
      return modulePermission.read === true;
    }

    const publicModules = [
      "dashboard",
      "my-leaves",
      "my-tasks",
      "task-reports",
      "my-wfh-requests",
      "my-profile",
      "my-attendance-requests",
      "ticket-raise",
    ];
    if (publicModules.includes(slug)) return true;

    return false;
  };

  // ✅ FIX 2: stop hard-coding admin-tickets/developer-tickets to admin.
  // Trust the backend permission flag — it's the source of truth.
  const shouldShowModule = (slug) => {
    if (slug === "dashboard") return true;
    if (slug === "support-admin-dashboard") return isSupportAdmin;

    if (HIDDEN_MODULES.includes(slug)) return false;

    return hasReadPermission(slug);
  };

  // ────────────────────────────────────────────────────────────
  // Build list of available module slugs
  // ────────────────────────────────────────────────────────────

  const apiModules = (user?.sidebar_modules || [])
    .filter((mod) => {
      if (mod.status !== "active") return false;
      if (!activeRouteMap[mod.slug]) {
        console.warn(`No route mapping found for slug: ${mod.slug}`);
        return false;
      }
      if (!shouldShowModule(mod.slug)) return false;
      return true;
    })
    .map((mod) => mod.slug);

  const allModules = [...apiModules];

  // Support Admin special cases
  if (isSupportAdmin && permissions["developer-tickets"]?.read === true) {
    if (!allModules.includes("developer-tickets")) {
      allModules.push("developer-tickets");
    }
  }
  if (isSupportAdmin && !allModules.includes("support-admin-dashboard")) {
    allModules.unshift("support-admin-dashboard");
  }

  // ────────────────────────────────────────────────────────────
  // Build nav items
  // ────────────────────────────────────────────────────────────

  const buildNavItems = () => {
    const processedSlugs = new Set();
    const parentItems = [];
    const standaloneItems = [];

    if (shouldShowParentMenus) {
      Object.entries(PARENT_MENU_CONFIG).forEach(([parentKey, config]) => {
        const hasRoleAccess =
          config.roles.includes("*") ||
          config.roles.some(
            (role) =>
              userRole === role ||
              userRole?.toLowerCase() === role.toLowerCase() ||
              userRole?.toLowerCase().includes(role.toLowerCase()) ||
              userType === role,
          ) ||
          isAdmin ||
          isSupportAdmin;

        if (!hasRoleAccess) return;

        const availableChildren = config.children.filter((child) => {
          return allModules.includes(child) && hasReadPermission(child);
        });

        if (availableChildren.length >= 2) {
          const sortedChildren = availableChildren.sort((a, b) => {
            return config.children.indexOf(a) - config.children.indexOf(b);
          });

          const children = sortedChildren.map((childSlug) => {
            const module = user?.sidebar_modules?.find(
              (m) => m.slug === childSlug,
            );
            return {
              slug: childSlug,
              label: module?.name || childSlug,
              path: activeRouteMap[childSlug],
              icon: ICON_MAP[childSlug] || "fas fa-circle",
              badge: badgeCounts[childSlug] || 0,
            };
          });

          const isActive = children.some(
            (child) => location.pathname === child.path,
          );

          parentItems.push({
            type: "parent",
            slug: parentKey,
            label: config.label,
            icon: config.icon,
            children,
            isActive,
            order: config.order || 500,
          });

          children.forEach((child) => processedSlugs.add(child.slug));
        } else if (availableChildren.length === 1) {
          const childSlug = availableChildren[0];
          const module = user?.sidebar_modules?.find(
            (m) => m.slug === childSlug,
          );

          standaloneItems.push({
            type: "single",
            slug: childSlug,
            label: module?.name || childSlug,
            path: activeRouteMap[childSlug],
            icon: ICON_MAP[childSlug] || "fas fa-circle",
            order: (config.order || 500) - 1,
            badge: badgeCounts[childSlug] || 0,
          });

          processedSlugs.add(childSlug);
        }
      });
    } else {
      const employeeStandalone = [
        "my-leaves",
        "my-tasks",
        "my-wfh-requests",
        "my-documents",
        "my-attendance-requests",
        "ticket-raise",
      ];
      employeeStandalone.forEach((slug) => {
        if (allModules.includes(slug) && hasReadPermission(slug)) {
          const module = user?.sidebar_modules?.find((m) => m.slug === slug);
          standaloneItems.push({
            type: "single",
            slug,
            label: module?.name || slug,
            path: activeRouteMap[slug],
            icon: ICON_MAP[slug] || "fas fa-circle",
            order: 100,
            badge: badgeCounts[slug] || 0,
          });
          processedSlugs.add(slug);
        }
      });
    }

    // Remaining standalone modules
    allModules.forEach((slug) => {
      if (processedSlugs.has(slug)) return;

      const module = user?.sidebar_modules?.find((m) => m.slug === slug);
      let label = module?.name || slug;

      if (slug === "support-admin-dashboard") {
        label = "Dashboard";
      }

      standaloneItems.push({
        type: "single",
        slug,
        label,
        path: activeRouteMap[slug],
        icon: ICON_MAP[slug] || "fas fa-circle",
        order: 100,
        badge: badgeCounts[slug] || 0,
      });
    });

    const allItems = [...standaloneItems, ...parentItems];
    allItems.sort((a, b) => (a.order || 0) - (b.order || 0));

    return allItems;
  };

  const navItems = buildNavItems();

  const toggleMenu = (slug) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const isMenuExpanded = (slug) => {
    return expandedMenus[slug] || false;
  };

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
  fixed top-0 left-0 h-full bg-gray-900 z-50 transition-all duration-300
  flex flex-col
  ${
    isMobile
      ? `${isOpen ? "translate-x-0" : "-translate-x-full"} w-72`
      : "w-20 hover:w-72 group"
  }
`}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
        onMouseLeave={() => !isMobile && setIsOpen(false)}
      >
        {/* Logo */}
        <div className="flex-shrink-0 py-5 px-4 border-b border-white/10 flex justify-center items-center">
          <img
            src="https://violet-leopard-500489.hostingersite.com/hr/public/assets/images/hr-logo2.jpg"
            alt="HMR Logo"
            className={`object-contain rounded-lg bg-white p-1 transition-all duration-300 ${
              !isMobile && !isOpen ? "w-10 h-10" : "w-12 h-12"
            }`}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-600">
          {navItems.length === 0 ? (
            <div className="text-center text-gray-500 text-sm px-4 py-8">
              No modules available
            </div>
          ) : (
            navItems.map((item) => {
              if (item.type === "parent") {
                const expanded = isMenuExpanded(item.slug);

                return (
                  <div key={item.slug} className="mb-1">
                    <div
                      onClick={() => toggleMenu(item.slug)}
                      className={`
                        flex items-center gap-3 px-5 py-3 mx-2 rounded-xl
                        transition-all duration-200 cursor-pointer select-none
                        ${
                          item.isActive
                            ? "bg-green-100/20 text-white"
                            : "text-gray-400 hover:text-white hover:bg-white/10"
                        }
                      `}
                    >
                      <i
                        className={item.icon + " w-6 text-lg flex-shrink-0"}
                      ></i>
                      <span
                        className={`flex-1 transition-opacity duration-200 ${
                          !isMobile && !isOpen
                            ? "opacity-0 group-hover:opacity-100"
                            : "opacity-100"
                        }`}
                      >
                        {item.label}
                      </span>
                      {(isMobile || isOpen) && (
                        <i
                          className={`fas fa-chevron-${
                            expanded ? "up" : "down"
                          } text-xs transition-transform duration-200 flex-shrink-0`}
                        ></i>
                      )}
                    </div>

                    {((isMobile && expandedMenus[item.slug]) ||
                      (!isMobile && isOpen && expanded)) && (
                      <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-700/50 pl-2">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.slug}
                            to={child.path}
                            onClick={() => {
                              if (isMobile) setIsOpen(false);
                            }}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-5 py-2 mx-2 rounded-xl transition-all duration-200 cursor-pointer ${
                                isActive
                                  ? "bg-green-200/20 text-white"
                                  : "text-gray-400 hover:text-white hover:bg-white/10"
                              }`
                            }
                          >
                            <i
                              className={
                                child.icon + " w-6 text-sm flex-shrink-0"
                              }
                            ></i>
                            <span className="text-sm flex-1">
                              {child.label}
                            </span>

                            {child.badge > 0 && (
                              <span
                                className={`ml-auto text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0 ${
                                  BADGE_COLORS[child.slug] || "bg-red-500"
                                }`}
                              >
                                {child.badge > 99 ? "99+" : child.badge}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.slug}
                  to={item.path}
                  end={
                    item.path === "/admin/employees" ||
                    item.path === "/admin/dashboard" ||
                    item.path === "/employee/dashboard"
                  }
                  onClick={() => isMobile && setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap overflow-hidden ${
                      isActive
                        ? "bg-green-500/20 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    }`
                  }
                >
                  <i className={item.icon + " w-6 text-lg flex-shrink-0"}></i>
                  <span
                    className={`flex-1 transition-opacity duration-200 ${
                      !isMobile && !isOpen
                        ? "opacity-0 group-hover:opacity-100"
                        : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>

                  {item.badge > 0 && (isMobile || isOpen) && (
                    <span
                      className={`text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0 ${
                        BADGE_COLORS[item.slug] || "bg-red-500"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;