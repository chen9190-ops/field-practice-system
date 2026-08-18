import React, { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import request from "../api/request";
import {
  aiHelperFrog,
  aiResultBackground,
  bulletLeaf,
  confidenceFill,
  confidenceTrack,
  formationIcon,
  mineralIcon,
  photoFrame,
  resultBackIcon,
  resultBottomTerrain,
  resultCard,
  resultDivider,
  resultShareIcon,
  retakeButton,
  saveButton,
} from "../assets/ai-analysis-result";
import "./AIAnalysisResultPage.css";
import { useStudentAuth } from "../context/StudentAuthContext";
import { createAIAnalysis } from "../api/observation";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

const STORAGE_KEY_PREFIX = "field-practice-ai-analysis-result";

function cleanValue(value) {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(cleanValue).filter(Boolean).join("、");
  }
  if (typeof value === "object") {
    return Object.values(value).map(cleanValue).filter(Boolean).join("；");
  }
  const text = String(value).trim();
  return text === "undefined" || text === "null" ? "" : text;
}

export function normalizeConfidence(value) {
  if (value == null || value === "") {
    return null;
  }

  const text = String(value).trim();
  const hasPercentSign = text.endsWith("%");
  let number = Number.parseFloat(text.replace("%", ""));
  if (!Number.isFinite(number)) {
    return null;
  }
  if (!hasPercentSign && number >= 0 && number <= 1) {
    number *= 100;
  }
  return Math.min(100, Math.max(0, Math.round(number)));
}

function readStoredResult(studentId) {
  try {
    return JSON.parse(
      sessionStorage.getItem(`${STORAGE_KEY_PREFIX}-${studentId}`),
    ) || {};
  } catch {
    return {};
  }
}

function resolvePhotoUrl(value) {
  const path = cleanValue(value);
  if (!path || /^(data:|blob:|https?:\/\/)/i.test(path)) {
    return path;
  }
  return `${request.defaults.baseURL}/${path.replace(/^\//, "")}`;
}

