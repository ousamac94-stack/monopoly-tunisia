import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import {
  QrCode, CreditCard, Users, Globe, Smartphone, Play, Plus, Trash2,
  ArrowRightLeft, Building2, Home, Dices, History, Trophy,
  Camera, X, Check, Volume2, VolumeX, Sparkles, Compass,
  Gift, Gavel, Maximize2, SmartphoneNfc, AlertCircle, MapPin,
  UserCheck, ScanLine, ShieldAlert, ChevronRight, Download, Share
} from 'lucide-react';

// ============================================================================
// CONFIGURAZIONE FIREBASE (OPZIONALE PER STANZE MULTI-SMARTPHONE)
// ============================================================================
let app = null;
let auth = null;
let db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'monopoly-tunisia-qr';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase non configurato, modalità 1 Smartphone attiva:', e);
}

// ============================================================================
// CONFIGURAZIONE PWA PER INSTALLAZIONE SU IPHONE (iOS HOME SCREEN)
// ============================================================================
function useIOSInstallablePWA() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const addMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Meta tag Apple per apertura a schermo intero senza barra Safari
    addMeta('apple-mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    addMeta('apple-mobile-web-app-title', 'Monopoly Tunisia');
    addMeta('theme-color', '#071120');

    // Icona Apple Touch SVG ad alta risoluzione (Stella Khatam oro su blu zellige)
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0e1f36"/><stop offset="100%" stop-color="#060e1a"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><rect x="28" y="28" width="456" height="456" rx="92" fill="none" stroke="#d4af37" stroke-width="14"/><rect x="146" y="146" width="220" height="220" fill="none" stroke="#f6dc7a" stroke-width="18"/><rect x="146" y="146" width="220" height="220" transform="rotate(45 256 256)" fill="none" stroke="#38bdf8" stroke-width="18"/><circle cx="256" cy="256" r="36" fill="#f6dc7a"/></svg>`;
    const iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgIcon)}`;

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.setAttribute('rel', 'apple-touch-icon');
      document.head.appendChild(appleIcon);
    }
    appleIcon.setAttribute('href', iconUrl);

    // Web App Manifest dinamico
    const manifest = {
      name: 'Monopoly Tunisia - App Banking QR',
      short_name: 'Monopoly TN',
      start_url: '.',
      display: 'standalone',
      background_color: '#071120',
      theme_color: '#071120',
      orientation: 'portrait',
      icons: [
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    };

    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute('href', manifestUrl);

    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, []);
}

// ============================================================================
// MOTORE AUDIO IN SCALA ORIENTALE (MAQAM HIJAZ) & DARBUKA
// ============================================================================
class TunisianAudioEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq, duration = 0.25, type = 'triangle', delay = 0, gainVal = 0.14) {
    const ctx = this.init();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  dice() {
    this.playTone(110, 0.18, 'sine', 0, 0.25);
    this.playTone(320, 0.1, 'triangle', 0.12, 0.15);
    this.playTone(340, 0.1, 'triangle', 0.22, 0.15);
  }

  coin() {
    this.playTone(587.33, 0.22, 'triangle', 0, 0.14);
    this.playTone(622.25, 0.22, 'triangle', 0.08, 0.14);
    this.playTone(739.99, 0.28, 'triangle', 0.16, 0.16);
    this.playTone(880.0, 0.4, 'sine', 0.25, 0.18);
  }

  pay() {
    this.playTone(622.25, 0.2, 'triangle', 0, 0.13);
    this.playTone(466.16, 0.3, 'triangle', 0.1, 0.13);
  }

  scan() {
    this.playTone(880, 0.12, 'sine', 0, 0.16);
    this.playTone(1174.66, 0.25, 'sine', 0.09, 0.18);
  }

  jail() {
    this.playTone(220, 0.25, 'sawtooth', 0, 0.14);
    this.playTone(155.56, 0.45, 'sawtooth', 0.18, 0.16);
  }

  fanfare() {
    const notes = [587.33, 622.25, 739.99, 783.99, 880.0, 1174.66];
    notes.forEach((f, i) => this.playTone(f, 0.32, 'triangle', i * 0.09, 0.16));
  }
}

const sfx = new TunisianAudioEngine();

// ============================================================================
// PEDINE TUNISINE, COLORI ZELLIGE, 40 CASELLE E CARTE REALI
// ============================================================================
const TUNISIAN_TOKENS = [
  { id: 'lantern', name: 'Lanterna della Medina', emoji: '🏮', gradient: 'from-[#c85a32] via-amber-700 to-[#0e1f36]' },
  { id: 'camel', name: 'Cammello del Sahara', emoji: '🐪', gradient: 'from-amber-600 via-yellow-700 to-[#1e1b18]' },
  { id: 'boat', name: 'Barca Sidi Bou Said', emoji: '⛵', gradient: 'from-[#0066b2] via-[#008b8b] to-[#081220]' },
  { id: 'palm', name: 'Palma da Datteri', emoji: '🌴', gradient: 'from-emerald-600 via-teal-800 to-[#081220]' },
  { id: 'drum', name: 'Tamburo Darbuka', emoji: '🥁', gradient: 'from-rose-700 via-red-800 to-[#0e1f36]' },
  { id: 'door', name: 'Porta Blu Intarsiata', emoji: '🚪', gradient: 'from-sky-600 via-[#0066b2] to-[#081220]' },
  { id: 'louage', name: 'Taxi Louage Tunisino', emoji: '🚐', gradient: 'from-red-600 via-amber-600 to-[#0e1f36]' },
  { id: 'amphora', name: 'Anfora di Nabeul', emoji: '🏺', gradient: 'from-orange-600 via-[#c85a32] to-[#081220]' },
];

const COLOR_GROUPS = {
  brown: { label: 'Sud & Trogloditi', bg: 'bg-gradient-to-r from-amber-900 to-stone-800', text: 'text-amber-100' },
  lightblue: { label: 'Oasi & Deserto', bg: 'bg-gradient-to-r from-sky-500 to-cyan-600', text: 'text-slate-950' },
  pink: { label: 'Costa & Archeologia', bg: 'bg-gradient-to-r from-fuchsia-600 to-pink-700', text: 'text-white' },
  orange: { label: 'Sahel & Artigianato', bg: 'bg-gradient-to-r from-orange-500 to-amber-600', text: 'text-slate-950' },
  red: { label: 'Cap Bon & Golfo', bg: 'bg-gradient-to-r from-red-600 to-rose-700', text: 'text-white' },
  yellow: { label: 'Isola dei Lotofagi', bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-slate-950' },
  green: { label: 'Perle del Nord', bg: 'bg-gradient-to-r from-emerald-600 to-teal-700', text: 'text-white' },
  darkblue: { label: 'Capitale & Prestige', bg: 'bg-gradient-to-r from-[#0066b2] to-indigo-900', text: 'text-amber-100' },
  station: { label: 'Trasporti Tunisini', bg: 'bg-gradient-to-r from-slate-700 to-slate-900', text: 'text-amber-200' },
  utility: { label: 'Servizi Nazionali', bg: 'bg-gradient-to-r from-teal-700 to-cyan-900', text: 'text-amber-100' },
};

const BOARD_SPACES = [
  { id: 0, name: 'Bab El Bhar (VIA!)', type: 'go', desc: 'Porta storica della Medina di Tunisi. Passando o fermandoti qui incassi 200 TND.' },
  { id: 1, name: 'Tataouine (Ksar Ouled Soltane)', type: 'property', group: 'brown', price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250] },
  { id: 2, name: 'Tesoro di Cartagine', type: 'chest', desc: 'Pesca una pergamena del Tesoro di Cartagine.' },
  { id: 3, name: 'Matmata (Case Troglodite)', type: 'property', group: 'brown', price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
  { id: 4, name: 'Tassa del Beylik', type: 'tax', amount: 200, desc: 'Versa 200 TND al Tesoro della Banca Centrale.' },
  { id: 5, name: 'Stazione Louage Interregionale', type: 'station', group: 'station', price: 200, rent: [25, 50, 100, 200] },
  { id: 6, name: 'Douz (Porta del Sahara)', type: 'property', group: 'lightblue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { id: 7, name: 'Sorpresa del Souk', type: 'chance', desc: 'Pesca una pergamena Sorpresa del Souk.' },
  { id: 8, name: 'Tozeur (Oasi delle Palme)', type: 'property', group: 'lightblue', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
  { id: 9, name: 'Chott El Djerid (Lago Salato)', type: 'property', group: 'lightblue', price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
  { id: 10, name: 'Prigione / Transito', type: 'jail', desc: 'Solo in transito oppure detenuto nelle segrete della Kasbah.' },
  { id: 11, name: 'El Jem (Anfiteatro Romano)', type: 'property', group: 'pink', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { id: 12, name: 'STEG (Elettricità & Gas)', type: 'utility', group: 'utility', price: 150, rent: [4, 10] },
  { id: 13, name: 'Mahdia (Capo d’Africa)', type: 'property', group: 'pink', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
  { id: 14, name: 'Monastir (Ribat & Marina)', type: 'property', group: 'pink', price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
  { id: 15, name: 'Treno TGM (Tunisi - La Marsa)', type: 'station', group: 'station', price: 200, rent: [25, 50, 100, 200] },
  { id: 16, name: 'Kairouan (Grande Moschea)', type: 'property', group: 'orange', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { id: 17, name: 'Tesoro di Cartagine', type: 'chest', desc: 'Pesca una pergamena del Tesoro di Cartagine.' },
  { id: 18, name: 'Sousse (Perla del Sahel)', type: 'property', group: 'orange', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
  { id: 19, name: 'Port El Kantaoui', type: 'property', group: 'orange', price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { id: 20, name: 'Oasi di Riposo Gratuito', type: 'free', desc: 'Sosta gratuita all’ombra delle palme e tè alla menta.' },
  { id: 21, name: 'Nabeul (Ceramiche & Agrumi)', type: 'property', group: 'red', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { id: 22, name: 'Sorpresa del Souk', type: 'chance', desc: 'Pesca una pergamena Sorpresa del Souk.' },
  { id: 23, name: 'Hammamet (Medina sul Mare)', type: 'property', group: 'red', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { id: 24, name: 'Yasmine Hammamet', type: 'property', group: 'red', price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { id: 25, name: 'Porto di La Goulette', type: 'station', group: 'station', price: 200, rent: [25, 50, 100, 200] },
  { id: 26, name: 'Houmt Souk (Djerba)', type: 'property', group: 'yellow', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { id: 27, name: 'Midoun & Laguna di Djerba', type: 'property', group: 'yellow', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { id: 28, name: 'SONEDE (Acque Nazionali)', type: 'utility', group: 'utility', price: 150, rent: [4, 10] },
  { id: 29, name: 'Guellala (Vasai di Djerba)', type: 'property', group: 'yellow', price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { id: 30, name: 'In Prigione!', type: 'gotojail', desc: 'Vai direttamente in Prigione senza passare da Bab El Bhar.' },
  { id: 31, name: 'Tabarka (Costa del Corallo)', type: 'property', group: 'green', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { id: 32, name: 'Biserta (Porto Vecchio)', type: 'property', group: 'green', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { id: 33, name: 'Tesoro di Cartagine', type: 'chest', desc: 'Pesca una pergamena del Tesoro di Cartagine.' },
  { id: 34, name: 'Cartagine (Terme di Antonino)', type: 'property', group: 'green', price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { id: 35, name: 'Aeroporto Tunisi-Cartagine', type: 'station', group: 'station', price: 200, rent: [25, 50, 100, 200] },
  { id: 36, name: 'Sorpresa del Souk', type: 'chance', desc: 'Pesca una pergamena Sorpresa del Souk.' },
  { id: 37, name: 'Sidi Bou Said (Villaggio Blu)', type: 'property', group: 'darkblue', price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
  { id: 38, name: 'Tassa di Lusso Cartaginese', type: 'tax', amount: 100, desc: 'Paga 100 TND di imposta sulle dimore reali.' },
  { id: 39, name: 'Tunisi - Av. Habib Bourguiba', type: 'property', group: 'darkblue', price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

const CHANCE_CARDS = [
  { title: 'Carovana verso Sidi Bou Said', text: 'Avanza fino a Sidi Bou Said per ammirare il tramonto sul Golfo.', action: 'move', target: 37, collectGo: true },
  { title: 'Festival Internazionale di Cartagine', text: 'I tuoi investimenti culturali rendono bene: incassa 150 TND.', action: 'money', amount: 150 },
  { title: 'Ritorno a Bab El Bhar', text: 'Avanza fino al VIA! e incassa 200 TND.', action: 'move', target: 0, collectGo: true },
  { title: 'Restauro delle Dar & Kasbah', text: 'Paga 25 TND per ogni Dar e 100 TND per ogni Kasbah posseduta.', action: 'repairs', house: 25, hotel: 100 },
  { title: 'Tè alla Menta per Tutti', text: 'Offri tè e pinoli al Café des Délices: versa 25 TND a ogni giocatore.', action: 'toAll', amount: 25 },
  { title: 'Ordine del Governatore', text: 'Vai direttamente in Prigione senza passare dal VIA!', action: 'jail' },
];

const CHEST_CARDS = [
  { title: 'Raccolto di Datteri Deglet Nour', text: 'Esportazione record dall’oasi di Tozeur! Incassa 200 TND.', action: 'money', amount: 200 },
  { title: 'Sigillo di Grazia del Bey', text: 'Conserva questo sigillo: ti permette di uscire gratis di Prigione.', action: 'jailFree' },
  { title: 'Festa Nuziale Tunisina', text: 'Ogni giocatore ti dona 30 TND in segno di buon auspicio.', action: 'fromAll', amount: 30 },
  { title: 'Tassa sulle Ceramiche di Nabeul', text: 'Paga 50 TND alla Banca Centrale.', action: 'money', amount: -50 },
  { title: 'Dividendi Olio d’Oliva del Sahel', text: 'Incassa 100 TND dal consorzio agricolo.', action: 'money', amount: 100 },
  { title: 'Crociere a Djerba', text: 'Avanza fino a Houmt Souk (Djerba).', action: 'move', target: 26, collectGo: true },
];

// ============================================================================
// STILI ORIENTALI & COMPONENTI GRAFICI (ZELLIGE, KHATAM, FANOUS, QR DETERMINISTICO)
// ============================================================================
function OrientalThemeStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

      body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background-color: #060e1a;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        -webkit-tap-highlight-color: transparent;
      }

      .font-oriental {
        font-family: 'Cinzel Decorative', serif;
      }

      .font-serif-luxury {
        font-family: 'Playfair Display', serif;
      }

      .zellige-bg {
        background-color: #071120;
        background-image:
          radial-gradient(circle at 20% 15%, rgba(0, 102, 178, 0.22) 0%, transparent 45%),
          radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.14) 0%, transparent 50%),
          repeating-linear-gradient(45deg, rgba(212, 175, 55, 0.04) 0px, rgba(212, 175, 55, 0.04) 1px, transparent 1px, transparent 24px),
          repeating-linear-gradient(-45deg, rgba(0, 139, 139, 0.05) 0px, rgba(0, 139, 139, 0.05) 1px, transparent 1px, transparent 24px);
      }

      .arabesque-card-pattern {
        background-image: radial-gradient(rgba(253, 230, 138, 0.14) 1px, transparent 1px);
        background-size: 14px 14px;
      }

      .gold-filigree-border {
        border: 1px solid rgba(212, 175, 55, 0.42);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(253, 230, 138, 0.18);
      }

      .moorish-arch-top {
        border-top-left-radius: 1.75rem;
        border-top-right-radius: 1.75rem;
      }

      @keyframes lanternSway {
        0%, 100% { transform: rotate(-3.5deg); }
        50% { transform: rotate(3.5deg); }
      }

      .animate-lantern {
        transform-origin: top center;
        animation: lanternSway 4.2s ease-in-out infinite;
      }

      @keyframes rosetteSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .animate-rosette {
        animation: rosetteSpin 60s linear infinite;
      }
    `}</style>
  );
}

