import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { useState } from "react";
import MissedPunchOutModal from "../modals/MissedPunchoutModal";
import MissedPunchInModal from "../modals/MissedPunchInModal";
import LateCheckinModal from "../modals/LateCheckinModal";
import EarlyCheckinModal from "../modals/EarlyCheckinModal";


const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  // Modal states
  const [showEarlyCheckin, setShowEarlyCheckin] = useState(false);
  const [showLateCheckin, setShowLateCheckin] = useState(false);
  const [showMissedPunchIn, setShowMissedPunchIn] = useState(false);
  const [showMissedPunchOut, setShowMissedPunchOut] = useState(false);
  const navItems = [
    { path: "/employee/dashboard", icon: "fas fa-chart-line", label: "Dashboard" },
    { path: "/employee/leaves", icon: "fas fa-calendar-check", label: "My Leaves" },
    { path: "/employee/wfh", icon: "fas fa-home", label: "WFH Requests" },
    {
      path: "/employee/task-reports",
      icon: "fas fa-clipboard-list",
      label: "Task Reports",
    },
    { path: "/employee/payroll", icon: "fas fa-file-invoice-dollar", label: "My Payroll" },
    { path: "/employee/profile", icon: "fas fa-user-circle", label: "My Profile" },
  ];

  const attendanceSubmenus = [
    {
      label: "Early Check-in",
      icon: "fas fa-sun",
      action: () => setShowEarlyCheckin(true)
    },
    {
      label: "Late Check-in",
      icon: "fas fa-moon",
      action: () => setShowLateCheckin(true)
    },
    {
      label: "Missed Punch In",
      icon: "fas fa-fingerprint",
      action: () => setShowMissedPunchIn(true)
    },
    {
      label: "Missed Punch Out",
      icon: "fas fa-door-open",
      action: () => setShowMissedPunchOut(true)
    },
  ];

  const isMyRequestsActive = location.pathname === "/employee/attendance-requests";

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <img
            src="https://violet-leopard-500489.hostingersite.com/hr/public/assets/images/hr-logo2.jpg"
            alt="HMR Logo"
            className="logo-img"
          />
        </div>

        <nav>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Attendance Requests Section */}
          <div className="nav-section">
            {/* My Requests - Main Menu Item that navigates to the page */}
            <Link
              to="/employee/attendance-requests"
              onClick={onClose}
              className={`nav-item ${isMyRequestsActive ? "active" : ""}`}
            >
              <i className="fas fa-clock"></i>
              <span>My Requests</span>
            </Link>

            {/* Submenu Items - Open Modals */}
            <div className="nav-submenu">
              {attendanceSubmenus.map((submenu, index) => (
                <button
                  key={index}
                  onClick={() => {
                    submenu.action();
                    onClose();
                  }}
                  className="nav-submenu-item"
                >
                  <i className={submenu.icon}></i>
                  <span>{submenu.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Modals */}
      <EarlyCheckinModal
        isOpen={showEarlyCheckin}
        onClose={() => setShowEarlyCheckin(false)}
      />
      <LateCheckinModal
        isOpen={showLateCheckin}
        onClose={() => setShowLateCheckin(false)}
      />
      <MissedPunchInModal
        isOpen={showMissedPunchIn}
        onClose={() => setShowMissedPunchIn(false)}
      />
      <MissedPunchOutModal
        isOpen={showMissedPunchOut}
        onClose={() => setShowMissedPunchOut(false)}
      />
    </>
  );
};

export default Sidebar;