
export interface ImageAsset {
  id: string;
  url: string; // Can be a remote URL or base64
  label?: string;
  type: 'person' | 'cloth' | 'generated';
}

export type Gender = 'male' | 'female' | 'unisex';

export interface Sample {
  id: string;
  name: string;
  url: string;
  gender?: Gender;
  category?: string;
}

export type ClothingSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type SubjectType = 'human' | 'pet';

export interface HistoryItem {
  id: string;
  url: string;
  timestamp: number;
  modelImage?: string; // Optional: store inputs for context if needed later
  isFavorite?: boolean;
  subjectType?: SubjectType;
}
