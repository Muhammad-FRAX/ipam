import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Network, Settings, History, UserCircle, ShieldAlert, LogOut, PlusCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Subnets from './pages/Subnets';
import Approvals from './pages/Approvals';
import Config from './pages/Config';
import Planning360 from './pages/Planning360';
import Planning360Search from './pages/Planning360Search';
import NetworkAssets from './pages/NetworkAssets';
import Discovery from './pages/Discovery';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';
import NewRequest from './pages/NewRequest';
import { Activity, Server, SearchCode } from 'lucide-react';
import { useAuth } from './hooks/useAuth';

function App() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [appTitle, setAppTitle] = React.useState('Antigravity IPAM');
  const [appLogo, setAppLogo] = React.useState('');

  React.useEffect(() => {
    if (!user) return;
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        const configMap = data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        if (configMap.app_title) setAppTitle(configMap.app_title);
        if (configMap.app_logo) setAppLogo(configMap.app_logo);
      })
      .catch(console.error);
  }, [user]);

  if (!user) {
    return <Login />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Telecom Resources', path: '/resources', icon: Server },
    { name: 'IP Topology', path: '/topology', icon: Network },
    { name: 'Subnet Discovery', path: '/discovery', icon: SearchCode },
    { name: 'Approvals', path: '/approvals', icon: ShieldAlert },
    { name: 'New Request', path: '/requests/new', icon: PlusCircle },
    { name: 'Planning 360', path: '/planning-360', icon: Activity },
    { name: 'Audit Log', path: '/audit', icon: History },
    { name: 'Configuration', path: '/config', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0e] text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

      {/* Sidebar */}
      <aside className="w-72 z-10 bg-[#0d0d12]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-300">
        <div className="h-24 flex items-center px-8 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            {appLogo ? (
               <img src={appLogo} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 ring-1 ring-white/10 shadow-lg" />
            ) : (
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                 <Network className="w-7 h-7 text-white" />
               </div>
            )}
            <span className="font-bold text-xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 truncate">{appTitle}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-indigo-300 border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:shadow-lg'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors duration-300 ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300'}`}>
                  <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="font-medium tracking-wide text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
               <UserCircle className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-white tracking-wide truncate">{user.roles.includes('ADMIN') ? 'Admin' : 'User'}</span>
              <span className="text-xs text-slate-400 truncate">{user.email}</span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 z-10 flex flex-col h-screen overflow-hidden">
        <header className="h-24 flex items-center justify-between px-10 border-b border-white/5 bg-[#0d0d12]/60 backdrop-blur-xl">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 capitalize tracking-tight drop-shadow-sm">
            {location.pathname === '/' ? 'Platform Overview' : location.pathname.substring(1).replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-6">
             <div className="px-5 py-2 text-xs font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                System Healthy
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/resources" element={<NetworkAssets />} />
              <Route path="/topology" element={<Subnets />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/config" element={<Config />} />
              <Route path="/planning-360" element={<Planning360Search />} />
              <Route path="/planning-360/:type/:id" element={<Planning360 />} />
              <Route path="/requests/new" element={<NewRequest />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
