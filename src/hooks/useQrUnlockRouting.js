import { useEffect, useMemo, useRef } from 'react';
import {
  ADMIN_UNLOCK_CATEGORIES,
  ADMIN_UNLOCK_LABELS,
  BASIC_UNLOCK_SYMBOLS,
  INITIAL_SYMBOLS,
  UNLOCKED_SYMBOLS,
  hasQuestionPrerequisites,
  normalizeSymbols,
  resolveQrSymbol,
} from '../utils/symbols';
import { saveUserSymbols } from '../utils/firebaseApi';

const readQuestionGuideAutoShown = () => {
  try {
    return localStorage.getItem('questionGuideAutoShown') === 'true';
  } catch {
    return false;
  }
};

const writeQuestionGuideAutoShown = () => {
  try {
    localStorage.setItem('questionGuideAutoShown', 'true');
  } catch {
    // Non-critical preference storage can fail in private or restricted browsers.
  }
};

const publishDeviceSymbols = symbols => {
  const normalizedSymbols = normalizeSymbols(symbols);
  try {
    localStorage.setItem('symbols', JSON.stringify(normalizedSymbols));
  } catch {
    // The in-memory state is still the source of truth for the current session.
  }

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('ccc-symbols');
    channel.postMessage({ symbols: normalizedSymbols });
    channel.close();
  }
};

const resolveScannedQrSymbol = rawValue => {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  try {
    const url = new URL(value, window.location.origin);
    const normalizedPath = url.pathname.replace(/\/+$/, '');
    const pathTarget = normalizedPath.startsWith('/qr/')
      ? normalizedPath.slice('/qr/'.length)
      : normalizedPath.startsWith('/symbol/')
        ? normalizedPath.slice('/symbol/'.length)
        : '';
    const queryTarget =
      url.searchParams.get('symbol') ||
      url.searchParams.get('id') ||
      url.searchParams.get('qr') ||
      url.searchParams.get('s');

    return resolveQrSymbol(pathTarget || queryTarget || value);
  } catch {
    return resolveQrSymbol(value);
  }
};

