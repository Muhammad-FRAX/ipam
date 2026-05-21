import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Network, Settings, History, UserCircle, ShieldAlert,
  LogOut, PlusCircle, Activity, Server, SearchCode, Menu, X, ChevronLeft,
  ChevronRight, User2, ChevronUp
} from 'lucide-react';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';

const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Subnets       = lazy(() => import('./pages/Subnets'));
const Approvals     = lazy(() => import('./pages/Approvals'));
const Config        = lazy(() => import('./pages/Config'));
const Planning360   = lazy(() => import('./pages/Planning360'));
const Planning360Search = lazy(() => import('./pages/Planning360Search'));
const NetworkAssets = lazy(() => import('./pages/NetworkAssets'));
const Discovery     = lazy(() => import('./pages/Discovery'));
const AuditLogs     = lazy(() => import('./pages/AuditLogs'));
const NewRequest    = lazy(() => import('./pages/NewRequest'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm">Loading page…</span>
      </div>
    </div>
  );
}

const navGroups = [
  {
    label: 'Management',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Telecom Resources', path: '/resources', icon: Server },
      { name: 'IP Topology', path: '/topology', icon: Network },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Subnet Discovery', path: '/discovery', icon: SearchCode },
      { name: 'Approvals', path: '/approvals', icon: ShieldAlert },
      { name: 'New Request', path: '/requests/new', icon: PlusCircle },
      { name: 'Planning 360', path: '/planning-360', icon: Activity },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Audit Log', path: '/audit', icon: History },
      { name: 'Configuration', path: '/config', icon: Settings },
    ],
  },
];

function NavItem({ item, isActive, collapsed }: { item: any; isActive: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={`group relative flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      {/* Left edge accent when active */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-indigo-500 to-purple-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      )}
      <div
        className={`flex-shrink-0 p-2 rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-indigo-500/20 text-indigo-400'
            : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      {!collapsed && (
        <span className="font-medium text-sm tracking-wide truncate">{item.name}</span>
      )}

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-3 z-50 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
          {item.name}
        </div>
      )}
    </Link>
  );
}

function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  appTitle,
  appLogo,
  location,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  appTitle: string;
  appLogo: string;
  location: any;
}) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path + '/');

  const sidebarContent = (
    <aside
      className={`relative z-30 flex flex-col h-full bg-[#0d0d12]/90 backdrop-blur-2xl border-r border-white/5 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center border-b border-white/5 shrink-0 ${collapsed ? 'h-20 justify-center px-2' : 'h-20 px-6 gap-4'}`}>
        {appLogo ? (
          <img
            src={appLogo}
            alt="Logo"
            className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 ring-1 ring-white/10 shadow-lg shrink-0"
          />
        ) : (
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
            <Network className="w-6 h-6 text-white" />
          </div>
        )}
        {!collapsed && (
          <span className="font-bold text-base tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 truncate flex-1">
            {appTitle}
          </span>
        )}
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggle}
          className={`hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-200 shrink-0 ${collapsed ? 'mt-0' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isActive={isActive(item.path)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User menu */}
      <div className="p-3 border-t border-white/5 relative" ref={userMenuRef}>
        {/* Dropdown */}
        {userMenuOpen && (
          <div className={`absolute ${collapsed ? 'left-full ml-2' : 'left-3 right-3'} bottom-full mb-2 z-50 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}>
            <div className="p-4 border-b border-white/5">
              <p className="text-sm font-semibold text-white">
                {user?.roles?.includes('ADMIN') ? 'Administrator' : 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
            <UserCircle className="w-5 h-5 text-indigo-400" />
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 min-w-0 text-left">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.roles?.includes('ADMIN') ? 'Admin' : 'User'}
                </span>
                <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
              </div>
              <ChevronUp
                className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${userMenuOpen ? '' : 'rotate-180'}`}
              />
            </>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-72">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const location = useLocation();
  const { user } = useAuth();
  const [appTitle, setAppTitle] = React.useState('Antigravity IPAM');
  const [appLogo, setAppLogo] = React.useState('');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        const configMap = data.reduce(
          (acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }),
          {}
        );
        if (configMap.app_title) setAppTitle(configMap.app_title);
        if (configMap.app_logo) setAppLogo(configMap.app_logo);
      })
      .catch(console.error);
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!user) {
    return <Login />;
  }

  const pageTitle =
    location.pathname === '/'
      ? 'Platform Overview'
      : location.pathname.substring(1).replace(/-/g, ' ').replace(/\//g, ' › ');

  return (
    <div className="flex h-screen bg-[#0a0a0e] text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-blob animation-delay-4000 pointer-events-none" />

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        appTitle={appTitle}
        appLogo={appLogo}
        location={location}
      />

      {/* Main Content */}
      <main className="flex-1 z-10 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-20 flex items-center justify-between px-6 md:px-10 border-b border-white/5 bg-[#0d0d12]/60 backdrop-blur-xl shrink-0">
          {/* Hamburger (mobile) */}
          <button
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="hidden md:block text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 capitalize tracking-tight drop-shadow-sm">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 text-xs font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              System Healthy
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div key={location.pathname} className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Suspense fallback={<PageFallback />}>
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
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