function KhatamStarSVG({ className = 'w-5 h-5', color = '#d4af37' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="14" y="14" width="36" height="36" stroke={color} strokeWidth="3.5" />
      <rect x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" stroke={color} strokeWidth="3.5" />
      <circle cx="32" cy="32" r="6" fill={color} />
    </svg>
  );
}

function FanousLanternSVG({ className = 'w-12 h-20' }) {
  return (
    <svg viewBox="0 0 80 140" fill="none" className={className} aria-hidden="true">
      <line x1="40" y1="0" x2="40" y2="24" stroke="#d4af37" strokeWidth="2.5" />
      <circle cx="40" cy="27" r="4" stroke="#f6dc7a" strokeWidth="2" />
      <path d="M24 44 Q40 24 56 44 Z" fill="#b45309" stroke="#f6dc7a" strokeWidth="2" />
      <polygon points="20,44 60,44 54,102 26,102" fill="url(#lanternGlow)" stroke="#f6dc7a" strokeWidth="2.2" />
      <line x1="40" y1="44" x2="40" y2="102" stroke="#d4af37" strokeWidth="1.5" />
      <path d="M26 102 L54 102 L44 122 L36 122 Z" fill="#92400e" stroke="#f6dc7a" strokeWidth="2" />
      <circle cx="40" cy="128" r="3.5" fill="#f6dc7a" />
      <defs>
        <radialGradient id="lanternGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#78350f" stopOpacity="0.9" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function MoorishDivider({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 my-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/50 to-amber-300" />
      <KhatamStarSVG className="w-4 h-4 shrink-0" color="#f6dc7a" />
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90 px-1">
          {label}
        </span>
      )}
      <KhatamStarSVG className="w-4 h-4 shrink-0" color="#f6dc7a" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400/50 to-amber-300" />
    </div>
  );
}

function DeterministicQRCode({ value = 'TUNISIA', size = 96, fgColor = '#071120', bgColor = '#FFFDF7' }) {
  const modules = 21;
  const matrix = useMemo(() => {
    const grid = Array.from({ length: modules }, () => Array(modules).fill(false));
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const drawFinder = (r0, c0) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[r0 + r][c0 + c] = isOuter || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, modules - 7);
    drawFinder(modules - 7, 0);

    let seed = Math.abs(hash) || 1234567;
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= modules - 8;
        const inBottomLeft = r >= modules - 8 && c < 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;

        seed = (seed * 1664525 + 1013904223) % 4294967296;
        grid[r][c] = (seed & 1) === 1;
      }
    }
    return grid;
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      shapeRendering="crispEdges"
      className="block rounded-md"
    >
      <rect width={modules} height={modules} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={fgColor} /> : null
        )
      )}
    </svg>
  );
}

