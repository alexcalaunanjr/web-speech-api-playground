// utils.js

import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for Web Speech Recognition.
 * Provides functions to start/stop recognition and state for results and errors.
 */
export const useSpeechRecognition = (lang = 'en-US') => {
  // State to hold the final, accumulated transcript parts (e.g., "hello. how are you?")
  const [finalTranscript, setFinalTranscript] = useState('');
  // State to hold the current, ephemeral interim transcript part (e.g., "I am fine")
  // This part changes rapidly and is not yet confirmed.
  const [interimTranscript, setInterimTranscript] = useState('');
  // State to indicate if recognition is active
  const [isListening, setIsListening] = useState(false);
  // State to hold any errors during recognition
  const [error, setError] = useState(null);

  // useRef to keep a mutable reference to the SpeechRecognition instance.
  // This prevents re-creating the SpeechRecognition object on every render.
  const recognitionRef = useRef(null);
  // useRef to hold the latest interim transcript for use in the onend handler.
  // This ensures onend gets the most current value without re-binding the event listener.
  const latestInterimRef = useRef('');

  useEffect(() => {
    // Check if the Web Speech API is supported by the browser
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError({ error: 'BrowserNotSupported', message: 'Web Speech API is not supported by your browser.' });
      return;
    }

    // Get the SpeechRecognition constructor (prefer webkitSpeechRecognition for broader compatibility)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    // Configure the recognition instance
    recognitionRef.current.continuous = true; // Keep listening even if user pauses
    recognitionRef.current.interimResults = true; // Get interim results as the user speaks
    recognitionRef.current.lang = lang; // Set the language for recognition

    // Event handler for when a result is received
    recognitionRef.current.onresult = (event) => {
      let currentSessionInterim = ''; // Accumulates interim results from *this specific event*
      let currentSessionFinal = '';   // Accumulates final results from *this specific event*

      // Loop through all results received in this event, starting from event.resultIndex.
      // event.resultIndex indicates the first new or changed result.
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        // Get the transcript from the most confident alternative (index 0)
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          currentSessionFinal += transcriptPart + ' '; // Add space for readability
        } else {
          currentSessionInterim += transcriptPart;
        }
      }

      // Update the final transcript state by appending any new final parts.
      // `.trim()` ensures no leading/trailing whitespace.
      setFinalTranscript(prev => (prev + currentSessionFinal).trim());

      // Update the interim transcript state by replacing it with the latest interim part.
      // This is crucial to prevent accumulation like "hellohello".
      setInterimTranscript(currentSessionInterim.trim());
      // Also update the ref with the latest interim value for the onend handler.
      latestInterimRef.current = currentSessionInterim.trim();

      setError(null); // Clear any previous errors on successful result
    };

    // Event handler for when recognition starts
    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
      // Clear all transcripts when starting a new recognition session
      setFinalTranscript('');
      setInterimTranscript('');
      latestInterimRef.current = ''; // Clear the ref as well
      console.log('Speech recognition started');
    };

    // Event handler for when recognition ends
    recognitionRef.current.onend = () => {
      setIsListening(false);
      // If there's any interim transcript left that was never marked final,
      // append it to the final transcript here. This handles edge cases
      // where speech might end abruptly without a final event for the last chunk.
      if (latestInterimRef.current) {
        setFinalTranscript(prev => (prev + ' ' + latestInterimRef.current).trim());
      }
      setInterimTranscript(''); // Clear the interim display
      latestInterimRef.current = ''; // Clear the ref
      console.log('Speech recognition ended');
    };

    // Event handler for errors during recognition
    recognitionRef.current.onerror = (event) => {
      setIsListening(false);
      setError({ error: event.error, message: event.message || 'An unknown speech recognition error occurred.' });
      console.error('Speech recognition error:', event);
      // Clear transcripts on error as the session might be interrupted
      setFinalTranscript('');
      setInterimTranscript('');
      latestInterimRef.current = '';
    };

    // Cleanup function: stop recognition when the component unmounts or language changes
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        // Note: For `onproperty` event handlers (like `onresult`, `onend`),
        // setting them to `null` or re-assigning them in a new `useEffect` instance
        // handles cleanup. Explicit `removeEventListener` is less critical here.
      }
    };
  }, [lang]); // Re-run effect only if the language changes

  /**
   * Starts speech recognition.
   */
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        // Clear all states on explicit start to ensure a fresh session
        setFinalTranscript('');
        setInterimTranscript('');
        latestInterimRef.current = '';
        setError(null);
        recognitionRef.current.start();
      } catch (e) {
        // Catch errors if start() is called multiple times or if already started
        setError({ error: 'RecognitionInProgress', message: e.message || 'Recognition is already in progress or failed to start.' });
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
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  return {
    // Combine final and interim transcripts for display.
    // Interim transcript is the live, changing part; final is the confirmed part.
    transcript: (finalTranscript + ' ' + interimTranscript).trim(),
    isListening,
    error,
    startListening,
    stopListening,
  };
};

/**
 * Custom hook for Web Speech Synthesis (Text-to-Speech).
 * Provides a function to speak text.
 */
export const useSpeechSynthesis = () => {
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setError({
        error: 'BrowserNotSupported',
        utterance: new SpeechSynthesisUtterance(),
        message: 'Web Speech Synthesis API is not supported by your browser.'
      });
      return;
    }

    const handleEnd = () => {
      setIsSpeaking(false);
    };

    const handleError = (event) => {
      setError(event);
      setIsSpeaking(false);
      console.error('Speech synthesis error:', event);
    };

    window.speechSynthesis.addEventListener('end', handleEnd);
    window.speechSynthesis.addEventListener('error', handleError);

    return () => {
      window.speechSynthesis.removeEventListener('end', handleEnd);
      window.speechSynthesis.removeEventListener('error', handleError);
    };
  }, []);

  const speak = (
    text,
    lang = 'en-US',
    voiceName,
    rate = 0.4,
    pitch = 2
  ) => {
    if (!('speechSynthesis' in window) || !text) {
      setError({
        error: 'UnsupportedOrNoText',
        utterance: new SpeechSynthesisUtterance(),
        message: 'Speech Synthesis is not supported or no text provided.'
      });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = Math.max(0.1, Math.min(10, rate));
    utterance.pitch = Math.max(0, Math.min(2, pitch));
    console.log('utterance', utterance);

    const voices = window.speechSynthesis.getVoices();
    if (voiceName) {
      const selectedVoice = voices.find(
        (voice) => voice.name === voiceName && voice.lang === lang
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        console.warn(`Voice "${voiceName}" not found for language "${lang}". Using default voice.`);
      }
    } else {
      const defaultVoice = voices.find(
        (voice) => voice.lang === lang && voice.default
      );
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      }
    }

    utterance.onend = () => setIsSpeaking(false);
    // utterance.onerror = (event) => {
    //   setError(event);
    //   setIsSpeaking(false);
    //   console.error('Utterance error:', event);
    // };

    setIsSpeaking(true);
    setError(null);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return {
    isSpeaking,
    error,
    speak,
    stopSpeaking,
  };
};
