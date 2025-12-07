import React from 'react';
import { AppView, PersonaProfile } from '../types';

interface SidebarProps {
  profiles: PersonaProfile[];
  activeProfileId: string | null;
  currentView: AppView;
  onSelectProfile: (id: string) => void;
  onNavigate: (view: AppView) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  profiles, 
  activeProfileId, 
  currentView, 
  onSelectProfile, 
  onNavigate,
  isOpen,
  onToggle
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-slate-800 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(AppView.HOME)}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 to-yellow-600 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              <span className="font-serif font-bold text-slate-900 text-sm">I</span>
            </div>
            <h1 className="text-xl font-serif font-semibold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-yellow-500">
              IMMORTAL
            </h1>
          </div>
          <button onClick={onToggle} className="md:hidden text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
          
          {/* Main Links */}
          <div className="space-y-1">
            <button 
              onClick={() => onNavigate(AppView.HOME)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === AppView.HOME ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Home
            </button>
            <button 
              onClick={() => onNavigate(AppView.CREATE_PROFILE)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === AppView.CREATE_PROFILE ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create New Soul
            </button>
          </div>

          {/* Souls List */}
          <div>
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">My Souls</h3>
            <div className="space-y-1">
              {profiles.length === 0 ? (
                <div className="px-4 py-2 text-sm text-slate-600 italic">No souls created yet.</div>
              ) : (
                profiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => onSelectProfile(profile.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${
                      activeProfileId === profile.id && currentView !== AppView.HOME && currentView !== AppView.ABOUT && currentView !== AppView.SETTINGS
                        ? 'bg-gradient-to-r from-amber-900/40 to-slate-800 text-amber-100 border-l-2 border-amber-500' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 flex-shrink-0">
                       {profile.avatarUrl ? (
                         <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">{profile.name[0]}</div>
                       )}
                    </div>
                    <div className="text-left truncate">
                      <div className="font-medium truncate">{profile.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{profile.relationship}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <button 
             onClick={() => onNavigate(AppView.SETTINGS)}
             className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === AppView.SETTINGS ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </button>
          <button 
             onClick={() => onNavigate(AppView.ABOUT)}
             className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === AppView.ABOUT ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            About Immortal
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;