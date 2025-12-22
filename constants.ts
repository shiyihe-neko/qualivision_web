
import { CodeDefinition, NoteDefinition } from './types';

// --- sequential coding 1: Behavioral
export const BEHAVIOR_CODES: CodeDefinition[] = [
  { id: 'b1', label: 'Explore_design', color: '#3b82f6', shortcut: '1' },
  { id: 'b2', label: 'Explore_function', color: '#10b981', shortcut: '2' },
  { id: 'b3', label: 'Stuck_unmet_design', color: '#f59e0b', shortcut: '3' },
  { id: 'b4', label: 'Stuck_unexp_func', color: 'rgba(245, 11, 136, 1)', shortcut: '4' },
  { id: 'b5', label: 'Stuck_complex_func', color: '#efdcbaff', shortcut: '5' },
  { id: 'b6', label: 'Vibe_finetuning', color: '#0b1bf5ff', shortcut: '6' },
  { id: 'b7', label: 'Vibe_evaluation', color: '#8b5cf6', shortcut: '7' },
  { id: 'b8', label: 'Vibe_reframing', color: '#5cf6e7ff', shortcut: '8' },
  { id: 'b9', label: 'Para_finetuning', color: '#ec5b5bff', shortcut: '9' },
  { id: 'b10', label: 'Para_evaluation', color: '#06b6d4', shortcut: '0' },
  { id: 'b11', label: 'Para_reframing', color: '#ae06d4ff', shortcut: '-' },
];

// --- sequential coding 2: tool triggered activities ---
export const TOOL_CODES: CodeDefinition[] = [
  { id: 'e1', label: 'EL_Preview', color: '#22d3ee', shortcut: 'q' },
  { id: 'e2', label: 'EL_Testing', color: '#94a3b8', shortcut: 'w' },
  { id: 'e3', label: 'Selective_Control', color: '#f43f5e', shortcut: 'e' },
  { id: 'e4', label: 'FT_Slider', color: '#f97316', shortcut: 'r' },
  { id: 'e5', label: 'FT_Wheels', color: '#10b981', shortcut: 't' },
  { id: 'e6', label: 'FT_Colorpicker', color: '#8b5cf6', shortcut: 'y' },
  { id: 'e7', label: 'FT_Colorspace', color: '#fb98daff', shortcut: 'u' },
  { id: 'e8', label: 'Hacking', color: '#3b82f6', shortcut: 'i' },
  { id: 'e9', label: 'Regenerate_same', color: '#ec4899', shortcut: 'o' },
  { id: 'e10', label: 'Regenerate_diff', color: '#fbbf24', shortcut: 'p' },
];

// --- sequential coding 3:  ---
export const INTERACTION_CODES: CodeDefinition[] = [
  { id: 'i1', label: 'Screen', color: '#8b5cf6', shortcut: 'a' },
  { id: 'i2', label: 'Paper', color: '#ec4899', shortcut: 's' },
  { id: 'i3', label: 'Person', color: '#f97316', shortcut: 'd' },
];


export const DEFAULT_STREAMS_CONFIG = [
  { name: 'Behavioral Stream', codes: BEHAVIOR_CODES },
  { name: 'Tool triggered Activities', codes: TOOL_CODES },
];

export const DEFAULT_TIMELINE_CODES = BEHAVIOR_CODES;

// transcripts code - cognitive actions and evaluation method
export const DEFAULT_TRANSCRIPT_CODES: CodeDefinition[] = [
  { id: 'tr1', label: 'Probing', color: '#84cc16', shortcut: '' }, 
  { id: 'tr2', label: 'Intuition', color: '#ef4444', shortcut: '' }, 
  { id: 'tr3', label: 'Hypothesis_Testing', color: '#6366f1', shortcut: '' },
  { id: 'tr4', label: 'Perceptual_Checking', color: '#d946ef', shortcut: '' },
  { id: 'tr5', label: 'Strategy_Shift', color: '#f43f5e', shortcut: '' },
  { id: 'tr6', label: 'Holistic_Judgment', color: '#fbbf24', shortcut: '' },
  { id: 'tr7', label: 'Pairwise_Comparison', color: '#10b981', shortcut: '' },
  { id: 'tr8', label: 'Preview_Evaluation', color: '#3b82f6', shortcut: '' },
  { id: 'tr9', label: 'Sequential_Scanning', color: '#06b6d4', shortcut: '' },
  { id: 'tr10', label: 'Check_Evaluation', color: '#8b5cf6', shortcut: '' },
];

// notes code
export const DEFAULT_NOTE_PALETTE: NoteDefinition[] = [
  { id: 'n1', color: '#fbbf24', label: 'Amber Highlight' }, 
  { id: 'n2', color: '#f472b6', label: 'Pink Highlight' }, 
  { id: 'n3', color: '#34d399', label: 'Green Highlight' },
  { id: 'n4', color: '#60a5fa', label: 'Blue Highlight' },
];
