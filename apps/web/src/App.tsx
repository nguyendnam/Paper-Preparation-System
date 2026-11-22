import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthGate } from './components/Auth';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/Toast';
import { PaperDetailPage } from './features/papers/PaperDetailPage';
import { PapersPage } from './features/papers/PapersPage';
import { HistoryPage } from './features/targets/HistoryPage';
import { TargetPage } from './features/targets/TargetPage';
import { MyTasksPage } from './features/tasks/MyTasksPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeamPage } from './pages/TeamPage';

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="papers" element={<PapersPage />} />
            <Route path="papers/:paperId" element={<PaperDetailPage />} />
            <Route path="targets/:targetId" element={<TargetPage />} />
            <Route path="tasks" element={<MyTasksPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthGate>
    </ToastProvider>
  );
}
