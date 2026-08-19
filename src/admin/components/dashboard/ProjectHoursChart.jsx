import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Blue gradient shades
const BLUE_GRADIENT = [
  "#1a56db",
  "#2563eb", 
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
];

export const ProjectHoursChart = ({ data, onBarClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 h-[280px] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          No hours data available
        </p>
      </div>
    );
  }

  const truncatedData = data.map((item) => ({
    ...item,
    displayName:
      item.name && item.name.length > 15
        ? item.name.substring(0, 15) + "..."
        : item.name || "Unknown",
    fullName: item.name || "Unknown",
    originalData: item,
  }));

  const handleBarClick = (entry, index) => {
    if (entry && onBarClick) {
      const payload = {
        activePayload: [
          {
            payload: {
              id: entry.id || entry.projectId,
              name: entry.fullName || entry.name,
              hours: entry.hours,
              originalData: entry.originalData || entry,
            },
          },
        ],
      };
      onBarClick(payload);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <i className="fas fa-clock text-blue-500"></i>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Total working hours per project
        </h3>
        <span className="text-xs text-blue-400 ml-auto">
          <i className="fas fa-hand-pointer mr-1"></i> Click for details
        </span>
      </div>
      
      {/* SVG Gradient Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="hoursBlueGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a56db" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
      
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={truncatedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [`${value} hours`]}
            labelFormatter={(label, props) => {
              // Get the full name from the payload
              if (props && props.length > 0) {
                return props[0]?.payload?.fullName || label;
              }
              return label;
            }}
            cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
          />
          <Bar
            dataKey="hours"
            fill="url(#hoursBlueGradient)"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            cursor="pointer"
            onClick={handleBarClick}
          >
            {truncatedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#hoursBlueGradient)`}
                className="transition-all duration-300 hover:opacity-80"
                style={{
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  const element = e.target;
                  element.style.opacity = "0.8";
                  element.style.transform = "scaleX(1.02)";
                }}
                onMouseLeave={(e) => {
                  const element = e.target;
                  element.style.opacity = "1";
                  element.style.transform = "scaleX(1)";
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-400 text-center mt-2">
        <i className="fas fa-hand-pointer mr-1 text-blue-400"></i> Click on any bar to view employee details
      </div>
    </div>
  );
};