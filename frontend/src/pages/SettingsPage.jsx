import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import {
  profileBackIcon,
  profileChevronIcon,
  profilePageBackground,
} from "../assets/profile-ui";
import {
  clearKnownLocalCaches,
  getDefaultGeologyLayers,
  getDefaultMapMode,
  setDefaultGeologyLayers,
  setDefaultMapMode,
} from "../utils/settings";
import "./SettingsPage.css";

const APP_VERSION = "v1.0.0";
const MAP_MODES = [["standard", "标准地图"], ["satellite", "卫星地图"]];
const GEOLOGY_OPTIONS = [["lithology", "岩性"], ["stratigraphy", "地层"], ["fault", "断层"]];

function SettingRow({ label, value, onClick, interactive = true }) {
  const content = <><span>{label}</span><span className="settings-row__value">{value}{interactive && <img src={profileChevronIcon} alt="" aria-hidden="true" />}</span></>;
  return interactive
    ? <button type="button" className="settings-row" onClick={onClick}>{content}</button>
    : <div className="settings-row settings-row--static">{content}</div>;
}

function Sheet({ title, children, onClose }) {
  return <div className="settings-overlay" onMouseDown={onClose}><section className="settings-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="settings-sheet__heading"><h2>{title}</h2><button type="button" onClick={onClose}>关闭</button></div>{children}</section></div>;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [mapMode, setMapModeState] = useState(getDefaultMapMode);
  const [geologyLayers, setGeologyLayers] = useState(getDefaultGeologyLayers);
  const [panel, setPanel] = useState("");
  const [permission, setPermission] = useState("checking");
  const [permissionMessage, setPermissionMessage] = useState("");
  const [toast, setToast] = useState("");

  const checkPermission = async () => {
    setPermissionMessage("");
    if (!("geolocation" in navigator)) { setPermission("unsupported"); return; }
    if (!navigator.permissions?.query) { setPermission("unknown"); return; }
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setPermission(result.state);
      result.onchange = () => setPermission(result.state);
    } catch { setPermission("unknown"); }
  };
  useEffect(() => { checkPermission(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const permissionLabel = {
    checking: "检查中",
    granted: "已允许",
    denied: "已关闭",
    prompt: "未授权",
    unsupported: "不支持",
    unknown: "无法判断",
  }[permission];
  const requestLocation = () => {
    if (permission !== "prompt" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => { setPermission("granted"); setPermissionMessage("定位权限已允许。") },
      (error) => { setPermission(error.code === 1 ? "denied" : "prompt"); setPermissionMessage(error.code === 1 ? "定位权限已被浏览器关闭，请在浏览器的网站设置中重新开启定位权限。" : "暂时无法获取位置，请稍后重试。") },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const enabledGeologyCount = Object.values(geologyLayers).filter(Boolean).length;
  const handleBack = () => {
    if ((window.history.state?.idx || 0) > 0) navigate(-1);
    else navigate("/profile", { replace: true });
  };

  return <MobilePageShell className="settings-page">
    <img className="settings-page__background" src={profilePageBackground} alt="" aria-hidden="true" />
    <div className="settings-page__content"><header className="settings-page__topbar"><button type="button" onClick={handleBack} aria-label="返回上一页"><img src={profileBackIcon} alt="" /></button><h1>设置</h1><span /></header>
      <section className="settings-group"><h2>地图</h2><div className="settings-card"><SettingRow label="默认地图模式" value={MAP_MODES.find(([key]) => key === mapMode)?.[1]} onClick={() => setPanel("map")} /><SettingRow label="地质图层默认显示" value={`${enabledGeologyCount}项开启`} onClick={() => setPanel("geology")} /></div></section>
      <section className="settings-group"><h2>系统</h2><div className="settings-card"><SettingRow label="定位权限" value={permissionLabel} onClick={() => setPanel("location")} /><SettingRow label="清除本地缓存" onClick={() => setPanel("cache")} /></div></section>
      <section className="settings-group"><h2>关于</h2><div className="settings-card"><SettingRow label="隐私说明" onClick={() => setPanel("privacy")} /><SettingRow label="版本" value={APP_VERSION} interactive={false} /></div></section>
    </div>
    {panel === "map" && <Sheet title="默认地图模式" onClose={() => setPanel("")}><div className="settings-options">{MAP_MODES.map(([key,label]) => <button type="button" key={key} className={mapMode === key ? "is-selected" : ""} onClick={() => { if (setDefaultMapMode(key)) { setMapModeState(key); setPanel(""); setToast("默认地图模式已保存") } else setToast("设置保存失败，请稍后重试") }}>{label}<span>{mapMode === key ? "✓" : ""}</span></button>)}</div></Sheet>}
    {panel === "geology" && <Sheet title="地质图层默认显示" onClose={() => setPanel("")}><div className="settings-options">{GEOLOGY_OPTIONS.map(([key,label]) => <label className="settings-switch" key={key}><span>{label}</span><input type="checkbox" checked={geologyLayers[key]} onChange={(event) => { const next = { ...geologyLayers, [key]: event.target.checked }; if (setDefaultGeologyLayers(next)) setGeologyLayers(next); else setToast("设置保存失败，请稍后重试") }} /><i aria-hidden="true" /></label>)}</div><p className="settings-sheet__hint">进入地图后仍可临时开关各地质图层。</p></Sheet>}
    {panel === "location" && <Sheet title="定位权限" onClose={() => setPanel("")}><div className="settings-explanation">{permission === "granted" && <p>定位权限已允许。</p>}{permission === "denied" && <p>定位权限已被浏览器关闭，请在浏览器的网站设置中重新开启定位权限。</p>}{permission === "prompt" && <><p>当前尚未授予定位权限，可通过浏览器原生提示进行授权。</p><button type="button" className="settings-primary" onClick={requestLocation}>请求定位权限</button></>}{permission === "unsupported" && <p>当前浏览器不支持定位功能。</p>}{permission === "unknown" && <p>当前浏览器无法读取定位权限状态，请在使用地图定位时根据浏览器提示操作。</p>}{permission === "checking" && <p>正在检查定位权限...</p>}{permissionMessage && <p>{permissionMessage}</p>}</div></Sheet>}
    {panel === "cache" && <Sheet title="清除本地缓存" onClose={() => setPanel("")}><div className="settings-explanation"><p>清除缓存后，本地保存的临时地图、路线或页面缓存可能需要重新加载。确定清除吗？</p><div className="settings-confirm-actions"><button type="button" onClick={() => setPanel("")}>取消</button><button type="button" className="settings-primary" onClick={() => { try { clearKnownLocalCaches(); setPanel(""); setToast("本地缓存已清理") } catch { setPanel(""); setToast("缓存清理失败，请稍后重试") } }}>确认清除</button></div></div></Sheet>}
    {panel === "privacy" && <Sheet title="隐私说明" onClose={() => setPanel("")}><div className="settings-explanation"><p>野外实习助手仅在完成课程、定位签到、观察记录和 AI 分析等功能所需范围内使用相关信息。定位、照片及观察内容用于实习任务与教学分析。</p><ul><li>定位信息：用于签到、路线和观察点定位</li><li>图片：用于学生观察记录和 AI 岩性分析</li><li>观察文字：用于生成 AI 分析和实习报告</li><li>学生身份信息：用于课程与教学管理</li></ul><p>具体数据管理规则以后端及学校实际部署政策为准。</p></div></Sheet>}
    {toast && <div className="settings-toast" role="status">{toast}</div>}
  </MobilePageShell>;
}
