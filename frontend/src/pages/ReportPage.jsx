import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCheckin } from "../api/checkin";
import { getAIAnalysis, getObservation } from "../api/observation";
import {
  generateReport,
  getReportStatus,
  getStudentReports,
} from "../api/report";
import { getPoints, getRoute } from "../api/route";
import { BottomNav } from "../components/BottomNav";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import {
  completionCard,
  generateReportButton,
  reportBackIcon,
  reportBackground,
  reportCard,
  reportHeader,
} from "../assets/report";
import "./ReportPage.css";
import { resolveCurrentRouteId } from "../utils/currentRoute";
import { useStudentAuth } from "../context/StudentAuthContext";

const emptyReportPreview = {
  completion: 0,
  checkedIn: "0/0",
  records: 0,
  analyses: 0,
  reportId: null,
  title: "暂无实习报告",
  generatedAt: "--",
  wordCount: "约0字",
};

const REPORT_POLL_INTERVAL = 2000;
const REPORT_POLL_TIMEOUT = 12 * 60 * 1000;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function waitForReport(reportId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < REPORT_POLL_TIMEOUT) {
    const response = await getReportStatus(reportId);
    const report = response.data;

    if (report?.status === "completed") return report;
    if (report?.status === "failed") {
      throw new Error(report.error_message || "报告生成失败");
    }

    await wait(REPORT_POLL_INTERVAL);
  }

  throw new Error("报告生成超时，请稍后在我的报告中查看");
}

function fulfilledArray(result) {
  return result.status === "fulfilled" && Array.isArray(result.value.data)
    ? result.value.data
    : [];
}

function formatReportTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const pad = (number) => String(number).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join(" ");
}

