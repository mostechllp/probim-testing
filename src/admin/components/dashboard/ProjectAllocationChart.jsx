import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Blue gradient shades (slightly varied)
const BLUE_GRADIENT = [
  "#1a56db", // darkest
  "#1e5fd9",
  "#2563eb",
  "#2d6ee5",
  "#3b82f6",
  "#4a8df7",
  "#5a9af8",
  "#6aa7f9",
  "#7ab4fa",
  "#8ac1fb",
  "#9acefc",
  "#aadbfd",
];

export const ProjectAllocationChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-[280px] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          No project data available
        </p>
      </div>
    );
  }

  const truncatedData = data.map((item) => ({
    ...item,
    displayName:
      item.name && item.name.length > 12
        ? item.name.substring(0, 12) + "..."
        : item.name || "Unknown",
    fullName: item.name || "Unknown",
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <i className="fas fa-chart-bar text-blue-500"></i>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Employees per project
        </h3>
      </div>

      {/* Gradient definition for bars */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1a56db" />
          </linearGradient>
        </defs>
      </svg>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={truncatedData}
          margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            vertical={false}
          />
          <XAxis
            dataKey="displayName"
            tick={{ fontSize: 10, fill: "#898781" }}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={40}
            interval={0}
            dy={5}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            grid={{ stroke: "#e1e0d9", strokeWidth: 0.5 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [`${value} employees`]}
            labelFormatter={(label, props) => {
              // Get the full name from the payload
              if (props && props.length > 0) {
                return props[0]?.payload?.fullName || label;
              }
              return label;
            }}
            cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
          />
          <Bar
            dataKey="employees"
            fill="url(#blueGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          >
            {truncatedData.map((entry, index) => {
              // Calculate shade based on value
              const maxEmployees = Math.max(
                ...truncatedData.map((d) => d.employees),
              );
              const ratio = entry.employees / maxEmployees;
              const shadeIndex = Math.floor(ratio * (BLUE_GRADIENT.length - 1));

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={BLUE_GRADIENT[shadeIndex] || BLUE_GRADIENT[0]}
                  style={{
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    const element = e.target;
                    element.style.opacity = "0.8";
                    element.style.transform = "scaleY(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    const element = e.target;
                    element.style.opacity = "1";
                    element.style.transform = "scaleY(1)";
                  }}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
