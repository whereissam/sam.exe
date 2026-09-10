import data from './stories.json';
export type Photo = {
  id: string;
  src: string;
  thumbnail: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  location?: string;
  country?: string;
  date?: string;
  series?: string;
  caption?: string;
  demo?: boolean;
  credit?: string;
  sourceUrl?: string;
};
export type Journey = {
  id: string;
  city: string;
  country: string;
  period: string;
  title: string;
  paragraphs: string[];
  photoIds: string[];
  demo?: boolean;
};
export const stories: { photos: Photo[]; journeys: Journey[] } = data;
