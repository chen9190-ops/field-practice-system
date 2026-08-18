import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getReportStatus } from "../api/report";
import { getRoute } from "../api/route";
import { MobilePageShell } from "../components/layout/MobilePageShell";
import { useStudentAuth } from "../context/StudentAuthContext";
import {
  reportBackIcon,
  reportBackground,
  reportShareIcon,
} from "../assets/report";
import "./ReportDetailPage.css";

function renderInlineMarkdown(text, keyPrefix) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function splitTableRow(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function ReportContent({ text }) {
  const lines = text.split(/\r?\n/);
  const elements = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const nextLine = lines[index + 1]?.trim() || "";
    if (line.includes("|") && /^\|?[\s:|-]+\|?$/.test(nextLine)) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      elements.push(
        <div className="report-detail-paper__table-wrap" key={`table-${index}`}>
          <table>
            <thead>
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th key={`head-${cellIndex}`}>
                    {renderInlineMarkdown(cell, `head-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>
                      {renderInlineMarkdown(cell, `cell-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const HeadingTag = `h${Math.min(heading[1].length + 2, 6)}`;
      elements.push(
        <HeadingTag key={`heading-${index}`}>
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </HeadingTag>,
      );
      continue;
    }

    if (/^---+$/.test(line)) {
      elements.push(<hr key={`rule-${index}`} />);
      continue;
    }

    const listItem = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    elements.push(
      <p
        className={listItem ? "report-detail-paper__list-item" : undefined}
        key={`paragraph-${index}`}
      >
        {listItem && (
          <span aria-hidden="true">
            {/^\d/.test(listItem[1]) ? listItem[1] : "•"}
          </span>
        )}
        {renderInlineMarkdown(listItem?.[2] || line, `paragraph-${index}`)}
      </p>,
    );
  }

  return elements;
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

function TeacherEvaluation({ evaluation }) {
  const hasScore = evaluation?.score != null;
  const comment = typeof evaluation?.comment === "string"
    ? evaluation.comment.trim()
    : "";

  return (
    <section className="report-detail-evaluation" aria-labelledby="teacher-evaluation-title">
      <h3 id="teacher-evaluation-title">教师评价</h3>
      {!hasScore && !comment ? (
        <p className="report-detail-evaluation__empty">教师暂未评价</p>
      ) : (
        <dl>
          <div>
            <dt>评分</dt>
            <dd>{hasScore ? <><strong>{evaluation.score}</strong> / 100</> : "暂未评分"}</dd>
          </div>
          <div>
            <dt>教师评语</dt>
            <dd>{comment || "暂无教师评语"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function ReportDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { student } = useStudentAuth();
  const reportId = Number(new URLSearchParams(location.search).get("id"));
  const [report, setReport] = useState(null);
  const [reportTitle, setReportTitle] = useState("地质实习报告");
  const [errorMessage, setErrorMessage] = useState("");

  const handleShare = async () => {
    const shareData = {
      title: reportTitle,
      text: `${reportTitle}，生成时间：${formatReportTime(report?.create_time)}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      window.alert("报告链接已复制");
    } catch (error) {
      if (error.name !== "AbortError") {
        window.alert("分享失败，请稍后重试");
      }
    }
  };

  const handleExportPdf = () => {
    const originalTitle = document.title;
    document.title = reportTitle;
    window.print();
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  useEffect(() => {
    let active = true;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      setErrorMessage("报告参数无效");
      return () => {
        active = false;
      };
    }

    getReportStatus(reportId)
      .then(async (response) => {
        const reportData = response.data;
        if (Number(reportData?.student_id) !== Number(student.id)) {
          throw new Error("该报告不属于当前登录学生");
        }
        if (reportData?.status !== "completed" || !reportData.report_text) {
          throw new Error(
            reportData?.error_message
              || (reportData?.status === "processing"
                ? "报告仍在生成中"
                : "报告内容暂不可用"),
          );
        }

        let title = "地质实习报告";
        try {
          const routeResponse = await getRoute(reportData.route_id);
          const routeName = routeResponse.data?.route_name
            || routeResponse.data?.name
            || "";
          if (routeName) {
            title = `${routeName.replace(/路线$/, "")}报告`;
          }
        } catch {
          // Route metadata is optional; the report itself can still be displayed.
        }

        if (active) {
          setReport(reportData);
          setReportTitle(title);
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(
            error.response?.data?.detail
              || error.response?.data?.message
              || error.message
              || "报告加载失败",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [reportId, student.id]);

  return (
    <MobilePageShell className="report-detail-page">
      <img
        className="report-detail-page__background"
        src={reportBackground}
        alt=""
        aria-hidden="true"
      />

      <div className="report-detail-page__scroll">
        <header className="report-detail-page__topbar">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="返回上一页"
          >
            <img src={reportBackIcon} alt="" aria-hidden="true" />
          </button>
          <h1>AI实习报告</h1>
          <button
            type="button"
            onClick={handleShare}
            aria-label="分享实习报告"
            disabled={!report}
          >
            <img src={reportShareIcon} alt="" aria-hidden="true" />
          </button>
        </header>

        {errorMessage ? (
          <section className="report-detail-page__message">
            <strong>报告暂时无法显示</strong>
            <p>{errorMessage}</p>
          </section>
        ) : report ? (
          <article className="report-detail-paper">
            <header>
              <h2>{reportTitle}</h2>
              <time dateTime={report.create_time}>
                生成时间：{formatReportTime(report.create_time)}
              </time>
              <button
                type="button"
                className="report-detail-paper__export"
                onClick={handleExportPdf}
              >
                导出为PDF
              </button>
            </header>
            <div className="report-detail-paper__divider" />
            <div className="report-detail-paper__content">
              <ReportContent text={report.report_text} />
              <TeacherEvaluation evaluation={report.evaluation} />
            </div>
          </article>
        ) : (
          <section className="report-detail-page__message" aria-live="polite">
            <strong>正在加载报告...</strong>
          </section>
        )}
      </div>
    </MobilePageShell>
  );
}