function ExpandableText({ text, limit = 110 }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = text.length > limit;
  const visibleText = !canCollapse || expanded
    ? text
    : `${text.slice(0, limit).trimEnd()}…`;

  return (
    <>
      <p>{visibleText}</p>
      {canCollapse && (
        <button
          type="button"
          className="ai-result-expand"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </>
  );
}

export function AIAnalysisResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { student } = useStudentAuth();
  const isOnline = useOnlineStatus();
  const { analysisId } = useParams();
  const [searchParams] = useSearchParams();
  const analysisFlow = useMemo(() => {
    if (!analysisId) {
      return {};
    }
    try {
      return JSON.parse(
        sessionStorage.getItem(`field-practice-analysis-flow-${analysisId}`),
      ) || {};
    } catch {
      return {};
    }
  }, [analysisId]);
  const sourceStudentId = location.state?.studentId || analysisFlow.studentId;
  const belongsToCurrentStudent = Number(sourceStudentId) === Number(student.id);
  const queryObservationId = searchParams.get("observation_id");
  const observationId = queryObservationId
    || (belongsToCurrentStudent
      ? location.state?.observationId
      || location.state?.observation_id
      || analysisFlow.observationId
      : null);
  const routeStateAnalysis = belongsToCurrentStudent
    ? location.state?.analysis || location.state?.analysis_result || null
    : null;
  const storedResult = useMemo(() => readStoredResult(student.id), [student.id]);
  const storedResultMatches = Number(storedResult.observationId) === Number(observationId);
  const [analysis, setAnalysis] = useState(
    routeStateAnalysis || (storedResultMatches ? storedResult.analysis : null) || null,
  );
  const [photoUrl, setPhotoUrl] = useState(resolvePhotoUrl(
    location.state?.photoUrl
      || location.state?.photo_url
      || location.state?.image_url
      || routeStateAnalysis?.photo_url
      || analysisFlow.photoUrl
      || (storedResultMatches ? storedResult.photoUrl : ""),
  ));
  const [loading, setLoading] = useState(Boolean(observationId && !routeStateAnalysis));
  const [analysisStatus, setAnalysisStatus] = useState(
    routeStateAnalysis?.status
      || (storedResultMatches ? storedResult.analysisStatus : "")
      || "",
  );
  const [loadError, setLoadError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [retryPending, setRetryPending] = useState(false);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    if (!observationId) {
      return undefined;
    }

    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      request.get(`/observations/${observationId}/ai_analysis`),
      request.get(`/observations/${observationId}`),
    ]).then(([analysisResponse, observationResponse]) => {
      if (!active) {
        return;
      }
      if (Number(observationResponse.data?.student_id) !== Number(student.id)) {
        throw new Error("OBSERVATION_STUDENT_MISMATCH");
      }
      const nextAnalysis = analysisResponse.data?.analysis_result
        || analysisResponse.data?.analysis
        || null;
      const nextStatus = String(
        analysisResponse.data?.status || nextAnalysis?.status || "",
      ).toLowerCase();
      const nextPhotoUrl = resolvePhotoUrl(
        observationResponse.data?.photo_url || nextAnalysis?.photo_url,
      ) || photoUrl;
      setAnalysisStatus(nextStatus);
      setAnalysis(["completed", "success"].includes(nextStatus) ? nextAnalysis : null);
      setPhotoUrl(nextPhotoUrl);
      setLoadError(nextStatus ? "" : "暂未获取到分析结果");
      setLoading(false);
    }).catch(() => {
      if (!active) {
        return;
      }
      setAnalysis(null);
      setAnalysisStatus("");
      setLoadError("分析结果加载失败，请稍后重试");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [observationId, student.id]);

  useEffect(() => {
    if (!analysis || !["completed", "success"].includes(analysisStatus)) {
      return;
    }
    try {
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}-${student.id}`,
        JSON.stringify({ observationId, analysis, analysisStatus, photoUrl }),
      );
    } catch {
      // Storage can be unavailable in private browsing; rendering is unaffected.
    }
  }, [analysis, analysisStatus, observationId, photoUrl, student.id]);

  const normalizedAnalysisStatus = String(analysisStatus || "").toLowerCase();
  const analysisFailed = ["failed", "error"].includes(normalizedAnalysisStatus);
  const analysisProcessing = ["processing", "pending"].includes(normalizedAnalysisStatus);
  const analysisCompleted = ["completed", "success"].includes(normalizedAnalysisStatus);

  const confidence = normalizeConfidence(analysis?.confidence);
  const rockName = cleanValue(analysis?.rock_name);
  const rockType = cleanValue(analysis?.rock_type);
  const studentReport = cleanValue(analysis?.student_report);
  const analysisItems = [
    { title: "矿物组成", value: cleanValue(analysis?.mineral), icon: mineralIcon },
    { title: "形成环境", value: cleanValue(analysis?.formation_environment), icon: formationIcon },
    { title: "结构特征", value: cleanValue(analysis?.structure), icon: bulletLeaf },
    { title: "风化情况", value: cleanValue(analysis?.weathering), icon: bulletLeaf },
    { title: "不确定性", value: cleanValue(analysis?.uncertainty), icon: bulletLeaf },
    { title: "AI建议", value: cleanValue(analysis?.suggestions), icon: bulletLeaf, collapsible: true },
  ].filter((item) => item.value);

  const handleShare = async () => {
    const shareData = {
      title: rockName ? `${rockName} · AI分析结果` : "AI分析结果",
      text: [rockName, rockType].filter(Boolean).join(" · "),
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("链接已复制");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setShareMessage("");
      }
    }
  };

  const handleRetake = () => {
    const routeId = searchParams.get("route_id")
      || location.state?.routeId
      || analysisFlow.routeId;
    navigate(routeId
      ? `/observe/new?route_id=${routeId}&mode=random`
      : "/observe/new");
  };

  const handleSave = () => {
    navigate(location.state?.saveReturnTo || "/", { replace: true });
  };

  const handleRetryAnalysis = async () => {
    const normalizedObservationId = Number(observationId);
    if (
      retryPending
      || !isOnline
      || !Number.isInteger(normalizedObservationId)
      || normalizedObservationId <= 0
    ) return;
    setRetryPending(true);
    setRetryError("");
    try {
      const response = await createAIAnalysis(normalizedObservationId);
      const nextAnalysisId = Number(response.data?.analysis_id);
      if (!Number.isInteger(nextAnalysisId) || nextAnalysisId <= 0) {
        throw new Error("ANALYSIS_ID_MISSING");
      }
      const routeId = searchParams.get("route_id")
        || location.state?.routeId
        || analysisFlow.routeId;
      const nextFlow = {
        analysisId: nextAnalysisId,
        observationId: normalizedObservationId,
        photoUrl,
        routeId,
        studentId: student.id,
        saveReturnTo: location.state?.saveReturnTo || `/routes/${routeId}/map`,
      };
      try {
        sessionStorage.setItem(
          `field-practice-analysis-flow-${nextAnalysisId}`,
          JSON.stringify(nextFlow),
        );
      } catch {
        // Route state is sufficient for the immediate loading flow.
      }
      navigate(`/analysis/loading/${nextAnalysisId}`, { state: nextFlow });
    } catch {
      setRetryPending(false);
      setRetryError("AI分析启动失败，请稍后重试");
    }
  };

  return (
    <MobilePageShell className="ai-result-page">
      <div
        className="ai-result-page__background"
        style={{ backgroundImage: `url(${aiResultBackground})` }}
        aria-hidden="true"
      />
      <div className="ai-result-page__scroll">
        <header className="ai-result-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="返回">
            <img src={resultBackIcon} alt="" aria-hidden="true" />
          </button>
          <h1>AI分析结果</h1>
          <button type="button" onClick={handleShare} aria-label="分享分析结果">
            <img src={resultShareIcon} alt="" aria-hidden="true" />
          </button>
        </header>

        <div className="ai-result-content">
          {loading ? (
            <p className="ai-result-state" role="status">正在加载分析结果…</p>
          ) : analysisFailed ? (
            <section className="ai-result-failed" role="alert">
              <img src={aiHelperFrog} alt="" aria-hidden="true" />
              <h2>AI分析失败</h2>
              <p>本次分析未能完成，请重新尝试。</p>
              <button
                type="button"
                style={{ backgroundImage: `url(${saveButton})` }}
                onClick={handleRetryAnalysis}
                disabled={retryPending || !isOnline}
              >
                {retryPending
                  ? "正在重新分析…"
                  : isOnline ? "重新分析" : "重新分析（需联网）"}
              </button>
              {retryError && <small>{retryError}</small>}
            </section>
          ) : analysisProcessing ? (
            <p className="ai-result-state" role="status">AI正在分析中，请稍后查看结果。</p>
          ) : analysisCompleted && analysis ? (
            <>
              <section
                className="ai-result-summary"
                style={{ backgroundImage: `url(${resultCard})` }}
              >
                <div
                  className={`ai-result-photo${photoUrl ? "" : " is-empty"}`}
                  style={{ "--photo-frame": `url(${photoFrame})` }}
                >
                  {photoUrl
                    ? <img src={photoUrl} alt={rockName ? `${rockName}照片` : "用户上传的岩石照片"} />
                    : <span>暂无照片</span>}
                </div>
                <div className="ai-result-summary__copy">
                  <span>识别结果</span>
                  <h2>{rockName || "待确认岩石"}</h2>
                  {rockType && <p>{rockType}</p>}
                </div>
                <img
                  className="ai-result-summary__frog"
                  src={aiHelperFrog}
                  alt=""
                  aria-hidden="true"
                />
              </section>

              {confidence != null && (
                <section className="ai-result-confidence" aria-label={`置信度 ${confidence}%`}>
                  <div className="ai-result-section-title">
                    <h2>置信度</h2>
                    <strong>{confidence}%</strong>
                  </div>
                  <div
                    className="ai-result-progress"
                    style={{ backgroundImage: `url(${confidenceTrack})` }}
                  >
                    <div style={{ width: `${confidence}%` }}>
                      <img src={confidenceFill} alt="" aria-hidden="true" />
                    </div>
                  </div>
                </section>
              )}

              {analysisItems.length > 0 && (
                <section className="ai-result-analysis">
                  <h2 className="ai-result-heading">分析结果</h2>
                  {analysisItems.map((item) => (
                    <article className="ai-result-item" key={item.title}>
                      <div className="ai-result-item__body">
                        <img src={item.icon} alt="" aria-hidden="true" />
                        <div>
                          <h3>{item.title}</h3>
                          {item.collapsible
                            ? <ExpandableText text={item.value} />
                            : <p>{item.value}</p>}
                        </div>
                      </div>
                      <img className="ai-result-divider" src={resultDivider} alt="" aria-hidden="true" />
                    </article>
                  ))}
                </section>
              )}

              {studentReport && (
                <section className="ai-result-report">
                  <h2 className="ai-result-heading">
                    <img src={bulletLeaf} alt="" aria-hidden="true" />
                    学生报告
                  </h2>
                  <ExpandableText text={studentReport} limit={150} />
                </section>
              )}

              {shareMessage && <p className="ai-result-message" role="status">{shareMessage}</p>}

              <div className="ai-result-actions">
                <button
                  type="button"
                  style={{ backgroundImage: `url(${retakeButton})` }}
                  onClick={handleRetake}
                >
                  再拍一张
                </button>
                <button
                  type="button"
                  style={{ backgroundImage: `url(${saveButton})` }}
                  onClick={handleSave}
                >
                  完成
                </button>
              </div>
            </>
          ) : (
            <p className="ai-result-state" role="status">
              {loadError || "暂无可显示的分析结果"}
            </p>
          )}
        </div>
      </div>

      <img
        className="ai-result-bottom-terrain"
        src={resultBottomTerrain}
        alt=""
        aria-hidden="true"
      />
    </MobilePageShell>
  );
}
