import { useState, useEffect, useRef } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend Window interface to include Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    SpeechRecognition: SpeechRecognitionConstructor;
  }
}

// Type definitions for speech recognition settings
interface SpeechRecognitionSettings {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

// Type definitions for custom hook returns and errors
interface SpeechRecognitionError {
  error: string;
  message: string;
}

interface SpeechRecognitionHookReturn {
  transcript: string;
  isListening: boolean;
  error: SpeechRecognitionError | null;
  settings: SpeechRecognitionSettings;
  startListening: () => void;
  stopListening: () => void;
  updateSettings: (newSettings: Partial<SpeechRecognitionSettings>) => void;
}

interface SpeechSynthesisError {
  error: string;
  utterance: SpeechSynthesisUtterance;
  message: string;
}

interface SpeechSynthesisSettings {
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string;
}

interface SpeechSynthesisHookReturn {
  isSpeaking: boolean;
  error: SpeechSynthesisError | null;
  settings: SpeechSynthesisSettings;
  availableVoices: SpeechSynthesisVoice[];
  speak: (text: string, customSettings?: Partial<SpeechSynthesisSettings>) => void;
  stopSpeaking: () => void;
  updateSettings: (newSettings: Partial<SpeechSynthesisSettings>) => void;
}

/**
 * Custom hook for Web Speech Recognition.
 * Provides functions to start/stop recognition and state for results and errors.
 */
export const useSpeechRecognition = (initialSettings?: Partial<SpeechRecognitionSettings>): SpeechRecognitionHookReturn => {
  // Default settings
  const defaultSettings: SpeechRecognitionSettings = {
    lang: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
  };

  // State for settings
  const [settings, setSettings] = useState<SpeechRecognitionSettings>({
    ...defaultSettings,
    ...initialSettings,
  });

  // State to hold the final, accumulated transcript parts
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  // State to hold the current, ephemeral interim transcript part
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  // State to indicate if recognition is active
  const [isListening, setIsListening] = useState<boolean>(false);
  // State to hold any errors during recognition
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  // useRef to keep a mutable reference to the SpeechRecognition instance
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // useRef to hold the latest interim transcript for use in the onend handler
  const latestInterimRef = useRef<string>('');

  useEffect(() => {
    // Check if the Web Speech API is supported by the browser
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError({ error: 'BrowserNotSupported', message: 'Web Speech API is not supported by your browser.' });
      return;
    }

    // Get the SpeechRecognition constructor
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    // Configure the recognition instance with current settings
    recognitionRef.current.continuous = settings.continuous;
    recognitionRef.current.interimResults = settings.interimResults;
    recognitionRef.current.lang = settings.lang;
    recognitionRef.current.maxAlternatives = settings.maxAlternatives;

    // Event handler for when a result is received
    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let currentSessionInterim = '';
      let currentSessionFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          currentSessionFinal += transcriptPart + ' ';
        } else {
          currentSessionInterim += transcriptPart;
        }
      }

      setFinalTranscript(prev => (prev + currentSessionFinal).trim());
      setInterimTranscript(currentSessionInterim.trim());
      latestInterimRef.current = currentSessionInterim.trim();

      setError(null);
    };

    // Event handler for when recognition starts
    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
      setFinalTranscript('');
      setInterimTranscript('');
      latestInterimRef.current = '';
      console.log('Speech recognition started');
    };

    // Event handler for when recognition ends
    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (latestInterimRef.current) {
        setFinalTranscript(prev => (prev + ' ' + latestInterimRef.current).trim());
      }
      setInterimTranscript('');
      latestInterimRef.current = '';
      console.log('Speech recognition ended');
    };

    // Event handler for errors during recognition
    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setError({ error: event.error, message: event.message || 'An unknown speech recognition error occurred.' });
      console.error('Speech recognition error:', event);
      setFinalTranscript('');
      setInterimTranscript('');
      latestInterimRef.current = '';
    };

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [settings]); // Re-run effect when settings change

  /**
   * Starts speech recognition.
   */
  const startListening = (): void => {
    if (recognitionRef.current && !isListening) {
      try {
        setFinalTranscript('');
        setInterimTranscript('');
        latestInterimRef.current = '';
        setError(null);
        recognitionRef.current.start();
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Recognition is already in progress or failed to start.';
        setError({ error: 'RecognitionInProgress', message: errorMessage });
        console.error('Error starting recognition:', e);
      }
    } else if (isListening) {
      setError({ error: 'AlreadyListening', message: 'Recognition is already active.' });
    } else {
      setError({ error: 'NotInitialized', message: 'Speech Recognition not initialized. Browser might not support it.' });
    }
  };

  /**
   * Stops speech recognition.
   */
  const stopListening = (): void => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  /**
   * Updates speech recognition settings.
   */
  const updateSettings = (newSettings: Partial<SpeechRecognitionSettings>): void => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    transcript: (finalTranscript + ' ' + interimTranscript).trim(),
    isListening,
    error,
    settings,
    startListening,
    stopListening,
    updateSettings,
  };
};

