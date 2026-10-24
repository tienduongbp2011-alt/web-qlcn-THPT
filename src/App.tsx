import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext.tsx';
import { MainLayout } from './layouts/MainLayout.tsx';
import { DashboardPage } from './features/dashboard/DashboardPage.tsx';
import { StudentsPage } from './features/students/StudentsPage.tsx';
import { CompetitionPage } from './features/competition/CompetitionPage.tsx';
import { AttendancePage } from './features/attendance/AttendancePage.tsx';
import { FinancePage } from './features/finance/FinancePage.tsx';
import { ReportsPage } from './features/reports/ReportsPage.tsx';
import { PlanningPage } from './features/planning/PlanningPage.tsx';
import { SettingsPage } from './features/settings/SettingsPage.tsx';

const ModuleRouter: React.FC = () => {
  const { activeModule, sessionRole } = useWorkspace();

  // Nếu là tài khoản Tổ trưởng trực thi đua, chỉ hiển thị phân hệ chấm trực thi đua (Yêu cầu 6.1)
  if (sessionRole.role === 'TO_TRUONG') {
    return <CompetitionPage />;
  }

  switch (activeModule) {
    case 'dashboard':
      return <DashboardPage />;
    case 'students':
      return <StudentsPage />;
    case 'competition':
      return <CompetitionPage />;
    case 'attendance':
      return <AttendancePage />;
    case 'finance':
      return <FinancePage />;
    case 'reports':
      return <ReportsPage />;
    case 'planning':
      return <PlanningPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};

export default function App() {
  return (
    <WorkspaceProvider>
      <MainLayout>
        <ModuleRouter />
      </MainLayout>
    </WorkspaceProvider>
  );
}
