import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS, STATUS_COLORS } from "../../pages/Dashboard";

// ✅ Friendly display labels — API keys stay unchanged
const STATUS_LABELS = {
  punched_in: "Punched In",
  punched_out: "Punched Out",
  present: "Present",
  Absent: "Absent",
  Late: "Late",
  Leave: "On Leave",
  "On Time": "On Time",
  half_day: "Half Day",
  WFH: "Work From Home",
  holiday: "Holiday",
  week_off: "Week Off",
  // add more as your backend sends them
};

export const TodayStatusChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-[220px] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          No status data available
        </p>
      </div>
    );
  }

  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-[220px] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          No status data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-[220px] flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <i className="fas fa-chart-donut text-gray-500 dark:text-gray-400"></i>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Today's status
        </h3>
      </div>
      <div className="flex-1 flex items-center justify-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name] || COLORS.blue}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(value, name) => [
                `${value} employees`,
                STATUS_LABELS[name] || name, // ✅ friendly name in tooltip
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 text-xs">
          {chartData.map((item) => (
            <span
              key={item.name}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{
                  backgroundColor: STATUS_COLORS[item.name] || COLORS.blue,
                }}
              />
              {/* ✅ Friendly label in legend, raw key still used for color lookup above */}
              {STATUS_LABELS[item.name] || item.name} {item.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};