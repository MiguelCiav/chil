import { FC } from 'react';

export interface ShowcaseVisualProps {
  /** When true the visual plays (or holds) its final animated state. */
  active: boolean;
}

export interface LandingChapter {
  id: string;
  number: string;
  verb: string;
  title: string;
  body: string;
  Visual: FC<ShowcaseVisualProps>;
}

export interface ManifestoLine {
  text: string;
  accent: boolean;
}

export interface ProductFactItem {
  figure: string;
  title: string;
  body: string;
}
