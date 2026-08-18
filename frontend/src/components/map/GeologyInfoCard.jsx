import React from "react";
import "./GeologyInfoCard.css";

const layerLabels = {
  lithology: "岩性分布",
  stratigraphy: "地层年代",
  fault: "断层构造",
};

const propertyLabels = {
  rock_type: "岩石类型",
  color: "图例颜色",
  period: "地质年代",
  name: "名称",
};

function formatPropertyValue(value) {
  if (value == null || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function GeologyInfoCard({ geologyFeature, onClose }) {
  if (!geologyFeature) return null;

  return (
    <section className="geology-info-card" aria-live="polite">
      <button type="button" onClick={onClose} aria-label="关闭地质详情">×</button>
      <span className="geology-info-card__eyebrow">
        {layerLabels[geologyFeature.layerType] || "地质专题"}
      </span>
      <h2>{geologyFeature.name || "未命名地质要素"}</h2>
      <span className="geology-info-card__section-title">属性字段</span>
      <dl>
        {Object.entries(geologyFeature.properties || {}).map(([key, value]) => (
          <div key={key}>
            <dt>{propertyLabels[key] || key}</dt>
            <dd>{formatPropertyValue(value)}</dd>
          </div>
        ))}
        <div><dt>经度</dt><dd>{Number(geologyFeature.longitude).toFixed(6)}</dd></div>
        <div><dt>纬度</dt><dd>{Number(geologyFeature.latitude).toFixed(6)}</dd></div>
      </dl>
    </section>
  );
}
