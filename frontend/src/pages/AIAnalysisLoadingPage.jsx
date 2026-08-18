import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { createAIAnalysis, getAIAnalysis } from "../api/observation";
import {
  aiHelperFrog,
  aiResultBackground,
  confidenceFill,
  confidenceTrack,
  photoFrame,
  resultBottomTerrain,
} from "../assets/ai-analysis-result";
import "./AIAnalysisLoadingPage.css";
import { useStudentAuth } from "../context/StudentAuthContext";

function readAnalysisFlow(analysisId) {
  try {
    return JSON.parse(
      sessionStorage.getItem(`field-practice-analysis-flow-${analysisId}`),
    ) || {};
  } catch {
    return {};
  }
}

const analysisStages = [
  { limit: 30, text: "正在读取岩石照片" },
  { limit: 60, text: "正在分析岩石结构和矿物特征" },
  { limit: 85, text: "正在生成地质解释" },
  { limit: 100, text: "正在整理分析报告" },
];

export function AIAnalysisLoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { student } = useStudentAuth();
  const { analysisId } = useParams();
  const storedFlow = useMemo(() => readAnalysisFlow(analysisId), [analysisId]);
  const flow = { ...storedFlow, ...location.state };
  const observationId = Number(flow.studentId) === Number(student.id)
    ? flow.observationId
    : null;
  const [progress, setProgress] = useState(8);
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("");
  const stage = analysisStages.find((item) => progress < item.limit)
    || analysisStages[analysisStages.length - 1];

  useEffect(() => {
    if (status !== "processing") {
      return undefined;
    }
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(96, current + 7));
    }, 2000);
    return () => window.clearInterval(progressTimer);
  }, [status]);

  useEffect(() => {
    if (!observationId) {
      setStatus("failed");
      setMessage("缺少观察记录信息，无法查询分析状态");
      return undefined;
    }

    let active = true;
    let pollTimer;
    const pollAnalysis = async () => {
      try {
        const response = await getAIAnalysis(observationId);
        if (!active) {
          return;
        }
        const nextStatus = response.data?.status;
        if (nextStatus === "completed") {
          setProgress(100);
          navigate(`/analysis/result/${analysisId}`, {
            replace: true,
            state: {
              ...flow,
              analysis: response.data?.analysis_result,
            },
          });
          return;
        }
        if (nextStatus === "failed") {
          setStatus("failed");
          setMessage("AI分析未能完成，请重新尝试");
          return;
        }
        pollTimer = window.setTimeout(pollAnalysis, 2000);
      } catch {
        if (active) {
          setMessage("暂时无法获取分析状态，正在重试…");
          pollTimer = window.setTimeout(pollAnalysis, 2000);
        }
      }
    };

    pollAnalysis();
    return () => {
      active = false;
      window.clearTimeout(pollTimer);
    };
  }, [analysisId, navigate, observationId]);

  const handleRetry = async () => {
    if (!observationId) {
      return;
    }
    setMessage("");
    try {
      const response = await createAIAnalysis(observationId);
      const nextAnalysisId = response.data.analysis_id;
      const nextFlow = { ...flow, analysisId: nextAnalysisId };
      try {
        sessionStorage.setItem(
          `field-practice-analysis-flow-${nextAnalysisId}`,
          JSON.stringify(nextFlow),
        );
      } catch {
        try {
          sessionStorage.setItem(
            `field-practice-analysis-flow-${nextAnalysisId}`,
            JSON.stringify({
              analysisId: nextAnalysisId,
              observationId,
              routeId: flow.routeId,
              studentId: student.id,
            }),
          );
        } catch {
          // Route state is sufficient for the immediate retry flow.
        }
      }
      setStatus("processing");
      setProgress(8);
      navigate(`/analysis/loading/${nextAnalysisId}`, {
        replace: true,
        state: nextFlow,
      });
    } catch {
      setMessage("重新分析请求失败，请稍后再试");
    }
  };

  return (
    <MobilePageShell className="ai-loading-page">
      <div
        className="ai-loading-page__background"
        style={{ backgroundImage: `url(${aiResultBackground})` }}
        aria-hidden="true"
      />
      <main className="ai-loading-content">
        <div
          className={`ai-loading-photo${flow.photoUrl ? "" : " is-empty"}`}
          style={{ "--loading-photo-frame": `url(${photoFrame})` }}
        >
          {flow.photoUrl
            ? <img src={flow.photoUrl} alt="用户上传的岩石照片" />
            : <span>暂无照片</span>}
        </div>

        {status === "processing" ? (
          <section className="ai-loading-panel" aria-live="polite">
            <img src={aiHelperFrog} alt="" aria-hidden="true" />
            <h1>AI正在分析中</h1>
            <p>{stage.text}</p>
            <div
              className="ai-loading-progress"
              style={{ backgroundImage: `url(${confidenceTrack})` }}
              role="progressbar"
              aria-label="AI分析阶段进度"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div style={{ width: `${progress}%` }}>
                <img src={confidenceFill} alt="" aria-hidden="true" />
              </div>
            </div>
            <small>分析通常需要几分钟，请保持页面开启</small>
            {message && <p className="ai-loading-message">{message}</p>}
          </section>
        ) : (
          <section className="ai-loading-panel is-failed" role="alert">
            <h1>AI分析失败</h1>
            <p>{message}</p>
            <button type="button" onClick={handleRetry} disabled={!observationId}>
              重新分析
            </button>
          </section>
        )}
      </main>
      <img
        className="ai-loading-bottom-terrain"
        src={resultBottomTerrain}
        alt=""
        aria-hidden="true"
      />
    </MobilePageShell>
  );
}
