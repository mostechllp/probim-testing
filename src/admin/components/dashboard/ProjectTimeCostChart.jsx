// src/admin/components/dashboard/ProjectTimeCostChart.jsx

import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Line,
  PieChart,
  Pie,
} from "recharts";
import {
  FiTrendingUp,
  FiDollarSign,
  FiClock,
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiLoader,
  FiTarget,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";
import { CHART_COLORS } from "../../pages/Dashboard";
import { useDispatch } from "react-redux";
import { fetchProjectTimeCost } from "../../store/slices/dashboardSlice";

// ─── Custom Tooltips ──────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs min-w-[200px]">
        <p className="font-semibold text-gray-800 dark:text-white mb-1 text-sm">
          {data.fullName || data.name}
        </p>
        <div className="space-y-0.5">
          <p className="text-blue-600 dark:text-blue-400 flex justify-between">
            <span>Actual Time:</span>
            <span className="font-medium">{data.timeLogged || 0}h</span>
          </p>
          {data.plannedHours > 0 && (
            <>
              <p className="text-gray-500 dark:text-gray-400 flex justify-between">
                <span>Estimated hours:</span>
                <span className="font-medium">{data.plannedHours}h</span>
              </p>
              <p className="text-purple-600 dark:text-purple-400 flex justify-between">
                <span>Utilization:</span>
                <span className="font-medium">{data.utilization || 0}%</span>
              </p>
            </>
          )}
          <p className="text-green-600 dark:text-green-400 flex justify-between">
            <span>Actual Cost:</span>
            <span className="font-medium">
              {data.currency || "AED"} {(data.actualCost || 0).toLocaleString()}
            </span>
          </p>
          {data.plannedCost > 0 && (
            <p className="text-gray-500 dark:text-gray-400 flex justify-between">
              <span>Estimated cost:</span>
              <span className="font-medium">
                {data.currency || "AED"} {data.plannedCost.toLocaleString()}
              </span>
            </p>
          )}
          {data.employeeCount > 0 && (
            <p className="text-purple-600 dark:text-purple-400 flex justify-between mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
              <span>Employees:</span>
              <span className="font-medium">{data.employeeCount}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ─── Month/Year Selector Component ──────────────────────────────────────

const MonthYearSelector = ({ month, year, onMonthChange, onYearChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const selectedMonthLabel = months.find(m => m.value === month)?.label || month;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <FiCalendar size={14} />
        <span>{selectedMonthLabel} {year}</span>
        <FiChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 min-w-[220px] max-h-[320px] overflow-y-auto">
          <div className="space-y-3">
            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => onYearChange(parseInt(e.target.value))}
                className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                Month
              </label>
              <div className="grid grid-cols-3 gap-1">
                {months.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => {
                      onMonthChange(m.value);
                      setIsOpen(false);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      month === m.value
                        ? "bg-green-500 text-white"
                        : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {m.label.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  onMonthChange(today.getMonth() + 1);
                  onYearChange(today.getFullYear());
                  setIsOpen(false);
                }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  onMonthChange(lastMonth.getMonth() + 1);
                  onYearChange(lastMonth.getFullYear());
                  setIsOpen(false);
                }}
                className="flex-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                Last Month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────

export const ProjectTimeCostChart = ({
  data: initialData,
  onBarClick,
  loading: parentLoading,
  reportPeriod: initialReportPeriod,
}) => {
  const dispatch = useDispatch();
  const [activeView, setActiveView] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(
    initialReportPeriod?.month || new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    initialReportPeriod?.year || new Date().getFullYear()
  );
  const [localData, setLocalData] = useState(initialData);
  const [localLoading, setLocalLoading] = useState(parentLoading || false);

  // ─── Fetch data when month/year changes ──────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLocalLoading(true);
      try {
        const result = await dispatch(
          fetchProjectTimeCost({ month: selectedMonth, year: selectedYear })
        ).unwrap();
        // The result structure: { projects: [...] } or { data: { projects: [...] } }
        const projects = result?.projects || result?.data?.projects || [];
        setLocalData(projects);
      } catch (error) {
        console.error("Failed to fetch project time & cost:", error);
        setLocalData([]);
      } finally {
        setLocalLoading(false);
      }
    };

    // Only fetch if we have month/year and it's not the initial data
    if (selectedMonth && selectedYear) {
      fetchData();
    }
  }, [selectedMonth, selectedYear, dispatch]);

  // ─── Update local data when parent data changes ─────────────────────
  useEffect(() => {
    if (initialData && !parentLoading) {
      setLocalData(initialData);
    }
    setLocalLoading(parentLoading || false);
  }, [initialData, parentLoading]);

  // ─── Process Data ──────────────────────────────────────────────────────
  const processedData = useMemo(() => {
    const data = localData || [];
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const allProjects = data.map((d) => ({
      ...d,
      actual_time_logged_hours: d.actual_time_logged_hours || 0,
      actual_cost: d.actual_cost || 0,
      planned_total_hours: d.planned_total_hours || 0,
      planned_total_cost: d.planned_total_cost || 0,
    }));

    const projectsWithUtilization = allProjects.map((d) => {
      const utilization =
        d.planned_total_hours > 0
          ? Math.min(
              Math.round(
                ((d.actual_time_logged_hours || 0) / d.planned_total_hours) *
                  100,
              ),
              100,
            )
          : 0;
      return {
        ...d,
        utilization,
        displayName:
          d.project_name?.length > 20
            ? d.project_name.substring(0, 20) + "..."
            : d.project_name || "Unnamed",
        fullName: d.project_name || "Unnamed",
        timeLogged: Math.round((d.actual_time_logged_hours || 0) * 100) / 100,
        actualCost: Math.round((d.actual_cost || 0) * 100) / 100,
        plannedHours: d.planned_total_hours || 0,
        plannedCost: d.planned_total_cost || 0,
        currency: d.currency || "AED",
        employeeCount: d.employee_breakdown?.length || 0,
        projectId: d.project_id,
        hasData:
          (d.actual_time_logged_hours || 0) > 0 || (d.actual_cost || 0) > 0,
        utilizationDisplay:
          d.planned_total_hours > 0
            ? Math.min(
                (d.actual_time_logged_hours / d.planned_total_hours) * 100,
                100,
              )
            : 0,
        utilizationStatus:
          utilization >= 80 ? "good" : utilization >= 50 ? "warning" : "danger",
      };
    });

    const sortedByCost = [...projectsWithUtilization].sort(
      (a, b) => (b.actualCost || 0) - (a.actualCost || 0),
    );

    const topProjects = sortedByCost.filter((d) => d.hasData).slice(0, 8);

    const projectsWithData = projectsWithUtilization.filter((d) => d.hasData);
    const totalHours = projectsWithUtilization.reduce(
      (sum, d) => sum + d.timeLogged,
      0,
    );
    const totalCost = projectsWithUtilization.reduce(
      (sum, d) => sum + d.actualCost,
      0,
    );
    const plannedHours = projectsWithUtilization.reduce(
      (sum, d) => sum + d.plannedHours,
      0,
    );
    const plannedCost = projectsWithUtilization.reduce(
      (sum, d) => sum + d.plannedCost,
      0,
    );
    const projectsWithPlan = projectsWithUtilization.filter(
      (d) => d.plannedHours > 0,
    );

    return {
      overview: projectsWithUtilization,
      topProjects: topProjects,
      projectsWithPlan: projectsWithPlan,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        plannedHours: Math.round(plannedHours * 100) / 100,
        plannedCost: Math.round(plannedCost * 100) / 100,
        timeUtilization:
          plannedHours > 0
            ? Math.min(Math.round((totalHours / plannedHours) * 100), 100)
            : 0,
        budgetUtilization:
          plannedCost > 0
            ? Math.min(Math.round((totalCost / plannedCost) * 100), 100)
            : 0,
        costVariance:
          plannedCost > 0
            ? Math.round(((totalCost - plannedCost) / plannedCost) * 100)
            : 0,
        projectCount: projectsWithData.length,
        totalProjects: projectsWithUtilization.length,
        projectsWithPlanCount: projectsWithPlan.length,
        avgUtilization:
          projectsWithPlan.length > 0
            ? Math.round(
                projectsWithPlan.reduce((sum, d) => sum + d.utilization, 0) /
                  projectsWithPlan.length,
              )
            : 0,
      },
    };
  }, [localData]);

  // ─── Handle month/year change ────────────────────────────────────────
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // ─── Loading State ────────────────────────────────────────────────────
  if (localLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-gray-700">
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.overview.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <FiTrendingUp
                className="text-green-600 dark:text-green-400"
                size={16}
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                Project Time & Cost
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {selectedMonth}/{selectedYear} • No data
              </p>
            </div>
          </div>
          <MonthYearSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />
        </div>
        <div className="flex justify-center items-center h-32 text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <FiTrendingUp size={24} className="mx-auto mb-1 opacity-30" />
            <p className="text-xs">No project data for this period</p>
          </div>
        </div>
      </div>
    );
  }

  const {
    overview,
    topProjects,
    projectsWithPlan,
    summary,
  } = processedData;

  // ─── Render Overview ──────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-4">
      {/* Stats Row - 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-3 border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FiClock className="text-blue-600 dark:text-blue-400 text-sm" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Total Hours
            </span>
          </div>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {summary.totalHours}h
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(summary.timeUtilization, 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {summary.timeUtilization}% utilized
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-3 border border-green-200 dark:border-green-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
              <FiDollarSign className="text-green-600 dark:text-green-400 text-sm" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Total Cost
            </span>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            AED {summary.totalCost.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(summary.budgetUtilization, 100)}%`,
                }}
              />
            </div>
            <span className="text-[9px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {summary.budgetUtilization}% of budget
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-3 border border-purple-200 dark:border-purple-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <FiActivity className="text-purple-600 dark:text-purple-400 text-sm" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Cost Variance
            </span>
          </div>
          <p
            className={`text-xl font-bold ${summary.costVariance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
          >
            {summary.costVariance > 0 ? "+" : ""}
            {summary.costVariance}%
          </p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400">
            {summary.costVariance > 0
              ? "Over budget"
              : summary.costVariance < 0
                ? "Under budget"
                : "On track"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-3 border border-orange-200 dark:border-orange-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <FiBarChart2 className="text-orange-600 dark:text-orange-400 text-sm" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Projects
            </span>
          </div>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {summary.projectCount}/{summary.totalProjects}
          </p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400">
            {summary.projectsWithPlanCount} with plans
          </p>
        </div>
      </div>

      {/* BAR CHART: Utilization + Cost Combined */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            <FiLoader className="inline mr-1.5 text-purple-500" size={12} />
            Project Performance
          </span>
          <span className="text-[9px] text-gray-400">Utilization & Cost</span>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={
                topProjects.length > 0
                  ? topProjects
                  : overview.filter((d) => d.hasData).slice(0, 8)
              }
              layout="vertical"
              margin={{ top: 10, right: 10, left: 110, bottom: 10 }}
              onClick={onBarClick}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                opacity={0.3}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: "#6b7280" }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 9, fill: "#6b7280", fontWeight: 500 }}
                width={110}
                interval={0}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />

              <Bar
                dataKey="utilizationDisplay"
                name="Utilization"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
                barSize={16}
                onClick={(data) =>
                  onBarClick &&
                  onBarClick({ activePayload: [{ payload: data }] })
                }
                cursor="pointer"
                label={(props) => {
                  const { x, y, width, value, payload } = props;
                  if (value === 0 || !payload) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y + 11}
                      fill="#ffffff"
                      fontSize={7}
                      fontWeight="600"
                      textAnchor="middle"
                      className="drop-shadow-sm"
                    >
                      {payload.timeLogged || 0}h / {payload.plannedHours || 0}h
                    </text>
                  );
                }}
              >
                {(topProjects.length > 0
                  ? topProjects
                  : overview.filter((d) => d.hasData).slice(0, 8)
                ).map((entry, index) => {
                  const utilization = entry.utilization || 0;
                  const color =
                    utilization >= 80
                      ? "#8b5cf6"
                      : utilization >= 50
                        ? "#f59e0b"
                        : "#ef4444";
                  return <Cell key={`util-${index}`} fill={color} />;
                })}
              </Bar>

              <Bar
                dataKey="actualCost"
                name="Cost (AED)"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
                barSize={16}
                onClick={(data) =>
                  onBarClick &&
                  onBarClick({ activePayload: [{ payload: data }] })
                }
                cursor="pointer"
                label={(props) => {
                  const { x, y, width, value } = props;
                  if (value === 0) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y + 11}
                      fill="#ffffff"
                      fontSize={7}
                      fontWeight="600"
                      textAnchor="middle"
                      className="drop-shadow-sm"
                    >
                      AED {value.toLocaleString()}
                    </text>
                  );
                }}
              >
                {(topProjects.length > 0
                  ? topProjects
                  : overview.filter((d) => d.hasData).slice(0, 8)
                ).map((entry, index) => (
                  <Cell
                    key={`cost-${index}`}
                    fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // ─── Render Utilization Chart ──────────────────────────────────────────
  const renderUtilization = () => {
    const utilizationData = projectsWithPlan.slice(0, 10).map((p) => ({
      name: p.displayName,
      fullName: p.fullName,
      utilization: p.utilization,
      timeLogged: p.timeLogged,
      plannedHours: p.plannedHours,
      status: p.utilizationStatus,
      actualCost: p.actualCost,
      plannedCost: p.plannedCost,
      projectId: p.projectId,
    }));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 text-center">
              Project Utilization
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={utilizationData}
                  layout="vertical"
                  margin={{ top: 5, right: 5, left: 70, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.3}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fill: "#6b7280" }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{
                      fontSize: 9,
                      fill: "#4b5563",
                      fontWeight: 500,
                    }}
                    width={70}
                    interval={0}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {data.fullName}
                            </p>
                            <p className="text-purple-600 dark:text-purple-400">
                              Utilization: {data.utilization}%
                            </p>
                            <p className="text-blue-600 dark:text-blue-400">
                              Actual: {data.timeLogged}h / {data.plannedHours}h
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="utilization"
                    name="Utilization %"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    onClick={(data) =>
                      onBarClick &&
                      onBarClick({ activePayload: [{ payload: data }] })
                    }
                    cursor="pointer"
                    label={(props) => {
                      const { x, y, width, value } = props;
                      if (value === 0) return null;
                      return (
                        <text
                          x={x + width + 5}
                          y={y + 5}
                          fill="#6b7280"
                          fontSize={8}
                          fontWeight="600"
                          textAnchor="start"
                        >
                          {value}%
                        </text>
                      );
                    }}
                  >
                    {utilizationData.map((entry, index) => {
                      const color =
                        entry.utilization >= 80
                          ? "#8b5cf6"
                          : entry.utilization >= 50
                            ? "#f59e0b"
                            : "#ef4444";
                      return <Cell key={`ub-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 text-center">
              Utilization Details
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {projectsWithPlan.slice(0, 10).map((project, index) => (
                <div
                  key={index}
                  onClick={() =>
                    onBarClick &&
                    onBarClick({ activePayload: [{ payload: project }] })
                  }
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-md px-2 py-1.5 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[9px] font-medium text-gray-400 w-4 text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                      {project.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          project.utilization >= 80
                            ? "bg-purple-500"
                            : project.utilization >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(project.utilization, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[8px] font-semibold min-w-[28px] text-right ${
                        project.utilization >= 80
                          ? "text-purple-600 dark:text-purple-400"
                          : project.utilization >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {project.utilization}%
                    </span>
                  </div>
                </div>
              ))}
              {projectsWithPlan.length === 0 && (
                <div className="text-center py-3 text-gray-400 dark:text-gray-500 text-xs">
                  No projects with planned hours
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render Scatter ──────────────────────────────────────────────────────
  const renderScatter = () => (
    <div className="space-y-2">
      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
        Bubble size = number of employees • Gray = no activity
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              opacity={0.4}
            />
            <XAxis
              type="number"
              dataKey="timeLogged"
              name="Time Logged"
              unit="h"
              tick={{ fontSize: 8, fill: "#6b7280" }}
              tickFormatter={(value) => `${value}h`}
            />
            <YAxis
              type="number"
              dataKey="actualCost"
              name="Actual Cost"
              tick={{ fontSize: 8, fill: "#6b7280" }}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
              }
            />
            <ZAxis dataKey="employeeCount" range={[20, 120]} name="Employees" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              name="Projects"
              data={overview}
              fill="#2a78d6"
              onClick={(data) =>
                onBarClick && onBarClick({ activePayload: [{ payload: data }] })
              }
              cursor="pointer"
            >
              {overview.map((entry, index) => (
                <Cell
                  key={`s-${index}`}
                  fill={
                    entry.hasData
                      ? CHART_COLORS[index % CHART_COLORS.length]
                      : "#d1d5db"
                  }
                  opacity={entry.hasData ? 1 : 0.4}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ─── Render Planned vs Actual ──────────────────────────────────────────
  const renderPlannedVsActual = () => {
    const plannedData = overview
      .filter((d) => d.plannedHours > 0 || d.plannedCost > 0)
      .slice(0, 10);
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={plannedData}
            margin={{ top: 5, right: 5, left: 0, bottom: 15 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              opacity={0.4}
            />
            <XAxis
              dataKey="displayName"
              angle={-30}
              textAnchor="end"
              height={30}
              tick={{ fontSize: 7, fill: "#6b7280" }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 7, fill: "#6b7280" }}
              width={25}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 7, fill: "#6b7280" }}
              width={25}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 7, paddingTop: 2 }} />
            <Bar
              yAxisId="left"
              dataKey="plannedHours"
              name="Planned Hrs"
              fill="#94a3b8"
              barSize={7}
            />
            <Bar
              yAxisId="left"
              dataKey="timeLogged"
              name="Actual Hrs"
              fill="#2a78d6"
              barSize={7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="plannedCost"
              name="Estimated cost"
              stroke="#94a3b8"
              strokeWidth={1}
              dot={{ r: 1.5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="actualCost"
              name="Actual Cost"
              stroke="#10b981"
              strokeWidth={1}
              dot={{ r: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // ─── Render Budget Distribution ──────────────────────────────────────
  const renderBudget = () => {
    const budgetData = overview
      .filter((d) => d.actualCost > 0 || d.plannedCost > 0)
      .slice(0, 8);

    return (
      <div className="space-y-2">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={budgetData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="actualCost"
                nameKey="displayName"
                onClick={(data) =>
                  onBarClick &&
                  onBarClick({ activePayload: [{ payload: data }] })
                }
                cursor="pointer"
              >
                {budgetData.map((entry, index) => (
                  <Cell
                    key={`p-${index}`}
                    fill={
                      entry.hasData
                        ? CHART_COLORS[index % CHART_COLORS.length]
                        : "#e5e7eb"
                    }
                    opacity={entry.hasData ? 1 : 0.4}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {data.fullName}
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          Actual: {data.currency || "AED"}{" "}
                          {data.actualCost.toLocaleString()}
                        </p>
                        {data.plannedCost > 0 && (
                          <p className="text-gray-500 dark:text-gray-400">
                            Planned: {data.currency || "AED"}{" "}
                            {data.plannedCost.toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 7 }}
                formatter={(value) => (
                  <span className="text-gray-600 dark:text-gray-300">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-[8px] text-gray-400">
          Top {budgetData.length} projects by cost
        </div>
      </div>
    );
  };

  // ─── Render Active View ──────────────────────────────────────────────
  const renderView = () => {
    switch (activeView) {
      case "overview":
        return renderOverview();
      case "utilization":
        return renderUtilization();
      case "scatter":
        return renderScatter();
      case "planned":
        return renderPlannedVsActual();
      case "budget":
        return renderBudget();
      default:
        return renderOverview();
    }
  };

  // ─── Main Render ──────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-soft border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <FiTrendingUp className="text-white" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">
              Project Time & Cost
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {selectedMonth}/{selectedYear} • {summary.totalProjects} projects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Month/Year Selector */}
          <MonthYearSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
          />

          {/* View Tabs */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 flex-wrap">
            <button
              onClick={() => setActiveView("overview")}
              className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                activeView === "overview"
                  ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Overview"
            >
              <FiBarChart2 className="inline mr-1" size={11} />
              Overview
            </button>
            <button
              onClick={() => setActiveView("utilization")}
              className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                activeView === "utilization"
                  ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Utilization"
            >
              <FiTarget className="inline mr-1" size={11} />
              Utilization
            </button>
            <button
              onClick={() => setActiveView("scatter")}
              className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                activeView === "scatter"
                  ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Scatter"
            >
              <FiActivity className="inline mr-1" size={11} />
              Scatter
            </button>
            <button
              onClick={() => setActiveView("planned")}
              className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                activeView === "planned"
                  ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Plan vs Actual"
            >
              <FiTrendingUp className="inline mr-1" size={11} />
              Plan vs Actual
            </button>
            <button
              onClick={() => setActiveView("budget")}
              className={`px-2.5 py-1 rounded text-[9px] font-medium transition-all ${
                activeView === "budget"
                  ? "bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title="Budget"
            >
              <FiPieChart className="inline mr-1" size={11} />
              Budget
            </button>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      {renderView()}
    </div>
  );
};