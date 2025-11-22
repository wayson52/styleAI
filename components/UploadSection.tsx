
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Upload, Camera, X, RefreshCcw, CheckCircle2, Link, ArrowRight, ChevronDown, ChevronUp, Search, Loader2, Dice5, Clipboard } from 'lucide-react';
import { Sample } from '../types';
import { TranslationSchema } from '../translations';

interface UploadSectionProps {
  title: string;
  description?: string;
  samples: Sample[];
  onSelect: (url: string) => void;
  onSearch?: (query: string) => Promise<void>;
  onRandomize?: () => Promise<void>;
  className?: string;
  compact?: boolean;
  selectedUrl?: string | null;
  enableCategoryFilter?: boolean;
  enableGenderFilter?: boolean;
  initialVisibleCount?: number;
  isLoading?: boolean;
  defaultCameraFacingMode?: 'user' | 'environment';
  labels: TranslationSchema['uploadLabels']; // Add labels prop
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  title,
  description,
  samples,
  onSelect,
  onSearch,
  onRandomize,
  className = "",
  compact = false,
  selectedUrl,
  enableCategoryFilter = true,
  enableGenderFilter = true,
  initialVisibleCount = 8,
  isLoading = false,
  defaultCameraFacingMode = 'user',
  labels // Destructure labels
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultCameraFacingMode);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  
  const [showSamples, setShowSamples] = useState(false);

  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  
  const VISIBLE_CATEGORY_COUNT = 4;

  const hasSamples = samples && samples.length > 0;

  useEffect(() => {
      setFacingMode(defaultCameraFacingMode);
  }, [defaultCameraFacingMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSelect(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
             if(event.target?.result) onSelect(event.target.result as string);
          };
          reader.readAsDataURL(blob);
        }
        return;
      }
    }
    
    if (e.target !== document.activeElement?.closest('input')) {
         const text = e.clipboardData.getData('text');
         if (text && (text.startsWith('http') || text.startsWith('data:'))) {
             onSelect(text);
         }
    }
  };

  const handleClipboardRead = async () => {
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const imageType = item.types.find(t => t.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                const reader = new FileReader();
                reader.onload = (event) => {
                    if(event.target?.result) onSelect(event.target.result as string);
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
        
        const text = await navigator.clipboard.readText();
        if (text) {
            if (text.startsWith('http') || text.startsWith('data:')) {
                onSelect(text);
            } else {
                setInputValue(text);
            }
        }
    } catch (err) {
        console.error("Clipboard access failed", err);
        alert("Could not access clipboard. Please use Ctrl+V to paste.");
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      setTimeout(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
      setIsCameraOpen(false);
    }
  };

  const switchCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        stopCamera();
        onSelect(dataUrl);
      }
    }
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputValue.trim();
    if (!value) return;

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      onSelect(value);
      setInputValue('');
    } else if (onSearch) {
      setShowSamples(true);
      setIsSearching(true);
      try {
        await onSearch(value);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleRandomizeClick = async () => {
    setShowSamples(true);
    if (onRandomize && !isRandomizing) {
      setIsRandomizing(true);
      try {
        await onRandomize();
      } finally {
        setIsRandomizing(false);
      }
    }
  };

  const availableGenders = useMemo(() => {
    const genders = new Set(samples.map(s => s.gender).filter(Boolean));
    return {
      hasMale: genders.has('male'),
      hasFemale: genders.has('female')
    };
  }, [samples]);

  const availableCategories = useMemo(() => {
    const cats = new Set(samples.map(s => s.category).filter(Boolean));
    return [labels.filterAll, ...Array.from(cats).sort()];
  }, [samples, labels.filterAll]);

  const filteredSamples = useMemo(() => {
    return samples.filter(sample => {
      if (enableGenderFilter && filterGender !== 'all') {
        if (sample.gender && sample.gender !== 'unisex' && sample.gender !== filterGender) {
          return false;
        }
      }
      if (enableCategoryFilter && filterCategory !== labels.filterAll && filterCategory !== 'All') {
        if (sample.category && sample.category !== filterCategory) {
          return false;
        }
      }
      return true;
    });
  }, [samples, filterGender, filterCategory, enableCategoryFilter, enableGenderFilter, labels.filterAll]);

  const showGenderFilter = !isLoading && enableGenderFilter && (availableGenders.hasMale || availableGenders.hasFemale);
  const showCategoryFilter = !isLoading && enableCategoryFilter && availableCategories.length > 2;

  const visibleSamples = isExpanded || !compact ? filteredSamples : filteredSamples.slice(0, initialVisibleCount);
  const hasMoreSamples = filteredSamples.length > initialVisibleCount;
  const remainingCount = filteredSamples.length - initialVisibleCount;

  const displayedCategories = isCategoryExpanded 
    ? availableCategories 
    : availableCategories.slice(0, VISIBLE_CATEGORY_COUNT);
  const hasMoreCategories = availableCategories.length > VISIBLE_CATEGORY_COUNT;

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <>
    {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center space-x-12 z-20 pb-safe">
                 <button 
                  onClick={stopCamera}
                  className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                  title={labels.cameraClose}
                >
                  <X className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                  title={labels.cameraCapture}
                >
                  <div className="w-16 h-16 bg-red-500 rounded-full border-2 border-white"></div>
                </button>
    
                <button 
                  onClick={switchCamera}
                  className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                  title={labels.cameraSwitch}
                >
                  <RefreshCcw className="w-6 h-6" />
                </button>
            </div>

            <div className="absolute top-0 left-0 right-0 p-6 flex justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur px-4 py-1 rounded-full text-white/90 text-sm font-medium">
                    {compact ? labels.cameraInstructionItem : labels.cameraInstructionModel}
                </div>
            </div>
        </div>
    )}

    <div 
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg transition-colors duration-300 flex flex-col focus:outline-none ${compact ? 'p-4 md:p-5' : 'p-8 w-full max-w-3xl mx-auto'} ${className}`}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
            <h2 className={`${compact ? 'text-lg' : 'text-2xl text-slate-800 dark:text-slate-200'} font-bold`}>{title}</h2>
        </div>
        
        {selectedUrl && compact && (
          <div className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs flex items-center font-medium border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {labels.selected}
          </div>
        )}
      </div>
      
      {description && (
        <p className={`text-slate-500 dark:text-slate-300 ${compact ? 'text-xs mb-4' : 'mb-6'}`}>{description}</p>
      )}

      {compact && selectedUrl && (
        <div className="mb-4 relative group rounded-lg overflow-hidden h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0">
          <img src={selectedUrl} alt="Selected" className="h-full w-full object-cover" />
          <button 
            onClick={() => onSelect('')} 
            className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hover:bg-black/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!selectedUrl || !compact ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary dark:hover:border-primary transition-all duration-300 group ${compact ? 'p-4 min-h-[100px]' : 'p-10'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className={`bg-slate-100 dark:bg-slate-700 rounded-full mb-2 group-hover:bg-blue-50 dark:group-hover:bg-slate-600 transition-colors ${compact ? 'p-2' : 'p-4 mb-4'}`}>
                  <Upload className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-600 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-primary`} />
                </div>
                {!compact && <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">{labels.btnUpload}</p>}
                <p className={`text-slate-400 dark:text-slate-300 text-center ${compact ? 'text-xs' : 'text-sm mt-2'}`}>{compact ? labels.btnUpload : 'SVG, PNG, JPG'}</p>
              </div>

              <div 
                onClick={startCamera}
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-secondary dark:hover:border-secondary transition-all duration-300 group ${compact ? 'p-4 min-h-[100px]' : 'p-10'}`}
              >
                <div className={`bg-slate-100 dark:bg-slate-700 rounded-full mb-2 group-hover:bg-green-50 dark:group-hover:bg-slate-600 transition-colors ${compact ? 'p-2' : 'p-4 mb-4'}`}>
                  <Camera className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-600 dark:text-slate-300 group-hover:text-secondary dark:group-hover:text-secondary`} />
                </div>
                {!compact && <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">{labels.btnCamera}</p>}
                <p className={`text-slate-400 dark:text-slate-300 text-center ${compact ? 'text-xs' : 'text-sm mt-2'}`}>{compact ? labels.btnCamera : 'Take photo'}</p>
              </div>
            </div>
            
             <form onSubmit={handleInputSubmit} className={`mb-6 relative z-0`}>
                <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center z-10">
                        {onSearch && !inputValue.startsWith('http') ? (
                            <Search className={`text-slate-400 dark:text-slate-200 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                        ) : (
                            <button 
                                type="button" 
                                onClick={handleClipboardRead}
                                className="text-slate-400 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
                                title={labels.btnPaste}
                            >
                                <Clipboard className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={onSearch ? labels.placeholderSearch : labels.placeholderUrl}
                        className={`block w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all relative z-0 placeholder:text-slate-400 dark:placeholder:text-slate-400 ${compact ? 'pl-9 pr-16 py-2 text-sm' : 'pl-10 pr-20 py-3'}`}
                        disabled={isSearching || isLoading}
                    />
                    
                    {inputValue && !isSearching && (
                      <button
                        type="button"
                        onClick={() => setInputValue('')}
                        className={`absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 p-1 rounded-full z-10 ${compact ? 'right-9' : 'right-12'}`}
                      >
                        <X className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      </button>
                    )}

                     <button 
                        type="submit"
                        disabled={!inputValue.trim() || isSearching || isLoading}
                        className={`absolute right-1 top-1 bottom-1 bg-primary text-white rounded-lg flex items-center justify-center transition-all z-10 cursor-pointer hover:bg-primary/90 ${!inputValue.trim() ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'} ${compact ? 'w-7' : 'w-10'}`}
                        title="Submit"
                    >
                        {isSearching ? (
                            <Loader2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
                        ) : (
                            <ArrowRight className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                        )}
                    </button>
                </div>
            </form>
          </>
      ) : null}

      {hasSamples && (
      <div className="relative flex items-center justify-center mb-4">
        <hr className="w-full border-slate-200 dark:border-slate-700" />
        <button 
            onClick={() => setShowSamples(!showSamples)}
            className="absolute bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-200 text-xs font-medium hover:text-primary dark:hover:text-primary hover:border-primary dark:hover:border-primary transition-colors flex items-center gap-2 shadow-sm z-10"
        >
           {showSamples ? (
               isSearching ? <><Loader2 className="w-3 h-3 animate-spin" /> {labels.searching}</> :
               isLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> {labels.loading}</> :
               <>{labels.hideSamples} <ChevronUp className="w-3 h-3" /></>
           ) : (
               <>
                {labels.selectSamples}
                {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                {!isLoading && <ChevronDown className="w-3 h-3" />}
               </>
           )}
        </button>
      </div>
      )}

      {showSamples && hasSamples && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
            {!isSearching && !isLoading && (
                <div className="flex items-start gap-2">
                    <div className="flex-grow space-y-3">
                        {showGenderFilter && (
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-lg w-full">
                            {(['all', 'male', 'female'] as const).map((gender) => (
                            <button
                                key={gender}
                                onClick={() => setFilterGender(gender)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                                filterGender === gender 
                                    ? 'bg-white dark:bg-slate-600 text-primary dark:text-primary-300 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {gender === 'all' ? labels.filterAll : gender === 'male' ? labels.filterMale : labels.filterFemale}
                            </button>
                            ))}
                        </div>
                        )}

                        {showCategoryFilter && (
                        <div className="flex flex-wrap gap-2">
                            {displayedCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                filterCategory === cat
                                    ? 'bg-primary/10 border-primary text-primary dark:text-primary-400 font-semibold'
                                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat}
                            </button>
                            ))}
                            {hasMoreCategories && (
                            <button 
                                onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                                className="px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 flex items-center transition-colors"
                            >
                                {isCategoryExpanded ? (
                                    <>{labels.showLess} <ChevronUp className="w-3 h-3 ml-1" /></>
                                ) : (
                                    <>{`+${availableCategories.length - VISIBLE_CATEGORY_COUNT} ${labels.showMore}`}</>
                                )}
                            </button>
                            )}
                        </div>
                        )}
                    </div>
                    
                    {onRandomize && (
                        <button 
                            onClick={handleRandomizeClick}
                            disabled={isRandomizing || isLoading}
                            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white dark:hover:bg-primary transition-all text-slate-500 dark:text-slate-300 flex-shrink-0 border border-slate-200 dark:border-slate-600"
                            title={labels.shuffle}
                        >
                            <Dice5 className={`w-4 h-4 ${isRandomizing || isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            )}

            {isSearching ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-300">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                    <p className="text-sm">{labels.searching} '{inputValue || '...'}'</p>
                </div>
            ) : isLoading ? (
                <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-2 sm:grid-cols-4 gap-4'}`}>
                    {[...Array(initialVisibleCount)].map((_, i) => (
                        <div key={i} className={`relative rounded-lg overflow-hidden border-2 border-transparent bg-slate-100 dark:bg-slate-700 animate-pulse ${compact ? 'h-20' : 'h-32'}`}></div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredSamples.length > 0 ? (
                    <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-2 sm:grid-cols-4 gap-4'}`}>
                        {visibleSamples.map((sample) => (
                        <div 
                            key={sample.id}
                            onClick={() => onSelect(sample.url)}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${selectedUrl === sample.url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`}
                        >
                            <img 
                            src={sample.url} 
                            alt={sample.name} 
                            className={`w-full object-cover transition-transform duration-500 group-hover:scale-110 ${compact ? 'h-20' : 'h-32'}`} 
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-white text-[10px] font-medium truncate w-full">{sample.name}</span>
                            </div>
                        </div>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-400 text-sm">
                        {labels.noSamples}
                    </div>
                    )}

                    {hasMoreSamples && compact && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-primary flex items-center justify-center bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        {isExpanded ? (
                        <>
                            <ChevronUp className="w-4 h-4 mr-1" /> {labels.showLess}
                        </>
                        ) : (
                        <>
                            <ChevronDown className="w-4 h-4 mr-1" /> {labels.showMore.replace('{n}', remainingCount.toString())} +{remainingCount}
                        </>
                        )}
                    </button>
                    )}
                </div>
            )}
        </div>
      )}
    </div>
    </>
  );
};