export default function useQrUnlockRouting({
  activePopup,
  isLoading,
  languageText,
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
}) {
  const highlightTimerRef = useRef(null);
  const hasAutoOpenedQuestionGuide = useRef(readQuestionGuideAutoShown());

  const discovery = useMemo(() => {
    const isHeartDiscovered = symbols.heart_kymin || symbols.heart_yewon || symbols.heart_eunhye || symbols.heart_jihoon || symbols.heart_eunchae;
    const isDivideDiscovered = symbols.divide_kyeomjun || symbols.divide_yewon;
    const isCrossDiscovered = symbols.cross || symbols.cross_jihoon;
    const isQuestionDiscovered = symbols.question;
    const isQuestionUnlocked = isHeartDiscovered && isDivideDiscovered && isCrossDiscovered;
    const discoveredCount = (isHeartDiscovered ? 1 : 0)
      + (isDivideDiscovered ? 1 : 0)
      + (isCrossDiscovered ? 1 : 0)
      + (isQuestionDiscovered ? 1 : 0);

    return {
      discoveredCount,
      isCrossDiscovered,
      isDivideDiscovered,
      isHeartDiscovered,
      isQuestionDiscovered,
      isQuestionUnlocked,
    };
  }, [symbols]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const normalizedPath = window.location.pathname.replace(/\/+$/, '');
    const adminPathTarget = normalizedPath.startsWith('/admin/')
      ? normalizedPath.slice('/admin/'.length)
      : '';
    const unlockPathTarget = normalizedPath.startsWith('/unlock/')
      ? normalizedPath.slice('/unlock/'.length)
      : '';
    const qrPathTarget = normalizedPath.startsWith('/qr/')
      ? normalizedPath.slice('/qr/'.length)
      : normalizedPath.startsWith('/symbol/')
        ? normalizedPath.slice('/symbol/'.length)
        : '';
    const adminQueryTarget = params.get('admin');
    const unlockQueryTarget = params.get('unlock');
    const qrQueryTarget =
      params.get('symbol') || params.get('id') || params.get('qr') || params.get('s');
    const adminUnlockTarget = adminPathTarget || adminQueryTarget;
    const isResetRequested = params.get('reset') === 'true';
    const isBasicUnlockRequested =
      unlockPathTarget === 'basic' ||
      unlockQueryTarget === 'basic' ||
      unlockQueryTarget === 'core' ||
      adminQueryTarget === 'basic';
    const isAdminUnlockRequested =
      normalizedPath === '/admin' || adminQueryTarget === 'unlock' || adminQueryTarget === 'all';
    const isAdminCategoryUnlockRequested =
      Object.prototype.hasOwnProperty.call(ADMIN_UNLOCK_CATEGORIES, adminUnlockTarget);

    if (isResetRequested) {
      localStorage.clear();
      hasAutoOpenedQuestionGuide.current = false;
      publishDeviceSymbols(INITIAL_SYMBOLS);
      localStorage.setItem('needReset', 'true');
      setSymbols(INITIAL_SYMBOLS);
      setToast('로컬 및 서버 데이터 초기화 중... 🔄');

      setTimeout(() => {
        setToast('');
        window.location.href = window.location.pathname;
      }, 1200);
      return;
    }

    if (isBasicUnlockRequested) {
      setSymbols(prev => {
        const next = normalizeSymbols(prev);
        for (const symbolId of BASIC_UNLOCK_SYMBOLS) {
          next[symbolId] = true;
        }
        publishDeviceSymbols(next);
        return next;
      });
      setToast(languageText.basicUnlocked);
      setTimeout(() => setToast(''), 1500);
      window.history.replaceState({}, '', '/');
      return;
    }

    if (isAdminUnlockRequested) {
      publishDeviceSymbols(UNLOCKED_SYMBOLS);
      setSymbols(UNLOCKED_SYMBOLS);
      setToast('관리자 모드로 전체 잠금이 열렸습니다.');
      setTimeout(() => setToast(''), 1500);
      window.history.replaceState({}, '', '/');
      return;
    }

    if (isAdminCategoryUnlockRequested) {
      setSymbols(prev => {
        const next = normalizeSymbols(prev);
        for (const symbolId of ADMIN_UNLOCK_CATEGORIES[adminUnlockTarget]) {
          next[symbolId] = true;
        }
        publishDeviceSymbols(next);
        return next;
      });
      setToast(`관리자 모드로 ${ADMIN_UNLOCK_LABELS[adminUnlockTarget]} 잠금이 열렸습니다.`);
      setTimeout(() => setToast(''), 1500);
      window.history.replaceState({}, '', '/');
      return;
    }

    const symbol = resolveQrSymbol(qrPathTarget || qrQueryTarget);
    if (!symbol) return;

    if (symbol === 'question') {
      if (!hasQuestionPrerequisites(symbols)) {
        setToast(languageText.needThreeSymbols);
        setTimeout(() => setToast(''), 2000);
        window.history.replaceState({}, '', '/');
        return;
      }

      setSymbols(prev => {
        const next = { ...prev, question: true };
        publishDeviceSymbols(next);
        if (userId) {
          saveUserSymbols(userId, next).catch(err => {
            console.error('question QR 완료 데이터 백업 중 에러 발생:', err);
          });
        }
        return next;
      });

      setPage('home');
      setActivePopup({ type: 'qr', id: 'question' });
      window.history.replaceState({}, '', '/');
      return;
    }

    if (Object.prototype.hasOwnProperty.call(INITIAL_SYMBOLS, symbol)) {
      setSymbols(prev => {
        if (prev[symbol]) return prev;
        const next = { ...prev, [symbol]: true };
        publishDeviceSymbols(next);
        if (userId) {
          saveUserSymbols(userId, next).catch(err => {
            console.error('QR 해금 데이터 즉시 백업 중 에러 발생:', err);
          });
        }
        return next;
      });

      setActivePopup({ type: 'qr', id: symbol });
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    if (
      !discovery.isQuestionUnlocked ||
      discovery.isQuestionDiscovered ||
      isLoading ||
      page !== 'home' ||
      activePopup ||
      hasAutoOpenedQuestionGuide.current
    ) {
      return undefined;
    }

    hasAutoOpenedQuestionGuide.current = true;
    writeQuestionGuideAutoShown();

    const timerId = window.setTimeout(() => {
      setActivePopup({ type: 'question_guide', id: 'question' });
    }, 650);

    return () => window.clearTimeout(timerId);
  }, [activePopup, discovery.isQuestionDiscovered, discovery.isQuestionUnlocked, isLoading, page, setActivePopup]);

  const handleQrScannerDetected = rawValue => {
    const symbol = resolveScannedQrSymbol(rawValue);

    if (!symbol || !Object.prototype.hasOwnProperty.call(INITIAL_SYMBOLS, symbol)) {
      setToast(languageText.invalidQr);
      window.setTimeout(() => setToast(''), 1600);
      return;
    }

    if (symbol === 'question' && !hasQuestionPrerequisites(symbols)) {
      setToast(languageText.needThreeSymbols);
      window.setTimeout(() => setToast(''), 2000);
      setIsQrScannerOpen(false);
      return;
    }

    setSymbols(prev => {
      const next = { ...prev, [symbol]: true };
      publishDeviceSymbols(next);
      if (userId) {
        saveUserSymbols(userId, next).catch(err => {
          console.error('QR 스캔 해금 데이터 백업 중 에러 발생:', err);
        });
      }
      return next;
    });

    setIsQrScannerOpen(false);
    setPage('home');
    setActivePopup({ type: 'qr', id: symbol });
    window.history.replaceState({}, '', '/');
  };

  const handleMapSymbolClick = id => {
    if (id === 'question') {
      if (!discovery.isQuestionUnlocked) {
        setToast(languageText.boothLocked);
        setTimeout(() => setToast(''), 2000);
        return;
      }
      setActivePopup({
        type: symbols.question ? 'qr' : 'question_guide',
        id: 'question',
      });
      return;
    }

    setActivePopup({
      type: symbols[id] ? 'qr' : 'map',
      id,
    });
  };

  const handleSymbolCardClick = id => {
    if (id === 'question') {
      if (!discovery.isQuestionUnlocked) {
        setToast(languageText.boothLocked);
        setTimeout(() => setToast(''), 2000);
        return;
      }
      setActivePopup({
        type: symbols.question ? 'qr' : 'question_guide',
        id: 'question',
      });
      return;
    }

    const isCategoryDiscovered =
      id === 'heart' ? discovery.isHeartDiscovered :
      id === 'divide' ? discovery.isDivideDiscovered :
      id === 'cross' ? discovery.isCrossDiscovered :
      symbols[id];

    if (!isCategoryDiscovered) {
      setToast(`${languageText.undiscovered} 🔒`);
      setTimeout(() => setToast(''), 1500);
      return;
    }

    setActivePopup(
      id === 'heart' || id === 'divide' || id === 'cross'
        ? { type: 'multi', id }
        : { type: 'qr', id },
    );
  };

  const focusQuestionPinOnMap = () => {
    const questionPin = mapSectionRef.current?.querySelector('[data-map-pin-id="question"]');

    (questionPin || mapSectionRef.current)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    setHighlightedPinId('question');
    window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedPinId(null);
    }, 6200);
  };

  useEffect(() => () => {
    window.clearTimeout(highlightTimerRef.current);
  }, []);

  return {
    ...discovery,
    focusQuestionPinOnMap,
    handleMapSymbolClick,
    handleQrScannerDetected,
    handleSymbolCardClick,
  };
}