export function ReportPage() {
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const params = new URLSearchParams(window.location.search);
  const studentId = student.id;
  const routeId = resolveCurrentRouteId(params.get("route_id"));
  const [reportPreview, setReportPreview] = useState(emptyReportPreview);
  const [routeName, setRouteName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [personalSummary, setPersonalSummary] = useState("");
  const [personalSummaryError, setPersonalSummaryError] = useState("");

  useEffect(() => {
    let active = true;
    if (!routeId) {
      setRouteName("");
      setReportPreview(emptyReportPreview);
      return () => { active = false; };
    }

    Promise.allSettled([
      getPoints(routeId),
      getCheckin(studentId, routeId),
      getObservation(studentId),
      getStudentReports(studentId),
      getRoute(routeId),
    ]).then(async ([
      pointsResult,
      checkinsResult,
      observationsResult,
      reportsResult,
      routeResult,
    ]) => {
      const points = fulfilledArray(pointsResult);
      const checkins = fulfilledArray(checkinsResult);
      const observations = fulfilledArray(observationsResult).filter(
        (observation) => Number(observation.route_id) === routeId,
      );
      const reports = fulfilledArray(reportsResult).filter(
        (report) => Number(report.route_id) === routeId,
      );

      const analysisResults = await Promise.allSettled(
        observations.map((observation) => getAIAnalysis(observation.id)),
      );
      const completedAnalysisCount = analysisResults.filter((result) => (
        result.status === "fulfilled"
        && (result.value.data?.status === "completed"
          || result.value.data?.analysis_result?.status === "completed")
      )).length;

      const completedCheckins = checkins.filter((checkin) => (
        ["success", "completed"].includes(
          String(checkin.status || "").toLowerCase(),
        )
      ));
      const checkedCount = completedCheckins.length;
      const totalPointCount = points.length;
      const completion = totalPointCount > 0
        ? Math.min(100, Math.round((checkedCount / totalPointCount) * 100))
        : 0;
      const latestReport = [...reports].sort((left, right) => {
        const timeDifference = new Date(right.create_time || 0).getTime()
          - new Date(left.create_time || 0).getTime();
        return timeDifference || Number(right.id || 0) - Number(left.id || 0);
      })[0] || null;
      const route = routeResult.status === "fulfilled"
        ? routeResult.value.data
        : null;
      const routeName = route?.route_name || route?.name || "";
      const reportText = latestReport?.report_text || "";
      const wordCount = reportText.replace(/\s/g, "").length;

      if (active) {
        setRouteName(routeName);
        setReportPreview({
          completion,
          checkedIn: `${checkedCount}/${totalPointCount}`,
          records: observations.length,
          analyses: completedAnalysisCount,
          reportId: latestReport?.id ?? null,
          title: latestReport
            ? `${routeName.replace(/路线$/, "") || "实习"}报告`
            : "暂无实习报告",
          generatedAt: formatReportTime(latestReport?.create_time),
          wordCount: `约${wordCount}字`,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [routeId, studentId]);

  const handleGenerate = async () => {
    if (isGenerating || !routeId) {
      if (!routeId) navigate("/routes");
      return;
    }
    const trimmedSummary = personalSummary.trim();
    if (!trimmedSummary) {
      setPersonalSummaryError("请先填写个人实习心得");
      return;
    }
    setIsGenerating(true);
    setGenerationProgress(0);
    setShowGenerationProgress(true);

    const progressTimer = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current < 30) return Math.min(30, current + 4);
        if (current < 70) return Math.min(70, current + 3);
        if (current < 90) return Math.min(90, current + 2);
        return Math.min(96, current + 1);
      });
    }, 800);

    try {
      const taskResponse = await generateReport(studentId, routeId, trimmedSummary);
      const reportId = taskResponse.data?.report_id;
      if (reportId == null) {
        throw new Error("后端未返回报告任务ID");
      }

      await waitForReport(reportId);
      window.clearInterval(progressTimer);
      setGenerationProgress(100);
      await wait(500);
      setShowGenerationProgress(false);
      navigate(`/report/detail?id=${reportId}`);
    } catch (error) {
      setShowGenerationProgress(false);
      const message = error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || "请稍后重试";
      window.alert(`报告生成失败：${message}`);
    } finally {
      window.clearInterval(progressTimer);
      setIsGenerating(false);
    }
  };

  return (
    <MobilePageShell className="report-page">
      <img
        className="report-page__background"
        src={reportBackground}
        alt=""
        aria-hidden="true"
      />

      <div className="report-page__scroll">
        <header className="report-page__topbar">
          <button
            type="button"
            className="report-page__icon-button"
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
          >
            <img src={reportBackIcon} alt="" aria-hidden="true" />
          </button>
          <h1>AI实习报告</h1>
          <span aria-hidden="true" />
        </header>

        <section className="report-hero" aria-label="野外实习插画">
          <img
            className="report-hero__landscape"
            src={reportHeader}
            alt=""
            aria-hidden="true"
          />
        </section>

        <section
          className="report-completion"
          style={{ "--report-card-image": `url(${completionCard})` }}
        >
          <h2>实习数据完成度</h2>
          <strong className="report-completion__percentage">
            {reportPreview.completion}<small>%</small>
          </strong>
          <div
            className="report-completion__progress"
            role="progressbar"
            aria-label="实习数据完成度"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={reportPreview.completion}
          >
            <span style={{ width: `${reportPreview.completion}%` }} />
          </div>
          <div className="report-completion__stats">
            <div>
              <span>已签到</span>
              <strong>{reportPreview.checkedIn}</strong>
            </div>
            <div>
              <span>记录数</span>
              <strong>{reportPreview.records}</strong>
            </div>
            <div>
              <span>分析数</span>
              <strong>{reportPreview.analyses}</strong>
            </div>
          </div>
        </section>

        <section className="report-personal-summary" aria-labelledby="report-personal-summary-title">
          <label id="report-personal-summary-title" htmlFor="report-personal-summary-input">
            个人实习心得 <span aria-hidden="true">*</span>
          </label>
          <p>生成实习报告前，请填写本次实习的收获、遇到的问题和自己的思考</p>
          <textarea
            id="report-personal-summary-input"
            value={personalSummary}
            rows={5}
            required
            disabled={isGenerating}
            aria-required="true"
            aria-invalid={Boolean(personalSummaryError)}
            aria-describedby="report-personal-summary-help report-personal-summary-error"
            placeholder="请写下这次实习中最有收获的内容、遇到的问题或自己的思考……"
            onChange={(event) => {
              const value = event.target.value;
              setPersonalSummary(value);
              if (value.trim()) setPersonalSummaryError("");
            }}
          />
          <small id="report-personal-summary-help">内容仅用于生成本次 AI 实习报告</small>
          <span
            id="report-personal-summary-error"
            className="report-personal-summary__error"
            role={personalSummaryError ? "alert" : undefined}
          >
            {personalSummaryError}
          </span>
        </section>

        <button
          type="button"
          className="report-generate-button"
          style={{ "--generate-report-image": `url(${generateReportButton})` }}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          <strong>
            {isGenerating
              ? "正在生成..."
              : <>生成AI报告 <span aria-hidden="true">›</span></>}
          </strong>
          <small>基于你的实习轨迹自动生成总结报告</small>
        </button>

        <section className="report-list">
          <h2>我的报告</h2>
          <button
            type="button"
            className="report-card"
            style={{ "--report-card-image": `url(${reportCard})` }}
            onClick={() => {
              if (reportPreview.reportId != null) {
                navigate(`/report/detail?id=${reportPreview.reportId}`);
              }
            }}
            aria-label={`查看${reportPreview.title}`}
          >
            <strong>{reportPreview.title}</strong>
            <span>生成时间：{reportPreview.generatedAt}</span>
            <span>字数：{reportPreview.wordCount}</span>
            <b aria-hidden="true">›</b>
          </button>
        </section>
      </div>

      <BottomNav activeId="report" />

      {showGenerationProgress && (
        <div className="report-generation-modal" role="presentation">
          <section
            className="report-generation-modal__paper"
            style={{ "--report-modal-image": `url(${reportCard})` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-generation-title"
          >
            <h2 id="report-generation-title">正在生成AI报告</h2>
            <strong>{Math.round(generationProgress)}%</strong>
            <div
              className="report-generation-modal__progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(generationProgress)}
            >
              <span style={{ width: `${generationProgress}%` }} />
            </div>
            <p>
              {generationProgress < 30 && "整理实习数据"}
              {generationProgress >= 30 && generationProgress < 70
                && "AI正在分析观察记录"}
              {generationProgress >= 70 && generationProgress < 90
                && "正在生成报告正文"}
              {generationProgress >= 90 && "正在保存报告"}
            </p>
            <small>请稍候，不要关闭页面</small>
          </section>
        </div>
      )}
    </MobilePageShell>
  );
}
