
import React, { useState, useEffect, useRef } from 'react';
import { UploadSection } from './components/UploadSection';
import { generateTryOnImage, searchImages } from './services/geminiService';
import { storage } from './services/storage';
import { 
  SAMPLE_ARTISTS, SAMPLE_TOPS, SAMPLE_BOTTOMS, SAMPLE_PETS, SAMPLE_PET_OUTFITS,
  RANDOM_MODEL_QUERIES, RANDOM_TOP_QUERIES, RANDOM_BOTTOM_QUERIES, RANDOM_PET_QUERIES, RANDOM_PET_OUTFIT_QUERIES 
} from './constants';
import { Sample, HistoryItem, SubjectType } from './types';
import { Shirt, Sparkles, AlertCircle, Download, Sun, Moon, RefreshCw, Layers, User, Clock, Trash2, PawPrint, Heart, ZoomIn, RotateCcw } from 'lucide-react';

// --- Zoomable Image Component ---
interface ZoomableImageProps {
  src: string;
  alt: string;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPinchDist = useRef<number | null>(null);
  const startScale = useRef(1);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(1, scale + delta * scale), 4);
    
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
       // Only allow panning if zoomed in
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

  // Touch pinch zoom logic (Simple implementation)
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
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max(1, startScale.current * (dist / startPinchDist.current)), 4);
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
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative touch-none cursor-move"
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
        ref={imgRef}
        src={src} 
        alt={alt} 
        className="max-w-full max-h-[70vh] object-contain transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
        }}
        draggable={false}
      />
      
      {/* Zoom Indicator / Reset Button */}
      {scale > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
            <ZoomIn className="w-3 h-3" /> 
            {Math.round(scale * 100)}%
            <button 
                onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                className="ml-2 p-1 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
            >
                <RotateCcw className="w-3 h-3" />
            </button>
        </div>
      )}
    </div>
  );
};


