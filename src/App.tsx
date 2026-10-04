/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useForumStore } from './store/forumStore';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/views/HomeView';
import { GlobalCursor } from './components/GlobalCursor';
import { Sparkles, Trophy, CheckCircle, Info } from 'lucide-react';
import type { DimensionView, User } from './types';
import { AuthProvider } from './context/AuthContext';
import { GODRAY_PRESETS } from './utils/godrays';
import { safeStorage } from './utils/storage';
import { PageResourceLoader } from './components/PageResourceLoader';
import { UserQuickCard } from './components/UserQuickCard';
import { RadialQuickMenu } from './components/RadialQuickMenu';

const LandingPage = lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const ClubsView = lazy(() => import('./components/views/ClubsView').then(m => ({ default: m.ClubsView })));
const QAForumView = lazy(() => import('./components/views/QAForumView').then(m => ({ default: m.QAForumView })));
const ChatView = lazy(() => import('./components/views/ChatView').then(m => ({ default: m.ChatView })));
const KhuVinhDanhView = lazy(() => import('./components/views/KhuVinhDanhView').then(m => ({ default: m.KhuVinhDanhView })));
const UpdateHubView = lazy(() => import('./components/views/UpdateHubView').then(m => ({ default: m.UpdateHubView })));
const StudyRoomView = lazy(() => import('./components/views/StudyRoomView').then(m => ({ default: m.StudyRoomView })));
const MemoryRealm = lazy(() => import('./components/MemoryRealm').then(m => ({ default: m.MemoryRealm })));
const ChatDock = lazy(() => import('./components/ChatDock').then(m => ({ default: m.ChatDock })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })));
const FocusSanctuary = lazy(() => import('./components/FocusSanctuary').then(m => ({ default: m.FocusSanctuary })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const XPSandboxDock = lazy(() => import('./components/XPSandboxDock').then(m => ({ default: m.XPSandboxDock })));

const ViewLoadingFallback = () => (
  <div className="w-full h-full min-h-[50vh] flex items-center justify-center" aria-busy="true" aria-label="Đang tải giao diện">
    <div className="w-8 h-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" />
  </div>
);

const CORE_SCROLL_VIEWS: DimensionView[] = ['home', 'clubs', 'qa', 'coming-soon'];
const SCROLL_COOLDOWN_MS = 650;

export const App: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    users,
    login,
    loginWithPassword,
    registerWithPassword,
    loginSocial,
    logout,
    addXP,
    updateProfile,
    clubs,
    clubPosts,
    createClub,
    approveClub,
    rejectClub,
    createClubPost,
    questions,
    solutions,
    createQuestion,
    addSolution,
    markBestSolution,
    chatMessages,
    sendChatMessage,
    onlineUsers,
    isChatOpen,
    setIsChatOpen,
    unreadChatCount,
    setUnreadChatCount,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isSynced,
    toastMessage,
    adminDeleteQuestion,
    adminEditQuestion,
    adminDeleteSolution,
    adminDeleteChatMessage,
    feedbacks,
    submitFeedback,
    studyDecks,
    studySessions,
    createStudyDeck,
    updateStudyDeck,
    deleteStudyDeck,
    importStudyCards,
    gradeStudyCard,
    syncStudyDeck,
    recordStudySession,
    toggleStudyDeckStar,
    cloneStudyDeck,
  } = useForumStore();

  const [isResourceLoading, setIsResourceLoading] = useState(true);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit'>('overview');
  const [targetProfileUser, setTargetProfileUser] = useState<User | null>(null);
  const [quickProfile, setQuickProfile] = useState<{ user: User; anchor?: { x: number; y: number } | null } | null>(null);
  const [scrollInsideCinema, setScrollInsideCinema] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');

  const isInsideCinema = currentView === 'memory' && scrollInsideCinema;

  const [godrayPreset, setGodrayPreset] = useState<string>(() => {
    return safeStorage.getItem('fforum_godray_preset') || 'godray-gold';
  });
  const [godrayIntensity, setGodrayIntensity] = useState<number>(() => {
    const val = safeStorage.getItem('fforum_godray_intensity');
    return val ? parseInt(val, 10) : 70;
  });

  useEffect(() => {
    const handleSyncGodray = () => {
      const p = safeStorage.getItem('fforum_godray_preset') || 'godray-gold';
      const i = safeStorage.getItem('fforum_godray_intensity');
      setGodrayPreset(p);
      if (i) setGodrayIntensity(parseInt(i, 10));
    };
    window.addEventListener('fforum_theme_sync', handleSyncGodray);
    return () => window.removeEventListener('fforum_theme_sync', handleSyncGodray);
  }, []);

  useEffect(() => {
    if (currentView !== 'memory') return;

    const checkScroll = () => {
      const cinemaEl = document.getElementById('cinema');
      if (cinemaEl) {
        const rect = cinemaEl.getBoundingClientRect();
        const inCinema = rect.top <= 60 && rect.bottom > window.innerHeight;
        setScrollInsideCinema(inCinema);
      } else {
        setScrollInsideCinema(false);
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    const timer = setTimeout(checkScroll, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [currentView]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView]);

  const handleOpenAuth = useCallback(
    (tab: 'login' | 'register' = 'login') => {
      setAuthInitialTab(tab);
      setIsLoginModalOpen(true);
    },
    [setIsLoginModalOpen],
  );

  const handleOpenProfile = (
    tab: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit' = 'overview',
    userToView?: { id: string; name: string; avatar: string; email?: string; level?: number }
  ) => {
    if (userToView) {
      const emailKey = userToView.email ? userToView.email.toLowerCase() : '';
      const existing = (emailKey && users[emailKey]) || Object.values(users).find(u => u.id === userToView.id);
      if (existing) {
        setTargetProfileUser(existing);
      } else {
        setTargetProfileUser({
          id: userToView.id,
          name: userToView.name,
          email: userToView.email || '',
          avatar: userToView.avatar,
          role: userToView.email === 'anhtuantran0512@gmail.com' ? 'SUPER_ADMIN' : 'STUDENT',
          level: userToView.level || 1,
          xp: 0,
          coin: 100,
          bio: '',
          scopedClubIds: [],
        });
      }
      setProfileInitialTab(tab);
      setIsProfileModalOpen(true);
      return;
    }

    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    setTargetProfileUser(null);
    setProfileInitialTab(tab);
    setIsProfileModalOpen(true);
  };

  const handleOpenUserProfile = (
    userToView?: { id: string; name: string; avatar: string; email?: string; level?: number },
    anchor?: { x: number; y: number } | null,
  ) => {
    if (!userToView) {
      handleOpenProfile('overview');
      return;
    }

    /* If an explicit anchor is passed, open the quick card; otherwise ("Trang cá nhân" button),
       open the full ProfileModal directly so no extra modal blocks the screen. */
    if (anchor) {
      const emailKey = userToView.email ? userToView.email.toLowerCase() : '';
      const existing = (emailKey && users[emailKey]) || Object.values(users).find(u => u.id === userToView.id);
      const resolved: User = existing || {
        id: userToView.id,
        name: userToView.name,
        email: userToView.email || '',
        avatar: userToView.avatar,
        role: 'STUDENT',
        level: userToView.level || 1,
        xp: 0,
        bio: '',
        scopedClubIds: [],
      };
      setQuickProfile({ user: resolved, anchor });
      return;
    }

    handleOpenProfile('overview', userToView);
  };

  const handleToggleChat = () => {
    setIsChatOpen(prev => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
      }
      return next;
    });
  };

  const handleNavigate = (v: DimensionView) => {
    setCurrentView(v);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleViewChange = useCallback((v: DimensionView) => {
    setCurrentView(v);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [setCurrentView]);

  const lastScrollTimeRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (currentView === 'chat' || currentView === 'memory' || currentView === 'chronicles') {
        return;
      }

      if (currentView === 'landing') {
        return;
      }

      if (isLoginModalOpen || isProfileModalOpen || isFocusModeOpen || isChatOpen) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [role="dialog"]')) {
        return;
      }

      const currentIndex = CORE_SCROLL_VIEWS.indexOf(currentView);
      if (currentIndex === -1) return;

      const deltaY = e.deltaY;
      if (Math.abs(deltaY) <= 30) return;

      const now = Date.now();
      const timeSinceLastScroll = now - lastScrollTimeRef.current;
      if (timeSinceLastScroll < SCROLL_COOLDOWN_MS) {
        lastWheelTimeRef.current = now;
        return;
      }

      lastWheelTimeRef.current = now;

      if (deltaY > 30) {
        if (currentIndex < CORE_SCROLL_VIEWS.length - 1) {
          lastScrollTimeRef.current = now;
          handleViewChange(CORE_SCROLL_VIEWS[currentIndex + 1]);
        }
      } else if (deltaY < -30) {
        if (currentIndex > 0) {
          lastScrollTimeRef.current = now;
          handleViewChange(CORE_SCROLL_VIEWS[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [currentView, isLoginModalOpen, isProfileModalOpen, isFocusModeOpen, isChatOpen, handleViewChange]);

  const solvedQuestionsCount = questions.filter(q => q.isSolved).length;
  const isScrollableView =
    currentView === 'memory' || currentView === 'chronicles' || currentView === 'landing';

  const activeGodray = GODRAY_PRESETS.find(p => p.id === godrayPreset) || GODRAY_PRESETS[0];

  useEffect(() => {
    document.documentElement.style.setProperty('--ff-accent', activeGodray.accent);
    document.documentElement.style.setProperty('--ff-godray-gradient', activeGodray.gradient);
    document.documentElement.style.setProperty(
      '--ff-godray-opacity',
      String(Math.min(0.95, (godrayIntensity / 100) * 0.92))
    );
  }, [activeGodray, godrayIntensity]);

  return (
    <AuthProvider currentUser={currentUser}>
      {/* Global Radiant Cursor (Active across entire app on pointer devices) */}
      <GlobalCursor />

      <div
        className={`relative w-full ${
          isScrollableView ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-hidden'
        } ${currentView === 'landing' ? 'bg-[var(--ff-bg)]' : 'bg-black'} text-white font-sans`}
      >
        {/* Ambient Godray Gradient Lighting Overlay (Enhanced influence across viewport) */}
        <div
          className="fixed inset-0 pointer-events-none z-[1] overflow-hidden transition-all duration-700"
          style={{
            background: activeGodray.gradient,
            opacity: Math.min(0.95, (godrayIntensity / 100) * 0.92),
          }}
          aria-hidden="true"
        />
        <div
          className="fixed -top-24 inset-x-0 h-[360px] pointer-events-none z-[1] blur-3xl transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${activeGodray.accent}55 0%, transparent 72%)`,
            opacity: Math.min(0.9, (godrayIntensity / 100) * 0.85),
          }}
          aria-hidden="true"
        />
      
      {/* Floating Global Navbar Dock (Viewport fixed wrapper with graceful transitions) */}
      {currentView !== 'chronicles' && (
        currentView === 'landing' ? null : (
        <Navbar
          currentView={currentView}
          onViewChange={handleViewChange}
          currentUser={currentUser}
          onOpenLoginModal={() => handleOpenAuth('login')}
          onLogout={logout}
          isChatOpen={isChatOpen}
          onToggleChat={handleToggleChat}
          unreadChatCount={unreadChatCount}
          onOpenProfile={handleOpenProfile}
          onOpenFocusMode={() => setIsFocusModeOpen(true)}
          isInsideCinema={isInsideCinema}
          onRewardCoins={(amount) => {
            if (currentUser) addXP(amount, currentUser.email);
          }}
          onUpdateStreak={(streak) => {
            if (currentUser && (currentUser.streakCount ?? 0) !== streak) {
              updateProfile({ streakCount: streak });
            }
          }}
        />
        )
      )}

      {/* Main Dimension View Routing (Single-Viewport Multi-View Architecture) */}
      <main className={`w-full ${currentView === 'memory' || currentView === 'chronicles' ? 'min-h-[116vh]' : 'h-full'}`}>
        <Suspense fallback={<ViewLoadingFallback />}>
          {currentView === 'landing' && (
            <LandingPage
              currentUser={currentUser}
              onOpenAuth={() => handleOpenAuth('register')}
              onEnterApp={() => handleViewChange('home')}
              onlineCount={onlineUsers.length}
              totalQuestions={questions.length}
              solvedQuestions={solvedQuestionsCount}
              totalClubs={clubs.filter(c => c.status === 'APPROVED').length}
            />
          )}

          {currentView === 'home' && (
            <div className="relative w-full h-full">
              <HomeView
                onNavigate={handleNavigate}
                onOpenLanding={() => handleViewChange('landing')}
                totalClubs={clubs.filter(c => c.status === 'APPROVED').length}
                totalQuestions={questions.length}
                solvedQuestionsCount={solvedQuestionsCount}
                onlineCount={onlineUsers.length}
                onlineUsersCount={onlineUsers.length}
                resolvedQuestionsCount={solvedQuestionsCount}
                totalClubsCount={clubs.filter(c => c.status === 'APPROVED').length}
                chatMessagesTodayCount={chatMessages.length}
                streakCount={currentUser?.streakCount || 0}
                onOpenDaily={() => window.dispatchEvent(new CustomEvent('fforum_open_daily'))}
              />
            </div>
          )}

          {currentView === 'clubs' && (
            <ClubsView
              currentUser={currentUser}
              clubs={clubs}
              clubPosts={clubPosts}
              onCreateClub={createClub}
              onApproveClub={approveClub}
              onRejectClub={rejectClub}
              onCreateClubPost={createClubPost}
              chatMessages={chatMessages}
              onOpenLoginModal={() => handleOpenAuth('login')}
            />
          )}

          {currentView === 'qa' && (
            <QAForumView
              currentUser={currentUser}
              questions={questions}
              solutions={solutions}
              onCreateQuestion={createQuestion}
              onAddSolution={addSolution}
              onMarkBestSolution={markBestSolution}
              onDeleteQuestion={adminDeleteQuestion}
              onEditQuestion={adminEditQuestion}
              onDeleteSolution={adminDeleteSolution}
              onOpenLoginModal={() => handleOpenAuth('login')}
              onOpenProfile={handleOpenUserProfile}
              users={users}
              chatMessages={chatMessages}
              isSynced={isSynced}
            />
          )}

          {currentView === 'chat' && (
            <ChatView
              currentUser={currentUser}
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              onDeleteMessage={adminDeleteChatMessage}
              onlineUsers={onlineUsers}
              onlineCount={onlineUsers.length}
              onOpenLoginModal={() => handleOpenAuth('login')}
              onOpenProfile={handleOpenUserProfile}
              isSynced={isSynced}
            />
          )}

          {currentView === 'memory' && (
            <div className="w-full min-h-screen bg-black">
              <MemoryRealm
                onNavigateSection={(sectionId) => {
                  if (sectionId === 'clubs' || sectionId === 'qa' || sectionId === 'chronicles') {
                    handleViewChange(sectionId as DimensionView);
                  } else {
                    const el = document.getElementById(sectionId);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            </div>
          )}

          {currentView === 'chronicles' && (
            <KhuVinhDanhView
              onExit={() => setCurrentView('home')}
              onNavigate={(v) => setCurrentView(v)}
              currentUser={currentUser}
            />
          )}

          {currentView === 'study' && (
            <StudyRoomView
              currentUser={currentUser}
              decks={studyDecks}
              sessions={studySessions}
              onOpenLoginModal={() => handleOpenAuth('login')}
              onCreateDeck={createStudyDeck}
              onUpdateDeck={updateStudyDeck}
              onDeleteDeck={deleteStudyDeck}
              onImportCards={importStudyCards}
              onGradeCard={gradeStudyCard}
              onSyncDeck={syncStudyDeck}
              onRecordSession={recordStudySession}
              onToggleStar={toggleStudyDeckStar}
              onCloneDeck={cloneStudyDeck}
            />
          )}

          {currentView === 'coming-soon' && (
            <UpdateHubView
              currentUser={currentUser}
              onOpenAuth={() => handleOpenAuth('register')}
              onNavigate={handleViewChange}
              stats={{
                members: Object.keys(users).length,
                questions: questions.length,
                solutions: solutions.length,
                clubs: clubs.filter(club => club.status === 'APPROVED').length,
                decks: studyDecks.length,
                sessions: studySessions.length,
              }}
              feedbacks={feedbacks}
              onSubmitFeedback={submitFeedback}
            />
          )}
        </Suspense>
      </main>

      {/* Radial quick actions (ccm-02 sin()/cos() fan at bottom-left below Streak) */}
      {currentView !== 'landing' && currentView !== 'chronicles' && !isChatOpen && (
        <RadialQuickMenu
          onNavigate={(v) => handleNavigate(v as DimensionView)}
          onToggleChat={handleToggleChat}
          onOpenFocusMode={() => setIsFocusModeOpen(true)}
        />
      )}

      <Suspense fallback={null}>
        {/* Slide-over Chat Dock (For quick chatting when browsing Home, Clubs, QA, Chronicles) */}
        {currentView !== 'chat' && (
          currentView === 'landing' ? null : (
          <ChatDock
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            currentUser={currentUser}
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onDeleteMessage={adminDeleteChatMessage}
            onOpenLoginModal={() => handleOpenAuth('login')}
            onOpenProfile={handleOpenUserProfile}
          />
          )
        )}

        {/* User Profile (F-ID Settings Modal) */}
        {(targetProfileUser || currentUser) && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setTargetProfileUser(null);
            }}
            currentUser={targetProfileUser || currentUser!}
            viewerUser={currentUser}
            onSaveProfile={updateProfile}
            initialTab={profileInitialTab}
            questions={questions}
            solutions={solutions}
          />
        )}

        {/* Quick Profile Card (click a user → preview, then open full profile on demand) */}
        <UserQuickCard
          user={quickProfile?.user || null}
          isOpen={Boolean(quickProfile)}
          onClose={() => setQuickProfile(null)}
          onOpenFullProfile={(user, tab) => {
            setQuickProfile(null);
            handleOpenProfile(tab || 'overview', {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              email: user.email,
              level: user.level,
            });
          }}
          questions={questions}
          solutions={solutions}
        />

        {/* Authentication Modal */}
        <AuthModal
          key={authInitialTab}
          initialTab={authInitialTab}
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
          onLoginSocial={loginSocial}
          onLoginWithPassword={loginWithPassword}
          onRegister={registerWithPassword}
        />

        {/* Focus Sanctuary & Pomodoro HUD Mode */}
        <FocusSanctuary
          isOpen={isFocusModeOpen}
          onClose={() => setIsFocusModeOpen(false)}
          onRewardXP={addXP}
        />
      </Suspense>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 sm:top-24 right-4 sm:right-6 z-50 animate-fade-up">
          <div className="liquid-glass rounded-2xl bg-neutral-950/95 border border-white/20 p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-sm">
            <div className="shrink-0 p-2 rounded-xl bg-white/10">
              {toastMessage.type === 'level' ? (
                <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
              ) : toastMessage.type === 'xp' ? (
                <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : toastMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{toastMessage.title}</h4>
              {toastMessage.subtitle && (
                <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                  {toastMessage.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin XP & Level Management Sandbox */}
      {currentUser?.email === 'anhtuantran0512@gmail.com' && (
        <XPSandboxDock
          level={currentUser.level}
          xp={currentUser.xp}
          onAddXP={addXP}
        />
      )}

      {/* CodeFronts .la-08 Healthcare Appointment & Resource Loading Animation */}
      {isResourceLoading && (
        <PageResourceLoader onLoaded={() => setIsResourceLoading(false)} />
      )}

      </div>
    </AuthProvider>
  );
};

export default App;
