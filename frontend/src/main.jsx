import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ObservationCreatePage } from "./pages/ObservationCreatePage";
import { ObservePage } from "./pages/ObservePage";
import { AIAnalysisResultPage } from "./pages/AIAnalysisResultPage";
import { AIAnalysisLoadingPage } from "./pages/AIAnalysisLoadingPage";
import { CheckinRecordsPage } from "./pages/CheckinRecordsPage";
import { RouteListPage } from "./pages/RouteListPage";
import { StudentRouteMapPage } from "./pages/StudentRouteMapPage";
import { ReportPage } from "./pages/ReportPage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { StudentLoginPage } from "./pages/StudentLoginPage";
import { StudentRegisterPage } from "./pages/StudentRegisterPage";
import { CourseSelectPage } from "./pages/CourseSelectPage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProtectedStudentRoute } from "./components/ProtectedStudentRoute";
import { StudentAuthProvider } from "./context/StudentAuthContext";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StudentAuthProvider>
      <BrowserRouter basename="/student">
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
      </BrowserRouter>
    </StudentAuthProvider>
  </StrictMode>,
);
