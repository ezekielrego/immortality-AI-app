import React, { useState, useEffect, useRef } from 'react';
import { AppView, PersonaProfile, PersonaTemplate } from './types';
import MemoryUpload from './components/MemoryUpload';
import ChatInterface from './components/ChatInterface';
import { LiveSession } from './services/geminiService';
import Waveform from './components/Waveform';
import Sidebar from './components/Sidebar';
import { loadProfiles, saveProfiles, fileToBase64, compressImage } from './utils/storageUtils';

const TEMPLATES: PersonaTemplate[] = [
  { 
    id: 'sage', 
    label: 'The Sage', 
    icon: '🦉', 
    traits: ['Wise', 'Patient', 'Reflective', 'Calm'], 
    desc: 'Perfect for grandparents, mentors, or teachers who offered guidance.',
    defaultVoice: 'Calm and slow-paced'
  },
  { 
    id: 'jester', 
    label: 'The Jester', 
    icon: '🎭', 
    traits: ['Humorous', 'Witty', 'Optimistic', 'Playful'], 
    desc: 'For the friend or sibling who always made you laugh.',
    defaultVoice: 'Upbeat and energetic'
  },
  { 
    id: 'guardian', 
    label: 'The Guardian', 
    icon: '🛡️', 
    traits: ['Protective', 'Warm', 'Reliable', 'Strong'], 
    desc: 'For parents or figures of safety and support.',
    defaultVoice: 'Warm and reassuring'
  },
  { 
    id: 'confidant', 
    label: 'The Confidant', 
    icon: '🤝', 
    traits: ['Empathetic', 'Listener', 'Trustworthy', 'Gentle'], 
    desc: 'For partners or best friends who knew your secrets.',
    defaultVoice: 'Soft and intimate'
  },
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [profiles, setProfiles] = useState<PersonaProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Create Profile State
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRel, setNewProfileRel] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PersonaTemplate | null>(null);
  
  // Live Session State
  const [liveStatus, setLiveStatus] = useState<string>('Ready');
  const [visualizerIntensity, setVisualizerIntensity] = useState(0);
  const liveSessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    const loaded = loadProfiles();
    setProfiles(loaded);
  }, []);

  useEffect(() => {
    if (profiles.length > 0) {
      saveProfiles(profiles);
    }
  }, [profiles]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  // --- Handlers ---

  const handleTemplateSelect = (t: PersonaTemplate) => {
    setSelectedTemplate(t);
    // Auto-scroll to form
    document.getElementById('creation-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateProfile = () => {
    if (!newProfileName) return;
    const newProfile: PersonaProfile = {
      id: crypto.randomUUID(),
      name: newProfileName,
      relationship: newProfileRel,
      avatarUrl: null,
      personalityTraits: selectedTemplate ? [...selectedTemplate.traits] : [],
      keyMemories: [],
      voiceStyle: selectedTemplate ? selectedTemplate.defaultVoice : 'Warm and conversational',
      systemInstruction: '',
      createdAt: Date.now(),
    };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    
    // Reset Form
    setNewProfileName('');
    setNewProfileRel('');
    setSelectedTemplate(null);
    
    setView(AppView.PROFILE_DASHBOARD);
  };

  const updateActiveProfile = (updated: PersonaProfile) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProfile || !e.target.files?.[0]) return;
    try {
        const base64 = await fileToBase64(e.target.files[0]);
        const compressed = await compressImage(base64, 300); 
        updateActiveProfile({ ...activeProfile, avatarUrl: compressed });
    } catch (err) {
        console.error("Image upload failed", err);
    }
  };

  const deleteProfile = (id: string) => {
    if (confirm("Are you sure you want to delete this soul? This cannot be undone.")) {
        const newProfiles = profiles.filter(p => p.id !== id);
        setProfiles(newProfiles);
        saveProfiles(newProfiles);
        if (activeProfileId === id) {
            setActiveProfileId(null);
            setView(AppView.HOME);
        }
    }
  };

  const startLiveSession = async () => {
    if (!activeProfile) return;
    if (liveSessionRef.current) await liveSessionRef.current.disconnect();
    
    liveSessionRef.current = new LiveSession(
      activeProfile,
      (intensity) => setVisualizerIntensity(intensity),
      (status) => setLiveStatus(status)
    );
    await liveSessionRef.current.connect();
  };

  const endLiveSession = async () => {
    if (liveSessionRef.current) {
      await liveSessionRef.current.disconnect();
      liveSessionRef.current = null;
      setVisualizerIntensity(0);
      setLiveStatus('Disconnected');
    }
  };

  useEffect(() => {
    return () => {
      liveSessionRef.current?.disconnect();
    };
  }, []);

  // --- Views ---

  const renderHome = () => (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-16 animate-[fadeIn_1s_ease-out]">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-300 mb-6 drop-shadow-2xl">
          IMMORTAL
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
          The physical form is temporary, but the soul is eternal. <br/>
          Preserve the essence, voice, and memories of your loved ones in a digital sanctuary.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl hover:shadow-2xl hover:shadow-amber-900/20 transition-all group cursor-pointer" onClick={() => setView(AppView.CREATE_PROFILE)}>
            <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h3 className="text-2xl font-serif text-white mb-2">Begin a New Legacy</h3>
            <p className="text-slate-400">Create a new digital soul. Choose from archetypes or start from a blank slate to capture their unique spirit.</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl hover:shadow-2xl hover:shadow-cyan-900/20 transition-all group cursor-pointer" onClick={() => setView(AppView.ABOUT)}>
             <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                <svg className="w-8 h-8 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-2xl font-serif text-white mb-2">Understanding Immortal</h3>
            <p className="text-slate-400">Learn how our AI analyzes linguistic patterns and visual cues to create an authentic resonance of personality.</p>
        </div>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
         <h2 className="text-3xl font-serif text-white mb-4">Select an Archetype</h2>
         <p className="text-slate-400">Choose a template to guide the AI, or skip to build from scratch.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {TEMPLATES.map(t => (
            <button 
                key={t.id}
                onClick={() => handleTemplateSelect(t)}
                className={`p-6 rounded-xl border transition-all text-left relative overflow-hidden group ${
                    selectedTemplate?.id === t.id 
                    ? 'bg-amber-900/20 border-amber-500 ring-1 ring-amber-500' 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                }`}
            >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{t.icon}</div>
                <h3 className="font-bold text-slate-200 mb-1">{t.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                {selectedTemplate?.id === t.id && (
                    <div className="absolute top-2 right-2 text-amber-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                )}
            </button>
        ))}
      </div>

      <div id="creation-form" className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-lg mx-auto">
        <h2 className="text-xl font-serif text-white mb-6 flex items-center gap-2">
            {selectedTemplate ? (
                <>
                   <span>{selectedTemplate.icon}</span>
                   <span>Initializing {selectedTemplate.label}</span>
                </>
            ) : "Initialize New Soul"}
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Name of Loved One</label>
            <input 
              type="text" 
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="E.g., Grandma Rose"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Your Relationship</label>
            <input 
              type="text" 
              value={newProfileRel}
              onChange={(e) => setNewProfileRel(e.target.value)}
              placeholder="E.g., Grandson"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
            />
          </div>
          
          {selectedTemplate && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-sm">
                <p className="text-slate-400 mb-2">Starting traits:</p>
                <div className="flex flex-wrap gap-2">
                    {selectedTemplate.traits.map(t => (
                        <span key={t} className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded text-xs border border-amber-900/50">{t}</span>
                    ))}
                </div>
            </div>
          )}

          <button 
            onClick={handleCreateProfile}
            disabled={!newProfileName}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-lg font-bold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white uppercase tracking-wide"
          >
            Create Profile
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (!activeProfile) return null;
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
           <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                   {activeProfile.avatarUrl ? (
                       <img src={activeProfile.avatarUrl} className="w-full h-full object-cover"/>
                   ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-500">{activeProfile.name[0]}</div>
                   )}
               </div>
               <div>
                   <h2 className="text-xl font-bold text-white">{activeProfile.name}</h2>
                   <p className="text-xs text-amber-500 uppercase tracking-widest">Dashboard</p>
               </div>
           </div>
           
           <button 
                onClick={() => deleteProfile(activeProfile.id)}
                className="text-slate-500 hover:text-red-400 text-sm flex items-center gap-2 px-3 py-1 rounded-full hover:bg-red-950/30 transition-colors"
           >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
           </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Col: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center shadow-lg">
              <div className="relative w-40 h-40 mx-auto mb-6 rounded-full overflow-hidden border-4 border-slate-700 group cursor-pointer shadow-2xl">
                 {activeProfile.avatarUrl ? (
                    <img src={activeProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">Change Photo</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              
              <div className="mt-8 space-y-3">
                <button 
                  onClick={() => setView(AppView.PROFILE_CHAT)}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-3 group"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  Text Chat
                </button>
                <button 
                  onClick={() => setView(AppView.PROFILE_CALL)}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-yellow-600 hover:shadow-lg hover:shadow-amber-500/20 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  Voice Call
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Traits Analysis</h3>
               {activeProfile.personalityTraits.length === 0 ? (
                 <p className="text-slate-500 text-sm italic">Upload data to learn traits.</p>
               ) : (
                 <div className="flex flex-wrap gap-2">
                   {activeProfile.personalityTraits.map((t, i) => (
                     <span key={i} className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-full text-xs text-amber-500/80">{t}</span>
                   ))}
                 </div>
               )}
            </div>
          </div>

          {/* Right Col: Memory Ingestion */}
          <div className="lg:col-span-2">
            <MemoryUpload profile={activeProfile} onProfileUpdate={updateActiveProfile} />
            
            <div className="mt-8 bg-slate-900 rounded-2xl border border-slate-800 p-6 h-96 overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 sticky top-0 bg-slate-900 pb-2">Core Memories</h3>
                 <ul className="space-y-4">
                    {activeProfile.keyMemories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-600">
                            <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <p className="italic text-sm">Upload chats or videos to populate memories.</p>
                        </div>
                    ) : (
                        activeProfile.keyMemories.map((mem, i) => (
                            <li key={i} className="flex gap-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                                <span className="text-amber-500/50 text-xl">❝</span>
                                <p className="text-sm text-slate-300 italic">{mem}</p>
                            </li>
                        ))
                    )}
                 </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAbout = () => (
    <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-4xl font-serif text-white mb-8">About Immortal</h1>
        <div className="space-y-6 text-slate-300 leading-relaxed text-lg">
            <p>
                <strong className="text-amber-400">Immortal</strong> is not just an app; it is a digital sanctuary designed to preserve the essence of those who matter most.
            </p>
            <p>
                By leveraging advanced Gemini 2.5 generative AI, Immortal analyzes the subtle nuances of human communication—text logs, voice patterns, and visual mannerisms—to create an interactive persona that feels authentically familiar.
            </p>
            <h3 className="text-2xl font-serif text-white mt-10 mb-4">Privacy & Sanctity</h3>
            <p>
                We believe your memories are sacred. All processing happens securely. Your data is stored locally within your browser whenever possible, and analysis is performed ephemerally. We do not use your personal memories to train public models.
            </p>
            <h3 className="text-2xl font-serif text-white mt-10 mb-4">The Mission</h3>
            <p>
                To bridge the gap between memory and presence, ensuring that the wisdom, humor, and love of our shared connections are never truly lost to time.
            </p>
        </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-4xl font-serif text-white mb-8">Settings</h1>
        
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Data Management</h3>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-300 font-medium">Export All Data</p>
                    <p className="text-xs text-slate-500">Download a JSON file of all created souls and memories.</p>
                </div>
                <button 
                    onClick={() => {
                        const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'immortal_backup.json';
                        a.click();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white border border-slate-600"
                >
                    Export
                </button>
            </div>
        </div>

        <div className="bg-red-950/20 rounded-xl border border-red-900/50 p-6">
            <h3 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h3>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-300 font-medium">Reset Application</p>
                    <p className="text-xs text-slate-500">Permanently delete all profiles and local data.</p>
                </div>
                <button 
                    onClick={() => {
                        if (confirm("WARNING: This will delete ALL profiles and memories. This action cannot be undone. Continue?")) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="px-4 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg text-sm text-red-200 border border-red-800"
                >
                    Reset All
                </button>
            </div>
        </div>
    </div>
  );

  const renderCall = () => {
    if (!activeProfile) return null;
    return (
      <div className="h-full flex flex-col relative bg-slate-950 overflow-hidden">
        {/* Call Header */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center">
            <button onClick={() => { endLiveSession(); setView(AppView.PROFILE_DASHBOARD); }} className="p-2 bg-slate-900/50 rounded-full text-white hover:bg-slate-800 backdrop-blur-md border border-slate-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="px-4 py-1 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-700 text-xs text-slate-300 font-mono tracking-wider">
                SECURE CONNECTION
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-slate-950 to-slate-950 -z-10"></div>
            
            {/* Avatar */}
            <div className="relative mb-12">
               <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full p-1 transition-all duration-500 ${liveStatus === 'Connected' ? 'shadow-[0_0_80px_rgba(245,158,11,0.2)]' : ''}`}>
                 <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-700/50 relative bg-slate-900">
                    {activeProfile.avatarUrl ? (
                      <img src={activeProfile.avatarUrl} alt="Avatar" className={`w-full h-full object-cover transition-transform duration-1000 ${liveStatus === 'Connected' ? 'scale-110' : 'grayscale'}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl text-slate-700">{activeProfile.name[0]}</div>
                    )}
                 </div>
               </div>
               <div className={`mt-6 text-center transition-opacity duration-500 ${liveStatus === 'Connected' ? 'opacity-100' : 'opacity-50'}`}>
                 <h2 className="text-3xl font-bold text-white tracking-wide font-serif">{activeProfile.name}</h2>
                 <p className={`text-sm mt-2 font-medium tracking-widest uppercase ${liveStatus === 'Connected' ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                    {liveStatus}
                 </p>
               </div>
            </div>

            {/* Visualizer */}
            <div className="w-full max-w-lg h-24 mb-12 px-4 opacity-80">
                <Waveform intensity={visualizerIntensity} active={liveStatus === 'Connected'} />
            </div>

            {/* Action Button */}
            {liveStatus !== 'Connected' ? (
                <button 
                  onClick={startLiveSession}
                  className="px-12 py-4 rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-amber-500/20"
                >
                  Start Conversation
                </button>
            ) : (
                <button 
                  onClick={endLiveSession}
                  className="p-4 rounded-full bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                </button>
            )}
        </div>
      </div>
    );
  };

  const renderChat = () => {
    if (!activeProfile) return null;
    return (
        <div className="h-full flex flex-col bg-slate-950">
            <div className="p-4 border-b border-slate-800 flex items-center gap-4 bg-slate-900 shadow-sm">
                <button onClick={() => setView(AppView.PROFILE_DASHBOARD)} className="text-slate-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700">
                        {activeProfile.avatarUrl && <img src={activeProfile.avatarUrl} className="w-full h-full object-cover"/>}
                    </div>
                    <h3 className="text-white font-bold">{activeProfile.name}</h3>
                </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
                <ChatInterface profile={activeProfile} />
            </div>
        </div>
    );
  };

  // Main Render Switch
  const renderContent = () => {
    switch (view) {
        case AppView.CREATE_PROFILE: return renderCreate();
        case AppView.PROFILE_DASHBOARD: return renderDashboard();
        case AppView.PROFILE_CALL: return renderCall();
        case AppView.PROFILE_CHAT: return renderChat();
        case AppView.ABOUT: return renderAbout();
        case AppView.SETTINGS: return renderSettings();
        case AppView.HOME:
        default: return renderHome();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
        <Sidebar 
            profiles={profiles}
            activeProfileId={activeProfileId}
            currentView={view}
            onSelectProfile={(id) => { setActiveProfileId(id); setView(AppView.PROFILE_DASHBOARD); setIsSidebarOpen(false); }}
            onNavigate={(v) => { setView(v); setIsSidebarOpen(false); }}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        {/* Mobile Header Trigger */}
        <div className="md:hidden fixed top-4 left-4 z-40">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-800 rounded-lg text-white border border-slate-700 shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
        </div>

        <main className="flex-1 overflow-y-auto relative">
            {renderContent()}
        </main>
    </div>
  );
};

export default App;