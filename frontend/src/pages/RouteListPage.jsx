import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCourseRoutes } from "../api/route";
import { getCurrentCourse } from "../api/course";
import { Background } from "../components/Background";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { PaperCard } from "../components/PaperCard";
import { backIcon } from "../assets/observation";
import { setCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";
import { getAllOfflineRoutePackages } from "../offline/offlineDb";
import { deleteOfflinePackage, downloadOfflinePackage } from "../offline/offlinePackage";
import "./RouteListPage.css";

function formatStartDate(value) {
  if (!value) return "待发布";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function RouteListPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const [routes, setRoutes] = useState([]);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offlinePackages, setOfflinePackages] = useState({});
  const [offlineDialog, setOfflineDialog] = useState(null);
  const [offlineProgress, setOfflineProgress] = useState(null);
  const [offlineError, setOfflineError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      getCurrentCourse(student.id),
      getCurrentCourseRoutes(student.id),
    ])
      .then(([courseResponse, routesResponse]) => {
        if (!active) return;
        setCurrentCourse(courseResponse.data || null);
        setRoutes(Array.isArray(routesResponse.data) ? routesResponse.data : []);
      })
      .catch(() => {
        if (!active) return;
        getAllOfflineRoutePackages()
          .then((packages) => {
            if (!active || !packages.length) {
              if (active) setError("路线加载失败，请稍后重试");
              return;
            }
            setRoutes(packages.map((item) => ({
              ...item.route,
              id: item.route_id,
              route_name: item.route?.route_name || item.route?.name || "离线路线",
              route_description: item.route?.route_description || item.route?.description || "已下载的离线路线",
            })));
            setOfflinePackages(Object.fromEntries(packages.map((item) => [item.route_id, item])));
          })
          .catch(() => active && setError("路线加载失败，请稍后重试"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [student.id]);

  useEffect(() => {
    getAllOfflineRoutePackages().then((packages) => {
      setOfflinePackages(Object.fromEntries(packages.map((item) => [item.route_id, item])));
    }).catch(() => {});
  }, []);

  const openRoute = (routeId) => {
    setCurrentRouteId(routeId);
    navigate(`/routes/${routeId}/map`);
  };

  const startDownload = async () => {
    const route = offlineDialog?.route;
    if (!route) return;
    setOfflineError("");
    setOfflineProgress({ phase: "route", current: 0, total: 1, percent: 0 });
    try {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage && estimate.quota - estimate.usage < 10 * 1024 * 1024) {
          throw new Error("LOW_STORAGE");
        }
      }
      const result = await downloadOfflinePackage(route.id, student.id, setOfflineProgress);
      setOfflinePackages((current) => ({ ...current, [route.id]: result }));
      setOfflineDialog({ route, mode: "success", result });
    } catch (downloadError) {
      const messages = {
        OFFLINE: "当前处于离线状态，请联网后重试",
        UNSUPPORTED: "当前浏览器不支持离线存储",
        TOO_MANY_TILES: "当前路线离线地图范围较大，请缩小范围或降低地图精度",
        MAP_DOWNLOAD_FAILED: "地图瓦片下载失败比例过高，请稍后重试",
        LOW_STORAGE: "设备存储空间不足，无法下载完整离线包",
      };
      setOfflineError(messages[downloadError.message] || "离线包下载失败，请重试");
      setOfflineProgress(null);
    }
  };

  const removePackage = async () => {
    const routeId = offlineDialog?.route?.id;
    if (!routeId) return;
    setOfflineError("");
    try {
      await deleteOfflinePackage(routeId, student.id);
      setOfflinePackages((current) => {
        const next = { ...current };
        delete next[routeId];
        return next;
      });
      setOfflineDialog(null);
    } catch {
      setOfflineError("离线包删除失败，请稍后重试");
    }
  };

  return (
    <MobilePageShell className="route-list-page">
      <Background />
      <div className="route-list-page__wash" aria-hidden="true" />

      <div className="route-list-page__content">
        <header className="route-list-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="返回">
            <img src={backIcon} alt="" aria-hidden="true" />
          </button>
          <h1>选择实习路线</h1>
          <span aria-hidden="true" />
        </header>

        <section className="route-list" aria-live="polite">
          {loading && <p className="route-list__message">正在加载路线...</p>}
          {!loading && error && <p className="route-list__message is-error">{error}</p>}
          {!loading && !error && routes.length === 0 && (
            <p className="route-list__message">
              {currentCourse ? "该课程暂无已发布路线" : "暂未选择当前课程"}
            </p>
          )}
          {!loading && !error && routes.map((route) => {
            const offlinePackage = offlinePackages[route.id];
            return <PaperCard
              key={route.id}
              className="route-list-card"
              role="link"
              tabIndex={0}
              onClick={() => openRoute(route.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openRoute(route.id);
                }
              }}
            >
              <div className="route-list-card__content">
                <span className="route-list-card__tag">学习路线</span>
                <h2>{route.route_name}</h2>
                <p className="route-list-card__description">
                  <strong>路线简介</strong>
                  <span>{route.route_description || "暂无路线简介"}</span>
                </p>
                <div className={`route-list-card__date${route.start_date ? "" : " is-pending"}`}>
                  <strong>开始日期</strong>
                  <time>{formatStartDate(route.start_date)}</time>
                </div>
                <div className="route-list-card__offline" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  {offlinePackage ? (
                    <>
                      <span>离线包已下载 · {new Date(offlinePackage.updated_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</span>
                      <button type="button" onClick={() => setOfflineDialog({ route, mode: "confirm" })}>更新</button>
                      <button type="button" className="is-delete" onClick={() => setOfflineDialog({ route, mode: "delete" })}>删除</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setOfflineDialog({ route, mode: "confirm" })}>下载离线包</button>
                  )}
                </div>
              </div>
              <div className="route-list-card__arrow" aria-hidden="true">›</div>
            </PaperCard>;
          })}
        </section>
      </div>

      {offlineDialog && (
        <div className="offline-package-modal" role="dialog" aria-modal="true" aria-labelledby="offline-package-title">
          <section>
            <h2 id="offline-package-title">离线包</h2>
            {offlineDialog.mode === "delete" ? (
              <p>删除后，断网时将无法打开“{offlineDialog.route.route_name}”。确认删除本路线的离线数据吗？</p>
            ) : offlineDialog.mode === "success" ? (
              <>
                <p>离线包已下载完成。断网时仍可查看路线、观察点、学习资料和离线地图。</p>
                {offlineDialog.result?.progress_cache_failed && (
                  <p className="offline-package-warning">
                    路线离线包已下载，个人进度缓存更新失败。
                  </p>
                )}
                {(offlineDialog.result?.material_failed_count > 0 || offlineDialog.result?.map?.failed_tiles > 0) && (
                  <p className="offline-package-warning">
                    {offlineDialog.result.material_failed_count > 0 && `${offlineDialog.result.material_failed_count} 个学习资料未能缓存。`}
                    {offlineDialog.result.map?.failed_tiles > 0 && `${offlineDialog.result.map.failed_tiles} 张地图瓦片下载失败。`}
                  </p>
                )}
              </>
            ) : offlineProgress ? (
              <div className="offline-package-progress">
                <p>{offlineProgress.phase === "route" ? "正在准备路线数据…" : offlineProgress.phase === "materials" ? "正在下载学习资料…" : offlineProgress.phase === "map" ? "正在下载路线附近地图…" : "下载完成"}</p>
                <span>{offlineProgress.phase === "materials" ? "学习资料" : offlineProgress.phase === "map" ? "地图" : "路线数据"} {offlineProgress.current} / {offlineProgress.total}</span>
                <div><i style={{ width: `${offlineProgress.percent}%` }} /></div>
                <strong>{offlineProgress.percent}%</strong>
              </div>
            ) : (
              <>
                <p>下载后，无网络时仍可查看路线、观察点、学习资料和路线附近地图。</p>
                <ul><li>路线数据与观察点</li><li>学习资料</li><li>13～17级路线附近地图</li></ul>
                <small>地图范围越大，下载时间越长。</small>
              </>
            )}
            {offlineError && <p className="offline-package-error" role="alert">{offlineError}</p>}
            <footer>
              {offlineDialog.mode === "success" ? (
                <button type="button" onClick={() => { setOfflineDialog(null); setOfflineProgress(null); }}>完成</button>
              ) : offlineDialog.mode === "delete" ? (
                <><button type="button" onClick={() => setOfflineDialog(null)}>取消</button><button type="button" className="is-danger" onClick={removePackage}>确认删除</button></>
              ) : (
                <><button type="button" disabled={Boolean(offlineProgress)} onClick={() => setOfflineDialog(null)}>取消</button><button type="button" disabled={Boolean(offlineProgress)} onClick={startDownload}>{offlinePackages[offlineDialog.route.id] ? "开始更新" : "开始下载"}</button></>
              )}
            </footer>
          </section>
        </div>
      )}

      <BottomNav />
    </MobilePageShell>
  );
}