const App: React.FC = () => {
  // Inputs
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [topImage, setTopImage] = useState<string | null>(null);
  const [bottomImage, setBottomImage] = useState<string | null>(null);

  // Mode State
  const [subjectType, setSubjectType] = useState<SubjectType>('human');

  // Samples Data
  const [modelSamples, setModelSamples] = useState<Sample[]>([]);
  const [topSamples, setTopSamples] = useState<Sample[]>(SAMPLE_TOPS);
  const [bottomSamples, setBottomSamples] = useState<Sample[]>(SAMPLE_BOTTOMS);
  const [petOutfitSamples, setPetOutfitSamples] = useState<Sample[]>(SAMPLE_PET_OUTFITS);

  // Outputs
  const [resultImage, setResultImage] = useState<string | null>(null);
  
  // Theme State - Auto detect system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isTopsLoading, setIsTopsLoading] = useState(false);
  const [isBottomsLoading, setIsBottomsLoading] = useState(false);
  const [isPetOutfitsLoading, setIsPetOutfitsLoading] = useState(false);

  const [generationStatus, setGenerationStatus] = useState<string>('Processing...');
  const [error, setError] = useState<string | null>(null);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load trending chinese actors on mount (if human)
  useEffect(() => {
    const fetchTrendingModels = async () => {
      setIsModelLoading(true);
      try {
        // If strictly defaulting to human on load:
        const results = await searchImages("Popular Chinese Actor");
        if (results.length > 0) {
            setModelSamples(results);
        } else {
            setModelSamples(SAMPLE_ARTISTS);
        }
      } catch (err) {
        console.error("Failed to load trending models", err);
        setModelSamples(SAMPLE_ARTISTS);
      } finally {
        setIsModelLoading(false);
      }
    };
    
    // Only fetch if human is the default, or reload when switching back to human and list is empty
    if (subjectType === 'human' && modelSamples.length === 0) {
        fetchTrendingModels();
    } else if (subjectType === 'pet') {
        // For pets, just use samples initially
        setModelSamples(SAMPLE_PETS);
        setIsModelLoading(false);
    }
  }, [subjectType]);

  // Load History from IndexedDB
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Clean up old localStorage mess if it exists
        localStorage.removeItem('styleai_history');
        
        const allItems = await storage.getAll();
        
        // Filter out non-favorites older than 30 days
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
        
        // Prune old items from DB
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
    
    // Optimistic update
    setHistory(prev => [newItem, ...prev]);
    
    // Persist to DB
    try {
        await storage.save(newItem);
    } catch (e) {
        console.error("Failed to save to history", e);
        setError("Could not save result to history (Storage full?)");
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Find item to update
    const itemToUpdate = history.find(h => h.id === id);
    if (!itemToUpdate) return;
    
    const updatedItem = { ...itemToUpdate, isFavorite: !itemToUpdate.isFavorite };
    
    // Optimistic UI Update
    setHistory(prev => prev.map(item => item.id === id ? updatedItem : item));
    
    // DB Update
    try {
        await storage.save(updatedItem);
    } catch (e) {
        console.error("Failed to update favorite status", e);
    }
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Optimistic UI Update
    setHistory(prev => prev.filter(item => item.id !== id));
    if (resultImage === history.find(h => h.id === id)?.url) {
        setResultImage(null);
    }
    
    // DB Update
    try {
        await storage.delete(id);
    } catch (e) {
        console.error("Failed to delete item", e);
    }
  };

  const clearHistory = async () => {
    // Optimistic UI Update
    setHistory(prev => prev.filter(h => h.isFavorite));
    
    // DB Update
    try {
        await storage.clearNonFavorites();
    } catch (e) {
        console.error("Failed to clear history", e);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSubjectTypeChange = (type: SubjectType) => {
    if (type === subjectType) return;
    setSubjectType(type);
    // Reset selections when switching modes
    setPersonImage(null);
    setTopImage(null);
    setBottomImage(null);
    setResultImage(null);
    setError(null);
    
    // Update samples based on mode
    if (type === 'human') {
        // Force fetch again if needed or rely on effect
        if (modelSamples.length === 0 || modelSamples === SAMPLE_PETS) {
             setModelSamples([]); // Clear to trigger effect and show loading
        }
    } else {
        setModelSamples(SAMPLE_PETS);
    }
  };

  const handleTopSelect = (url: string) => {
    setTopImage(url === topImage ? null : url); 
  };

  const handleBottomSelect = (url: string) => {
    setBottomImage(url === bottomImage ? null : url); 
  };

  const handleModelSearch = async (query: string) => {
    setIsModelLoading(true);
    try {
      setError(null);
      const results = await searchImages(query);
      if (results.length > 0) {
        setModelSamples(results);
      } else {
        setError(`No images found for "${query}". Try a different search term.`);
      }
    } catch (err) {
      console.error("Search failed", err);
      setError("Failed to search for models. Please try again.");
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleTopsSearch = async (query: string) => {
    setIsTopsLoading(true);
    try {
      setError(null);
      const results = await searchImages(query);
      if (results.length > 0) setTopSamples(results);
      else setError(`No tops found for "${query}".`);
    } catch (err) {
      setError("Failed to search tops.");
    } finally {
      setIsTopsLoading(false);
    }
  };

  const handleBottomsSearch = async (query: string) => {
    setIsBottomsLoading(true);
    try {
      setError(null);
      const results = await searchImages(query);
      if (results.length > 0) setBottomSamples(results);
      else setError(`No bottoms found for "${query}".`);
    } catch (err) {
      setError("Failed to search bottoms.");
    } finally {
      setIsBottomsLoading(false);
    }
  };

  const handlePetOutfitSearch = async (query: string) => {
    setIsPetOutfitsLoading(true);
    try {
      setError(null);
      const results = await searchImages(query);
      if (results.length > 0) setPetOutfitSamples(results);
      else setError(`No outfits found for "${query}".`);
    } catch (err) {
      setError("Failed to search pet outfits.");
    } finally {
      setIsPetOutfitsLoading(false);
    }
  };

  // --- RANDOMIZATION HANDLERS ---
  
  const getRandomQuery = (queries: string[]) => {
    return queries[Math.floor(Math.random() * queries.length)];
  };

  const handleRandomizeModels = async () => {
    setIsModelLoading(true);
    try {
      const query = getRandomQuery(subjectType === 'human' ? RANDOM_MODEL_QUERIES : RANDOM_PET_QUERIES);
      const results = await searchImages(query);
      if (results.length > 0) setModelSamples(results);
    } catch (e) {
      console.error("Randomization failed", e);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleRandomizeTops = async () => {
    setIsTopsLoading(true);
    try {
      const query = getRandomQuery(RANDOM_TOP_QUERIES);
      const results = await searchImages(query);
      if (results.length > 0) setTopSamples(results);
    } catch (e) {
      console.error("Randomization failed", e);
    } finally {
      setIsTopsLoading(false);
    }
  };

  const handleRandomizeBottoms = async () => {
    setIsBottomsLoading(true);
    try {
      const query = getRandomQuery(RANDOM_BOTTOM_QUERIES);
      const results = await searchImages(query);
      if (results.length > 0) setBottomSamples(results);
    } catch (e) {
      console.error("Randomization failed", e);
    } finally {
      setIsBottomsLoading(false);
    }
  };

  const handleRandomizePetOutfits = async () => {
    setIsPetOutfitsLoading(true);
    try {
      const query = getRandomQuery(RANDOM_PET_OUTFIT_QUERIES);
      const results = await searchImages(query);
      if (results.length > 0) setPetOutfitSamples(results);
    } catch (e) {
      console.error("Randomization failed", e);
    } finally {
      setIsPetOutfitsLoading(false);
    }
  };

  // Generation Validation
  const canGenerate = subjectType === 'human' 
    ? (personImage && (topImage || bottomImage) && !isLoading)
    : (personImage && topImage && !isLoading); // For pet, topImage holds the outfit

  const handleGenerateClick = async () => {
    if (!personImage) {
      setError(`Please upload or select a ${subjectType} model first.`);
      return;
    }
    
    if (subjectType === 'human' && !topImage && !bottomImage) {
      setError("Please select at least one clothing item.");
      return;
    }

    if (subjectType === 'pet' && !topImage) {
      setError("Please select an outfit for your pet.");
      return;
    }

    setIsLoading(true);
    setGenerationStatus("Preparing images...");
    setError(null);
    
    try {
      // Simulate stages for better UX
      setTimeout(() => {
          if (isLoading) setGenerationStatus("Analyzing inputs...");
      }, 1500);

      setTimeout(() => {
          if (isLoading) setGenerationStatus("Designing outfit...");
      }, 3500);
      
      setTimeout(() => {
          if (isLoading) setGenerationStatus("Applying texture and lighting...");
      }, 6000);

      const generatedUrl = await generateTryOnImage(personImage, topImage, bottomImage, subjectType);
      
      setGenerationStatus("Finalizing...");
      setResultImage(generatedUrl);
      await addToHistory(generatedUrl);
    } catch (err: any) {
      let errorMessage = "Failed to generate image. Please try again.";
      if (err.message?.includes('429') || err.status === 429) {
        errorMessage = "Traffic is high. Please wait a moment and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setGenerationStatus("Processing...");
    }
  };

  const resetAll = () => {
    setPersonImage(null);
    setTopImage(null);
    setBottomImage(null);
    setResultImage(null);
    setError(null);
  };

  return (
    <div className="transition-colors duration-300">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300 shadow-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={resetAll}>
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6 text-primary dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">StyleAI</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Dashboard */}
        <main className="flex-grow p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
          
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Column 1: The Model (3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                   <div className="flex items-center justify-between mb-2">
                       <h2 className="font-bold text-slate-800 dark:text-white flex items-center">
                         <User className="w-5 h-5 mr-2 text-primary dark:text-primary-400" /> Base Model
                       </h2>
                   </div>
                   
                   {/* Type Switcher */}
                   <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                        <button 
                            onClick={() => handleSubjectTypeChange('human')}
                            className={`flex-1 py-1 px-3 rounded-md text-xs font-medium flex items-center justify-center transition-all ${
                                subjectType === 'human' 
                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
                                : 'text-slate-500 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <User className="w-3 h-3 mr-1" /> Human
                        </button>
                        <button 
                            onClick={() => handleSubjectTypeChange('pet')}
                            className={`flex-1 py-1 px-3 rounded-md text-xs font-medium flex items-center justify-center transition-all ${
                                subjectType === 'pet' 
                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
                                : 'text-slate-500 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <PawPrint className="w-3 h-3 mr-1" /> Pet
                        </button>
                   </div>
                </div>
                
                <div className="p-4 flex-grow flex flex-col gap-4">
                  {personImage ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[3/4] bg-slate-100 dark:bg-slate-800">
                      <img src={personImage} alt="Base Model" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setPersonImage(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <UploadSection 
                      title={subjectType === 'human' ? "Select Model" : "Select Pet"}
                      description={subjectType === 'human' ? "Search for a celebrity or upload photo." : "Upload your pet or choose sample."}
                      samples={modelSamples}
                      onSelect={setPersonImage}
                      onSearch={handleModelSearch}
                      onRandomize={handleRandomizeModels}
                      compact={true}
                      className="flex-grow"
                      enableCategoryFilter={subjectType === 'pet'} // Enable category for pets (Dog/Cat)
                      enableGenderFilter={subjectType === 'human'}
                      initialVisibleCount={6}
                      isLoading={isModelLoading}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: The Wardrobe (5 cols) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col">
              
              {subjectType === 'human' ? (
                  /* Human Wardrobe: Split Top/Bottom */
                  <div className="grid md:grid-cols-2 gap-4 items-start h-full">
                    {/* Tops */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm h-full">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                        <span className="font-bold text-blue-700 dark:text-blue-200 flex items-center text-sm">
                            <Shirt className="w-4 h-4 mr-2" /> Tops
                        </span>
                        {topImage && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                    </div>
                    <div className="p-2 flex-grow">
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
                        />
                    </div>
                    </div>

                    {/* Bottoms */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm h-full">
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 flex items-center justify-between">
                        <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center text-sm">
                            <Layers className="w-4 h-4 mr-2" /> Bottoms
                        </span>
                        {bottomImage && <span className="w-2 h-2 bg-purple-500 rounded-full"></span>}
                    </div>
                    <div className="p-2 flex-grow">
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
                        />
                    </div>
                    </div>
                  </div>
              ) : (
                  /* Pet Wardrobe: Single Outfit */
                   <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-sm h-full">
                    <div className="p-3 bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/20 flex items-center justify-between">
                        <span className="font-bold text-green-700 dark:text-green-300 flex items-center text-sm">
                            <Shirt className="w-4 h-4 mr-2" /> Pet Outfit
                        </span>
                        {topImage && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                    </div>
                    <div className="p-4 flex-grow">
                        <UploadSection 
                        title="Choose Outfit"
                        description="Select a cute outfit for your pet."
                        samples={petOutfitSamples}
                        onSelect={handleTopSelect} // Reusing handleTopSelect for the single pet outfit
                        onSearch={handlePetOutfitSearch}
                        onRandomize={handleRandomizePetOutfits}
                        selectedUrl={topImage}
                        compact
                        className="shadow-none border-none p-0"
                        enableGenderFilter={false}
                        initialVisibleCount={8}
                        isLoading={isPetOutfitsLoading}
                        />
                    </div>
                   </div>
              )}
            </div>

            {/* Column 3: The Studio / Result (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="sticky top-20 space-y-4">
                
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
                      Generate Try-On
                     </>
                  )}
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[400px] relative flex items-center justify-center group">
                  
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

                  {resultImage ? (
                    <div className="relative w-full h-full">
                       <ZoomableImage 
                         src={resultImage} 
                         alt="Result" 
                       />
                       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <a 
                            href={resultImage}
                            download="styleai-result.jpg"
                            className="bg-white/90 dark:bg-black/90 text-slate-900 dark:text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform pointer-events-auto"
                            title="Download"
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
                               <Sparkles className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Ready to Create</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-400 max-w-[200px] mt-2">
                              Select a model and some clothes, then hit Generate to see the magic.
                            </p>
                         </div>
                       )}
                    </div>
                  )}
                </div>

                {/* History Section */}
                {history.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                     <div className="flex items-center justify-between mb-3">
                       <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                         <Clock className="w-4 h-4 mr-2" /> History
                       </h3>
                       <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500 flex items-center transition-colors">
                         Clear Recent
                       </button>
                     </div>
                     <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        {history.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => setResultImage(item.url)}
                            className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 group ${resultImage === item.url ? 'border-primary' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                          >
                            <img src={item.url} alt="History" className="w-full h-full object-cover" />
                            
                            {/* Favorite Indicator/Toggle */}
                            <button
                                onClick={(e) => toggleFavorite(e, item.id)}
                                className={`absolute top-1 right-1 p-1 rounded-full z-10 ${item.isFavorite ? 'text-red-500 bg-white/80' : 'text-white bg-black/30 opacity-0 group-hover:opacity-100 hover:bg-black/50'}`}
                            >
                                <Heart className={`w-3 h-3 ${item.isFavorite ? 'fill-current' : ''}`} />
                            </button>

                            {/* Delete Button */}
                            <button
                                onClick={(e) => deleteHistoryItem(e, item.id)}
                                className="absolute bottom-1 right-1 p-1 rounded-full bg-black/30 text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 z-10 transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
