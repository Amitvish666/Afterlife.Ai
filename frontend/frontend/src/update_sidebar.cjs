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

// Find the main section to replace
// Specifically, look for `<main className="flex-1 flex flex-col min-w-0 bg-surface-950 relative overflow-hidden">`
const mainStartStr = '<main className="flex-1 flex flex-col min-w-0 bg-surface-950 relative overflow-hidden">';
const mainStart = content.indexOf(mainStartStr);
const mainEnd = content.indexOf('</main>', mainStart) + '</main>'.length;

const newMain = `<main className="flex-1 flex flex-col min-w-0 bg-surface-950 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-beyond-purple/10 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-beyond-pink/10 blur-[120px] rounded-full" />
            </div>

            {selectedPersona ? (
              <>
                {/* Header */}
                <header className="h-20 border-b border-white/5 flex items-center px-4 lg:px-8 bg-surface-950/80 backdrop-blur-3xl flex-shrink-0 relative z-10">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2.5 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-3 border border-transparent hover:border-white/10 shadow-sm"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center flex-1 min-w-0">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="hidden lg:flex p-2.5 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-5 border border-transparent hover:border-white/10 shadow-sm"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center space-x-4 truncate">
                      <div className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-surface-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-xl overflow-hidden group">
                        {selectedPersona.avatar_url ? (
                          <img src={selectedPersona.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-beyond-purple" />
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                      </div>
                      <div className="truncate">
                        <h1 className="text-lg lg:text-xl font-bold text-white truncate tracking-tight">{selectedPersona.title}</h1>
                        <p className="text-surface-400 text-sm truncate font-medium flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                          {selectedPersona.description || 'Neural Assistant'}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center space-x-3">
                      <button
                        onClick={() => router.push('/avatar?persona=' + selectedPersona.id)}
                        className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-white border border-white/10 hover:border-white/20 transition-all shadow-lg group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Video className="w-5 h-5 text-beyond-purple group-hover:text-beyond-pink transition-colors relative z-10" />
                        <span className="hidden sm:inline text-sm font-semibold tracking-wide relative z-10">AI Avatar</span>
                      </button>
                    </div>
                  </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 relative z-10 scroll-smooth">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center max-w-lg p-10 rounded-3xl bg-surface-900/30 border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/5 to-beyond-pink/5" />
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-800 border border-white/10 flex items-center justify-center relative group shadow-inner">
                          <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 rounded-2xl opacity-50" />
                          <MessageCircle className="w-8 h-8 text-beyond-purple relative z-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight relative z-10">Begin Neural Session</h2>
                        <p className="text-surface-400 text-base leading-relaxed relative z-10">
                          Establish a secure link with <span className="text-white font-medium">{selectedPersona.title}</span>.
                        </p>
                      </motion.div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                          className={cn(
                            'flex items-end space-x-4 max-w-[85%] lg:max-w-[70%]',
                            message.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
                          )}
                        >
                          {message.role === 'assistant' && (
                             <div className="relative w-10 h-10 rounded-xl bg-surface-800 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden hidden sm:flex">
                                {selectedPersona?.avatar_url ? (
                                  <img src={selectedPersona.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Sparkles className="w-5 h-5 text-beyond-purple" />
                                )}
                             </div>
                          )}
                          
                          <div className={cn(
                            'px-6 py-4 relative group shadow-2xl backdrop-blur-xl',
                            message.role === 'assistant'
                              ? 'bg-surface-800/90 text-surface-50 border border-white/10 rounded-[24px] rounded-bl-sm'
                              : 'bg-beyond-purple text-white rounded-[24px] rounded-br-sm border border-beyond-purple shadow-[0_10px_30px_rgba(139,92,246,0.2)]'
                          )}>
                            <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">{message.content}</p>
                            
                            {message.role === 'assistant' && (
                              <div className="absolute -bottom-4 -right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                <button
                                  onClick={() => speakText(message.content)}
                                  className="w-9 h-9 bg-surface-700 border border-white/10 rounded-full flex items-center justify-center shadow-xl hover:bg-surface-600 transition-all text-surface-300 hover:text-white"
                                  title="Speak message"
                                >
                                  {isSpeaking ? (
                                    <Volume2 className="w-4 h-4 text-beyond-purple animate-pulse" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                            
                            <p className={cn(
                              "text-[10px] mt-2 font-bold tracking-wider",
                              message.role === 'assistant' ? "text-surface-500" : "text-white/70"
                            )}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-end space-x-4 max-w-[85%] mr-auto"
                        >
                          <div className="relative w-10 h-10 rounded-xl bg-surface-800 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden hidden sm:flex">
                             {selectedPersona?.avatar_url ? (
                               <img src={selectedPersona.avatar_url} alt="" className="w-full h-full object-cover" />
                             ) : (
                               <Sparkles className="w-5 h-5 text-beyond-purple" />
                             )}
                          </div>
                          <div className="bg-surface-800/90 backdrop-blur-xl border border-white/10 rounded-[24px] rounded-bl-sm px-6 py-5 flex items-center space-x-3 shadow-2xl">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-beyond-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-beyond-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-beyond-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-surface-400 text-xs font-semibold tracking-wider ml-2">Synthesizing response...</span>
                          </div>
                        </motion.div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 lg:p-6 bg-transparent relative z-20">
                  <div className="max-w-4xl mx-auto relative">
                    <div className="absolute inset-0 bg-beyond-purple/5 blur-2xl rounded-[2rem] -z-10" />
                    <div className="absolute inset-0 bg-surface-900/90 backdrop-blur-2xl rounded-3xl -z-10 border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)]" />
                    
                    <div className="flex flex-col p-3 gap-2">
                      {/* Top Control Bar (Voice & Settings) */}
                      <div className="flex items-center justify-between px-3 pt-1">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowVoiceTab(!showVoiceTab)}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              showVoiceTab 
                                ? "bg-beyond-purple text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]" 
                                : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700"
                            )}
                            title="Voice Settings"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Language quick indicator */}
                          <div className="px-3 py-1.5 rounded-full bg-surface-800 border border-white/5 flex items-center space-x-2 shadow-inner">
                            <Volume2 className="w-3.5 h-3.5 text-surface-400" />
                            <span className="text-[10px] font-bold text-surface-300 uppercase tracking-widest">{language === 'en' ? 'ENG' : language === 'hi' ? 'HIN' : 'MAR'}</span>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showVoiceTab && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-5 mt-2 bg-surface-950/50 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8 mx-2 mb-2 shadow-inner">
                              <div>
                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-3 flex items-center justify-between">
                                  <span>Speed</span>
                                  <span className="text-white bg-surface-800 px-2 py-0.5 rounded text-[10px]">{speechRate.toFixed(2)}x</span>
                                </label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.1"
                                  value={speechRate}
                                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                  className="w-full accent-beyond-purple h-2 bg-surface-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-3 flex items-center justify-between">
                                  <span>Pitch</span>
                                  <span className="text-white bg-surface-800 px-2 py-0.5 rounded text-[10px]">{speechPitch.toFixed(2)}</span>
                                </label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.1"
                                  value={speechPitch}
                                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                                  className="w-full accent-beyond-purple h-2 bg-surface-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              
                              {/* Language Selector */}
                              <div>
                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-3">Language</label>
                                <div className="relative">
                                  <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'mr')}
                                    className="w-full bg-surface-800 text-white text-sm font-medium rounded-xl px-4 py-2 border border-white/10 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-beyond-purple/50 transition-all hover:bg-surface-700"
                                  >
                                    <option value="en">English</option>
                                    <option value="hi">हिन्दी (Hindi)</option>
                                    <option value="mr">मराठी (Marathi)</option>
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Main Input Row */}
                      <div className="flex items-end gap-3 px-2 pb-2 mt-1">
                        <button
                          onClick={() => {
                            // Optionally trigger voice recording
                          }}
                          className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-all flex-shrink-0 border border-white/10 shadow-sm"
                          title="Voice Input"
                        >
                          <Mic className="w-5 h-5 lg:w-6 lg:h-6 transition-colors" />
                        </button>
                        
                        <div className="flex-1 relative">
                          <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            placeholder={\`Message \${selectedPersona.title}...\`}
                            disabled={isLoading}
                            rows={1}
                            className="w-full bg-surface-950/60 hover:bg-surface-950/90 focus:bg-surface-950 text-white placeholder-surface-500 text-base rounded-2xl py-3.5 lg:py-4 pl-5 pr-12 focus:outline-none focus:ring-1 focus:ring-beyond-purple border border-white/10 transition-all resize-none overflow-hidden min-h-[48px] lg:min-h-[56px] leading-relaxed shadow-inner"
                            style={{ 
                              height: 'auto',
                              minHeight: '48px',
                            }}
                          />
                        </div>
                        
                        <button
                          onClick={handleSend}
                          disabled={!input.trim() || isLoading}
                          className={cn(
                            'w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-lg border',
                            input.trim() && !isLoading
                              ? 'bg-beyond-purple text-white hover:bg-beyond-purple/90 border-beyond-purple/50 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-105 hover:-rotate-3'
                              : 'bg-surface-800 text-surface-500 cursor-not-allowed border-white/5'
                          )}
                        >
                          <Send className={cn("w-5 h-5 lg:w-6 lg:h-6 ml-1", input.trim() && !isLoading && "text-white")} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-surface-500 text-[10px] mt-4 font-semibold tracking-wider flex items-center justify-center gap-2">
                    <Shield className="w-3 h-3 text-emerald-500/70" />
                    Neural connections are secured via quantum encryption
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Mobile Header for no persona */}
                <header className="lg:hidden h-20 border-b border-white/5 flex items-center px-4 bg-surface-950/80 backdrop-blur-3xl relative z-10">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2.5 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4 border border-transparent hover:border-white/10 shadow-sm"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <span className="text-xl font-bold text-white tracking-tight">Neural Chats</span>
                </header>
                
                <div className="h-full flex items-center justify-center p-6 relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-lg p-10 rounded-3xl bg-surface-900/30 border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/5 to-beyond-pink/5" />
                    <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-surface-800 border border-white/10 flex items-center justify-center relative group shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 rounded-3xl opacity-50" />
                      <Users className="w-10 h-10 text-beyond-purple relative z-10" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight relative z-10">No Persona Selected</h2>
                    <p className="text-surface-400 mb-8 text-lg leading-relaxed relative z-10">Select a persona from the sidebar or initialize a new neural template to begin.</p>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-8 py-4 rounded-2xl bg-beyond-purple text-white font-black text-sm uppercase tracking-widest hover:bg-beyond-purple/90 border border-beyond-purple/50 transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-105 relative z-10"
                    >
                      Open Personas Directory
                    </button>
                  </motion.div>
                </div>
              </>
            )}
          </main>`;

content = content.substring(0, mainStart) + newMain + content.substring(mainEnd);

fs.writeFileSync(file, content);
console.log('UI updated successfully!');
