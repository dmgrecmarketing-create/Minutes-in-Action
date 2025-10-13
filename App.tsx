
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './views/Dashboard';
import LiveMeeting from './views/LiveMeeting';
import ReviewMinutes from './views/ReviewMinutes';
import Header from './components/Header';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <HashRouter>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meeting/:id" element={<LiveMeeting />} />
            <Route path="/review/:id" element={<ReviewMinutes />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </HashRouter>
    </div>
  );
};

export default App;
