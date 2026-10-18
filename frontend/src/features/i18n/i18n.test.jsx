import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LANGUAGE_STORAGE_KEY, LanguageProvider, translate, useTranslation } from './LanguageContext.jsx';
import LanguageSelect from './LanguageSelect.jsx';
import { LANGUAGES, translations } from './translations.js';

function Probe() {
  const { t } = useTranslation();
  return <p>{t('fac.title')}</p>;
}

beforeEach(() => window.localStorage.clear());

describe('translations', () => {
  it('every language uses only keys that exist in English', () => {
    for (const { code } of LANGUAGES) {
      const extra = Object.keys(translations[code]).filter((k) => !(k in translations.en));
      expect(extra, `unknown keys in ${code}`).toEqual([]);
    }
  });

  it('Tamil draft covers every English key (so nothing silently falls back)', () => {
    const missing = Object.keys(translations.en).filter((k) => !(k in translations.ta));
    expect(missing).toEqual([]);
  });

  it('every translation keeps the same {placeholders} as English', () => {
    const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    for (const [key, value] of Object.entries(translations.ta)) {
      expect(placeholders(value), key).toBe(placeholders(translations.en[key]));
    }
  });

  it('falls back to English, then to the key, and fills placeholders', () => {
    expect(translate('xx', 'fac.title')).toBe('Facilitator dashboard');
    expect(translate('en', 'missing.key')).toBe('missing.key');
    expect(translate('en', 'module.score', { score: 7 })).toBe('Score 7');
    expect(translate('en', 'module.score', {})).toBe('Score {score}');
  });
});

describe('LanguageProvider + LanguageSelect', () => {
  it('works without a provider (English)', () => {
    render(<Probe />);
    expect(screen.getByText('Facilitator dashboard')).toBeInTheDocument();
  });

  it('switches language, updates <html lang>, remembers choice and flags draft translations', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageSelect />
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Language'), 'ta');
    expect(screen.getByText(translations.ta['fac.title'])).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ta');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ta');
    expect(screen.getByRole('note')).toHaveTextContent(translations.ta['lang.draftNotice']);
  });

  it('restores the saved language and ignores unknown codes', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ta');
    const { unmount } = render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByText(translations.ta['fac.title'])).toBeInTheDocument();
    unmount();
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon');
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByText('Facilitator dashboard')).toBeInTheDocument();
  });
});
