import { useState, useEffect, useCallback } from 'react';

export const useVoice = (isEnabled, commands = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        if (!isEnabled) {
            if (recognition) recognition.stop();
            return;
        }

        if (window.webkitSpeechRecognition || window.SpeechRecognition) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recog = new SpeechRecognition();

            recog.continuous = true;
            recog.interimResults = false;
            recog.lang = 'en-US';

            recog.onstart = () => setIsListening(true);
            recog.onend = () => setIsListening(false);

            recog.onresult = (event) => {
                const last = event.results.length - 1;
                const text = event.results[last][0].transcript.trim().toLowerCase();
                setTranscript(text);
                console.log("Voice Command:", text);

                // Simple fuzzy matching
                Object.keys(commands).forEach(cmdKey => {
                    if (text.includes(cmdKey.toLowerCase())) {
                        commands[cmdKey]();
                        // Provide Audio Feedback
                        const utterance = new SpeechSynthesisUtterance(`Command recognized: ${cmdKey}`);
                        window.speechSynthesis.speak(utterance);
                    }
                });
            };

            setRecognition(recog);
        }
    }, [isEnabled]);

    const startListening = useCallback(() => {
        if (recognition && isEnabled) {
            try {
                recognition.start();
            } catch (e) {
                console.error("Speech recognition start error", e);
            }
        }
    }, [recognition, isEnabled]);

    const stopListening = useCallback(() => {
        if (recognition) recognition.stop();
    }, [recognition]);

    const toggleListening = useCallback(() => {
        if (isListening) stopListening();
        else startListening();
    }, [isListening, stopListening, startListening]);

    return { isListening, transcript, startListening, stopListening, toggleListening };
};
