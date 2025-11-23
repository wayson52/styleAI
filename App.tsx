
import React, { useState, useEffect, useRef } from 'react';
import { UploadSection } from './components/UploadSection';
import { generateTryOnImage, searchImages } from './services/geminiService';
import { storage } from './services/storage';
import { 
  SAMPLE_TOPS, SAMPLE_BOTTOMS, SAMPLE_PET_OUTFITS,
  RANDOM_TOP_QUERIES, RANDOM_BOTTOM_QUERIES, RANDOM_PET_OUTFIT_QUERIES 
} from './constants';
import { Sample, HistoryItem, SubjectType } from './types';
import { Shirt, Sparkles, AlertCircle, Download, Sun, Moon, RefreshCw, Layers, User, Clock, Trash2, PawPrint, Heart, ZoomIn, RotateCcw, Maximize2, X, ShoppingBag, Wand2, ChevronRight, ChevronDown } from 'lucide-react';
import { translations, LanguageCode } from './translations';

// --- Language Selector Component ---
interface LanguageOption {
  code: LanguageCode;
  name: string;
  country: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', country: 'us' },
  { code: 'zh-CN', name: 'Chinese', country: 'cn' },
  { code: 'ms', name: 'Malay', country: 'my' },
  { code: 'ko', name: 'Korean', country: 'kr' },
  { code: 'ja', name: 'Japanese', country: 'jp' },
];

interface LanguageSelectorProps {
  currentLang: LanguageCode;
  onChange: (lang: LanguageCode) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFlag = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors rounded-full pl-1 pr-3 py-1 border border-slate-200 dark:border-slate-700"
      >
        <img 
          src={`https://flagcdn.com/w40/${currentFlag.country}.png`} 
          alt={currentFlag.name}
          className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-600"
        />
        <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { onChange(lang.code); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                currentLang === lang.code 
                  ? 'bg-primary/10 text-primary dark:text-primary-400 font-medium' 
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <img 
                src={`https://flagcdn.com/w40/${lang.country}.png`} 
                alt={lang.name}
                className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-600"
              />
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Fullscreen Zoomable Image Component ---
interface ZoomableImageProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPinchDist = useRef<number | null>(null);
  const startScale = useRef(1);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(1, scale + delta * scale), 5);
    
    setScale(newScale);
    
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    
    lastPos.current = { x: e.clientX, y: e.clientY };

    if (scale > 1) {
       setPosition(prev => ({
         x: prev.x + dx,
         y: prev.y + dy
       }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      startPinchDist.current = dist;
      startScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && startPinchDist.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max(1, startScale.current * (dist / startPinchDist.current)), 5);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    }
  };

  const handleTouchEnd = () => {
    startPinchDist.current = null;
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-200">
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className="text-white font-medium drop-shadow-md pointer-events-auto flex items-center gap-2">
                <ZoomIn className="w-4 h-4" /> 
                {Math.round(scale * 100)}%
            </div>
            <div className="flex gap-4 pointer-events-auto">
                 <button 
                    onClick={resetZoom}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div 
            ref={containerRef}
            className="flex-grow flex items-center justify-center overflow-hidden touch-none cursor-move"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={resetZoom}
        >
            <img 
                src={src} 
                alt={alt} 
                className="max-w-none transition-transform duration-75 ease-linear"
                style={{
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    maxHeight: '100vh',
                    maxWidth: '100vw'
                }}
                draggable={false}
            />
        </div>
    </div>
  );
};

type Tab = 'model' | 'wardrobe' | 'result';

