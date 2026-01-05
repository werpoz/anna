import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthBootstrap from '../auth/ui/AuthBootstrap';
import AuthGate from '../auth/ui/AuthGate';
import LoginPage from '../auth/ui/LoginPage';
import SessionPage from '../sessions/ui/SessionPage';

const App = () => (
  <AuthBootstrap>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/console" element={<Navigate to="/app" replace />} />
        <Route
          path="/app"
          element={
            <AuthGate>
              <SessionPage />
            </AuthGate>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthBootstrap>
);

export default App;