/**
 * Custom hook for Web Speech Synthesis (Text-to-Speech).
 * Provides a function to speak text with configurable settings.
 */
export const useSpeechSynthesis = (initialSettings?: Partial<SpeechSynthesisSettings>): SpeechSynthesisHookReturn => {
  // Default settings
  const defaultSettings: SpeechSynthesisSettings = {
    lang: 'en-US',
    rate: 0.8,
    pitch: 1.0,
    volume: 1.0,
  };

  // State for settings
  const [settings, setSettings] = useState<SpeechSynthesisSettings>({
    ...defaultSettings,
    ...initialSettings,
  });

  const [error, setError] = useState<SpeechSynthesisError | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setError({
        error: 'BrowserNotSupported',
        utterance: new SpeechSynthesisUtterance(),
        message: 'Web Speech Synthesis API is not supported by your browser.'
      });
      return;
    }

    // Load available voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const handleEnd = (): void => {
      setIsSpeaking(false);
    };

    const handleError = (event: Event): void => {
      const errorEvent = event as SpeechSynthesisErrorEvent;
      setError({
        error: (errorEvent as any).error,
        utterance: (errorEvent as any).utterance,
        message: (errorEvent as any).error || 'Speech synthesis error occurred'
      });
      setIsSpeaking(false);
      console.error('Speech synthesis error:', errorEvent);
    };

    window.speechSynthesis.addEventListener('end', handleEnd);
    window.speechSynthesis.addEventListener('error', handleError);

    return () => {
      window.speechSynthesis.removeEventListener('end', handleEnd);
      window.speechSynthesis.removeEventListener('error', handleError);
    };
  }, []);

  const speak = (text: string, customSettings?: Partial<SpeechSynthesisSettings>): void => {
    if (!('speechSynthesis' in window) || !text) {
      setError({
        error: 'UnsupportedOrNoText',
        utterance: new SpeechSynthesisUtterance(),
        message: 'Speech Synthesis is not supported or no text provided.'
      });
      return;
    }

    const finalSettings = { ...settings, ...customSettings };
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = finalSettings.lang;
    utterance.rate = Math.max(0.1, Math.min(10, finalSettings.rate));
    utterance.pitch = Math.max(0, Math.min(2, finalSettings.pitch));
    utterance.volume = Math.max(0, Math.min(1, finalSettings.volume));

    if (finalSettings.voiceName) {
      const selectedVoice = availableVoices.find(
        (voice) => voice.name === finalSettings.voiceName && voice.lang === finalSettings.lang
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        console.warn(`Voice "${finalSettings.voiceName}" not found for language "${finalSettings.lang}". Using default voice.`);
      }
    } else {
      const defaultVoice = availableVoices.find(
        (voice) => voice.lang === finalSettings.lang && voice.default
      );
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      }
    }

    utterance.onend = () => setIsSpeaking(false);

    setIsSpeaking(true);
    setError(null);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = (): void => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  /**
   * Updates speech synthesis settings.
   */
  const updateSettings = (newSettings: Partial<SpeechSynthesisSettings>): void => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    isSpeaking,
    error,
    settings,
    availableVoices,
    speak,
    stopSpeaking,
    updateSettings,
  };
};


