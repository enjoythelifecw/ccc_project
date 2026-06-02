import React, { Suspense, lazy, useMemo, useRef, useState, useEffect } from 'react';
import Header from './components/Header';
import MapArea, { DEFAULT_MAP_PINS } from './components/MapArea';
import SymbolCards from './components/SymbolCards';
import useFirebaseSymbolSync from './hooks/useFirebaseSymbolSync';
import usePublicFeedbackFeed from './hooks/usePublicFeedbackFeed';
import useQrUnlockRouting from './hooks/useQrUnlockRouting';
import {
  INITIAL_SYMBOLS,
  normalizeSymbols,
} from './utils/symbols';
import { Camera, Sparkles } from 'lucide-react';

const Popup = lazy(() => import('./components/Popup'));
const ParticipatePage = lazy(() => import('./components/ParticipatePage'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const QRScannerPopup = lazy(() => import('./components/QRScannerPopup.jsx'));

const SYMBOLS_STORAGE_KEY = 'symbols';
const SYMBOLS_BROADCAST_CHANNEL = 'ccc-symbols';

const appCopy = {
  ko: {
    loadingFallback: '불러오는 중...',
    syncTitle: '기기 데이터 동기화 중',
    syncDesc: '해금 데이터를 안전하게 불러오고 있어요. 잠시만 기다려 주세요.',
    basicUnlocked: '하트, 나누기, 십자가가 해금되었어요.',
    needThreeSymbols: '먼저 하트, 나누기, 십자가를 모두 찾아야 해요.',
    boothLocked: '하트, 나누기, 십자가를 모으면 상품 부스 안내가 열려요.',
    undiscovered: '아직 발견하지 못한 심볼이에요.',
    mapTitle: '작품 지도',
    mapDesc: '심볼을 따라 오늘의 작품을 찾아보세요.',
    scanQrButton: 'QR 스캔',
    invalidQr: '작품 QR을 인식하지 못했어요.',
    cardsTitle: '작품 설명 카드',
    cardsDesc: '발견한 심볼의 작품 설명을 확인하고, 마지막 상품 부스까지 이어가 보세요.',
  },
  en: {
    loadingFallback: 'Loading...',
    syncTitle: 'Syncing Device Data',
    syncDesc: 'Your unlocked symbols are being loaded safely. Please wait a moment.',
    basicUnlocked: 'Heart, Division, and Cross have been unlocked.',
    needThreeSymbols: 'Find Heart, Division, and Cross first.',
    boothLocked: 'Find Heart, Division, and Cross to unlock the prize booth guide.',
    undiscovered: 'This symbol has not been discovered yet.',
    mapTitle: 'Artwork Map',
    mapDesc: "Follow the symbols and find today's artworks.",
    scanQrButton: 'Scan QR',
    invalidQr: 'This QR code was not recognized.',
    cardsTitle: 'Artwork Cards',
    cardsDesc: 'Open the cards you discovered and continue to the final booth.',
  },
};

const readStoredSymbols = () => {
  const savedSymbols = localStorage.getItem(SYMBOLS_STORAGE_KEY);
  if (!savedSymbols) return INITIAL_SYMBOLS;

  try {
    return normalizeSymbols(JSON.parse(savedSymbols));
  } catch {
    return INITIAL_SYMBOLS;
  }
};

const areAllSymbolsLocked = symbols => (
  Object.keys(INITIAL_SYMBOLS).every(symbolId => !symbols[symbolId])
);

const mergeDeviceSymbols = (currentSymbols, incomingSymbols) => {
  const normalizedIncoming = normalizeSymbols(incomingSymbols);
  if (areAllSymbolsLocked(normalizedIncoming)) return normalizedIncoming;

  return Object.keys(INITIAL_SYMBOLS).reduce((acc, symbolId) => {
    acc[symbolId] = !!(currentSymbols?.[symbolId] || normalizedIncoming[symbolId]);
    return acc;
  }, {});
};

export default function App() {
  const [page, setPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/participate') return 'participate';
    if (path === '/admin-panel') return 'admin-panel';
    return 'home';
  });

  const [pins, setPins] = useState(DEFAULT_MAP_PINS);
  const [announcement, setAnnouncement] = useState(null);

  const [symbols, setSymbols] = useState(() => {
    return readStoredSymbols();
  });

  const [activePopup, setActivePopup] = useState(null);
  const [toast, setToast] = useState('');
  const [highlightedPinId, setHighlightedPinId] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'ko');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const mapSectionRef = useRef(null);
  const { userId, isLoading } = useFirebaseSymbolSync({
    symbols,
    setSymbols,
    setPins,
    setAnnouncement,
  });

  // 1개 이상 해금 시 해당 카테고리 발견 완료로 판정
  const text = appCopy[language] || appCopy.ko;

  const featuredFeedbacks = usePublicFeedbackFeed({ enabled: page === 'home' });

  const {
    discoveredCount,
    focusQuestionPinOnMap,
    handleMapSymbolClick,
    handleQrScannerDetected,
    handleSymbolCardClick,
    isQuestionUnlocked,
  } = useQrUnlockRouting({
    activePopup,
    isLoading,
    languageText: text,
    mapSectionRef,
    page,
    setActivePopup,
    setHighlightedPinId,
    setIsQrScannerOpen,
    setPage,
    setSymbols,
    setToast,
    symbols,
    userId,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('kakaotalk')) {
      const currentUrl = window.location.href;
      window.location.href = `kakaotalk://web/openExternalApp?url=${encodeURIComponent(currentUrl)}`;
    }
  }, []);

  const closePopup = () => {
    const shouldFocusQuestionPin = activePopup?.type === 'question_guide' && activePopup?.id === 'question';
    setActivePopup(null);

    if (shouldFocusQuestionPin) {
      window.setTimeout(focusQuestionPinOnMap, 180);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => {
      const nextLanguage = prev === 'ko' ? 'en' : 'ko';
      localStorage.setItem('language', nextLanguage);
      return nextLanguage;
    });
  };

  const openHomePage = () => {
    setPage('home');
    window.history.pushState({}, '', '/');
  };

  const openAdminPanel = () => {
    setPage('admin-panel');
    window.history.pushState({}, '', '/admin-panel');
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/participate') setPage('participate');
      else if (path === '/admin-panel') setPage('admin-panel');
      else setPage('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  if (page === 'participate') {
    return (
      <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-500">{text.loadingFallback}</div>}>
        <ParticipatePage onBack={openHomePage} language={language} />
      </Suspense>
    );
  }

  if (page === 'admin-panel') {
    return (
      <Suspense fallback={<div className="flex h-full items-center justify-center bg-slate-950 text-slate-300">관리자 페이지를 불러오는 중...</div>}>
        <AdminPanel onBack={openHomePage} />
      </Suspense>
    );
  }

  return (
    <div className="home-screen w-full h-full flex flex-col overflow-hidden relative font-['Jua']">
      <div className="home-backdrop" aria-hidden="true">
        <div className="home-backdrop__wash" />
        <div className="home-backdrop__grid" />
        <div className="home-backdrop__route home-backdrop__route--top" />
        <div className="home-backdrop__route home-backdrop__route--bottom" />
        <div className="home-backdrop__spark home-backdrop__spark--one" />
        <div className="home-backdrop__spark home-backdrop__spark--two" />
        <div className="home-backdrop__spark home-backdrop__spark--three" />
      </div>
      
      {/* 5. 프리미엄 글래스모피즘 동기화 로딩 화면 */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/75 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="w-20 h-20 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-center justify-center shadow-lg mb-6 animate-bounce">
            <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
          </div>
          <h3 className="font-['Cafe24_Ssurround'] font-bold text-2xl text-gray-800 text-center mb-2">
            {text.syncTitle}
          </h3>
          <p className="text-gray-500 text-sm text-center leading-relaxed max-w-[240px]">
            {text.syncDesc}
          </p>
        </div>
      )}

      <div className="relative z-10 flex-1 overflow-y-auto scroll-container pb-10">
        <Header
          discoveredCount={discoveredCount}
          announcement={announcement}
          language={language}
          onToggleLanguage={toggleLanguage}
        />

        <section
          ref={mapSectionRef}
          className="border-y border-sky-100 bg-sky-50/45 px-6 py-5 backdrop-blur-sm"
          aria-labelledby="tour-map-title"
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 id="tour-map-title" className="font-['Cafe24_Ssurround'] text-[20px] font-bold text-slate-950">
                {text.mapTitle}
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">
                {text.mapDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsQrScannerOpen(true)}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-sky-200 bg-white/90 px-3 text-[13px] font-bold text-sky-700 shadow-sm transition active:scale-95"
            >
              <Camera className="h-4 w-4" />
              {text.scanQrButton}
            </button>
          </div>
          <MapArea 
            symbols={symbols} 
            onSymbolClick={handleMapSymbolClick} 
            isQuestionUnlocked={isQuestionUnlocked}
            pins={pins}
            highlightedPinId={highlightedPinId}
            language={language}
          />
        </section>

        <section className="px-6 pt-6" aria-labelledby="artwork-cards-title">
          <div className="mb-4">
            <h2 id="artwork-cards-title" className="font-['Cafe24_Ssurround'] text-[20px] font-bold text-slate-950">
              {text.cardsTitle}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              {text.cardsDesc}
            </p>
          </div>

          <SymbolCards 
            symbols={symbols} 
            onCardClick={handleSymbolCardClick} 
            isQuestionUnlocked={isQuestionUnlocked}
            featuredFeedbacks={featuredFeedbacks}
            language={language}
          />
        </section>
      </div>

      {activePopup && (
        <Suspense fallback={null}>
          <Popup
            id={activePopup.id}
            type={activePopup.type}
            symbols={symbols}
            discovered={symbols[activePopup.id]}
            onClose={closePopup}
            language={language}
            onToggleLanguage={toggleLanguage}
          />
        </Suspense>
      )}

      {isQrScannerOpen && (
        <Suspense fallback={null}>
          <QRScannerPopup
            language={language}
            onClose={() => setIsQrScannerOpen(false)}
            onDetected={handleQrScannerDetected}
          />
        </Suspense>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-white/95 to-transparent" />

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-[120] -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-fade-in-out">
          {toast}
        </div>
      )}
    </div>
  );
}