// ============================================================================
// MODALE ISTRUZIONI INSTALLAZIONE SU IPHONE (SAFARI PWA + APP STORE CAPACITOR)
// ============================================================================
function IOSInstallModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030811]/92 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl moorish-arch-top bg-[#0b182b] gold-filigree-border p-6 space-y-5 my-auto">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#c85a32] flex items-center justify-center text-slate-950 font-black">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                App Nativa iOS • Schermo Intero
              </span>
              <h3 className="font-serif-luxury text-xl font-black text-white">Installa su iPhone</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-amber-200 hover:text-white border border-amber-400/25"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Puoi installare <strong className="text-amber-300">Monopoly Tunisia</strong> direttamente sulla schermata Home del tuo iPhone in 10 secondi, senza passare dall’App Store:
        </p>

        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#07101d] border border-amber-400/30 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              Apri questa pagina con <strong className="text-sky-300">Safari</strong> su iPhone (su iOS l’installazione PWA funziona solo da Safari).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#07101d] border border-amber-400/30 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              Tocca l’icona <strong className="text-amber-300 inline-flex items-center gap-1">Condividi <Share className="w-3.5 h-3.5 inline" /></strong> nella barra in basso di Safari.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#07101d] border border-amber-400/30 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              Scorri verso il basso e tocca <strong className="text-emerald-300">“Aggiungi alla schermata Home”</strong>, poi conferma su <strong className="text-white">Aggiungi</strong>.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#0066b2]/20 border border-sky-400/35 text-[11px] text-sky-100 leading-relaxed">
          <strong>Nota Fotocamera iPhone:</strong> Su iOS la fotocamera per scansionare i QR Code funziona su connessioni sicure <strong>HTTPS</strong>.
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] text-slate-950 font-black text-sm"
        >
          Ho Capito!
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TESSERA BANCARIA REALE CON CORNICE ZELLIGE & PULSANTE INGRANDIMENTO QR
// ============================================================================
function PlayerQRCard({ player, compact = false, onSelect, onExpandQR, selected = false, showScanHint = false }) {
  const token = TUNISIAN_TOKENS.find((t) => t.id === player.tokenId) || TUNISIAN_TOKENS[0];

  if (compact) {
    return (
      <div
        className={`group relative flex items-center justify-between w-full p-3 rounded-2xl border transition-all text-left ${
          selected
            ? 'bg-gradient-to-r from-amber-500/25 via-[#0066b2]/25 to-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.01]'
            : 'bg-[#0c1b30]/95 border-amber-500/25 hover:border-amber-400/70 hover:bg-[#112440]'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect && onSelect(player)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${token.gradient} border border-amber-300/50 flex items-center justify-center text-2xl shadow-md shrink-0`}>
            {token.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-50 truncate">{player.name}</span>
              {player.inJail && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/25 text-red-200 border border-red-400/40 font-semibold">
                  PRIGIONE
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-amber-300/90 flex items-center gap-1">
              <KhatamStarSVG className="w-3 h-3" /> {player.cardCode}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <div className="text-sm font-extrabold text-amber-300">{player.balance.toLocaleString('it-IT')} TND</div>
            {showScanHint && (
              <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">
                Tap / Scansiona
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onExpandQR) onExpandQR(player);
              else if (onSelect) onSelect(player);
            }}
            title="Ingrandisci QR a schermo intero"
            className="p-1 bg-[#FFFDF7] rounded-lg border-2 border-[#0066b2] hover:border-amber-400 shadow transition transform hover:scale-105"
          >
            <DeterministicQRCode value={player.qrPayload} size={38} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => (onExpandQR ? onExpandQR(player) : onSelect && onSelect(player))}
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${token.gradient} arabesque-card-pattern text-white shadow-2xl border-2 border-amber-400/60 transition-transform ${
        onExpandQR || onSelect ? 'cursor-pointer hover:scale-[1.015] active:scale-[0.99]' : ''
      }`}
    >
      <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-amber-300/70 rounded-tl-md pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-amber-300/70 rounded-tr-md pointer-events-none" />
      <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-amber-300/70 rounded-bl-md pointer-events-none" />
      <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-amber-300/70 rounded-br-md pointer-events-none" />

      <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-amber-300/15 blur-2xl pointer-events-none" />

      <div className="relative flex justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-amber-200 font-bold">
            <KhatamStarSVG className="w-3.5 h-3.5" color="#fde68a" />
            <span>Banque Centrale de Tunisie • تونس</span>
          </div>
          <h3 className="font-serif-luxury text-xl sm:text-2xl font-black mt-1.5 tracking-tight flex items-center gap-2 text-amber-50">
            <span className="text-2xl drop-shadow">{token.emoji}</span>
            <span>{player.name}</span>
          </h3>
          <p className="text-xs text-amber-100/80 mt-0.5 italic">{token.name}</p>
        </div>

        <div className="relative group/qr shrink-0">
          <div className="p-1.5 rounded-2xl bg-gradient-to-br from-[#0066b2] via-[#008b8b] to-[#081220] border-2 border-amber-300 shadow-xl">
            <div className="bg-[#FFFDF7] p-1 rounded-xl">
              <DeterministicQRCode value={player.qrPayload} size={86} />
            </div>
          </div>
          <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-200 bg-[#081220]/80 px-2 py-0.5 rounded-full border border-amber-400/40">
            <Maximize2 className="w-2.5 h-2.5" /> Ingrandisci
          </span>
        </div>
      </div>

      <div className="relative mt-4 pt-4 border-t border-amber-300/30 flex items-end justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80 block">Tesoro Disponibile</span>
          <span className="font-serif-luxury text-2xl sm:text-3xl font-black tracking-tight text-white">
            {player.balance.toLocaleString('it-IT')}{' '}
            <span className="text-sm font-sans font-extrabold text-amber-300">TND</span>
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase tracking-widest text-amber-200/75 block">Sigillo Tessera</span>
          <span className="font-mono text-xs sm:text-sm font-bold bg-[#081220]/65 text-amber-300 px-3 py-1 rounded-lg border border-amber-400/40 inline-block mt-0.5">
            {player.cardCode}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODALE TESSERA QR INGRANDITA A SCHERMO INTERO (PER SCANSIONE DA ALTRO TELEFONO)
// ============================================================================
function FullscreenQRModal({
  player,
  onClose,
  paymentContext = null,
  onOpenScannerForReceiver = null,
  onDirectConfirmSinglePhone = null,
}) {
  if (!player) return null;
  const token = TUNISIAN_TOKENS.find((t) => t.id === player.tokenId) || TUNISIAN_TOKENS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#030811]/95 backdrop-blur-lg overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0e1f36] via-[#091526] to-[#060e1a] border-2 border-amber-400 shadow-[0_0_60px_rgba(212,175,55,0.28)] overflow-hidden my-auto">
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#081220] via-[#0066b2]/40 to-[#081220] border-b border-amber-400/35 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-extrabold uppercase tracking-widest">
            <KhatamStarSVG className="w-4 h-4" />
            <span>Tessera QR ad Alta Leggibilità</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-200 border border-amber-400/35"
            aria-label="Chiudi QR ingrandito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 flex flex-col items-center text-center space-y-4">
          {paymentContext && (
            <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#c85a32]/30 via-red-900/35 to-[#c85a32]/30 border border-amber-400/60 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-200">
                  {paymentContext.title}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                  {paymentContext.amount} TND
                </span>
              </div>
              <p className="text-xs text-amber-50/90 mt-1 leading-relaxed">
                Mostra questo schermo al telefono di <strong className="text-amber-300">{paymentContext.receiverName}</strong> affinché lo inquadri con la fotocamera!
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${token.gradient} border border-amber-300 flex items-center justify-center text-2xl shadow-lg`}>
              {token.emoji}
            </div>
            <div className="text-left">
              <h3 className="font-serif-luxury text-2xl font-black text-white leading-tight">{player.name}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-amber-300">{player.cardCode}</span>
                <span className="text-slate-400">•</span>
                <span className="font-extrabold text-emerald-400">{player.balance.toLocaleString('it-IT')} TND</span>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-[#0066b2] via-[#d4af37] to-[#008b8b] shadow-[0_0_40px_rgba(255,253,247,0.2)]">
            <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-2xl shadow-inner flex flex-col items-center">
              <DeterministicQRCode value={player.qrPayload} size={245} fgColor="#050b14" bgColor="#FFFFFF" />
              <div className="mt-2.5 text-[11px] font-mono font-black tracking-widest text-slate-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-400">
                {player.qrPayload}
              </div>
            </div>
          </div>

          <p className="text-xs text-amber-100/80 max-w-xs">
            Tieni il telefono fermo a circa 15–20 cm dalla fotocamera dell'altro giocatore per una lettura istantanea.
          </p>

          {paymentContext && (
            <div className="w-full space-y-2.5 pt-1">
              {onOpenScannerForReceiver && (
                <button
                  type="button"
                  onClick={onOpenScannerForReceiver}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0066b2] via-[#008b8b] to-[#0066b2] hover:brightness-110 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 border border-sky-300/50 shadow-lg"
                >
                  <Camera className="w-4 h-4 text-amber-300" />
                  <span>Apri Fotocamera Ricevente ({paymentContext.receiverName})</span>
                </button>
              )}

              {onDirectConfirmSinglePhone && (
                <button
                  type="button"
                  onClick={onDirectConfirmSinglePhone}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Conferma Pagamento Diretto ({paymentContext.amount} TND)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODALE SCANNER QR CODE (APERTURA AUTOMATICA FOTOCAMERA + TAP RAPIDO)
// ============================================================================
function QRScannerModal({
  isOpen,
  onClose,
  players,
  expectedPlayerId = null,
  actionTitle = 'Scansiona Tessera Giocatore',
  actionDescription = 'Inquadra con la fotocamera il QR Code ingrandito sul telefono del giocatore.',
  amountBadge = null,
  autoStartCamera = true,
  onVerified,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanSuccessPlayer, setScanSuccessPlayer] = useState(null);
  const [wrongPlayerError, setWrongPlayerError] = useState('');

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const handleDetectedCode = useCallback(
    (rawText) => {
      if (!rawText) return;
      const clean = rawText.trim().toUpperCase();
      const matched = players.find(
        (p) =>
          p.qrPayload.toUpperCase() === clean ||
          p.cardCode.toUpperCase() === clean ||
          clean.includes(p.cardCode.toUpperCase())
      );

      if (!matched) {
        setWrongPlayerError(`Codice "${rawText}" non riconosciuto tra i giocatori della partita.`);
        return;
      }

      if (expectedPlayerId && matched.id !== expectedPlayerId) {
        const expected = players.find((p) => p.id === expectedPlayerId);
        setWrongPlayerError(
          `Tessera errata! Hai scansionato ${matched.name}, ma devi inquadrare il QR di ${expected?.name || 'un altro giocatore'}.`
        );
        return;
      }

      setWrongPlayerError('');
      setScanSuccessPlayer(matched);
      sfx.scan();
      stopCamera();

      setTimeout(() => {
        setScanSuccessPlayer(null);
        onVerified(matched);
      }, 650);
    },
    [players, expectedPlayerId, onVerified, stopCamera]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setWrongPlayerError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Fotocamera non supportata su questo dispositivo. Usa il Tap rapido sulle tessere qui sotto!');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                handleDetectedCode(barcodes[0].rawValue);
              }
            } catch (e) {
              // Ignora singoli frame non letti
            }
          }
        }, 300);
      }
    } catch (err) {
      setCameraError(
        'Accesso fotocamera non disponibile (permesso negato o assente). Tocca direttamente la tessera del giocatore qui sotto!'
      );
    }
  }, [handleDetectedCode]);

  useEffect(() => {
    if (isOpen) {
      if (autoStartCamera) {
        startCamera();
      }
    } else {
      stopCamera();
      setCameraError('');
      setWrongPlayerError('');
      setManualCode('');
      setScanSuccessPlayer(null);
    }
    return () => stopCamera();
  }, [isOpen, autoStartCamera, startCamera, stopCamera]);

  if (!isOpen) return null;

  const expectedPlayer = expectedPlayerId ? players.find((p) => p.id === expectedPlayerId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040a14]/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0b182b] gold-filigree-border overflow-hidden flex flex-col max-h-[94vh]">
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#081220] via-[#0066b2]/40 to-[#081220] border-b border-amber-400/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-inner">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-black text-amber-50 text-base sm:text-lg leading-tight">
                {actionTitle}
              </h3>
              {amountBadge && (
                <span className="inline-block mt-0.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {amountBadge}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-200/80 hover:text-white border border-amber-400/25 transition"
            aria-label="Chiudi scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{actionDescription}</p>

          {expectedPlayer && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                <KhatamStarSVG className="w-3.5 h-3.5" /> Inquadra QR di:
              </span>
              <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                {TUNISIAN_TOKENS.find((t) => t.id === expectedPlayer.tokenId)?.emoji} {expectedPlayer.name} (
                {expectedPlayer.cardCode})
              </span>
            </div>
          )}

          <div className="rounded-2xl bg-[#07101d] border border-amber-400/35 p-3 flex flex-col items-center">
            {cameraActive ? (
              <div className="relative w-full aspect-square max-h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-amber-400 rounded-2xl shadow-[0_0_0_9999px_rgba(4,10,20,0.62)] relative">
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-300 shadow-[0_0_12px_#fde047] animate-pulse" />
                  </div>
                </div>
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/80 text-[11px] font-bold text-amber-300 border border-amber-400/40">
                  Inquadra il QR ingrandito sull'altro telefono
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 text-xs font-bold text-amber-200 border border-amber-400/40"
                >
                  Chiudi Camera
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs">
                  <Camera className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Inquadra lo schermo del telefono che paga per confermare l'incasso.</span>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition shrink-0"
                >
                  <Camera className="w-4 h-4" /> Riattiva Fotocamera
                </button>
              </div>
            )}

            {cameraError && (
              <p className="mt-2 text-xs text-amber-200 bg-amber-950/60 border border-amber-500/40 rounded-xl p-2.5 w-full">
                {cameraError}
              </p>
            )}
          </div>

          {scanSuccessPlayer && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center gap-3 text-emerald-200">
              <Check className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="font-extrabold text-sm">QR Smartphone Riconosciuto!</div>
                <div className="text-xs">
                  {scanSuccessPlayer.name} ({scanSuccessPlayer.cardCode})
                </div>
              </div>
            </div>
          )}

          {wrongPlayerError && (
            <div className="p-3 rounded-2xl bg-red-500/20 border border-red-400/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{wrongPlayerError}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80">
                Conferma Rapida (Modalità 1 Telefono / Senza Camera)
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {players.map((p) => {
                const isExpected = !expectedPlayerId || expectedPlayerId === p.id;
                return (
                  <div key={p.id} className={!isExpected ? 'opacity-40' : ''}>
                    <PlayerQRCard
                      player={p}
                      compact
                      showScanHint={isExpected}
                      selected={expectedPlayerId === p.id}
                      onSelect={(selectedP) => handleDetectedCode(selectedP.qrPayload)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDetectedCode(manualCode);
            }}
            className="flex gap-2 pt-1"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Codice carta (es. TUN-01)..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#07101d] border border-amber-400/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono uppercase"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#0e1f36] hover:bg-[#152d4d] text-amber-300 font-bold text-xs border border-amber-400/35"
            >
              Verifica
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPALE: MONOPOLY TUNISIA - APP BANKING (100% SMARTPHONE)
// ============================================================================
export default function App() {
  useIOSInstallablePWA();

  const [screen, setScreen] = useState('menu'); // 'menu' | 'setup' | 'game'
  const [gameMode, setGameMode] = useState('local'); // 'local' (1 Telefono) | 'online' (Multi-Smartphone)
  const [soundOn, setSoundOn] = useState(true);
  const [fbUser, setFbUser] = useState(null);
  const [iosInstallModalOpen, setIosInstallModalOpen] = useState(false);

  const [myDevicePlayerId, setMyDevicePlayerId] = useState(null);

  const [startingBalance, setStartingBalance] = useState(1500);
  const [setupPlayers, setSetupPlayers] = useState([
    { name: 'Amira', tokenId: 'lantern' },
    { name: 'Youssef', tokenId: 'camel' },
    { name: 'Salma', tokenId: 'boat' },
  ]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [onlineError, setOnlineError] = useState('');
  const [onlineLoading, setOnlineLoading] = useState(false);

  const [gameState, setGameState] = useState(null);

  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'bank' | 'properties' | 'cards' | 'history'
  const [diceRolling, setDiceRolling] = useState(false);
  const [lastDice, setLastDice] = useState([1, 1]);
  const [drawnCard, setDrawnCard] = useState(null);
  const [landedSpaceModal, setLandedSpaceModal] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [selectedPropertyDetail, setSelectedPropertyDetail] = useState(null);

  const [fullscreenQRState, setFullscreenQRState] = useState({
    player: null,
    paymentContext: null,
    onOpenScannerForReceiver: null,
    onDirectConfirmSinglePhone: null,
  });

  const [transferFrom, setTransferFrom] = useState('BANK');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('100');
  const [transferNote, setTransferNote] = useState('');

  const [qrModal, setQrModal] = useState({
    isOpen: false,
    expectedPlayerId: null,
    actionTitle: '',
    actionDescription: '',
    amountBadge: null,
    autoStartCamera: true,
    onVerified: () => {},
  });

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.warn('Auth fallback:', e);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (user) => setFbUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (gameMode !== 'online' || !gameState?.roomCode || !db || !fbUser) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'tunisia_rooms', gameState.roomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data();
          if (remoteData && remoteData.stateJson) {
            try {
              const parsed = JSON.parse(remoteData.stateJson);
              setGameState(parsed);
            } catch (e) {
              console.error('Errore parsing stato online:', e);
            }
          }
        }
      },
      (err) => {
        console.error('Errore sync Firestore:', err);
      }
    );

    return () => unsub();
  }, [gameMode, gameState?.roomCode, fbUser]);

  const commitGameState = useCallback(
    async (updater) => {
      setGameState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (gameMode === 'online' && next?.roomCode && db && fbUser) {
          const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'tunisia_rooms', next.roomCode);
          setDoc(
            roomRef,
            {
              roomCode: next.roomCode,
              updatedAt: Date.now(),
              stateJson: JSON.stringify(next),
            },
            { merge: true }
          ).catch((e) => console.error('Errore salvataggio stanza:', e));
        }
        return next;
      });
    },
    [gameMode, fbUser]
  );

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.enabled = next;
  };

  const addSetupPlayer = () => {
    if (setupPlayers.length >= 8) return;
    const usedTokens = new Set(setupPlayers.map((p) => p.tokenId));
    const availableToken = TUNISIAN_TOKENS.find((t) => !usedTokens.has(t.id)) || TUNISIAN_TOKENS[setupPlayers.length % 8];
    const defaultNames = ['Amira', 'Youssef', 'Salma', 'Mehdi', 'Ines', 'Karim', 'Nour', 'Sami'];
    setSetupPlayers([
      ...setupPlayers,
      { name: defaultNames[setupPlayers.length] || `Giocatore ${setupPlayers.length + 1}`, tokenId: availableToken.id },
    ]);
  };

  const removeSetupPlayer = (idx) => {
    if (setupPlayers.length <= 2) return;
    setSetupPlayers(setupPlayers.filter((_, i) => i !== idx));
  };

  const updateSetupPlayer = (idx, field, value) => {
    setSetupPlayers(setupPlayers.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const startNewGame = async () => {
    const roomCode =
      gameMode === 'online'
        ? `TUN-${Math.floor(100 + Math.random() * 900)}`
        : `LOC-${Math.floor(100 + Math.random() * 900)}`;

    const players = setupPlayers.map((p, idx) => {
      const cardCode = `TUN-0${idx + 1}`;
      return {
        id: `p_${idx + 1}`,
        name: p.name.trim() || `Giocatore ${idx + 1}`,
        tokenId: p.tokenId,
        balance: Number(startingBalance) || 1500,
        position: 0,
        inJail: false,
        jailTurns: 0,
        jailFreeCards: 0,
        bankrupt: false,
        cardCode,
        qrPayload: `MONOPOLY-TUNISIA:${roomCode}:${cardCode}:${idx + 1}`,
      };
    });

    const initialState = {
      roomCode,
      mode: gameMode,
      players,
      currentPlayerIndex: 0,
      hasRolledThisTurn: false,
      doublesCount: 0,
      ownership: {},
      transactions: [
        {
          id: `tx_${Date.now()}`,
          time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          text: `Partita avviata su smartphone! Ogni giocatore riceve ${startingBalance} TND e la propria Tessera Digitale QR.`,
          type: 'system',
        },
      ],
      winnerId: null,
    };

    if (gameMode === 'online' && db && fbUser) {
      setOnlineLoading(true);
      setOnlineError('');
      try {
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'tunisia_rooms', roomCode);
        await setDoc(roomRef, {
          roomCode,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stateJson: JSON.stringify(initialState),
        });
      } catch (e) {
        setOnlineError('Errore di rete nella creazione stanza online. Avvio in modalità locale.');
      } finally {
        setOnlineLoading(false);
      }
    }

    setGameState(initialState);
    setMyDevicePlayerId(players[0].id);
    setActiveTab('board');
    setScreen('game');
    sfx.fanfare();
  };

  const joinOnlineRoom = async (e) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    if (!db || !fbUser) {
      setOnlineError('Servizio cloud non disponibile in questo momento. Usa la modalità 1 Telefono!');
      return;
    }

    setOnlineLoading(true);
    setOnlineError('');
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'tunisia_rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setOnlineError(`Nessuna stanza trovata con codice "${code}". Verifica il codice e riprova.`);
      } else {
        const data = snap.data();
        const parsed = JSON.parse(data.stateJson);
        setGameMode('online');
        setGameState(parsed);
        setMyDevicePlayerId(null);
        setActiveTab('board');
        setScreen('game');
        sfx.scan();
      }
    } catch (err) {
      setOnlineError('Impossibile connettersi alla stanza. Riprova.');
    } finally {
      setOnlineLoading(false);
    }
  };

  const appendTx = (state, text, type = 'info') => {
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      text,
      type,
    };
    return [newTx, ...(state.transactions || [])].slice(0, 60);
  };

  const calculateRent = (space, state) => {
    const own = state.ownership[space.id];
    if (!own || own.mortgaged) return 0;

    if (space.type === 'property') {
      const groupSpaces = BOARD_SPACES.filter((s) => s.group === space.group);
      const ownsAllGroup = groupSpaces.every((s) => state.ownership[s.id]?.ownerId === own.ownerId);
      if (own.houses === 0) {
        return ownsAllGroup ? space.rent[0] * 2 : space.rent[0];
      }
      return space.rent[own.houses] || space.rent[0];
    }

    if (space.type === 'station') {
      const ownedStations = BOARD_SPACES.filter(
        (s) => s.type === 'station' && state.ownership[s.id]?.ownerId === own.ownerId
      ).length;
      return space.rent[Math.max(0, ownedStations - 1)] || 25;
    }

    if (space.type === 'utility') {
      const ownedUtils = BOARD_SPACES.filter(
        (s) => s.type === 'utility' && state.ownership[s.id]?.ownerId === own.ownerId
      ).length;
      const diceSum = (lastDice[0] || 4) + (lastDice[1] || 3);
      return ownedUtils >= 2 ? diceSum * 10 : diceSum * 4;
    }

    return 0;
  };

  const checkWinner = (players) => {
    const active = players.filter((p) => !p.bankrupt);
    if (active.length === 1) return active[0].id;
    return null;
  };

  const executeVerifiedTransfer = ({ fromId, toId, amount, reason, afterCallback }) => {
    const numAmount = Math.max(0, Math.round(Number(amount)));
    if (!numAmount) return;

    commitGameState((prev) => {
      if (!prev) return prev;
      let logText = '';
      const updatedPlayers = prev.players.map((p) => ({ ...p }));

      const sender = fromId !== 'BANK' ? updatedPlayers.find((p) => p.id === fromId) : null;
      const receiver = toId !== 'BANK' ? updatedPlayers.find((p) => p.id === toId) : null;

      if (sender) {
        sender.balance -= numAmount;
        if (sender.balance < 0) {
          sender.bankrupt = true;
        }
      }
      if (receiver) {
        receiver.balance += numAmount;
      }

      if (sender && receiver) {
        logText = `${sender.name} ha versato ${numAmount} TND a ${receiver.name}${reason ? ` (${reason})` : ''}.`;
      } else if (sender && !receiver) {
        logText = `${sender.name} ha versato ${numAmount} TND al Tesoro della Banca${reason ? ` (${reason})` : ''}.`;
      } else if (!sender && receiver) {
        logText = `${receiver.name} ha incassato ${numAmount} TND dalla Banca${reason ? ` (${reason})` : ''}.`;
      }

      if (sender?.bankrupt) {
        logText += ` ⚠️ ${sender.name} è in bancarotta!`;
      }

      const winnerId = checkWinner(updatedPlayers);
      if (winnerId) {
        sfx.fanfare();
      } else if (receiver && (!sender || receiver.id === prev.players[prev.currentPlayerIndex]?.id)) {
        sfx.coin();
      } else {
        sfx.pay();
      }

      return {
        ...prev,
        players: updatedPlayers,
        winnerId,
        transactions: appendTx(prev, logText, receiver && !sender ? 'income' : 'payment'),
      };
    });

    if (afterCallback) afterCallback();
  };

  const requestQRTransaction = ({
    playerToScanId,
    title,
    description,
    amountBadge,
    autoStartCamera = true,
    onVerified,
  }) => {
    setQrModal({
      isOpen: true,
      expectedPlayerId: playerToScanId,
      actionTitle: title,
      actionDescription: description,
      amountBadge,
      autoStartCamera,
      onVerified: (verifiedPlayer) => {
        setQrModal((m) => ({ ...m, isOpen: false }));
        onVerified(verifiedPlayer);
      },
    });
  };

  const initiatePlayerToPlayerQRPayment = ({ payer, receiver, amount, reason }) => {
    const openScannerStep = () => {
      setFullscreenQRState({
        player: null,
        paymentContext: null,
        onOpenScannerForReceiver: null,
        onDirectConfirmSinglePhone: null,
      });
      requestQRTransaction({
        playerToScanId: payer.id,
        title: `${receiver.name}: Scansiona QR di ${payer.name}`,
        description: `Inquadra con la fotocamera del telefono di ${receiver.name} il QR Code ingrandito sul telefono di ${payer.name} per incassare ${amount} TND.`,
        amountBadge: `+${amount} TND per ${receiver.name}`,
        autoStartCamera: true,
        onVerified: () => {
          executeVerifiedTransfer({
            fromId: payer.id,
            toId: receiver.id,
            amount,
            reason,
          });
        },
      });
    };

    setFullscreenQRState({
      player: payer,
      paymentContext: {
        title: reason,
        amount,
        receiverName: receiver.name,
      },
      onOpenScannerForReceiver: openScannerStep,
      onDirectConfirmSinglePhone: () => {
        setFullscreenQRState({
          player: null,
          paymentContext: null,
          onOpenScannerForReceiver: null,
          onDirectConfirmSinglePhone: null,
        });
        executeVerifiedTransfer({
          fromId: payer.id,
          toId: receiver.id,
          amount,
          reason,
        });
      },
    });
  };

  const handleRollDice = () => {
    if (!gameState || diceRolling || gameState.hasRolledThisTurn) return;
    setDiceRolling(true);
    sfx.dice();

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2;
      const isDouble = d1 === d2;
      setLastDice([d1, d2]);
      setDiceRolling(false);

      let landedSpaceObj = null;
      let drawnCardObj = null;

      commitGameState((prev) => {
        const players = prev.players.map((p) => ({ ...p }));
        const p = players[prev.currentPlayerIndex];
        let logs = [...prev.transactions];
        let doublesCount = isDouble ? prev.doublesCount + 1 : 0;
        let allowAnotherRoll = isDouble && doublesCount < 3;

        if (p.inJail) {
          if (isDouble) {
            p.inJail = false;
            p.jailTurns = 0;
            logs = appendTx(
              { transactions: logs },
              `🎲 ${p.name} ottiene un doppio (${d1}+${d2}) ed esce di Prigione!`,
              'income'
            );
          } else {
            p.jailTurns += 1;
            if (p.jailTurns >= 3) {
              p.inJail = false;
              p.jailTurns = 0;
              p.balance -= 50;
              logs = appendTx(
                { transactions: logs },
                `🔓 ${p.name} sconta 3 turni, paga 50 TND e torna libero.`,
                'payment'
              );
            } else {
              logs = appendTx(
                { transactions: logs },
                `⛓️ ${p.name} lancia ${d1}+${d2} e resta in Prigione (tentativo ${p.jailTurns}/3).`,
                'alert'
              );
              return {
                ...prev,
                players,
                hasRolledThisTurn: true,
                doublesCount: 0,
                winnerId: checkWinner(players),
                transactions: logs,
              };
            }
          }
        }

        if (doublesCount >= 3) {
          p.position = 10;
          p.inJail = true;
          p.jailTurns = 0;
          sfx.jail();
          logs = appendTx(
            { transactions: logs },
            `🚔 Tre doppi consecutivi! ${p.name} viene rinchiuso in Prigione!`,
            'alert'
          );
          return {
            ...prev,
            players,
            hasRolledThisTurn: true,
            doublesCount: 0,
            transactions: logs,
          };
        }

        const oldPos = p.position;
        const newPos = (oldPos + sum) % BOARD_SPACES.length;
        p.position = newPos;

        if (newPos < oldPos) {
          p.balance += 200;
          sfx.coin();
          logs = appendTx(
            { transactions: logs },
            `🏁 ${p.name} passa da Bab El Bhar (VIA!) e incassa 200 TND!`,
            'income'
          );
        }

        const landed = BOARD_SPACES[newPos];
        logs = appendTx(
          { transactions: logs },
          `🎲 ${p.name} tira ${d1}+${d2} (${sum}) e arriva a ${landed.name}.`,
          'info'
        );

        if (landed.type === 'gotojail') {
          p.position = 10;
          p.inJail = true;
          p.jailTurns = 0;
          allowAnotherRoll = false;
          sfx.jail();
          logs = appendTx({ transactions: logs }, `🚔 ${p.name} va direttamente in Prigione!`, 'alert');
        } else if (landed.type === 'chance' || landed.type === 'chest') {
          const deck = landed.type;
          const cards = deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
          drawnCardObj = { deck, card: cards[Math.floor(Math.random() * cards.length)] };
        } else if (
          landed.type === 'property' ||
          landed.type === 'station' ||
          landed.type === 'utility' ||
          landed.type === 'tax'
        ) {
          landedSpaceObj = landed;
        }

        return {
          ...prev,
          players,
          hasRolledThisTurn: !allowAnotherRoll,
          doublesCount,
          winnerId: checkWinner(players),
          transactions: logs,
        };
      });

      if (drawnCardObj) {
        setDrawnCard(drawnCardObj);
      } else if (landedSpaceObj) {
        setLandedSpaceModal(landedSpaceObj);
      }
    }, 450);
  };

  const handleEndTurn = () => {
    if (!gameState) return;
    commitGameState((prev) => {
      const total = prev.players.length;
      let nextIdx = (prev.currentPlayerIndex + 1) % total;
      let safety = 0;
      while (prev.players[nextIdx]?.bankrupt && safety < total) {
        nextIdx = (nextIdx + 1) % total;
        safety++;
      }
      const nextPlayer = prev.players[nextIdx];
      return {
        ...prev,
        currentPlayerIndex: nextIdx,
        hasRolledThisTurn: false,
        doublesCount: 0,
        transactions: appendTx(prev, `➡️ Tocca ora a ${nextPlayer.name}.`, 'system'),
      };
    });
  };

  const handleBuyProperty = (space, buyerId) => {
    const buyer = gameState.players.find((p) => p.id === buyerId);
    if (!buyer || buyer.balance < space.price) return;
    setLandedSpaceModal(null);

    requestQRTransaction({
      playerToScanId: buyer.id,
      title: `Acquista ${space.name}`,
      description: `Scansiona o conferma la tessera QR di ${buyer.name} per versare ${space.price} TND alla Banca.`,
      amountBadge: `-${space.price} TND`,
      onVerified: () => {
        commitGameState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === buyer.id ? { ...p, balance: p.balance - space.price } : p
          ),
          ownership: {
            ...prev.ownership,
            [space.id]: { ownerId: buyer.id, houses: 0, mortgaged: false },
          },
          transactions: appendTx(
            prev,
            `🏛️ ${buyer.name} acquisisce ${space.name} per ${space.price} TND.`,
            'payment'
          ),
        }));
        sfx.coin();
      },
    });
  };

  const startAuctionForSpace = (space) => {
    setLandedSpaceModal(null);
    setAuctionState({
      space,
      currentBid: 10,
      highestBidderId: null,
    });
  };

  const handleBuildHouse = (space) => {
    const own = gameState.ownership[space.id];
    if (!own || own.houses >= 5) return;
    const owner = gameState.players.find((p) => p.id === own.ownerId);
    if (!owner || owner.balance < space.houseCost) return;

    const isKasbah = own.houses === 4;
    requestQRTransaction({
      playerToScanId: owner.id,
      title: isKasbah ? `Edifica Kasbah su ${space.name}` : `Edifica Dar su ${space.name}`,
      description: `Scansiona la tessera QR di ${owner.name} per investire ${space.houseCost} TND.`,
      amountBadge: `-${space.houseCost} TND`,
      onVerified: () => {
        commitGameState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === owner.id ? { ...p, balance: p.balance - space.houseCost } : p
          ),
          ownership: {
            ...prev.ownership,
            [space.id]: { ...own, houses: own.houses + 1 },
          },
          transactions: appendTx(
            prev,
            `🕌 ${owner.name} costruisce ${isKasbah ? 'una Kasbah Reale' : 'una Dar'} su ${space.name} (${space.houseCost} TND).`,
            'payment'
          ),
        }));
        sfx.coin();
      },
    });
  };

  const handleApplyDrawnCard = () => {
    if (!drawnCard || !gameState) return;
    const { card } = drawnCard;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const finalizeCard = () => {
      commitGameState((prev) => {
        const players = prev.players.map((p) => ({ ...p }));
        const actor = players[prev.currentPlayerIndex];
        let logs = [...prev.transactions];

        if (card.action === 'money') {
          actor.balance += card.amount;
          logs = appendTx(
            { transactions: logs },
            `📜 Pergamena "${card.title}": ${actor.name} ${card.amount >= 0 ? `incassa ${card.amount}` : `paga ${Math.abs(card.amount)}`} TND.`,
            card.amount >= 0 ? 'income' : 'payment'
          );
        } else if (card.action === 'move') {
          const passed = card.collectGo && card.target < actor.position;
          actor.position = card.target;
          if (passed || card.target === 0) {
            actor.balance += 200;
            logs = appendTx({ transactions: logs }, `🏁 ${actor.name} varca Bab El Bhar (VIA!) e incassa 200 TND.`, 'income');
          }
          logs = appendTx(
            { transactions: logs },
            `📜 Pergamena "${card.title}": ${actor.name} avanza fino a ${BOARD_SPACES[card.target].name}.`,
            'info'
          );
        } else if (card.action === 'jail') {
          actor.position = 10;
          actor.inJail = true;
          actor.jailTurns = 0;
          sfx.jail();
          logs = appendTx({ transactions: logs }, `🚔 Pergamena "${card.title}": ${actor.name} va in Prigione!`, 'alert');
        } else if (card.action === 'jailFree') {
          actor.jailFreeCards = (actor.jailFreeCards || 0) + 1;
          logs = appendTx(
            { transactions: logs },
            `🎟️ ${actor.name} ottiene un Sigillo di Grazia del Bey (Uscita gratis di prigione).`,
            'income'
          );
        } else if (card.action === 'fromAll') {
          let totalCollected = 0;
          players.forEach((p) => {
            if (p.id !== actor.id && !p.bankrupt) {
              p.balance -= card.amount;
              totalCollected += card.amount;
            }
          });
          actor.balance += totalCollected;
          logs = appendTx(
            { transactions: logs },
            `📜 Pergamena "${card.title}": ${actor.name} riceve ${card.amount} TND da ciascun giocatore (Totale: ${totalCollected} TND).`,
            'income'
          );
        } else if (card.action === 'toAll') {
          let totalPaid = 0;
          players.forEach((p) => {
            if (p.id !== actor.id && !p.bankrupt) {
              p.balance += card.amount;
              totalPaid += card.amount;
            }
          });
          actor.balance -= totalPaid;
          logs = appendTx(
            { transactions: logs },
            `📜 Pergamena "${card.title}": ${actor.name} offre ${card.amount} TND a ciascun giocatore (Totale: ${totalPaid} TND).`,
            'payment'
          );
        } else if (card.action === 'repairs') {
          let cost = 0;
          Object.values(prev.ownership).forEach((o) => {
            if (o.ownerId === actor.id) {
              if (o.houses === 5) cost += card.hotel;
              else cost += o.houses * card.house;
            }
          });
          actor.balance -= cost;
          logs = appendTx(
            { transactions: logs },
            `📜 Pergamena "${card.title}": ${actor.name} paga ${cost} TND per restauro edifici.`,
            'payment'
          );
        }

        return {
          ...prev,
          players,
          winnerId: checkWinner(players),
          transactions: logs,
        };
      });
      setDrawnCard(null);
    };

    requestQRTransaction({
      playerToScanId: currentPlayer.id,
      title: card.title,
      description: `Scansiona la tessera QR di ${currentPlayer.name} per sigillare l'effetto della pergamena.`,
      amountBadge: card.amount ? `${card.amount > 0 ? '+' : ''}${card.amount} TND` : 'Conferma Pergamena',
      onVerified: finalizeCard,
    });
  };

  // ============================================================================
  // RENDER SCHERMATA 1: MENU INIZIALE ORIENTALE (100% SMARTPHONE)
  // ============================================================================
  if (screen === 'menu') {
    return (
      <div className="min-h-screen zellige-bg text-white flex flex-col justify-between relative overflow-hidden">
        <OrientalThemeStyles />

        <div className="pointer-events-none absolute top-0 left-4 sm:left-12 z-20 animate-lantern">
          <FanousLanternSVG className="w-10 h-16 sm:w-14 sm:h-24" />
        </div>
        <div className="pointer-events-none absolute top-0 right-4 sm:right-12 z-20 animate-lantern" style={{ animationDelay: '1.6s' }}>
          <FanousLanternSVG className="w-10 h-16 sm:w-14 sm:h-24" />
        </div>

        <header className="relative z-10 max-w-6xl w-full mx-auto px-14 sm:px-24 pt-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#c85a32] via-red-700 to-[#081220] border-2 border-amber-400/80 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <KhatamStarSVG className="w-6 h-6" color="#fde68a" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.22em] text-amber-300 font-bold block">
                تونس • République Tunisienne
              </span>
              <span className="font-oriental text-xs sm:text-sm tracking-wider text-amber-50">
                BANQUE ROYALE QR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIosInstallModalOpen(true)}
              className="px-3 py-2 rounded-2xl bg-gradient-to-r from-[#0066b2]/40 to-[#008b8b]/40 border border-sky-300/50 hover:border-amber-300 text-amber-100 text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
              title="Come installare l'app su iPhone"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Installa su iPhone</span>
              <span className="sm:hidden">iOS</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-2.5 rounded-2xl bg-[#0e1f36]/90 border border-amber-400/35 hover:border-amber-300 text-amber-300 transition shadow-md"
              title={soundOn ? 'Disattiva audio Maqam' : 'Attiva audio Maqam'}
            >
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col items-center text-center">
          <div className="pointer-events-none absolute top-4 opacity-15">
            <KhatamStarSVG className="w-72 h-72 sm:w-96 sm:h-96 animate-rosette" color="#d4af37" />
          </div>

          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0e1f36]/90 border border-amber-400/50 text-amber-200 text-xs font-bold uppercase tracking-[0.18em] mb-5 shadow-lg">
            <SmartphoneNfc className="w-3.5 h-3.5 text-amber-400" /> 100% Digitale su Smartphone • 2–8 Giocatori
          </div>

          <h1 className="relative font-oriental text-3xl sm:text-5xl md:text-6xl font-black tracking-wide leading-tight drop-shadow-[0_4px_20px_rgba(212,175,55,0.28)]">
            <span className="bg-gradient-to-b from-[#fffbeb] via-[#f6dc7a] to-[#d4af37] bg-clip-text text-transparent">
              MONOPOLY TUNISIA
            </span>
            <span className="block font-serif-luxury italic text-xl sm:text-3xl font-bold text-[#38bdf8] mt-2 tracking-widest">
              — App Banking & Pagamenti QR —
            </span>
          </h1>

          <div className="w-full max-w-md mt-2">
            <MoorishDivider label="تونس • Tabellone & Banca sullo Smartphone" />
          </div>

          <p className="relative max-w-2xl text-slate-200/90 text-sm sm:text-base mt-2 leading-relaxed">
            Nessun tabellone fisico necessario: l’intera Tunisia da <strong className="text-amber-300">Matmata</strong> a{' '}
            <strong className="text-sky-300">Sidi Bou Said</strong> vive direttamente sul tuo smartphone! Ingrandisci la tua{' '}
            <span className="text-amber-300 font-bold">Tessera QR Code</span> per pagare affitti e spese facendola inquadrare dalla fotocamera dell’altro giocatore.
          </p>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-9 text-left">
            <div className="group relative rounded-3xl bg-gradient-to-b from-[#0e1f36] to-[#081220] gold-filigree-border moorish-arch-top p-6 sm:p-8 transition-all flex flex-col justify-between overflow-hidden">
              <div className="arabesque-card-pattern absolute inset-0 opacity-40 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] via-amber-500 to-[#c85a32] flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 border border-amber-200/60">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/40 text-xs font-bold">
                    1 Telefono • 2 - 8 Giocatori
                  </span>
                </div>

                <h2 className="font-serif-luxury text-2xl sm:text-3xl font-black text-amber-50 group-hover:text-amber-300 transition">
                  Passa lo Smartphone
                </h2>
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                  Tutti i 2–8 giocatori giocano sullo <strong className="text-amber-200">stesso telefono</strong> passandoselo di turno in turno con tabellone digitale, dadi 3D e banca QR integrata.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-amber-100/85">
                  <li className="flex items-center gap-2">
                    <KhatamStarSVG className="w-3.5 h-3.5 shrink-0" /> Tabellone interattivo Tunisia completo su schermo
                  </li>
                  <li className="flex items-center gap-2">
                    <KhatamStarSVG className="w-3.5 h-3.5 shrink-0" /> Tessera QR ingrandibile + conferma istantanea 1-Tap
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setGameMode('local');
                  setScreen('setup');
                }}
                className="relative mt-6 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f6dc7a] to-[#d4af37] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition"
              >
                <Play className="w-4 h-4 fill-current" /> Gioca su 1 Smartphone
              </button>
            </div>

            <div className="group relative rounded-3xl bg-gradient-to-b from-[#0b2747] to-[#081220] border border-[#38bdf8]/45 moorish-arch-top p-6 sm:p-8 shadow-2xl transition-all flex flex-col justify-between overflow-hidden">
              <div className="arabesque-card-pattern absolute inset-0 opacity-40 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0066b2] via-[#008b8b] to-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 border border-sky-300/50">
                    <Globe className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-sky-400/15 text-sky-200 border border-sky-400/40 text-xs font-bold">
                    Multi-Smartphone QR
                  </span>
                </div>

                <h2 className="font-serif-luxury text-2xl sm:text-3xl font-black text-white group-hover:text-sky-300 transition">
                  Più Telefoni (Online)
                </h2>
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                  Ogni giocatore usa il <strong className="text-white">proprio telefono</strong>! Quando paghi un affitto ingrandisci il tuo QR e l’altro giocatore apre la <strong className="text-amber-300">fotocamera per scansionarlo</strong>.
                </p>

                <form onSubmit={joinOnlineRoom} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="Codice Stanza (es. TUN-842)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#060e1a] border border-sky-400/35 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={onlineLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#0e2a4a] hover:bg-[#153a66] text-amber-300 font-extrabold text-xs border border-amber-400/40 transition shrink-0"
                  >
                    {onlineLoading ? '...' : 'Entra'}
                  </button>
                </form>
                {onlineError && <p className="text-xs text-red-300 mt-2">{onlineError}</p>}
              </div>

              <button
                onClick={() => {
                  setGameMode('online');
                  setScreen('setup');
                }}
                className="relative mt-6 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#0066b2] via-[#008b8b] to-[#0066b2] hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 border border-sky-300/40 shadow-lg shadow-sky-600/25 transition"
              >
                <Users className="w-4 h-4" /> Crea Stanza Multi-Smartphone
              </button>
            </div>
          </div>
        </main>

        <footer className="relative z-10 text-center py-4 text-xs text-amber-200/60">
          Valuta Ufficiale: Dinaro Tunisino (TND) • Installabile su iPhone (Safari → Condividi → Aggiungi alla schermata Home)
        </footer>

        <IOSInstallModal isOpen={iosInstallModalOpen} onClose={() => setIosInstallModalOpen(false)} />
      </div>
    );
  }

  // ============================================================================
  // RENDER SCHERMATA 2: CONFIGURAZIONE CAROVANA GIOCATORI (2-8)
  // ============================================================================
  if (screen === 'setup') {
    return (
      <div className="min-h-screen zellige-bg text-white p-4 sm:p-6">
        <OrientalThemeStyles />
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setScreen('menu')}
              className="px-4 py-2 rounded-xl bg-[#0e1f36] hover:bg-[#152c4b] border border-amber-400/35 text-xs font-bold text-amber-200 transition"
            >
              ← Torna al Portale
            </button>
            <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/45">
              {gameMode === 'online' ? 'Stanza Multi-Smartphone' : '1 Telefono (Passa & Gioca)'}
            </span>
          </div>

          <div className="rounded-3xl bg-[#0b182b]/95 gold-filigree-border moorish-arch-top p-5 sm:p-8 space-y-6">
            <div className="text-center sm:text-left">
              <span className="text-[11px] uppercase tracking-[0.22em] text-amber-400 font-bold">
                Preparazione Partita Digitale
              </span>
              <h2 className="font-serif-luxury text-2xl sm:text-3xl font-black text-amber-50 mt-1">
                Configura Giocatori & Tessere QR
              </h2>
              <p className="text-slate-300 text-sm mt-1">
                Aggiungi da <strong className="text-amber-300">2 a 8 giocatori</strong>. Tutto si svolge direttamente sugli smartphone senza tabellone fisico.
              </p>
            </div>

            <MoorishDivider />

            <div className="p-4 rounded-2xl bg-[#07101d] border border-amber-400/25">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/85 mb-2.5">
                Tesoro Iniziale per Giocatore (Dinari Tunisini - TND)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[1500, 2000, 2500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStartingBalance(amt)}
                    className={`py-3 px-2 rounded-xl border font-black text-sm transition ${
                      startingBalance === amt
                        ? 'bg-emerald-500/20 border-amber-400 text-amber-300 shadow-inner'
                        : 'bg-[#0b182b] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {amt} TND
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-extrabold text-amber-100 flex items-center gap-2">
                  <KhatamStarSVG className="w-4 h-4" /> Giocatori ({setupPlayers.length} / 8)
                </span>
                <button
                  type="button"
                  onClick={addSetupPlayer}
                  disabled={setupPlayers.length >= 8}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-4 h-4" /> Aggiungi Giocatore
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {setupPlayers.map((player, idx) => {
                  const token = TUNISIAN_TOKENS.find((t) => t.id === player.tokenId) || TUNISIAN_TOKENS[0];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#07101d] border border-amber-400/25 flex items-center gap-3"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${token.gradient} border border-amber-300/60 flex items-center justify-center text-2xl shrink-0 shadow`}>
                        {token.emoji}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => updateSetupPlayer(idx, 'name', e.target.value)}
                            placeholder={`Nome Giocatore ${idx + 1}`}
                            className="w-full bg-[#0e1f36] border border-amber-400/30 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-[11px] font-mono text-amber-300 shrink-0">TUN-0{idx + 1}</span>
                        </div>

                        <select
                          value={player.tokenId}
                          onChange={(e) => updateSetupPlayer(idx, 'tokenId', e.target.value)}
                          className="w-full bg-[#0e1f36] border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-100/90 focus:outline-none focus:border-amber-400"
                        >
                          {TUNISIAN_TOKENS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.emoji} {t.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {setupPlayers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeSetupPlayer(idx)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Rimuovi giocatore"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={startNewGame}
              disabled={onlineLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f6dc7a] to-[#c85a32] hover:brightness-110 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition"
            >
              <Sparkles className="w-5 h-5" />
              {onlineLoading ? 'Apertura Stanza Multi-Smartphone...' : 'Avvia Partita & Genera Tessere QR'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER SCHERMATA 3: PARTITA ATTIVA (100% SMARTPHONE + TESSERA QR INGRANDIBILE)
  // ============================================================================
  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex] || gameState.players[0];
  const devicePlayer =
    gameMode === 'online' && myDevicePlayerId
      ? gameState.players.find((p) => p.id === myDevicePlayerId) || currentPlayer
      : currentPlayer;
  const currentToken = TUNISIAN_TOKENS.find((t) => t.id === currentPlayer.tokenId) || TUNISIAN_TOKENS[0];
  const currentSpace = BOARD_SPACES[currentPlayer.position] || BOARD_SPACES[0];
  const winnerPlayer = gameState.winnerId ? gameState.players.find((p) => p.id === gameState.winnerId) : null;

  return (
    <div className="min-h-screen zellige-bg text-white flex flex-col">
      <OrientalThemeStyles />

      {gameMode === 'online' && !myDevicePlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040a14]/95 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl moorish-arch-top bg-[#0b182b] gold-filigree-border p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-300">
              <UserCheck className="w-6 h-6" />
              <h2 className="font-serif-luxury text-xl font-black text-white">Chi sta usando questo telefono?</h2>
            </div>
            <p className="text-xs text-slate-300">
              Seleziona il tuo profilo nella stanza <span className="font-mono text-amber-300 font-bold">{gameState.roomCode}</span> per avere la tua Tessera QR sempre pronta sul tuo schermo.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {gameState.players.map((p) => (
                <PlayerQRCard
                  key={p.id}
                  player={p}
                  compact
                  onSelect={(chosen) => setMyDevicePlayerId(chosen.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-[#081220]/95 backdrop-blur-md border-b border-amber-400/35 px-3 sm:px-6 py-2.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c85a32] to-[#78350f] border border-amber-400/70 flex items-center justify-center">
              <KhatamStarSVG className="w-5 h-5" color="#fde68a" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-oriental font-black text-xs sm:text-sm tracking-wider text-amber-200">
                  MONOPOLY TUNISIA
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-[#0066b2]/30 border border-amber-400/50 text-amber-300 font-mono text-[11px] font-bold">
                  {gameState.roomCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {gameMode === 'online' ? (
                  <>
                    Il tuo telefono: <strong className="text-amber-300">{devicePlayer.name}</strong> ({devicePlayer.balance.toLocaleString('it-IT')} TND)
                  </>
                ) : (
                  <>
                    Turno: <strong className="text-amber-300">{currentPlayer.name}</strong> ({currentPlayer.balance.toLocaleString('it-IT')} TND)
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() =>
                setFullscreenQRState({
                  player: devicePlayer,
                  paymentContext: null,
                  onOpenScannerForReceiver: null,
                  onDirectConfirmSinglePhone: null,
                })
              }
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Mostra Mio QR</span>
            </button>

            <button
              onClick={() =>
                requestQRTransaction({
                  playerToScanId: null,
                  title: 'Scansiona QR per Incassare',
                  description: `Inquadra con la fotocamera il QR Code ingrandito sul telefono del giocatore che ti sta pagando.`,
                  amountBadge: 'Incasso QR',
                  autoStartCamera: true,
                  onVerified: (scannedPayer) => {
                    setTransferFrom(scannedPayer.id);
                    setTransferTo(devicePlayer.id);
                    setActiveTab('bank');
                  },
                })
              }
              className="p-2 rounded-xl bg-[#0066b2]/30 hover:bg-[#0066b2]/50 border border-sky-400/50 text-sky-200 transition"
              title="Apri Fotocamera per scansionare il telefono di un altro giocatore"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-[#0e1f36] border border-amber-400/30 text-amber-300 hover:border-amber-300"
              aria-label="Audio"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setScreen('menu')}
              className="px-2.5 py-2 rounded-xl bg-[#0e1f36] hover:bg-red-950/60 border border-slate-700 hover:border-red-400/50 text-xs text-slate-300 hover:text-red-200 transition"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <div className="bg-[#0b182b]/85 border-b border-amber-400/20 px-3 sm:px-6 py-2.5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5 min-w-max">
          {gameState.players.map((p, idx) => {
            const tok = TUNISIAN_TOKENS.find((t) => t.id === p.tokenId) || TUNISIAN_TOKENS[0];
            const isTurn = idx === gameState.currentPlayerIndex;
            return (
              <button
                key={p.id}
                onClick={() =>
                  setFullscreenQRState({
                    player: p,
                    paymentContext: null,
                    onOpenScannerForReceiver: null,
                    onDirectConfirmSinglePhone: null,
                  })
                }
                title="Tocca per ingrandire il QR Code di questo giocatore"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition ${
                  p.bankrupt
                    ? 'opacity-40 bg-slate-950 border-slate-800 grayscale'
                    : isTurn
                    ? 'bg-gradient-to-r from-amber-500/25 via-[#0066b2]/25 to-amber-500/10 border-amber-400 shadow-md shadow-amber-500/15'
                    : 'bg-[#081220]/90 border-amber-400/20 hover:border-amber-400/50'
                }`}
              >
                <span className="text-xl drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]">{tok.emoji}</span>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-amber-50">{p.name}</span>
                    {isTurn && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />}
                  </div>
                  <div className="text-xs font-black text-amber-300">{p.balance.toLocaleString('it-IT')} TND</div>
                </div>
                <QrCode className="w-3.5 h-3.5 text-amber-300/75 ml-1" />
              </button>
            );
          })}
        </div>
      </div>

      <nav className="bg-[#081220]/95 border-b border-amber-400/25 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2">
          {[
            { id: 'board', label: 'Tabellone Tunisia', icon: Compass },
            { id: 'bank', label: 'Pagamenti & Fotocamera', icon: ArrowRightLeft },
            { id: 'properties', label: 'Proprietà & Affitti', icon: Building2 },
            { id: 'cards', label: 'Tessere QR Ingrandibili', icon: QrCode },
            { id: 'history', label: 'Registro', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                  active
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] text-slate-950 shadow-md shadow-amber-500/25'
                    : 'text-amber-100/75 hover:text-white hover:bg-[#0e1f36]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {winnerPlayer && (
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-[#d4af37] via-[#f6dc7a] to-[#c85a32] text-slate-950 shadow-2xl border-2 border-white/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Trophy className="w-12 h-12 shrink-0" />
              <div>
                <div className="font-oriental text-xs font-black uppercase tracking-widest">
                  Sultano & Magnate di Tunisia!
                </div>
                <h2 className="font-serif-luxury text-2xl sm:text-3xl font-black">{winnerPlayer.name} trionfa!</h2>
                <p className="text-sm font-bold opacity-90">
                  Tesoro finale: {winnerPlayer.balance.toLocaleString('it-IT')} TND
                </p>
              </div>
            </div>
            <button
              onClick={() => setScreen('menu')}
              className="px-5 py-3 rounded-2xl bg-[#081220] text-amber-300 border border-amber-400 font-extrabold text-sm shadow-lg"
            >
              Nuova Partita
            </button>
          </div>
        )}

        {/* TAB 1: TABELLONE INTERATTIVO TUNISIA & CONTROLLO TURNO */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-3xl bg-gradient-to-b from-[#0e1f36] to-[#081220] gold-filigree-border moorish-arch-top p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                    <KhatamStarSVG className="w-3.5 h-3.5" /> Turno Attuale
                  </span>
                  <span className="text-xs font-mono text-amber-200/70">Casella #{currentPlayer.position}</span>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentToken.gradient} border border-amber-300/60 flex items-center justify-center text-3xl shadow-lg`}>
                    {currentToken.emoji}
                  </div>
                  <div>
                    <h3 className="font-serif-luxury text-xl font-black text-amber-50">{currentPlayer.name}</h3>
                    <p className="text-xs text-sky-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> {currentSpace.name}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#060e1a] border border-amber-400/30 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {lastDice.map((val, idx) => (
                      <div
                        key={idx}
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFFDF7] to-amber-100 text-[#081220] font-serif-luxury font-black text-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37] ${
                          diceRolling ? 'animate-spin' : ''
                        }`}
                      >
                        {val}
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-amber-200/70">Somma Dadi</div>
                    <div className="font-serif-luxury text-2xl font-black text-amber-300">{lastDice[0] + lastDice[1]}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {!gameState.hasRolledThisTurn ? (
                    <button
                      onClick={handleRollDice}
                      disabled={diceRolling || !!winnerPlayer}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f6dc7a] to-[#c85a32] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
                    >
                      <Dices className="w-5 h-5" />
                      {diceRolling ? 'Lancio in corso...' : 'Lancia i Dadi'}
                    </button>
                  ) : (
                    <button
                      onClick={handleEndTurn}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#008b8b] to-[#0066b2] hover:brightness-110 text-white border border-sky-300/40 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      Passa il Turno <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  {(currentSpace.type === 'property' ||
                    currentSpace.type === 'station' ||
                    currentSpace.type === 'utility' ||
                    currentSpace.type === 'tax') && (
                    <button
                      onClick={() => setLandedSpaceModal(currentSpace)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0e1f36] hover:bg-[#152d4d] text-amber-300 font-bold text-xs border border-amber-400/35 transition"
                    >
                      Apri Contratto Tappa ({currentSpace.name})
                    </button>
                  )}

                  {currentPlayer.inJail && (
                    <button
                      onClick={() => {
                        requestQRTransaction({
                          playerToScanId: currentPlayer.id,
                          title: 'Cauzione Prigione',
                          description: `Scansiona la tessera QR di ${currentPlayer.name} per pagare 50 TND ed uscire subito di prigione.`,
                          amountBadge: '-50 TND',
                          onVerified: () => {
                            commitGameState((prev) => {
                              const players = prev.players.map((p) =>
                                p.id === currentPlayer.id
                                  ? { ...p, balance: p.balance - 50, inJail: false, jailTurns: 0 }
                                  : p
                              );
                              return {
                                ...prev,
                                players,
                                transactions: appendTx(
                                  prev,
                                  `🔓 ${currentPlayer.name} paga 50 TND ed esce di Prigione.`,
                                  'payment'
                                ),
                              };
                            });
                          },
                        });
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ShieldAlert className="w-4 h-4" /> Paga Cauzione 50 TND (QR)
                    </button>
                  )}
                </div>
              </div>

              <PlayerQRCard
                player={devicePlayer}
                onExpandQR={(pl) =>
                  setFullscreenQRState({
                    player: pl,
                    paymentContext: null,
                    onOpenScannerForReceiver: null,
                    onDirectConfirmSinglePhone: null,
                  })
                }
              />
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-3xl bg-[#0b182b]/95 gold-filigree-border p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-400/25">
                  <div className="flex items-center gap-3">
                    <KhatamStarSVG className="w-8 h-8 shrink-0" />
                    <div>
                      <h3 className="font-oriental font-black text-sm sm:text-base text-amber-200 tracking-wide">
                        تونس • ROTTA CAROVANIERA (40 TAPPE)
                      </h3>
                      <p className="text-xs text-slate-300">
                        Tocca una tappa per ispezionare il contratto, acquistare o riscuotere affitti via QR
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      requestQRTransaction({
                        playerToScanId: currentPlayer.id,
                        title: 'Passaggio da Bab El Bhar (VIA!)',
                        description: `Scansiona la tessera QR di ${currentPlayer.name} per accreditare 200 TND.`,
                        amountBadge: '+200 TND',
                        onVerified: () =>
                          executeVerifiedTransfer({
                            fromId: 'BANK',
                            toId: currentPlayer.id,
                            amount: 200,
                            reason: 'Passaggio dal VIA!',
                          }),
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-amber-400/50 text-amber-200 font-extrabold text-xs shrink-0"
                  >
                    +200 TND Bab El Bhar
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[68vh] overflow-y-auto pr-1">
                  {BOARD_SPACES.map((space) => {
                    const groupInfo = space.group ? COLOR_GROUPS[space.group] : null;
                    const own = gameState.ownership[space.id];
                    const owner = own ? gameState.players.find((p) => p.id === own.ownerId) : null;
                    const ownerTok = owner ? TUNISIAN_TOKENS.find((t) => t.id === owner.tokenId) : null;
                    const playersHere = gameState.players.filter((p) => !p.bankrupt && p.position === space.id);

                    return (
                      <button
                        key={space.id}
                        onClick={() => {
                          if (
                            space.type === 'property' ||
                            space.type === 'station' ||
                            space.type === 'utility' ||
                            space.type === 'tax'
                          ) {
                            setLandedSpaceModal(space);
                          } else {
                            setSelectedPropertyDetail(space);
                          }
                        }}
                        className={`relative rounded-2xl moorish-arch-top bg-[#07101d] border text-left overflow-hidden flex flex-col justify-between min-h-[108px] transition hover:scale-[1.02] ${
                          playersHere.some((p) => p.id === currentPlayer.id)
                            ? 'border-amber-300 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/15'
                            : 'border-amber-400/20 hover:border-amber-400/60'
                        }`}
                      >
                        {groupInfo ? (
                          <div className={`h-4 w-full ${groupInfo.bg} border-b border-amber-300/30`} />
                        ) : (
                          <div className="h-4 w-full bg-gradient-to-r from-[#0e1f36] via-[#0066b2]/40 to-[#0e1f36] border-b border-amber-400/20" />
                        )}

                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-amber-200/60 font-mono">
                              <span>#{space.id}</span>
                              {space.price && <span className="text-amber-300 font-bold">{space.price} TND</span>}
                              {space.amount && <span className="text-red-400 font-bold">-{space.amount} TND</span>}
                            </div>
                            <div className="font-serif-luxury font-bold text-xs text-amber-50 leading-snug mt-0.5 line-clamp-2">
                              {space.name}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-1">
                            {owner ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0e1f36] border border-amber-400/30 text-[10px] font-bold text-amber-200 truncate">
                                <span>{ownerTok?.emoji}</span>
                                <span className="truncate">{owner.name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                {space.price ? 'Libera' : space.type.toUpperCase()}
                              </span>
                            )}

                            {own && own.houses > 0 && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                {own.houses === 5 ? '🕌' : `🏠×${own.houses}`}
                              </span>
                            )}
                          </div>

                          {playersHere.length > 0 && (
                            <div className="mt-1.5 pt-1 border-t border-amber-400/15 flex flex-wrap gap-1">
                              {playersHere.map((ph) => {
                                const t = TUNISIAN_TOKENS.find((tk) => tk.id === ph.tokenId);
                                return (
                                  <span
                                    key={ph.id}
                                    title={ph.name}
                                    className="text-sm bg-[#0e1f36] border border-amber-400/40 rounded-md px-1 shadow"
                                  >
                                    {t?.emoji}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BANCA DIGITALE & PAGAMENTI SMARTPHONE-TO-SMARTPHONE */}
        {activeTab === 'bank' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-3xl bg-[#0b182b]/95 gold-filigree-border moorish-arch-top p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#c85a32] flex items-center justify-center text-slate-950 shadow-lg border border-amber-200">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif-luxury text-xl sm:text-2xl font-black text-amber-50">
                    Trasferimento & Scansione QR
                  </h2>
                  <p className="text-xs text-slate-300">
                    Per pagare un altro giocatore, mostra il QR ingrandito sul telefono del pagante e inquadralo con la fotocamera!
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/85 mb-1.5">
                    Da (Chi Paga)
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[#07101d] border border-amber-400/35 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="BANK">🏛️ Banque Centrale de Tunisie (Banca)</option>
                    {gameState.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {TUNISIAN_TOKENS.find((t) => t.id === p.tokenId)?.emoji} {p.name} — Saldo: {p.balance} TND (
                        {p.cardCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/85 mb-1.5">
                    A (Chi Riceve)
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[#07101d] border border-amber-400/35 text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- Seleziona Beneficiario --</option>
                    <option value="BANK">🏛️ Banque Centrale de Tunisie (Banca)</option>
                    {gameState.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {TUNISIAN_TOKENS.find((t) => t.id === p.tokenId)?.emoji} {p.name} — Saldo: {p.balance} TND (
                        {p.cardCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-300/85 mb-1.5">
                    Importo (Dinari Tunisini - TND)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-[#07101d] border border-amber-400/60 font-serif-luxury text-2xl font-black text-amber-300 focus:outline-none focus:border-amber-300"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-amber-400/70">TND</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 mt-2.5">
                    {[20, 50, 100, 200, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTransferAmount(String(val))}
                        className="py-2 rounded-xl bg-[#07101d] hover:bg-[#0e1f36] border border-amber-400/25 text-xs font-extrabold text-amber-200 transition"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Causale (es. Affitto Sidi Bou Said, Spese locale...)"
                    className="w-full p-3 rounded-xl bg-[#07101d] border border-amber-400/25 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="button"
                  disabled={!transferTo || transferFrom === transferTo || Number(transferAmount) <= 0}
                  onClick={() => {
                    const amt = Number(transferAmount);
                    const note = transferNote || 'Trasferimento tra giocatori';

                    if (transferFrom !== 'BANK' && transferTo !== 'BANK') {
                      const payerObj = gameState.players.find((p) => p.id === transferFrom);
                      const receiverObj = gameState.players.find((p) => p.id === transferTo);
                      if (!payerObj || !receiverObj) return;
                      setTransferNote('');
                      initiatePlayerToPlayerQRPayment({
                        payer: payerObj,
                        receiver: receiverObj,
                        amount: amt,
                        reason: note,
                      });
                      return;
                    }

                    const playerToScan = transferFrom !== 'BANK' ? transferFrom : transferTo;
                    const targetObj = gameState.players.find((p) => p.id === playerToScan);
                    requestQRTransaction({
                      playerToScanId: playerToScan,
                      title: 'Conferma Operazione Bancaria',
                      description: `Inquadra il QR Code di ${targetObj?.name} per confermare ${amt} TND.`,
                      amountBadge: `${amt} TND`,
                      autoStartCamera: true,
                      onVerified: () => {
                        executeVerifiedTransfer({
                          fromId: transferFrom,
                          toId: transferTo,
                          amount: amt,
                          reason: transferNote,
                          afterCallback: () => setTransferNote(''),
                        });
                      },
                    });
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f6dc7a] to-[#d4af37] hover:brightness-110 disabled:opacity-40 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition"
                >
                  <QrCode className="w-5 h-5" /> Avvia Pagamento QR ({transferAmount || 0} TND)
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl bg-[#0b182b]/95 gold-filigree-border p-5">
                <h3 className="font-serif-luxury font-black text-base text-amber-200 mb-3 flex items-center gap-2">
                  <KhatamStarSVG className="w-4 h-4" /> Azioni Rapide Tesoreria QR
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  <button
                    onClick={() =>
                      requestQRTransaction({
                        playerToScanId: null,
                        title: 'Incassa 200 TND (Bab El Bhar - VIA!)',
                        description: 'Scansiona o tocca la tessera QR del giocatore che varca la Porta della Medina!',
                        amountBadge: '+200 TND',
                        onVerified: (p) =>
                          executeVerifiedTransfer({
                            fromId: 'BANK',
                            toId: p.id,
                            amount: 200,
                            reason: 'Passaggio dal VIA!',
                          }),
                      })
                    }
                    className="p-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-amber-400/40 text-left flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-amber-200">Passaggio da Bab El Bhar (VIA!)</div>
                      <div className="text-xs text-slate-300">Scansiona tessera → +200 TND</div>
                    </div>
                    <QrCode className="w-5 h-5 text-amber-300" />
                  </button>

                  <button
                    onClick={() =>
                      requestQRTransaction({
                        playerToScanId: null,
                        title: 'Tassa del Beylik (200 TND)',
                        description: 'Scansiona la tessera QR del giocatore che versa il tributo.',
                        amountBadge: '-200 TND',
                        onVerified: (p) =>
                          executeVerifiedTransfer({
                            fromId: p.id,
                            toId: 'BANK',
                            amount: 200,
                            reason: 'Tassa del Beylik',
                          }),
                      })
                    }
                    className="p-3.5 rounded-2xl bg-[#c85a32]/20 hover:bg-[#c85a32]/30 border border-[#c85a32]/50 text-left flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-orange-200">Tassa del Beylik</div>
                      <div className="text-xs text-slate-300">Scansiona tessera → -200 TND</div>
                    </div>
                    <QrCode className="w-5 h-5 text-orange-300" />
                  </button>

                  <button
                    onClick={() => {
                      const deck = Math.random() > 0.5 ? 'chance' : 'chest';
                      const cards = deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
                      setDrawnCard({ deck, card: cards[Math.floor(Math.random() * cards.length)] });
                    }}
                    className="p-3.5 rounded-2xl bg-[#0066b2]/25 hover:bg-[#0066b2]/35 border border-sky-400/45 text-left flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-sky-200">Pesca Pergamena Souk / Cartagine</div>
                      <div className="text-xs text-slate-300">Imprevisti & Probabilità reali</div>
                    </div>
                    <Gift className="w-5 h-5 text-sky-300" />
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-[#0b182b]/95 gold-filigree-border p-5">
                <h3 className="font-serif-luxury font-black text-sm text-amber-200 mb-3">Ultimi Sigilli Bancari</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {gameState.transactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="p-2.5 rounded-xl bg-[#07101d] border border-amber-400/15 text-xs">
                      <span className="text-[10px] font-mono text-amber-300/70 mr-2">{tx.time}</span>
                      <span className="text-slate-200">{tx.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONTRATTI, PROPRIETÀ & COSTRUZIONE DAR / KASBAH */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif-luxury text-xl sm:text-2xl font-black text-amber-100">
                Atti di Proprietà della Tunisia
              </h2>
              <p className="text-xs text-slate-300">
                Gestisci possedimenti, vendite dirette, riscossione affitti QR e costruzione di Dar (Case) e Kasbah (Alberghi).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {BOARD_SPACES.filter((s) => s.price).map((space) => {
                const group = COLOR_GROUPS[space.group];
                const own = gameState.ownership[space.id];
                const owner = own ? gameState.players.find((p) => p.id === own.ownerId) : null;
                const currentRent = own ? calculateRent(space, gameState) : space.rent ? space.rent[0] : 0;

                return (
                  <div
                    key={space.id}
                    className="rounded-3xl moorish-arch-top bg-[#0b182b] gold-filigree-border overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className={`px-4 py-3.5 ${group.bg} ${group.text} border-b border-amber-300/30`}>
                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-90">{group.label}</div>
                        <h3 className="font-serif-luxury font-black text-base leading-tight mt-0.5">{space.name}</h3>
                      </div>

                      <div className="p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Valore Atto:</span>
                          <span className="font-extrabold text-amber-300">{space.price} TND</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rendita Attuale:</span>
                          <span className="font-extrabold text-emerald-400">
                            {space.type === 'utility' && !own ? '4× o 10× Dadi' : `${currentRent} TND`}
                          </span>
                        </div>

                        {space.houseCost && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Costo Dar / Kasbah:</span>
                            <span className="font-bold text-amber-100">{space.houseCost} TND</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-amber-400/20 flex items-center justify-between">
                          <span className="text-slate-400">Proprietario:</span>
                          {owner ? (
                            <span className="font-extrabold text-amber-200 flex items-center gap-1">
                              {TUNISIAN_TOKENS.find((t) => t.id === owner.tokenId)?.emoji} {owner.name}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">Disponibile</span>
                          )}
                        </div>

                        {own && space.type === 'property' && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Dimore:</span>
                            <span className="font-bold text-amber-300">
                              {own.houses === 0
                                ? 'Nessuna'
                                : own.houses === 5
                                ? '🕌 1 Kasbah Reale'
                                : `🏠 ${own.houses} Dar`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-[#07101d] border-t border-amber-400/20 flex flex-col gap-2">
                      {!owner ? (
                        <button
                          onClick={() => {
                            requestQRTransaction({
                              playerToScanId: null,
                              title: `Acquista ${space.name}`,
                              description: `Inquadra il QR Code dell'acquirente per ${space.name} (${space.price} TND).`,
                              amountBadge: `-${space.price} TND`,
                              autoStartCamera: true,
                              onVerified: (buyer) => {
                                if (buyer.balance < space.price) return;
                                commitGameState((prev) => ({
                                  ...prev,
                                  players: prev.players.map((p) =>
                                    p.id === buyer.id ? { ...p, balance: p.balance - space.price } : p
                                  ),
                                  ownership: {
                                    ...prev.ownership,
                                    [space.id]: { ownerId: buyer.id, houses: 0, mortgaged: false },
                                  },
                                  transactions: appendTx(
                                    prev,
                                    `🏛️ ${buyer.name} acquisisce ${space.name} per ${space.price} TND.`,
                                    'payment'
                                  ),
                                }));
                                sfx.coin();
                              },
                            });
                          }}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Acquista Locale (QR)
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const rentAmt = calculateRent(space, gameState);
                              requestQRTransaction({
                                playerToScanId: null,
                                title: `${owner.name}: Incassa Affitto (${space.name})`,
                                description: `Inquadra con la fotocamera il QR Code ingrandito sul telefono del giocatore che paga ${rentAmt} TND.`,
                                amountBadge: `+${rentAmt} TND → ${owner.name}`,
                                autoStartCamera: true,
                                onVerified: (tenant) => {
                                  if (tenant.id === owner.id) return;
                                  executeVerifiedTransfer({
                                    fromId: tenant.id,
                                    toId: owner.id,
                                    amount: rentAmt,
                                    reason: `Affitto ${space.name}`,
                                  });
                                },
                              });
                            }}
                            className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" /> Scansiona & Incassa ({currentRent} TND)
                          </button>

                          {space.type === 'property' && own.houses < 5 && (
                            <button
                              onClick={() => handleBuildHouse(space)}
                              className="w-full py-2 rounded-xl bg-[#0e1f36] hover:bg-[#152d4d] border border-amber-400/35 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                              <Home className="w-3.5 h-3.5" />
                              {own.houses === 4 ? `Edifica Kasbah (${space.houseCost} TND)` : `Edifica Dar (${space.houseCost} TND)`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: LE TESSERE QR INGRANDIBILI DEI GIOCATORI */}
        {activeTab === 'cards' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b182b] gold-filigree-border p-5 rounded-3xl">
              <div>
                <h2 className="font-serif-luxury text-xl sm:text-2xl font-black text-amber-100 flex items-center gap-2">
                  <Maximize2 className="w-6 h-6 text-amber-400" /> Tessere QR Ingrandibili su Smartphone
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Tocca una tessera per <strong>ingrandire il QR Code a schermo intero</strong> ad alto contrasto, così l’altro giocatore può scansionarlo facilmente con la fotocamera del suo telefono!
                </p>
              </div>
              <button
                onClick={() =>
                  setFullscreenQRState({
                    player: devicePlayer,
                    paymentContext: null,
                    onOpenScannerForReceiver: null,
                    onDirectConfirmSinglePhone: null,
                  })
                }
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 shadow-lg"
              >
                <Maximize2 className="w-4 h-4" /> Ingrandisci Mio QR ({devicePlayer.name})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {gameState.players.map((p) => (
                <PlayerQRCard
                  key={p.id}
                  player={p}
                  onExpandQR={(pl) =>
                    setFullscreenQRState({
                      player: pl,
                      paymentContext: null,
                      onOpenScannerForReceiver: null,
                      onDirectConfirmSinglePhone: null,
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: REGISTRO STORICO MOVIMENTI BANCARI */}
        {activeTab === 'history' && (
          <div className="max-w-3xl mx-auto rounded-3xl bg-[#0b182b] gold-filigree-border p-5 sm:p-6">
            <h2 className="font-serif-luxury text-xl font-black text-amber-100 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" /> Registro Ufficiale dei Sigilli Bancari
            </h2>
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {gameState.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-[#07101d] border border-amber-400/20 flex items-start gap-3 text-xs sm:text-sm"
                >
                  <span className="font-mono text-[11px] text-amber-300/80 bg-[#0e1f36] px-2 py-0.5 rounded border border-amber-400/25 shrink-0">
                    {tx.time}
                  </span>
                  <span className="text-slate-200">{tx.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALE 0: TESSERA QR INGRANDITA A SCHERMO INTERO */}
      <FullscreenQRModal
        player={fullscreenQRState.player}
        paymentContext={fullscreenQRState.paymentContext}
        onOpenScannerForReceiver={fullscreenQRState.onOpenScannerForReceiver}
        onDirectConfirmSinglePhone={fullscreenQRState.onDirectConfirmSinglePhone}
        onClose={() =>
          setFullscreenQRState({
            player: null,
            paymentContext: null,
            onOpenScannerForReceiver: null,
            onDirectConfirmSinglePhone: null,
          })
        }
      />

      {/* MODALE 1: SCANNER QR CODE & SIMULATORE TESSERA */}
      <QRScannerModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal((m) => ({ ...m, isOpen: false }))}
        players={gameState.players}
        expectedPlayerId={qrModal.expectedPlayerId}
        actionTitle={qrModal.actionTitle}
        actionDescription={qrModal.actionDescription}
        amountBadge={qrModal.amountBadge}
        autoStartCamera={qrModal.autoStartCamera}
        onVerified={qrModal.onVerified}
      />

      {/* MODALE 2: AZIONE CASELLA (ACQUISTO O PAGAMENTO AFFITTO CON QR INGRANDITO + FOTOCAMERA) */}
      {landedSpaceModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#040a14]/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl moorish-arch-top bg-[#0b182b] gold-filigree-border overflow-hidden">
            {landedSpaceModal.group && (
              <div className={`h-5 w-full ${COLOR_GROUPS[landedSpaceModal.group].bg} border-b border-amber-300/35`} />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-amber-300 font-bold">
                    {landedSpaceModal.group ? COLOR_GROUPS[landedSpaceModal.group].label : 'Tappa Speciale'}
                  </span>
                  <h3 className="font-serif-luxury text-2xl font-black text-amber-50 mt-0.5">
                    {landedSpaceModal.name}
                  </h3>
                </div>
                <button
                  onClick={() => setLandedSpaceModal(null)}
                  className="p-2 rounded-xl bg-slate-900 text-amber-200 hover:text-white border border-amber-400/25"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {landedSpaceModal.type === 'tax' && (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-slate-300">{landedSpaceModal.desc}</p>
                  <button
                    onClick={() => {
                      const amt = landedSpaceModal.amount;
                      const spaceName = landedSpaceModal.name;
                      setLandedSpaceModal(null);
                      requestQRTransaction({
                        playerToScanId: currentPlayer.id,
                        title: spaceName,
                        description: `Scansiona la tessera QR di ${currentPlayer.name} per versare ${amt} TND alla Banca.`,
                        amountBadge: `-${amt} TND`,
                        onVerified: () =>
                          executeVerifiedTransfer({
                            fromId: currentPlayer.id,
                            toId: 'BANK',
                            amount: amt,
                            reason: spaceName,
                          }),
                      });
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#c85a32] to-red-700 hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" /> Versa {landedSpaceModal.amount} TND con Tessera QR
                  </button>
                </div>
              )}

              {landedSpaceModal.price && (() => {
                const own = gameState.ownership[landedSpaceModal.id];
                const owner = own ? gameState.players.find((p) => p.id === own.ownerId) : null;

                if (!owner) {
                  return (
                    <div className="mt-5 space-y-4">
                      <div className="p-4 rounded-2xl bg-[#07101d] border border-amber-400/30 flex items-center justify-between">
                        <span className="text-sm text-slate-300">Valore Atto Reale:</span>
                        <span className="font-serif-luxury text-2xl font-black text-amber-300">
                          {landedSpaceModal.price} TND
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <button
                          disabled={currentPlayer.balance < landedSpaceModal.price}
                          onClick={() => handleBuyProperty(landedSpaceModal, currentPlayer.id)}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
                        >
                          <QrCode className="w-4 h-4" /> Acquista ({landedSpaceModal.price} TND) con QR
                        </button>

                        <button
                          onClick={() => startAuctionForSpace(landedSpaceModal)}
                          className="w-full py-3 rounded-2xl bg-[#0e1f36] hover:bg-[#152d4d] border border-amber-400/40 text-amber-200 font-extrabold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Gavel className="w-4 h-4 text-amber-400" /> Rifiuta e Bandisci Asta al Souk
                        </button>
                      </div>
                    </div>
                  );
                }

                if (owner.id === currentPlayer.id) {
                  return (
                    <div className="mt-5 space-y-4">
                      <p className="text-sm text-amber-200 font-semibold">
                        Questa tenuta appartiene già al tuo casato! Riposa all’ombra delle palme.
                      </p>
                      <button
                        onClick={() => setLandedSpaceModal(null)}
                        className="w-full py-3 rounded-2xl bg-[#0e1f36] border border-amber-400/35 text-white font-bold text-sm"
                      >
                        Chiudi
                      </button>
                    </div>
                  );
                }

                const rentToPay = calculateRent(landedSpaceModal, gameState);
                return (
                  <div className="mt-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-[#07101d] border border-amber-400/30 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Proprietario Locale:</span>
                        <span className="font-extrabold text-amber-200">{owner.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-300">Affitto / Spesa dovuta:</span>
                        <span className="font-serif-luxury text-2xl font-black text-red-400">{rentToPay} TND</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        onClick={() => {
                          const targetSpace = landedSpaceModal;
                          setLandedSpaceModal(null);
                          initiatePlayerToPlayerQRPayment({
                            payer: currentPlayer,
                            receiver: owner,
                            amount: rentToPay,
                            reason: `Affitto ${targetSpace.name}`,
                          });
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#f6dc7a] to-[#d4af37] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Maximize2 className="w-4 h-4" /> Ingrandisci Mio QR per Pagare ({rentToPay} TND)
                      </button>

                      <button
                        onClick={() => {
                          const targetSpace = landedSpaceModal;
                          setLandedSpaceModal(null);
                          requestQRTransaction({
                            playerToScanId: currentPlayer.id,
                            title: `${owner.name}: Scansiona QR di ${currentPlayer.name}`,
                            description: `Inquadra con la fotocamera il QR Code ingrandito sul telefono di ${currentPlayer.name} per incassare ${rentToPay} TND.`,
                            amountBadge: `+${rentToPay} TND → ${owner.name}`,
                            autoStartCamera: true,
                            onVerified: () =>
                              executeVerifiedTransfer({
                                fromId: currentPlayer.id,
                                toId: owner.id,
                                amount: rentToPay,
                                reason: `Affitto ${targetSpace.name}`,
                              }),
                          });
                        }}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0066b2] to-[#008b8b] hover:brightness-110 text-white border border-sky-300/45 font-extrabold text-xs flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4 text-amber-300" /> Sono {owner.name}: Apri Fotocamera Scan
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODALE 3: ASTA AL SOUK */}
      {auctionState && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#040a14]/85 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl moorish-arch-top bg-[#0b182b] gold-filigree-border p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gavel className="w-6 h-6 text-amber-400" />
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                    Banditore del Souk
                  </span>
                  <h3 className="font-serif-luxury text-xl font-black text-amber-50">{auctionState.space.name}</h3>
                </div>
              </div>
              <button
                onClick={() => setAuctionState(null)}
                className="p-2 rounded-xl bg-slate-900 text-amber-200 hover:text-white border border-amber-400/25"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#07101d] border border-amber-400/35 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Offerta Attuale</span>
                <span className="font-serif-luxury text-3xl font-black text-amber-300">{auctionState.currentBid} TND</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Miglior Offerente</span>
                <span className="text-sm font-extrabold text-emerald-400">
                  {auctionState.highestBidderId
                    ? gameState.players.find((p) => p.id === auctionState.highestBidderId)?.name
                    : 'Nessuna offerta'}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {gameState.players
                .filter((p) => !p.bankrupt)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#07101d] border border-amber-400/20 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-bold text-amber-50">
                      {TUNISIAN_TOKENS.find((t) => t.id === p.tokenId)?.emoji} {p.name}{' '}
                      <span className="text-xs text-amber-300/70">({p.balance} TND)</span>
                    </span>
                    <div className="flex gap-1.5">
                      {[10, 50].map((inc) => {
                        const nextBid = auctionState.highestBidderId ? auctionState.currentBid + inc : inc;
                        return (
                          <button
                            key={inc}
                            disabled={p.balance < nextBid}
                            onClick={() =>
                              setAuctionState((prev) => ({
                                ...prev,
                                currentBid: nextBid,
                                highestBidderId: p.id,
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-30 text-amber-300 border border-amber-400/35 font-extrabold text-xs"
                          >
                            +{inc}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>

            <button
              disabled={!auctionState.highestBidderId}
              onClick={() => {
                const winner = gameState.players.find((p) => p.id === auctionState.highestBidderId);
                const space = auctionState.space;
                const finalPrice = auctionState.currentBid;
                setAuctionState(null);

                requestQRTransaction({
                  playerToScanId: winner.id,
                  title: `Aggiudicazione Asta: ${space.name}`,
                  description: `Scansiona la tessera QR di ${winner.name} per versare ${finalPrice} TND.`,
                  amountBadge: `-${finalPrice} TND`,
                  onVerified: () => {
                    commitGameState((prev) => ({
                      ...prev,
                      players: prev.players.map((p) =>
                        p.id === winner.id ? { ...p, balance: p.balance - finalPrice } : p
                      ),
                      ownership: {
                        ...prev.ownership,
                        [space.id]: { ownerId: winner.id, houses: 0, mortgaged: false },
                      },
                      transactions: appendTx(
                        prev,
                        `🔨 ${winner.name} si aggiudica ${space.name} all'asta per ${finalPrice} TND!`,
                        'payment'
                      ),
                    }));
                    sfx.coin();
                  },
                });
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" /> Aggiudica & Scansiona Tessera QR
            </button>
          </div>
        </div>
      )}

      {/* MODALE 4: PERGAMENA SORPRESA DEL SOUK / TESORO DI CARTAGINE */}
      {drawnCard && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#040a14]/85 backdrop-blur-md">
          <div
            className={`w-full max-w-md rounded-3xl moorish-arch-top p-6 shadow-2xl border-2 text-white arabesque-card-pattern ${
              drawnCard.deck === 'chance'
                ? 'bg-gradient-to-br from-[#c85a32] via-red-900 to-[#271104] border-amber-300'
                : 'bg-gradient-to-br from-[#0066b2] via-[#0b2747] to-[#081220] border-amber-300'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-200">
              <KhatamStarSVG className="w-4 h-4" color="#fde68a" />
              <span>{drawnCard.deck === 'chance' ? 'Sorpresa del Souk (Imprevisti)' : 'Tesoro di Cartagine (Probabilità)'}</span>
            </div>

            <h3 className="font-serif-luxury text-2xl font-black mt-3 text-amber-50">{drawnCard.card.title}</h3>
            <p className="text-sm sm:text-base mt-3 leading-relaxed bg-[#081220]/55 p-4 rounded-2xl border border-amber-300/30 text-amber-50">
              {drawnCard.card.text}
            </p>

            <button
              onClick={handleApplyDrawnCard}
              className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl"
            >
              <QrCode className="w-4 h-4" /> Sigilla con Tessera QR
            </button>
          </div>
        </div>
      )}

      {/* MODALE 5: DETTAGLIO CASELLA SPECIALE */}
      {selectedPropertyDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#040a14]/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl moorish-arch-top bg-[#0b182b] gold-filigree-border p-6">
            <h3 className="font-serif-luxury text-xl font-black text-amber-100">{selectedPropertyDetail.name}</h3>
            <p className="text-sm text-slate-300 mt-2">{selectedPropertyDetail.desc}</p>
            <button
              onClick={() => setSelectedPropertyDetail(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f6dc7a] text-slate-950 font-extrabold text-sm"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
