import { Outlet } from 'react-router-dom';
import { NavShell } from '../../components/NavShell.jsx';

export function InstitutionLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <NavShell />
      <main className="p-24">
        <Outlet />
      </main>
    </div>
  );
}
