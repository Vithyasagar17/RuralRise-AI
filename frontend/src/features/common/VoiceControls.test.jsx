import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReadAloud, VoiceInput } from './VoiceControls.jsx';
afterEach(() => vi.unstubAllGlobals());
it('starts audio only on demand and cancels it on leaving a lesson', () => {
  const speak = vi.fn(); const cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel });
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  const view = render(<ReadAloud text="A practice lesson" />);
  expect(speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Read lesson aloud' }));
  expect(speak.mock.calls[0][0]).toMatchObject({ text: 'A practice lesson', lang: 'en-IN' });
  view.unmount(); expect(cancel).toHaveBeenCalled();
});
it('provides voice transcripts for review without automatically saving them', () => {
  let instance;
  vi.stubGlobal('SpeechRecognition', class { constructor() { instance = this; } start() {} abort() {} });
  const onResult = vi.fn(); render(<VoiceInput onResult={onResult} language="ta-IN" />);
  expect(instance).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Speak my skills' }));
  expect(instance.lang).toBe('ta-IN');
  instance.onresult({ results: [[{ transcript: 'communication' }]] });
  expect(onResult).toHaveBeenCalledWith('communication');
});
