import { Navigate, Route, Routes } from 'react-router-dom'
import TeacherLayout from '../components/TeacherLayout.jsx'
import EvaluationPage from '../pages/EvaluationPage.jsx'
import StudentManagementPage from '../pages/StudentManagementPage.jsx'
import CoursesPage from '../pages/CoursesPage.jsx'
import CreatePage from '../pages/CreatePage.jsx'
import CreateRoute from '../pages/CreateRoute.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Login from '../pages/Login.jsx'
import Profile from '../pages/Profile.jsx'
import PublishRoutesPage from '../pages/PublishRoutesPage.jsx'
import Register from '../pages/Register.jsx'
import RouteDetail from '../pages/RouteDetail.jsx'
import RouteEditor from '../pages/RouteEditor.jsx'
import RouteList from '../pages/RouteList.jsx'
import RouteMapTest from '../pages/RouteMapTest.jsx'
import RouteMapPage from '../pages/RouteMapPage.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<TeacherLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/create" element={<CreatePage type="course" />} />
        <Route path="/routes" element={<RouteList />} />
        <Route path="/routes/:routeId" element={<RouteDetail />} />
        <Route path="/routes/:routeId/map" element={<RouteMapPage />} />
        <Route path="/map-test" element={<RouteMapTest />} />
        <Route path="/routes/create" element={<CreateRoute />} />
        <Route path="/routes/:routeId/edit" element={<RouteEditor />} />
        <Route path="/points/create" element={<CreatePage type="point" />} />
        <Route path="/routes/publish" element={<PublishRoutesPage />} />
        {['students','completion','attendance','observations','ai-analysis'].map((type) => <Route key={type} path={`/${type}`} element={<StudentManagementPage initialTab={type} />} />)}
        {['reports','scores','comments','statistics'].map((type) => <Route key={type} path={`/${type}`} element={<EvaluationPage initialTab={type} />} />)}
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
