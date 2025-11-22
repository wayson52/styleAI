import React, { useRef, useState, useMemo } from 'react';
import { Upload, Camera, X, RefreshCcw, CheckCircle2, Link, ArrowRight, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { Sample } from '../types';

interface UploadSectionProps {
  title: string;
  description?: string;
  samples: Sample[];
  onSelect: (url: string) => void;
  onSearch?: (query: string) => Promise<void>;
  className?: string;
  compact?: boolean;
  selectedUrl?: string | null;
  enableCategoryFilter?: boolean;
  enableGenderFilter?: boolean;
  initialVisibleCount?: number;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  title,
  description,
  samples,
  onSelect,
  onSearch,
  className = "",
  compact = false,
  selectedUrl,
  enableCategoryFilter = true,
  enableGenderFilter = true,
  initialVisibleCount = 8
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Filter State
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  
  const VISIBLE_CATEGORY_COUNT = 4;

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

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      // Slight delay to allow UI to render video element
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
        // Flip horizontally if using front camera for mirror effect
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

    // Check if it's a URL
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      onSelect(value);
      setInputValue('');
    } else if (onSearch) {
      // It's a search query
      setIsSearching(true);
      try {
        await onSearch(value);
      } finally {
        setIsSearching(false);
      }
    }
  };

  // Filter Logic
  const availableGenders = useMemo(() => {
    const genders = new Set(samples.map(s => s.gender).filter(Boolean));
    return {
      hasMale: genders.has('male'),
      hasFemale: genders.has('female')
    };
  }, [samples]);

  const availableCategories = useMemo(() => {
    const cats = new Set(samples.map(s => s.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [samples]);

  const filteredSamples = useMemo(() => {
    return samples.filter(sample => {
      // Gender Filter (Unisex shows for both)
      if (enableGenderFilter && filterGender !== 'all') {
        if (sample.gender && sample.gender !== 'unisex' && sample.gender !== filterGender) {
          return false;
        }
      }
      // Category Filter
      if (enableCategoryFilter && filterCategory !== 'All') {
        if (sample.category && sample.category !== filterCategory) {
          return false;
        }
      }
      return true;
    });
  }, [samples, filterGender, filterCategory, enableCategoryFilter, enableGenderFilter]);

  const showGenderFilter = enableGenderFilter && (availableGenders.hasMale || availableGenders.hasFemale);
  const showCategoryFilter = enableCategoryFilter && availableCategories.length > 2; // 'All' + at least 2 categories

  // Expand/Collapse Logic for Samples
  const visibleSamples = isExpanded || !compact ? filteredSamples : filteredSamples.slice(0, initialVisibleCount);
  const hasMoreSamples = filteredSamples.length > initialVisibleCount;
  const remainingCount = filteredSamples.length - initialVisibleCount;

  // Expand/Collapse Logic for Categories
  const displayedCategories = isCategoryExpanded 
    ? availableCategories 
    : availableCategories.slice(0, VISIBLE_CATEGORY_COUNT);
  const hasMoreCategories = availableCategories.length > VISIBLE_CATEGORY_COUNT;

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg transition-colors duration-300 flex flex-col ${compact ? 'p-4 md:p-5' : 'p-8 w-full max-w-3xl mx-auto'} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-slate-800 dark:text-white`}>{title}</h2>
        {selectedUrl && compact && (
          <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full text-xs flex items-center font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Selected
          </div>
        )}
      </div>
      
      {description && (
        <p className={`text-slate-500 dark:text-slate-400 ${compact ? 'text-xs mb-4' : 'mb-6'}`}>{description}</p>
      )}

      {/* Selected Preview (Only in compact mode) */}
      {compact && selectedUrl && !isCameraOpen && (
        <div className="mb-4 relative group rounded-lg overflow-hidden h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0">
          <img src={selectedUrl} alt="Selected" className="h-full w-full object-cover" />
          <button 
            onClick={() => onSelect('')} 
            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isCameraOpen ? (
        <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4 flex flex-col items-center justify-center flex-grow min-h-[200px]">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-6 z-10">
             <button 
              onClick={stopCamera}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <button 
              onClick={capturePhoto}
              className="w-12 h-12 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              <div className="w-10 h-10 bg-red-500 rounded-full"></div>
            </button>

            <button 
              onClick={switchCamera}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        !selectedUrl || !compact ? (
          <>
            <div className={`flex flex-col ${compact ? 'gap-2' : 'md:flex-row gap-4'} mb-4 md:mb-4`}>
              {/* File Upload Trigger */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-primary dark:hover:border-primary transition-all duration-300 group ${compact ? 'p-4 min-h-[100px]' : 'p-10'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className={`bg-slate-100 dark:bg-slate-700 rounded-full mb-2 group-hover:bg-blue-50 dark:group-hover:bg-slate-600 transition-colors ${compact ? 'p-2' : 'p-4 mb-4'}`}>
                  <Upload className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-600 dark:text-slate-300 group-hover:text-primary`} />
                </div>
                {!compact && <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">Upload Photo</p>}
                <p className={`text-slate-400 dark:text-slate-500 text-center ${compact ? 'text-xs' : 'text-sm mt-2'}`}>{compact ? 'Upload' : 'SVG, PNG, JPG or GIF'}</p>
              </div>

              {/* Camera Trigger */}
              <div 
                onClick={startCamera}
                className={`flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-secondary dark:hover:border-secondary transition-all duration-300 group ${compact ? 'p-4 min-h-[100px]' : 'p-10'}`}
              >
                <div className={`bg-slate-100 dark:bg-slate-700 rounded-full mb-2 group-hover:bg-green-50 dark:group-hover:bg-slate-600 transition-colors ${compact ? 'p-2' : 'p-4 mb-4'}`}>
                  <Camera className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-600 dark:text-slate-300 group-hover:text-secondary`} />
                </div>
                {!compact && <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">Use Camera</p>}
                <p className={`text-slate-400 dark:text-slate-500 text-center ${compact ? 'text-xs' : 'text-sm mt-2'}`}>{compact ? 'Camera' : 'Take a photo now'}</p>
              </div>
            </div>
            
            {/* Input (URL or Search) */}
             <form onSubmit={handleInputSubmit} className={`mb-6 relative z-0`}>
                <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        {onSearch && !inputValue.startsWith('http') ? (
                            <Search className={`text-slate-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                        ) : (
                            <Link className={`text-slate-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                        )}
                    </div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={onSearch ? "Google Search images or paste URL..." : "Paste image URL..."}
                        className={`block w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all relative z-0 ${compact ? 'pl-9 pr-16 py-2 text-sm' : 'pl-10 pr-20 py-3'}`}
                        disabled={isSearching}
                    />
                    
                    {/* Clear Button */}
                    {inputValue && !isSearching && (
                      <button
                        type="button"
                        onClick={() => setInputValue('')}
                        className={`absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full z-10 ${compact ? 'right-9' : 'right-12'}`}
                      >
                        <X className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                      </button>
                    )}

                    {/* Submit Button */}
                     <button 
                        type="submit"
                        disabled={!inputValue.trim() || isSearching}
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
        ) : null
      )}

      {/* Divider */}
      <div className="relative flex items-center justify-center mb-4">
        <hr className="w-full border-slate-200 dark:border-slate-700" />
        <span className={`absolute bg-white dark:bg-slate-800 px-2 text-slate-400 font-medium uppercase ${compact ? 'text-[10px]' : 'text-xs'}`}>
           {isSearching ? 'Searching...' : 'Or select sample'}
        </span>
      </div>

      {/* Filters Section */}
      {!isSearching && (
        <div className="mb-4 space-y-3">
            {/* Gender Tabs */}
            {showGenderFilter && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-full">
                {(['all', 'male', 'female'] as const).map((gender) => (
                <button
                    key={gender}
                    onClick={() => setFilterGender(gender)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                    filterGender === gender 
                        ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    {gender}
                </button>
                ))}
            </div>
            )}

            {/* Category Pills - Expandable */}
            {showCategoryFilter && (
            <div className="flex flex-wrap gap-2">
                {displayedCategories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    filterCategory === cat
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
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
                        <>Less <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                        <>{`+${availableCategories.length - VISIBLE_CATEGORY_COUNT} more`}</>
                    )}
                </button>
                )}
            </div>
            )}
        </div>
      )}

      {/* Samples Grid */}
      {isSearching ? (
         <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Finding best matches...</p>
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
                        // If image fails to load (e.g. CORS or broken link), hide it
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                    />
                    {/* Hover Overlay Name */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-white text-[10px] font-medium truncate w-full">{sample.name}</span>
                    </div>
                </div>
                ))}
            </div>
            ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
                No samples match filters.
            </div>
            )}

            {/* Expand/Collapse Button for Samples */}
            {hasMoreSamples && compact && (
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary flex items-center justify-center bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
            >
                {isExpanded ? (
                <>
                    <ChevronUp className="w-4 h-4 mr-1" /> Show Less
                </>
                ) : (
                <>
                    <ChevronDown className="w-4 h-4 mr-1" /> Show +{remainingCount} more
                </>
                )}
            </button>
            )}
        </div>
      )}
    </div>
  );
};