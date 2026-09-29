export type AppThemeId = 'great_hall' | 'studio_heritage' | 'warner_blue' | 'botanical_backlot';

export interface AppTheme {
  id: AppThemeId;
  name: string;
  tagline: string;
  description: string;
  mode: 'dark' | 'light';
  palette: {
    bgMain: string;
    bgCard: string;
    bgHeader: string;
    border: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    accentText: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
  };
  fontFamilyDisplay: string;
  fontFamilyBody: string;
  previewColors: string[];
}

export const APP_THEMES: Record<AppThemeId, AppTheme> = {
  great_hall: {
    id: 'great_hall',
    name: 'Midnight Obsidian & Gold',
    tagline: 'The Great Hall · Tour Nocturne',
    description: 'Deep obsidian dark slate canvas with warm cinematic amber lighting, brass highlights, and high-contrast operational analytics.',
    mode: 'dark',
    palette: {
      bgMain: 'bg-slate-950 text-slate-100',
      bgCard: 'bg-slate-900/80 border-slate-800',
      bgHeader: 'bg-slate-950/95 border-slate-800',
      border: 'border-slate-800',
      textPrimary: 'text-white',
      textMuted: 'text-slate-400',
      accent: 'bg-amber-400',
      accentHover: 'hover:bg-amber-300',
      accentText: 'text-slate-950',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400',
    },
    fontFamilyDisplay: 'Plus Jakarta Sans',
    fontFamilyBody: 'Plus Jakarta Sans',
    previewColors: ['#020617', '#0F172A', '#F59E0B', '#10B981'],
  },
  studio_heritage: {
    id: 'studio_heritage',
    name: 'Executive Parchment & Burgundy',
    tagline: 'Leavesden Heritage & Quality Archive',
    description: 'Warm British archival aesthetic featuring rich aged alabaster parchment, deep royal burgundy accents, gold leaf serif titles, and editorial refinement.',
    mode: 'light',
    palette: {
      bgMain: 'bg-[#F9F7F2] text-[#241F1C]',
      bgCard: 'bg-[#FFFFFF] border-[#E8E2D6] shadow-sm',
      bgHeader: 'bg-[#F4EFE6]/95 border-[#E2DAD0]',
      border: 'border-[#E8E2D6]',
      textPrimary: 'text-[#1A1412]',
      textMuted: 'text-[#70645B]',
      accent: 'bg-[#8B1E2D]',
      accentHover: 'hover:bg-[#721824]',
      accentText: 'text-white',
      badgeBg: 'bg-[#8B1E2D]/10',
      badgeBorder: 'border-[#8B1E2D]/30',
      badgeText: 'text-[#8B1E2D]',
    },
    fontFamilyDisplay: 'Cinzel, Cormorant Garamond, serif',
    fontFamilyBody: 'Plus Jakarta Sans, sans-serif',
    previewColors: ['#F9F7F2', '#FFFFFF', '#8B1E2D', '#C89B3C'],
  },
  warner_blue: {
    id: 'warner_blue',
    name: 'London Fog & Warner Cobalt',
    tagline: 'Corporate Quality Assurance & Compliance',
    description: 'Crisp corporate executive clarity with cool slate/cloud grey backgrounds, authoritative Warner cobalt blue branding, and precise Swiss data typography.',
    mode: 'light',
    palette: {
      bgMain: 'bg-[#F8FAFC] text-[#0F172A]',
      bgCard: 'bg-[#FFFFFF] border-[#E2E8F0] shadow-sm',
      bgHeader: 'bg-[#FFFFFF]/95 border-[#E2E8F0]',
      border: 'border-[#E2E8F0]',
      textPrimary: 'text-[#0F172A]',
      textMuted: 'text-[#64748B]',
      accent: 'bg-[#1D4ED8]',
      accentHover: 'hover:bg-[#1E40AF]',
      accentText: 'text-white',
      badgeBg: 'bg-[#1D4ED8]/10',
      badgeBorder: 'border-[#1D4ED8]/30',
      badgeText: 'text-[#1D4ED8]',
    },
    fontFamilyDisplay: 'Plus Jakarta Sans, sans-serif',
    fontFamilyBody: 'Plus Jakarta Sans, sans-serif',
    previewColors: ['#F8FAFC', '#FFFFFF', '#1D4ED8', '#059669'],
  },
  botanical_backlot: {
    id: 'botanical_backlot',
    name: 'Botanical Emerald & Warm Copper',
    tagline: 'Artisanal Cafe & Backlot Kitchen',
    description: 'Earthy luxury inspired by the studio tour greenhouse and cafe spaces, with deep pine canvas, warm butterscotch copper highlights, and organic warmth.',
    mode: 'dark',
    palette: {
      bgMain: 'bg-[#081512] text-[#ECFDF5]',
      bgCard: 'bg-[#0F241F]/90 border-[#1B3B34]',
      bgHeader: 'bg-[#081512]/95 border-[#1B3B34]',
      border: 'border-[#1B3B34]',
      textPrimary: 'text-[#FFFFFF]',
      textMuted: 'text-[#8AA89F]',
      accent: 'bg-[#D97706]',
      accentHover: 'hover:bg-[#B45309]',
      accentText: 'text-slate-950',
      badgeBg: 'bg-[#059669]/15',
      badgeBorder: 'border-[#059669]/30',
      badgeText: 'text-[#34D399]',
    },
    fontFamilyDisplay: 'Plus Jakarta Sans, sans-serif',
    fontFamilyBody: 'Plus Jakarta Sans, sans-serif',
    previewColors: ['#081512', '#0F241F', '#D97706', '#10B981'],
  },
};
