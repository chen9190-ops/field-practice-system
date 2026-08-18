import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./ElevationProfileChart.css";

export function ElevationProfileChart({ data = [] }) {
  return (
    <div className="elevation-profile-chart" aria-label="路线地形剖面图">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 18, left: 2 }}>
          <CartesianGrid stroke="rgba(126, 109, 70, .2)" strokeDasharray="3 4" />
          <XAxis
            dataKey="distance"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => Math.round(value)}
            tick={{ fill: "#746f5b", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(111, 119, 63, .5)" }}
            label={{ value: "距离(m)", position: "insideBottom", offset: -12, fill: "#66664f", fontSize: 10 }}
          />
          <YAxis
            dataKey="elevation"
            width={42}
            tickFormatter={(value) => Math.round(value)}
            tick={{ fill: "#746f5b", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(111, 119, 63, .5)" }}
            label={{ value: "海拔(m)", angle: -90, position: "insideLeft", fill: "#66664f", fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))}m`, "海拔"]}
            labelFormatter={(value) => `距离 ${Math.round(Number(value))}m`}
            contentStyle={{
              border: "1px solid rgba(143, 127, 87, .35)",
              borderRadius: "10px",
              background: "rgba(255, 249, 226, .97)",
              color: "#4f5144",
              fontSize: "11px",
            }}
          />
          <Line
            type="monotone"
            dataKey="elevation"
            stroke="#718f47"
            strokeWidth={3}
            dot={data.length <= 3}
            activeDot={{ r: 5, fill: "#e8962d", stroke: "#fff8df", strokeWidth: 2 }}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
