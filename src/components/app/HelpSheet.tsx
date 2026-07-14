/**
 * In-app Help & Crisis — discoverability for resources already used in chat safety.
 */

import { useEffect, useId, useRef } from 'react';

interface HelpSheetProps {
  open: boolean;
  onClose: () => void;
}

export function HelpSheet({ open, onClose }: HelpSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="help-sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="help-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="help-sheet-head">
          <div>
            <p className="help-sheet-kicker">Help &amp; crisis</p>
            <h2 id={titleId} className="help-sheet-title">
              You’re not alone
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="help-sheet-close"
            onClick={onClose}
            aria-label="Close help"
          >
            Close
          </button>
        </header>

        <p className="help-sheet-lead">
          Zuly is an AI wellness guide, not a therapist. If you’re in danger or
          thinking about harming yourself, reach people who can help now.
        </p>

        <div className="help-sheet-crisis" aria-label="Crisis resources">
          <a className="help-crisis-primary" href="tel:988">
            <span className="help-crisis-label">US · call or text</span>
            <span className="help-crisis-value">988</span>
          </a>
          <a
            className="help-crisis-link"
            href="https://findahelpline.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            findahelpline.com
            <span className="help-crisis-meta">Local helplines worldwide</span>
          </a>
          <p className="help-crisis-emergency">
            In immediate danger, call your local emergency services (US:{' '}
            <a href="tel:911">911</a>).
          </p>
        </div>

        <section className="help-sheet-faq" aria-labelledby="help-faq-title">
          <h3 id="help-faq-title" className="help-sheet-section">
            Quick answers
          </h3>
          <dl className="help-faq-list">
            <div className="help-faq-item">
              <dt>How do Waves work?</dt>
              <dd>
                A Wave is a soft 4-week track built around your pillars. Talk with
                Zuly, shape tiny actions for today, and Plan/Grow keep the week in
                view — no streaks, no shame for blank days.
              </dd>
            </div>
            <div className="help-faq-item">
              <dt>Privacy</dt>
              <dd>
                See how we handle wellness data in our{' '}
                <a href="/privacy">Privacy Policy</a>. Conversations are not
                confidential like therapy.
              </dd>
            </div>
            <div className="help-faq-item">
              <dt>Early access / invite</dt>
              <dd>
                Soft launch is invite-only for many accounts. Join the waitlist on
                the homepage, or write us if you already have an invite email.
              </dd>
            </div>
            <div className="help-faq-item">
              <dt>Support</dt>
              <dd>
                <a href="mailto:support@heyzuly.com">support@heyzuly.com</a>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
