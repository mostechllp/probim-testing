import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "../../admin/components/common/Header";
import Sidebar from "../../components/common/Sidebar";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="app flex min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div
        className={`flex-1 min-w-0 w-full overflow-x-hidden flex flex-col ${!isMobile ? "md:ml-[72px]" : ""}`}
      >
        {/* Fixed header container */}
        <div className="fixed top-0 right-0 z-40" style={{ left: !isMobile ? '72px' : '0' }}>
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        {/* Spacer to push content below fixed header */}
        <div className="h-[72px] md:h-[76px]"></div>
        <main className="content px-4 py-4 md:px-6 md:py-6 max-w-[1600px] mx-auto w-full overflow-x-hidden flex-1">
          <Outlet />
        </main>
        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">
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
    </div>
  );
};

export default AdminLayout;