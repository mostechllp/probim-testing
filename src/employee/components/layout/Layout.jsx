// Layout.jsx
import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import Sidebar from "../../../components/common/Sidebar";
import Header from "../common/Header";
import UnifiedWidgets from "../widgets/UnifiedWidgets";

const Layout = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="app flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="main flex-1 flex flex-col min-h-screen">
        <Header onMenuClick={toggleSidebar} />
        <div className="content-section py-7 px-4 md:px-7 flex-1">
          <Outlet />
        </div>
        
        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto">
          <div className="max-w-[1600px] mx-auto px-4 md:px-7 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} All Rights Reserved
              </p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Developed by{" "}
                <a
                  href="https://mostech.ae/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors hover:underline"
                >
                  Mostech Business Solutions
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Unified Widgets - Handles both mobile and desktop */}
      <UnifiedWidgets />
    </div>
  );
};

export default Layout;