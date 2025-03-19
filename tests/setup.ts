import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock globale per localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Aggiungi localStorage al global
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock per MediaStream e altre API Browser
window.MediaStream = vi.fn().mockImplementation(() => ({
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  getTracks: vi.fn().mockReturnValue([]),
  getVideoTracks: vi.fn().mockReturnValue([]),
  getAudioTracks: vi.fn().mockReturnValue([]),
}));

// Resetta tutti i mock prima di ogni test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
});
