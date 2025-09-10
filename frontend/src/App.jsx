// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider.jsx';

import NavBar from './components/NavBar.jsx';
import Protected from './components/Protected.jsx';

import Login from './pages/Login.jsx';
import AdminDashBoard from './pages/AdminDashBoard.jsx';     // matches your filename
import ParentDashBoard from './pages/ParentDashBoard.jsx';   // matches your filename
import CreateReport from './pages/CreateReport.jsx';
import Register from './pages/Register.jsx';
import ReportsList from './pages/ReportsLists.jsx';

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

            <Route
              path="/admin"
              element={
                <Protected role="admin">
                  <AdminDashBoard />
                </Protected>
              }
            />

            <Route
              path="/parent"
              element={
                <Protected role="parent">
                  <ParentDashBoard />
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
            path="/reports"
            element={
              // both roles can view their allowed reports
              <Protected>
                <ReportsList />
              </Protected>
            }
          />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