const App: React.FC = () => {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [topImage, setTopImage] = useState<string | null>(null);
  const [bottomImage, setBottomImage] = useState<string | null>(null);

  const [subjectType, setSubjectType] = useState<SubjectType>('human');
  
  const [activeTab, setActiveTab] = useState<Tab>('model');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [topSamples, setTopSamples] = useState<Sample[]>(SAMPLE_TOPS);
  const [bottomSamples, setBottomSamples] = useState<Sample[]>(SAMPLE_BOTTOMS);
  const [petOutfitSamples, setPetOutfitSamples] = useState<Sample[]>(SAMPLE_PET_OUTFITS);

  const [resultImage, setResultImage] = useState<string | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTopsLoading, setIsTopsLoading] = useState(false);
  const [isBottomsLoading, setIsBottomsLoading] = useState(false);
  const [isPetOutfitsLoading, setIsPetOutfitsLoading] = useState(false);

  // Language State with Persistence and Auto-detection
  const [currentLang, setCurrentLang] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      // 1. Check Local Storage
      const savedLang = localStorage.getItem('styleai_lang');
      const supportedCodes: LanguageCode[] = ['en', 'zh-CN', 'ms', 'ko', 'ja'];
      if (savedLang && supportedCodes.includes(savedLang as LanguageCode)) {
        return savedLang as LanguageCode;
      }

      // 2. Check System Language
      const systemLang = navigator.language || 'en';
      if (systemLang.startsWith('zh')) return 'zh-CN';
      if (systemLang.startsWith('ms')) return 'ms';
      if (systemLang.startsWith('ko')) return 'ko';
      if (systemLang.startsWith('ja')) return 'ja';
    }
    return 'en';
  });

  // Persist language change
  useEffect(() => {
    localStorage.setItem('styleai_lang', currentLang);
  }, [currentLang]);

  // Translation Helper
  const t = translations[currentLang];

  const [generationStatus, setGenerationStatus] = useState<string>(t.statusProcessing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        localStorage.removeItem('styleai_history');
        const allItems = await storage.getAll();
        
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const idsToDelete: string[] = [];
        
        const validHistory = allItems.filter(item => {
            if (item.isFavorite) return true;
            if (item.timestamp <= thirtyDaysAgo) {
                idsToDelete.push(item.id);
                return false;
            }
            return true;
        });
        
        setHistory(validHistory);
        
        if (idsToDelete.length > 0) {
            await storage.deleteMultiple(idsToDelete);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    
    loadHistory();
  }, []);

  const addToHistory = async (url: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      url: url,
      timestamp: Date.now(),
      subjectType: subjectType,
      isFavorite: false
    };
    setHistory(prev => [newItem, ...prev]);
    try { await storage.save(newItem); } catch (e) { setError("Could not save history"); }
  };

  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const itemToUpdate = history.find(h => h.id === id);
    if (!itemToUpdate) return;
    const updatedItem = { ...itemToUpdate, isFavorite: !itemToUpdate.isFavorite };
    setHistory(prev => prev.map(item => item.id === id ? updatedItem : item));
    try { await storage.save(updatedItem); } catch (e) { console.error(e); }
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (resultImage === history.find(h => h.id === id)?.url) {
        setResultImage(null);
    }
    try { await storage.delete(id); } catch (e) { console.error(e); }
  };

  const clearHistory = async () => {
    setHistory(prev => prev.filter(h => h.isFavorite));
    try { await storage.clearNonFavorites(); } catch (e) { console.error(e); }
  };

  const toggleTheme = () => { setIsDarkMode(!isDarkMode); };

  const handleSubjectTypeChange = (type: SubjectType) => {
    if (type === subjectType) return;
    setSubjectType(type);
    setPersonImage(null);
    setTopImage(null);
    setBottomImage(null);
    setResultImage(null);
    setError(null);
  };

  const handleTopSelect = (url: string) => { setTopImage(url === topImage ? null : url); };
  const handleBottomSelect = (url: string) => { setBottomImage(url === bottomImage ? null : url); };

  const handleTopsSearch = async (q: string) => { 
      setIsTopsLoading(true); 
      try { 
          const r = await searchImages(q); 
          if(r.length) setTopSamples(r); 
          else setError(`No tops found for "${q}"`);
      } catch(e){
          setError("Search failed")
      } finally{
          setIsTopsLoading(false)
      } 
  };

  const handleBottomsSearch = async (q: string) => { 
      setIsBottomsLoading(true); 
      try { 
          const r = await searchImages(q); 
          if(r.length) setBottomSamples(r);
          else setError(`No bottoms found for "${q}"`);
      } catch(e){
          setError("Search failed")
      } finally{
          setIsBottomsLoading(false)
      } 
  };

  const handlePetOutfitSearch = async (q: string) => { 
      setIsPetOutfitsLoading(true); 
      try { 
          const r = await searchImages(q); 
          if(r.length) setPetOutfitSamples(r);
          else setError(`No outfits found for "${q}"`);
      } catch(e){
          setError("Search failed")
      } finally{
          setIsPetOutfitsLoading(false)
      } 
  };

  const getRandomQuery = (queries: string[]) => queries[Math.floor(Math.random() * queries.length)];

  const handleRandomizeTops = async () => { setIsTopsLoading(true); try { const q = getRandomQuery(RANDOM_TOP_QUERIES); const r = await searchImages(q); if(r.length) setTopSamples(r); } catch(e){} finally { setIsTopsLoading(false); } };
  const handleRandomizeBottoms = async () => { setIsBottomsLoading(true); try { const q = getRandomQuery(RANDOM_BOTTOM_QUERIES); const r = await searchImages(q); if(r.length) setBottomSamples(r); } catch(e){} finally { setIsBottomsLoading(false); } };
  const handleRandomizePetOutfits = async () => { setIsPetOutfitsLoading(true); try { const q = getRandomQuery(RANDOM_PET_OUTFIT_QUERIES); const r = await searchImages(q); if(r.length) setPetOutfitSamples(r); } catch(e){} finally { setIsPetOutfitsLoading(false); } };

  const canGenerate = subjectType === 'human' 
    ? (personImage && (topImage || bottomImage) && !isLoading)
    : (personImage && topImage && !isLoading);

  const handleGenerateClick = async () => {
    if (!personImage) { setError(t.errSelectModel); setActiveTab('model'); return; }
    if (subjectType === 'human' && !topImage && !bottomImage) { setError(t.errSelectClothes); setActiveTab('wardrobe'); return; }
    if (subjectType === 'pet' && !topImage) { setError(t.errSelectOutfit); setActiveTab('wardrobe'); return; }

    setIsLoading(true);
    setActiveTab('result'); 
    setGenerationStatus(t.statusPreparing);
    setError(null);
    
    try {
      setTimeout(() => { if (isLoading) setGenerationStatus(t.statusAnalyzing); }, 1500);
      setTimeout(() => { if (isLoading) setGenerationStatus(t.statusDesigning); }, 3500);
      
      const generatedUrl = await generateTryOnImage(personImage, topImage, bottomImage, subjectType);
      
      setGenerationStatus(t.statusFinalizing);
      setResultImage(generatedUrl);
      await addToHistory(generatedUrl);
    } catch (err: any) {
      let errorMessage = t.errFailed;
      if (err.message?.includes('429')) errorMessage = t.errTraffic;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setGenerationStatus(t.statusProcessing);
    }
  };

  const resetAll = () => {
    setPersonImage(null);
    setTopImage(null);
    setBottomImage(null);
    setResultImage(null);
    setError(null);
    setActiveTab('model');
  };

  // --- Layout Components ---

  const BaseModelColumn = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-slate-800 dark:text-white flex items-center">
                    <User className="w-5 h-5 mr-2 text-primary dark:text-primary-400" /> {t.colModel}
                </h2>
            </div>
            
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => handleSubjectTypeChange('human')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center transition-all ${
                        subjectType === 'human' 
                        ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    <User className="w-3 h-3 mr-1" /> {t.modeHuman}
                </button>
                <button 
                    onClick={() => handleSubjectTypeChange('pet')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center transition-all ${
                        subjectType === 'pet' 
                        ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    <PawPrint className="w-3 h-3 mr-1" /> {t.modePet}
                </button>
            </div>
        </div>
        
        <div className="p-4 flex-grow flex flex-col gap-4 overflow-y-auto">
            {personImage ? (
            <div className="flex-grow h-full relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-full bg-slate-100 dark:bg-slate-800">
                <img src={personImage} alt="Base Model" className="w-full h-full object-cover" />
                <button 
                onClick={() => setPersonImage(null)}
                className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 cursor-pointer"
                >
                <RefreshCw className="w-4 h-4" />
                </button>
            </div>
            ) : (
            <UploadSection 
                title={subjectType === 'human' ? t.uploadLabels.titleModel : t.uploadLabels.titlePet}
                description={subjectType === 'human' ? t.uploadLabels.descModel : t.uploadLabels.descPet}
                samples={[]}
                onSelect={setPersonImage}
                compact={true}
                className="flex-grow h-full"
                enableCategoryFilter={false}
                enableGenderFilter={false}
                initialVisibleCount={0}
                defaultCameraFacingMode={subjectType === 'human' ? 'user' : 'environment'}
                labels={t.uploadLabels}
            />
            )}
        </div>
    </div>
  );

  const WardrobeColumn = () => (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
         {subjectType === 'human' ? (
            /* Human Wardrobe */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start h-full">
            {/* Tops */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm h-full max-h-[calc(100vh-150px)] lg:max-h-none">
            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                <span className="font-bold text-blue-700 dark:text-blue-200 flex items-center text-sm">
                    <Shirt className="w-4 h-4 mr-2" /> {t.colTops}
                </span>
                {topImage && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
            </div>
            <div className="p-2 flex-grow overflow-y-auto">
                <UploadSection 
                title="" 
                samples={topSamples}
                onSelect={handleTopSelect}
                onSearch={handleTopsSearch}
                onRandomize={handleRandomizeTops}
                selectedUrl={topImage}
                compact
                className="shadow-none border-none p-0"
                enableGenderFilter={false}
                initialVisibleCount={6}
                isLoading={isTopsLoading}
                defaultCameraFacingMode="environment"
                labels={t.uploadLabels}
                />
            </div>
            </div>

            {/* Bottoms */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm h-full max-h-[calc(100vh-150px)] lg:max-h-none">
            <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center text-sm">
                    <Layers className="w-4 h-4 mr-2" /> {t.colBottoms}
                </span>
                {bottomImage && <span className="w-2 h-2 bg-purple-500 rounded-full"></span>}
            </div>
            <div className="p-2 flex-grow overflow-y-auto">
                <UploadSection 
                title="" 
                samples={bottomSamples}
                onSelect={handleBottomSelect}
                onSearch={handleBottomsSearch}
                onRandomize={handleRandomizeBottoms}
                selectedUrl={bottomImage}
                compact
                className="shadow-none border-none p-0"
                enableGenderFilter={false}
                initialVisibleCount={6}
                isLoading={isBottomsLoading}
                defaultCameraFacingMode="environment"
                labels={t.uploadLabels}
                />
            </div>
            </div>
            </div>
        ) : (
            /* Pet Wardrobe */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm h-full">
                <div className="p-3 bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                    <span className="font-bold text-green-700 dark:text-green-300 flex items-center text-sm">
                        <Shirt className="w-4 h-4 mr-2" /> {t.colPetOutfit}
                    </span>
                    {topImage && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                </div>
                <div className="p-4 flex-grow overflow-y-auto">
                    <UploadSection 
                    title={t.uploadLabels.titlePetOutfit}
                    description={t.uploadLabels.descPetOutfit}
                    samples={petOutfitSamples}
                    onSelect={handleTopSelect}
                    onSearch={handlePetOutfitSearch}
                    onRandomize={handleRandomizePetOutfits}
                    selectedUrl={topImage}
                    compact
                    className="shadow-none border-none p-0"
                    enableGenderFilter={false}
                    initialVisibleCount={8}
                    isLoading={isPetOutfitsLoading}
                    defaultCameraFacingMode="environment"
                    labels={t.uploadLabels}
                    />
                </div>
                </div>
        )}
    </div>
  );

  const ResultColumn = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <div className="sticky top-0 lg:top-20 space-y-4 z-20 bg-slate-50 dark:bg-slate-950 pb-4 lg:pb-0">
            <button 
                onClick={handleGenerateClick}
                disabled={!canGenerate}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center transform active:scale-[0.98] ${
                canGenerate 
                ? 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-xl hover:shadow-primary/20' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
            >
                {isLoading ? (
                    <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    {generationStatus}
                    </>
                ) : (
                    <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t.btnGenerate}
                    </>
                )}
            </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px] lg:min-h-[500px] relative flex items-center justify-center group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

            {resultImage ? (
            <div 
                className="relative w-full h-full cursor-zoom-in" 
                onClick={() => setIsFullscreen(true)}
            >
                <img 
                    src={resultImage} 
                    alt="Result" 
                    className="w-full h-full object-contain" 
                />
                <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-5 h-5" />
                </div>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <a 
                    href={resultImage}
                    download="styleai-result.jpg"
                    className="bg-white/90 dark:bg-black/90 text-slate-900 dark:text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform pointer-events-auto"
                    title={t.btnDownload}
                    onClick={(e) => e.stopPropagation()}
                    >
                    <Download className="w-5 h-5" />
                    </a>
                </div>
            </div>
            ) : (
            <div className="text-center p-8 z-10">
                {isLoading ? (
                    <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-4">
                        <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">{generationStatus}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center opacity-50">
                    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                        <Wand2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t.statusReady}</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-400 max-w-[200px] mt-2">
                        {t.statusReadyDesc}
                    </p>
                    </div>
                )}
            </div>
            )}
        </div>

        {history.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 pb-20 lg:pb-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                    <Clock className="w-4 h-4 mr-2" /> {t.historyTitle}
                    </h3>
                    <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500 flex items-center transition-colors">
                    {t.historyClear}
                    </button>
                </div>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {history.map((item) => (
                    <div 
                    key={item.id}
                    onClick={() => { setResultImage(item.url); window.scrollTo({top:0, behavior:'smooth'}); }}
                    className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 group ${resultImage === item.url ? 'border-primary' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                    <img src={item.url} alt="History" className="w-full h-full object-cover" />
                    <button onClick={(e) => toggleFavorite(e, item.id)} className={`absolute top-1 right-1 p-1 rounded-full z-10 ${item.isFavorite ? 'text-red-500 bg-white/80' : 'text-white bg-black/30 opacity-0 group-hover:opacity-100 hover:bg-black/50'}`}>
                        <Heart className={`w-3 h-3 ${item.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <button onClick={(e) => deleteHistoryItem(e, item.id)} className="absolute bottom-1 right-1 p-1 rounded-full bg-black/30 text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 z-10 transition-all">
                        <Trash2 className="w-3 h-3" />
                    </button>
                    </div>
                ))}
                </div>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col pb-20 lg:pb-0">
        {resultImage && isFullscreen && (
            <ZoomableImage 
                src={resultImage} 
                alt="Full Result" 
                onClose={() => setIsFullscreen(false)} 
            />
        )}

        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300 shadow-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={resetAll}>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6 text-primary dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.appName}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector currentLang={currentLang} onChange={setCurrentLang} />
              <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-grow p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div className="hidden lg:grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3"><BaseModelColumn /></div>
            <div className="lg:col-span-5"><WardrobeColumn /></div>
            <div className="lg:col-span-4"><ResultColumn /></div>
          </div>

          <div className="lg:hidden min-h-[80vh]">
            {activeTab === 'model' && <BaseModelColumn />}
            {activeTab === 'wardrobe' && <WardrobeColumn />}
            {activeTab === 'result' && <ResultColumn />}
            
            {activeTab !== 'result' && (
                <div className="fixed bottom-24 right-4 z-40">
                     <button 
                        onClick={() => setActiveTab(activeTab === 'model' ? 'wardrobe' : 'result')}
                        className="bg-primary text-white p-4 rounded-full shadow-xl hover:bg-primary/90 transition-all flex items-center animate-in zoom-in duration-300"
                     >
                        <span className="mr-2 font-bold">{t.btnNext}</span> <ChevronRight className="w-5 h-5" />
                     </button>
                </div>
            )}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                <button 
                    onClick={() => setActiveTab('model')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'model' ? 'text-primary dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    <User className={`w-6 h-6 transition-transform ${activeTab === 'model' ? 'scale-110' : ''}`} />
                    <span className="text-[10px] font-medium">{t.colModel}</span>
                </button>
                
                <button 
                    onClick={() => setActiveTab('wardrobe')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'wardrobe' ? 'text-primary dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    <div className="relative">
                        <ShoppingBag className={`w-6 h-6 transition-transform ${activeTab === 'wardrobe' ? 'scale-110' : ''}`} />
                        {(topImage || bottomImage) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                    </div>
                    <span className="text-[10px] font-medium">Wardrobe</span>
                </button>
                
                <button 
                    onClick={() => setActiveTab('result')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'result' ? 'text-primary dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    <div className="relative">
                        <Sparkles className={`w-6 h-6 transition-transform ${activeTab === 'result' ? 'scale-110' : ''}`} />
                        {resultImage && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>}
                    </div>
                    <span className="text-[10px] font-medium">Studio</span>
                </button>
            </div>
        </nav>
    </div>
  );
}

export default App;
