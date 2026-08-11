// src/admin/components/dashboard/ProjectTimeCostChart.jsx

import React, { useState, useMemo } from "react";
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
  FiUsers,
  FiCalendar,
  FiArrowUp,
  FiArrowDown,
  FiLoader,
} from "react-icons/fi";
import { CHART_COLORS } from "../../pages/Dashboard";

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
                <span>Total / Planned Hours:</span>
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
              <span>Planned Cost:</span>
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

// ─── Custom Label for Bars ──────────────────────────────────────────────

const renderCustomBarLabel = (props) => {
  const { x, y, width, value, name, payload } = props;
  
  // Only show label if value > 0
  if (value === 0) return null;
  
  // For the utilization bar, show "12h / 40h"
  if (name === "Utilization") {
    const utilizationText = `${payload.timeLogged || 0}h / ${payload.plannedHours || 0}h`;
    return (
      <text
        x={x + width / 2}
        y={y + 12}
        fill="#ffffff"
        fontSize={8}
        fontWeight="600"
        textAnchor="middle"
        className="drop-shadow-sm"
      >
        {utilizationText}
      </text>
    );
  }
  
  // For cost bars, show the cost value
  if (name === "Cost (AED)" || name === "actualCost") {
    return (
      <text
        x={x + width / 2}
        y={y + 12}
        fill="#ffffff"
        fontSize={8}
        fontWeight="600"
        textAnchor="middle"
        className="drop-shadow-sm"
      >
        AED {value.toLocaleString()}
      </text>
    );
  }
  
  return null;
};

// ─── Main Component ──────────────────────────────────────────────────────

