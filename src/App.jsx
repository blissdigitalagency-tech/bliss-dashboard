import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import Login from './pages/Login.jsx'
import Overview from './pages/Overview.jsx'
import Clients from './pages/Clients.jsx'
import Invoices from './pages/Invoices.jsx'
import Tasks from './pages/Tasks.jsx'
import Content from './pages/Content.jsx'
import Calendar from './pages/Calendar.jsx'
import Analytics from './pages/Analytics.jsx'
import Settings from './pages/Settings.jsx'
import AdminUsers from './pages/AdminUsers.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="clients" element={<Clients />} />
        <Route
          path="invoices"
          element={
            <ProtectedRoute role="Admin">
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route path="tasks" element={<Tasks />} />
        <Route path="content" element={<Content />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute role="Superadmin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
