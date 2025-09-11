import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider.jsx';

import NavBar from './components/NavBar.jsx';
import Protected from './components/Protected.jsx';

import Login from './pages/Login.jsx';
import AdminDashBoard from './pages/AdminDashBoard.jsx';
import CreateReport from './pages/CreateReport.jsx';
import Register from './pages/Register.jsx';
import ReportsList from './pages/ReportsLists.jsx'; // keep your current path
import ReportDetails from './pages/ReportDetails.jsx';
import EditReport from './pages/EditReport.jsx';
import CreateMonthly from './pages/CreateMonthly.jsx';
import MyChildren from './pages/MyChildren';
import NewChildForParent from './pages/NewChildForParent';
import ChildProfile from './pages/ChildProfile.jsx';
import AdminParents from './pages/AdminParents.jsx';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/" element={<div className="p-4">Welcome to KindergartenApp</div>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Parent-only: My Children */}
            <Route
              path="/my-children"
              element={
                <Protected role="parent">
                  <MyChildren />
                </Protected>
              }
            />
            <Route
              path="/my-children/new"
              element={
                <Protected role="parent">
                  <NewChildForParent />
                </Protected>
              }
            />

            {/* Admin-only */}
            <Route
              path="/admin"
              element={
                <Protected role="admin">
                  <AdminDashBoard />
                </Protected>
              }
            />
            <Route
              path="/reports/new"
              element={
                <Protected role="admin">
                  <CreateReport />
                </Protected>
              }
            />
            <Route
              path="/reports/monthly/new"
              element={
                <Protected role="admin">
                  <CreateMonthly />
                </Protected>
              }
            />
            <Route
              path="/reports/:kind/:id/edit"
              element={
                <Protected role="admin">
                  <EditReport />
                </Protected>
              }
            />

            {/* Authenticated (parent or admin) */}
            <Route
              path="/reports"
              element={
                <Protected>
                  <ReportsList />
                </Protected>
              }
            />
            <Route
              path="/reports/:kind/:id"
              element={
                <Protected>
                  <ReportDetails />
                </Protected>
              }
            />

            <Route
              path="/admin/parents"
              element={
                <Protected role="admin">
                  <AdminParents />
                </Protected>
              }
            />

            <Route
              path="/children/:id"
              element={
                <Protected>
                  <ChildProfile />
                </Protected>
              }
            />

            {/* ❌ Removed /parent route entirely */}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
