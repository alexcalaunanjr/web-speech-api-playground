'use client';

import React, { useState, useEffect } from 'react';
import { useSpeechRecognition, useSpeechSynthesis, languageCategories } from '../utils/utils';

export default function SpeechPage() {
  // State for the text input that will be spoken
  const [textToSpeak, setTextToSpeak] = useState('Hello, this is a test of the Web Speech API.');
  // State for showing/hiding settings
  const [showSettings, setShowSettings] = useState(false);

  // Initialize hooks with default settings
  const {
    transcript,
    isListening,
    error: recognitionError,
    settings: recognitionSettings,
    startListening,
    stopListening,
    updateSettings: updateRecognitionSettings,
  } = useSpeechRecognition();

  const {
    isSpeaking,
    error: synthesisError,
    settings: synthesisSettings,
    availableVoices,
    speak,
    stopSpeaking,
    updateSettings: updateSynthesisSettings,
  } = useSpeechSynthesis();

  // Effect to log recognition errors
  useEffect(() => {
    if (recognitionError) {
      console.error('Recognition Error:', recognitionError);
    }
  }, [recognitionError]);

  // Effect to log synthesis errors
  useEffect(() => {
    if (synthesisError) {
      console.error('Synthesis Error:', synthesisError);
    }
  }, [synthesisError]);

  // Handler for the speak button click
  const handleSpeak = () => {
    if (textToSpeak.trim()) {
      speak(textToSpeak);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-inter">
      {/* Main container */}
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full text-center">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Web Speech API Demo</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            {showSettings ? 'Hide Settings' : 'Show Settings'}
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">Settings</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Speech Recognition Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-700">Speech Recognition Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={recognitionSettings.lang}
                    onChange={(e) => updateRecognitionSettings({ lang: e.target.value })}
                    className="text-black w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    disabled={isListening}
                  >
                    {Object.entries(languageCategories).map(([category, languages]) => (
                      <optgroup key={category} label={category}>
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Alternatives</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={recognitionSettings.maxAlternatives}
                    onChange={(e) => updateRecognitionSettings({ maxAlternatives: parseInt(e.target.value) })}
                    className="text-black w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    disabled={isListening}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={recognitionSettings.continuous}
                      onChange={(e) => updateRecognitionSettings({ continuous: e.target.checked })}
                      className="text-black mr-2"
                      disabled={isListening}
                    />
                    <span className="text-sm text-gray-700">Continuous Recognition</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={recognitionSettings.interimResults}
                      onChange={(e) => updateRecognitionSettings({ interimResults: e.target.checked })}
                      className="text-black mr-2"
                      disabled={isListening}
                    />
                    <span className="text-sm text-gray-700">Show Interim Results</span>
                  </label>
                </div>
              </div>

              {/* Speech Synthesis Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-700">Speech Synthesis Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={synthesisSettings.lang}
                    onChange={(e) => updateSynthesisSettings({ lang: e.target.value })}
                    className="text-black w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    {Object.entries(languageCategories).map(([category, languages]) => (
                      <optgroup key={category} label={category}>
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
                  <select
                    value={synthesisSettings.voiceName || ''}
                    onChange={(e) => updateSynthesisSettings({ voiceName: e.target.value || undefined })}
                    className="text-black w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  >
                    <option value="">Default Voice</option>
                    {availableVoices
                      .filter((voice) => voice.lang === synthesisSettings.lang)
                      .map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate: {synthesisSettings.rate.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={synthesisSettings.rate}
                    onChange={(e) => updateSynthesisSettings({ rate: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pitch: {synthesisSettings.pitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={synthesisSettings.pitch}
                    onChange={(e) => updateSynthesisSettings({ pitch: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volume: {synthesisSettings.volume.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={synthesisSettings.volume}
                    onChange={(e) => updateSynthesisSettings({ volume: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Speech Recognition Section */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg shadow-inner">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Speech Recognition (STT)</h2>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`
              px-6 py-3 rounded-full text-white font-semibold transition-all duration-300 ease-in-out
              ${isListening ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50' : 'bg-green-600 hover:bg-green-700 shadow-green-500/50'}
              focus:outline-none focus:ring-4 focus:ring-opacity-75
              ${isListening ? 'focus:ring-red-400' : 'focus:ring-green-400'}
              shadow-lg transform hover:scale-105 active:scale-95
            `}
            disabled={!!recognitionError && !isListening}
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>

          <p className="mt-4 text-gray-700 text-lg">
            Status: {isListening ? <span className="font-bold text-green-600">Listening...</span> : <span className="font-bold text-gray-500">Idle</span>}
          </p>
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-left min-h-[80px] max-h-[200px] overflow-y-auto">
            <p className="text-gray-800 text-base break-words">
              {transcript || 'Speak something...'}
            </p>
          </div>
          {recognitionError && (
            <p className="mt-4 text-red-600 text-sm font-medium">
              Error: {recognitionError.message} (Code: {recognitionError.error})
            </p>
          )}
        </div>

        {/* Speech Synthesis Section */}
        <div className="p-4 bg-purple-50 rounded-lg shadow-inner">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">Speech Synthesis (TTS)</h2>
          <textarea
            className="w-full text-black p-3 border border-gray-300 rounded-md resize-y min-h-[100px] focus:ring-2 focus:ring-purple-400 focus:border-transparent transition duration-200 ease-in-out"
            value={textToSpeak}
            onChange={(e) => setTextToSpeak(e.target.value)}
            placeholder="Enter text to speak..."
          ></textarea>

          <div className="flex justify-center mt-4 space-x-4">
            <button
              onClick={handleSpeak}
              className={`
                px-6 py-3 rounded-full text-white font-semibold transition-all duration-300 ease-in-out
                ${isSpeaking ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}
                focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-75
                shadow-lg transform hover:scale-105 active:scale-95
              `}
              disabled={isSpeaking || !textToSpeak.trim() || !!synthesisError}
            >
              {isSpeaking ? 'Speaking...' : 'Speak Text'}
            </button>
            <button
              onClick={stopSpeaking}
              className="
                px-6 py-3 rounded-full bg-gray-500 text-white font-semibold hover:bg-gray-600
                focus:outline-none focus:ring-4 focus:ring-gray-400 focus:ring-opacity-75
                shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out
              "
              disabled={!isSpeaking}
            >
              Stop Speaking
            </button>
          </div>
          {synthesisError && (
            <p className="mt-4 text-red-600 text-sm font-medium">
              Error: {synthesisError.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}