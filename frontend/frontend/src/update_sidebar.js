const fs = require('fs');
const file = 'e:/Beyond Life AI/New folder (4)/frontend/frontend/src/app/dashboard/chats/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const sidebarStart = content.indexOf('const renderSecondarySidebar = (isMobile = false) => (');
const sidebarEnd = content.indexOf('  return (', sidebarStart);

const newSidebar = `  const renderSecondarySidebar = (isMobile = false) => (
    <div className={cn(
      "flex flex-col h-full",
      isMobile ? "p-6" : ""
    )}>
      <div className="p-5 lg:p-6 border-b border-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-beyond-purple/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h2 className="text-xs font-black text-surface-500 uppercase tracking-widest px-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-beyond-purple" />
            Neural Sessions
          </h2>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-surface-400 hover:text-white bg-surface-800 rounded-xl transition-colors border border-transparent hover:border-white/10">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => {
            handleCreateSession();
            if (isMobile) setMobileMenuOpen(false);
          }}
          disabled={!selectedPersonaId}
          className="relative w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-surface-900 text-white font-bold text-sm tracking-wide border border-white/10 hover:border-beyond-purple/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden shadow-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple/20 to-beyond-pink/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform relative z-10" />
          <span className="relative z-10">New Session</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        {/* Personas Quick Select */}
        <div>
          <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3 px-2">Personas</p>
          <div className="space-y-2">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => {
                  handleSelectPersona(persona.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group border relative overflow-hidden",
                  selectedPersonaId === persona.id 
                    ? "bg-surface-800/80 border-beyond-purple/30 text-white shadow-lg backdrop-blur-md" 
                    : "bg-transparent border-transparent text-surface-400 hover:text-white hover:bg-surface-900"
                )}
              >
                {selectedPersonaId === persona.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple/5 to-transparent pointer-events-none" />
                )}
                <div className="relative w-10 h-10 rounded-xl bg-surface-900 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-beyond-purple/30 transition-colors shadow-inner">
                  {persona.avatar_url ? (
                    <img src={persona.avatar_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  {selectedPersonaId === persona.id && (
                    <div className="absolute inset-0 bg-beyond-purple/20 mix-blend-overlay"></div>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0 text-left z-10">
                   <span className="truncate text-sm font-semibold tracking-wide">{persona.title}</span>
                </div>
                {selectedPersonaId === persona.id && (
                  <div className="w-2 h-2 rounded-full bg-beyond-purple shadow-[0_0_10px_rgba(139,92,246,0.8)] z-10" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Sessions */}
        {selectedPersonaId && (
          <div>
            <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3 px-2">Memory Fragments</p>
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    handleSelectSession(session.id);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                    selectedSessionId === session.id 
                      ? "bg-surface-800 text-white shadow-md" 
                      : "bg-transparent text-surface-400 hover:text-white hover:bg-surface-900/50"
                  )}
                >
                  {selectedSessionId === session.id && (
                    <motion.div 
                      layoutId="active-session"
                      className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-beyond-purple rounded-r-full shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                    />
                  )}
                  <MessageCircle className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors ml-1 relative z-10",
                    selectedSessionId === session.id ? "text-beyond-purple" : "group-hover:text-surface-300"
                  )} />
                  <span className="truncate text-sm font-medium text-left flex-1 relative z-10">{session.title}</span>
                  <Trash2 
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-surface-500 relative z-10"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                  />
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="px-4 py-8 text-center bg-surface-900/30 rounded-xl border border-white/5 border-dashed">
                  <p className="text-sm text-surface-500">No active sessions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Tasks */}
        {selectedPersonaId && personaTasks.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-4 px-2">Processing</p>
            <div className="space-y-4 px-2">
              {personaTasks.map((task) => (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">{task.type}</span>
                    <span className="text-xs font-bold text-beyond-purple">{task.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-900 rounded-full overflow-hidden shadow-inner border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: \`\${task.progress}%\` }}
                      className="h-full bg-gradient-to-r from-beyond-purple to-beyond-pink"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Persona Meta */}
      {selectedPersona && (
        <div className="p-5 mt-auto bg-surface-900/40 border-t border-white/5 backdrop-blur-xl">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-surface-800 border border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20" />
               <Sparkles className="w-4 h-4 text-beyond-purple relative z-10 animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white uppercase tracking-widest">Neural Link</p>
              <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                Stable Connection
              </p>
            </div>
          </div>
          <p className="text-xs text-surface-400 leading-relaxed border-l-[3px] border-surface-700 pl-3">
            {selectedPersona.description?.slice(0, 80)}...
          </p>
        </div>
      )}
    </div>
  );

`;
content = content.substring(0, sidebarStart) + newSidebar + content.substring(sidebarEnd);

fs.writeFileSync(file, content);
console.log('Sidebar UI updated');