// recognitionLanguages
export const languageCategories = {
  '🇺🇸 English': [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-AU', name: 'English (Australia)' },
    { code: 'en-CA', name: 'English (Canada)' },
    { code: 'en-IN', name: 'English (India)' },
    { code: 'en-NZ', name: 'English (New Zealand)' },
    { code: 'en-ZA', name: 'English (South Africa)' },
  ],
  '🇪🇸 Spanish': [
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'es-AR', name: 'Spanish (Argentina)' },
    { code: 'es-CL', name: 'Spanish (Chile)' },
    { code: 'es-CO', name: 'Spanish (Colombia)' },
    { code: 'es-CR', name: 'Spanish (Costa Rica)' },
    { code: 'es-PE', name: 'Spanish (Peru)' },
    { code: 'es-VE', name: 'Spanish (Venezuela)' },
  ],
  '🇫🇷 French': [
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'fr-CA', name: 'French (Canada)' },
    { code: 'fr-BE', name: 'French (Belgium)' },
    { code: 'fr-CH', name: 'French (Switzerland)' },
  ],
  '🇩🇪 German': [
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'de-AT', name: 'German (Austria)' },
    { code: 'de-CH', name: 'German (Switzerland)' },
  ],
  '🇮🇹 Italian': [
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'it-CH', name: 'Italian (Switzerland)' },
  ],
  '🇧🇷 Portuguese': [
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  ],
  '🇷🇺 Russian': [
    { code: 'ru-RU', name: 'Russian (Russia)' },
  ],
  '🇳🇱 Dutch': [
    { code: 'nl-NL', name: 'Dutch (Netherlands)' },
    { code: 'nl-BE', name: 'Dutch (Belgium)' },
  ],
  '🌏 East Asian': [
    { code: 'zh-CN', name: 'Chinese (Mandarin, China)' },
    { code: 'zh-TW', name: 'Chinese (Traditional, Taiwan)' },
    { code: 'zh-HK', name: 'Chinese (Cantonese, Hong Kong)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'ko-KR', name: 'Korean (South Korea)' },
  ],
  '🌴 Southeast Asian': [
    { code: 'id-ID', name: 'Indonesian (Indonesia)' },
    { code: 'ms-MY', name: 'Malay (Malaysia)' },
    { code: 'th-TH', name: 'Thai (Thailand)' },
    { code: 'vi-VN', name: 'Vietnamese (Vietnam)' },
    { code: 'fil-PH', name: 'Filipino/Tagalog (Philippines)' },
    { code: 'tl-PH', name: 'Tagalog (Philippines)' },
    { code: 'my-MM', name: 'Burmese (Myanmar)' },
    { code: 'km-KH', name: 'Khmer (Cambodia)' },
    { code: 'lo-LA', name: 'Lao (Laos)' },
  ],
  '🇮🇳 Indian Subcontinent': [
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'bn-BD', name: 'Bengali (Bangladesh)' },
    { code: 'bn-IN', name: 'Bengali (India)' },
    { code: 'ta-IN', name: 'Tamil (India)' },
    { code: 'te-IN', name: 'Telugu (India)' },
    { code: 'mr-IN', name: 'Marathi (India)' },
    { code: 'gu-IN', name: 'Gujarati (India)' },
    { code: 'kn-IN', name: 'Kannada (India)' },
    { code: 'ml-IN', name: 'Malayalam (India)' },
    { code: 'pa-IN', name: 'Punjabi (India)' },
    { code: 'or-IN', name: 'Odia (India)' },
    { code: 'as-IN', name: 'Assamese (India)' },
    { code: 'ur-PK', name: 'Urdu (Pakistan)' },
    { code: 'ur-IN', name: 'Urdu (India)' },
    { code: 'ne-NP', name: 'Nepali (Nepal)' },
    { code: 'si-LK', name: 'Sinhala (Sri Lanka)' },
  ],
  '🕌 Middle Eastern': [
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'ar-EG', name: 'Arabic (Egypt)' },
    { code: 'ar-AE', name: 'Arabic (UAE)' },
    { code: 'ar-JO', name: 'Arabic (Jordan)' },
    { code: 'ar-LB', name: 'Arabic (Lebanon)' },
    { code: 'fa-IR', name: 'Persian/Farsi (Iran)' },
    { code: 'he-IL', name: 'Hebrew (Israel)' },
    { code: 'tr-TR', name: 'Turkish (Turkey)' },
  ],
  '🌍 African': [
    { code: 'sw-KE', name: 'Swahili (Kenya)' },
    { code: 'sw-TZ', name: 'Swahili (Tanzania)' },
    { code: 'af-ZA', name: 'Afrikaans (South Africa)' },
    { code: 'am-ET', name: 'Amharic (Ethiopia)' },
    { code: 'zu-ZA', name: 'Zulu (South Africa)' },
    { code: 'xh-ZA', name: 'Xhosa (South Africa)' },
  ],
  '❄️ Nordic': [
    { code: 'sv-SE', name: 'Swedish (Sweden)' },
    { code: 'no-NO', name: 'Norwegian (Norway)' },
    { code: 'da-DK', name: 'Danish (Denmark)' },
    { code: 'fi-FI', name: 'Finnish (Finland)' },
    { code: 'is-IS', name: 'Icelandic (Iceland)' },
  ],
  '🏰 Central & Eastern European': [
    { code: 'pl-PL', name: 'Polish (Poland)' },
    { code: 'cs-CZ', name: 'Czech (Czech Republic)' },
    { code: 'sk-SK', name: 'Slovak (Slovakia)' },
    { code: 'hu-HU', name: 'Hungarian (Hungary)' },
    { code: 'ro-RO', name: 'Romanian (Romania)' },
    { code: 'bg-BG', name: 'Bulgarian (Bulgaria)' },
    { code: 'hr-HR', name: 'Croatian (Croatia)' },
    { code: 'sr-RS', name: 'Serbian (Serbia)' },
    { code: 'sl-SI', name: 'Slovenian (Slovenia)' },
    { code: 'et-EE', name: 'Estonian (Estonia)' },
    { code: 'lv-LV', name: 'Latvian (Latvia)' },
    { code: 'lt-LT', name: 'Lithuanian (Lithuania)' },
    { code: 'mt-MT', name: 'Maltese (Malta)' },
    { code: 'el-GR', name: 'Greek (Greece)' },
    { code: 'uk-UA', name: 'Ukrainian (Ukraine)' },
    { code: 'be-BY', name: 'Belarusian (Belarus)' },
  ],
  '🏛️ Regional Languages': [
    { code: 'ca-ES', name: 'Catalan (Spain)' },
    { code: 'eu-ES', name: 'Basque (Spain)' },
    { code: 'gl-ES', name: 'Galician (Spain)' },
    { code: 'cy-GB', name: 'Welsh (UK)' },
    { code: 'ga-IE', name: 'Irish (Ireland)' },
  ],
};