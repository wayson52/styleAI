
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

// Fix for "Property does not exist on type JSX.IntrinsicElements"
// Explicitly define standard HTML elements to ensure TypeScript recognizes them
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
      span: any;
      p: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      a: any;
      button: any;
      input: any;
      img: any;
      form: any;
      header: any;
      main: any;
      nav: any;
      video: any;
      hr: any;
      ul: any;
      li: any;
      label: any;
      select: any;
      option: any;
      section: any;
      footer: any;
    }
  }
}