export const ProjectTimeCostChart = ({ data, onBarClick, loading, reportPeriod }) => {
  const [activeView, setActiveView] = useState("overview");

  // ─── Process Data ──────────────────────────────────────────────────────
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const allProjects = data.map((d) => ({
      ...d,
      actual_time_logged_hours: d.actual_time_logged_hours || 0,
      actual_cost: d.actual_cost || 0,
      planned_total_hours: d.planned_total_hours || 0,
      planned_total_cost: d.planned_total_cost || 0,
    }));

    // Calculate utilization for each project
    const projectsWithUtilization = allProjects.map((d) => {
      const utilization = d.planned_total_hours > 0 
        ? Math.min(Math.round(((d.actual_time_logged_hours || 0) / d.planned_total_hours) * 100), 100)
        : 0;
      return {
        ...d,
        utilization,
        displayName: d.project_name.length > 20 ? d.project_name.substring(0, 20) + "..." : d.project_name,
        fullName: d.project_name,
        timeLogged: Math.round((d.actual_time_logged_hours || 0) * 100) / 100,
        actualCost: Math.round((d.actual_cost || 0) * 100) / 100,
        plannedHours: d.planned_total_hours || 0,
        plannedCost: d.planned_total_cost || 0,
        currency: d.currency || "AED",
        employeeCount: d.employee_breakdown?.length || 0,
        projectId: d.project_id,
        hasData: (d.actual_time_logged_hours || 0) > 0 || (d.actual_cost || 0) > 0,
        // For utilization bar: scaled value for display
        utilizationDisplay: d.planned_total_hours > 0 
          ? Math.min((d.actual_time_logged_hours / d.planned_total_hours) * 100, 100)
          : 0,
      };
    });

    // Sort by actual cost descending
    const sortedByCost = [...projectsWithUtilization].sort(
      (a, b) => (b.actualCost || 0) - (a.actualCost || 0)
    );

    // Top projects with data
    const topProjects = sortedByCost.filter(d => d.hasData).slice(0, 8);

    // ─── Summary Stats ──────────────────────────────────────────────────────
    const projectsWithData = projectsWithUtilization.filter(d => d.hasData);
    const totalHours = projectsWithUtilization.reduce((sum, d) => sum + d.timeLogged, 0);
    const totalCost = projectsWithUtilization.reduce((sum, d) => sum + d.actualCost, 0);
    const plannedHours = projectsWithUtilization.reduce((sum, d) => sum + d.plannedHours, 0);
    const plannedCost = projectsWithUtilization.reduce((sum, d) => sum + d.plannedCost, 0);
    const projectsWithPlan = projectsWithUtilization.filter(d => d.plannedHours > 0);

    return {
      overview: projectsWithUtilization,
      topProjects: topProjects,
      projectsWithPlan: projectsWithPlan,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        plannedHours: Math.round(plannedHours * 100) / 100,
        plannedCost: Math.round(plannedCost * 100) / 100,
        timeUtilization: plannedHours > 0 ? Math.min(Math.round((totalHours / plannedHours) * 100), 100) : 0,
        budgetUtilization: plannedCost > 0 ? Math.min(Math.round((totalCost / plannedCost) * 100), 100) : 0,
        costVariance: plannedCost > 0 ? Math.round(((totalCost - plannedCost) / plannedCost) * 100) : 0,
        projectCount: projectsWithData.length,
        totalProjects: projectsWithUtilization.length,
        projectsWithPlanCount: projectsWithPlan.length,
      },
    };
  }, [data]);

  if (loading) {
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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <FiTrendingUp className="text-green-600 dark:text-green-400" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Project Time & Cost</h3>
            {reportPeriod && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {reportPeriod.month}/{reportPeriod.year} • No data
              </p>
            )}
          </div>
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

  const { overview, topProjects, projectsWithPlan, summary } = processedData;

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
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total Hours</span>
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
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Total Cost</span>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">
            AED {summary.totalCost.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(summary.budgetUtilization, 100)}%` }}
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
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Cost Variance</span>
          </div>
          <p className={`text-xl font-bold ${summary.costVariance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {summary.costVariance > 0 ? '+' : ''}{summary.costVariance}%
          </p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400">
            {summary.costVariance > 0 ? 'Over budget' : summary.costVariance < 0 ? 'Under budget' : 'On track'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-3 border border-orange-200 dark:border-orange-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <FiBarChart2 className="text-orange-600 dark:text-orange-400 text-sm" />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Projects</span>
          </div>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {summary.projectCount}/{summary.totalProjects}
          </p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400">
            {summary.projectsWithPlanCount} with plans
          </p>
        </div>
      </div>

      {/* ─── BAR CHART: Utilization + Cost Combined ────────────────────── */}
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
              data={topProjects.length > 0 ? topProjects : overview.filter(d => d.hasData).slice(0, 8)}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 110, bottom: 10 }}
              onClick={onBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 9, fill: "#6b7280" }}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
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
              
              {/* Utilization Bar - Shows actual/total hours */}
              <Bar
                dataKey="utilizationDisplay"
                name="Utilization"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
                barSize={16}
                onClick={(data) => onBarClick && onBarClick({ activePayload: [{ payload: data }] })}
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
                {(topProjects.length > 0 ? topProjects : overview.filter(d => d.hasData).slice(0, 8)).map((entry, index) => {
                  const utilization = entry.utilization || 0;
                  const color = utilization >= 80 ? '#8b5cf6' : utilization >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <Cell key={`util-${index}`} fill={color} />
                  );
                })}
              </Bar>
              
              {/* Cost Bar */}
              <Bar
                dataKey="actualCost"
                name="Cost (AED)"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
                barSize={16}
                onClick={(data) => onBarClick && onBarClick({ activePayload: [{ payload: data }] })}
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
                {(topProjects.length > 0 ? topProjects : overview.filter(d => d.hasData).slice(0, 8)).map((entry, index) => (
                  <Cell key={`cost-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Quick Utilization List ────────────────────────────────────── */}
      <div className="mt-1 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
            Time Utilization Details
          </span>
          <span className="text-[8px] text-gray-400">Actual / Total Hours</span>
        </div>
        <div className="grid grid-cols-1 gap-1 max-h-[60px] overflow-y-auto">
          {projectsWithPlan.slice(0, 6).map((project, index) => (
            <div 
              key={index}
              onClick={() => onBarClick && onBarClick({ activePayload: [{ payload: project }] })}
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded px-2 py-0.5 transition-colors flex items-center justify-between"
            >
              <span className="text-[8px] text-gray-600 dark:text-gray-400 truncate flex-1">
                {project.fullName}
              </span>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      project.utilization >= 80 ? 'bg-purple-500' : 
                      project.utilization >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(project.utilization, 100)}%` }}
                  />
                </div>
                <span className={`text-[7px] font-medium whitespace-nowrap ${
                  project.utilization >= 80 ? 'text-purple-600' : 
                  project.utilization >= 50 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {project.timeLogged}h / {project.plannedHours}h
                </span>
              </div>
            </div>
          ))}
          {projectsWithPlan.length > 6 && (
            <div className="text-[7px] text-gray-400 text-center">
              +{projectsWithPlan.length - 6} more projects
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render Scatter ──────────────────────────────────────────────────────
  const renderScatter = () => (
    <div className="space-y-2">
      <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
        Bubble size = number of employees • Gray = no activity
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
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
              onClick={(data) => onBarClick && onBarClick({ activePayload: [{ payload: data }] })}
              cursor="pointer"
            >
              {overview.map((entry, index) => (
                <Cell 
                  key={`s-${index}`} 
                  fill={entry.hasData ? CHART_COLORS[index % CHART_COLORS.length] : "#d1d5db"}
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
    const plannedData = overview.filter(d => d.plannedHours > 0 || d.plannedCost > 0).slice(0, 10);
    return (
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={plannedData}
            margin={{ top: 5, right: 5, left: 0, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
            <XAxis
              dataKey="displayName"
              angle={-30}
              textAnchor="end"
              height={30}
              tick={{ fontSize: 7, fill: "#6b7280" }}
              interval={0}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 7, fill: "#6b7280" }} width={25} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 7, fill: "#6b7280" }} width={25} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 7, paddingTop: 2 }} />
            <Bar yAxisId="left" dataKey="plannedHours" name="Planned Hrs" fill="#94a3b8" barSize={7} />
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
              name="Planned Cost"
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
      .filter(d => d.actualCost > 0 || d.plannedCost > 0)
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
                onClick={(data) => onBarClick && onBarClick({ activePayload: [{ payload: data }] })}
                cursor="pointer"
              >
                {budgetData.map((entry, index) => (
                  <Cell 
                    key={`p-${index}`} 
                    fill={entry.hasData ? CHART_COLORS[index % CHART_COLORS.length] : "#e5e7eb"}
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
                        <p className="font-semibold text-gray-800 dark:text-white">{data.fullName}</p>
                        <p className="text-green-600 dark:text-green-400">
                          Actual: {data.currency || "AED"} {data.actualCost.toLocaleString()}
                        </p>
                        {data.plannedCost > 0 && (
                          <p className="text-gray-500 dark:text-gray-400">
                            Planned: {data.currency || "AED"} {data.plannedCost.toLocaleString()}
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
                  <span className="text-gray-600 dark:text-gray-300">{value}</span>
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
            {reportPeriod && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {reportPeriod.month}/{reportPeriod.year} • {summary.totalProjects} projects
              </p>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
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

      {/* Chart Content */}
      {renderView()}
    </div>
  );
};