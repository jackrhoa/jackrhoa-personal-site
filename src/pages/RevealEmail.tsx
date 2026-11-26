import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

type State = 'hidden' | 'challenge' | 'verifying' | 'key' | 'revealed' | 'error';
type Result = { email: string; method: string; device?: string };

const METHOD_LABELS: Record<string, string> = {
  'private-access-token': 'VERIFIED BY APPLE PRIVATE ACCESS TOKEN',
  turnstile: 'VERIFIED BY CLOUDFLARE TURNSTILE',
  webauthn: 'VERIFIED BY HARDWARE KEY ATTESTATION',
};

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const webauthnSupported = typeof PublicKeyCredential !== 'undefined'
  && typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function';

let turnstileScript: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (!turnstileScript) {
    turnstileScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TURNSTILE_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        turnstileScript = null;
        reject(new Error('turnstile failed to load'));
      };
      document.head.appendChild(s);
    });
  }
  return turnstileScript;
}

function label(result: Result): string | null {
  const base = METHOD_LABELS[result.method];
  if (!base) return null;
  return result.device ? `${base} · ${result.device.toUpperCase()}` : base;
}

const smallClass = 'text-[11px] tracking-[0.1em] opacity-50';

export default function RevealEmail({ className }: { className: string }) {
  const [state, setState] = useState<State>('hidden');
  const [result, setResult] = useState<Result | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const showWidget = state === 'challenge' || state === 'verifying';

  useEffect(() => {
    let cancelled = false;
    fetch('/api/email', { cache: 'no-store' })
      .then(async resp => {
        if (!resp.ok || cancelled) return;
        setResult(await resp.json());
        setState(prev => (prev === 'hidden' ? 'revealed' : prev));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function reveal() {
    setState('challenge');
  }

  async function verifyWithKey() {
    setState('key');
    try {
      const optionsResp = await fetch('/api/email/webauthn', { cache: 'no-store' });
      if (!optionsResp.ok) throw new Error(String(optionsResp.status));
      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(await optionsResp.json());
      const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
      if (!credential) throw new Error('no credential');
      const resp = await fetch('/api/email/webauthn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: credential.toJSON() }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setResult(await resp.json());
      setState('revealed');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    if (!showWidget) return;
    let cancelled = false;

    async function onToken(token: string) {
      setState('verifying');
      try {
        const resp = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!resp.ok) throw new Error(String(resp.status));
        setResult(await resp.json());
        setState('revealed');
      } catch {
        setState('error');
      }
    }

    loadTurnstile().then(() => {
      if (cancelled || !widgetRef.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(widgetRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'email',
        theme: 'auto',
        appearance: 'always',
        callback: onToken,
        'error-callback': () => setState('error'),
      });
    }).catch(() => setState('error'));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [showWidget]);

  if (state === 'revealed' && result) {
    const text = label(result);
    return (
      <div className="animate-reveal flex flex-col gap-3">
        <a href={`mailto:${result.email}`} className={className}>{result.email}</a>
        {text && <span className="verified text-[11px] tracking-[0.1em] font-medium">{text}</span>}
      </div>
    );
  }

  if (showWidget) {
    return (
      <>
        <div ref={widgetRef} />
        {webauthnSupported && state === 'challenge' && (
          <button type="button" onClick={verifyWithKey} className={`${smallClass} hover:opacity-80 cursor-pointer md:text-left`}>
            OR USE A HARDWARE SECURITY KEY
          </button>
        )}
      </>
    );
  }

  if (state === 'key') return <span className={className}>Touch your key…</span>;

  return (
    <button type="button" onClick={reveal} className={`${className} cursor-pointer text-inherit md:text-left`}>
      {state === 'error' ? 'Try again' : 'Reveal email'}
    </button>
  );
}
