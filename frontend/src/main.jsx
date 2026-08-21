import React, { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { StudentLoginPage } from "./pages/StudentLoginPage";
import { ProtectedStudentRoute } from "./components/ProtectedStudentRoute";
import { StudentAuthProvider } from "./context/StudentAuthContext";
import "./styles/global.css";

// 非首屏页面全部懒加载：地图(OpenLayers/Recharts)、AI 分析、报告、
// 记录、收藏、个人中心等代码拆成独立 chunk，进入对应路由时才加载。
const ObservationCreatePage = lazy(() => import("./pages/ObservationCreatePage").then((m) => ({ default: m.ObservationCreatePage })));
const ObservePage = lazy(() => import("./pages/ObservePage").then((m) => ({ default: m.ObservePage })));
const AIAnalysisResultPage = lazy(() => import("./pages/AIAnalysisResultPage").then((m) => ({ default: m.AIAnalysisResultPage })));
const AIAnalysisLoadingPage = lazy(() => import("./pages/AIAnalysisLoadingPage").then((m) => ({ default: m.AIAnalysisLoadingPage })));
const CheckinRecordsPage = lazy(() => import("./pages/CheckinRecordsPage").then((m) => ({ default: m.CheckinRecordsPage })));
const RouteListPage = lazy(() => import("./pages/RouteListPage").then((m) => ({ default: m.RouteListPage })));
const StudentRouteMapPage = lazy(() => import("./pages/StudentRouteMapPage").then((m) => ({ default: m.StudentRouteMapPage })));
const ReportPage = lazy(() => import("./pages/ReportPage").then((m) => ({ default: m.ReportPage })));
const ReportDetailPage = lazy(() => import("./pages/ReportDetailPage").then((m) => ({ default: m.ReportDetailPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const StudentRegisterPage = lazy(() => import("./pages/StudentRegisterPage").then((m) => ({ default: m.StudentRegisterPage })));
const CourseSelectPage = lazy(() => import("./pages/CourseSelectPage").then((m) => ({ default: m.CourseSelectPage })));
const MyCoursesPage = lazy(() => import("./pages/MyCoursesPage").then((m) => ({ default: m.MyCoursesPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StudentAuthProvider>
      <BrowserRouter basename="/student">
        <Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={(
              <ProtectedStudentRoute>
                <HomePage />
              </ProtectedStudentRoute>
            )}
          />
          <Route path="/student/login" element={<StudentLoginPage />} />
          <Route path="/student/register" element={<StudentRegisterPage />} />
          <Route
            path="/courses/select"
            element={<ProtectedStudentRoute><CourseSelectPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/my-courses"
            element={<ProtectedStudentRoute><MyCoursesPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/map"
            element={(
              <ProtectedStudentRoute>
                <Navigate to="/routes" replace />
              </ProtectedStudentRoute>
            )}
          />
          <Route
            path="/routes"
            element={<ProtectedStudentRoute><RouteListPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/routes/:routeId/map"
            element={<ProtectedStudentRoute><StudentRouteMapPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/observe/new"
            element={<ProtectedStudentRoute><ObservationCreatePage /></ProtectedStudentRoute>}
          />
          <Route
            path="/observe"
            element={<ProtectedStudentRoute><ObservePage /></ProtectedStudentRoute>}
          />
          <Route
            path="/checkin-records"
            element={<ProtectedStudentRoute><CheckinRecordsPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/report"
            element={<ProtectedStudentRoute><ReportPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/report/detail"
            element={<ProtectedStudentRoute><ReportDetailPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/profile"
            element={(
              <ProtectedStudentRoute>
                <ProfilePage />
              </ProtectedStudentRoute>
            )}
          />
          <Route
            path="/favorites"
            element={<ProtectedStudentRoute><FavoritesPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedStudentRoute><SettingsPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedStudentRoute><NotificationsPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/analysis/loading/:analysisId"
            element={<ProtectedStudentRoute><AIAnalysisLoadingPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/analysis/result/:analysisId"
            element={<ProtectedStudentRoute><AIAnalysisResultPage /></ProtectedStudentRoute>}
          />
          <Route
            path="/analysis/result"
            element={<ProtectedStudentRoute><AIAnalysisResultPage /></ProtectedStudentRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </StudentAuthProvider>
  </StrictMode>,
);
