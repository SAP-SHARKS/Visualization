import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

const SpeechRecorder = ({ onTranscriptUpdate, onTranscriptFinalize }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const webSocketRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, []);

    const startRecording = async () => {
        // Guard: prevent double connections
        if (webSocketRef.current) return;
        setError(null);
        try {
            // 1. Get Microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 2. Open WebSocket connection to our Python backend
            const ws = new WebSocket('ws://localhost:3001/api/speech');
            webSocketRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsRecording(true);

                // 3. Start MediaRecorder
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm' // Often supported in Chrome/Firefox
                });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.addEventListener('dataavailable', (event) => {
                    if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        ws.send(event.data);
                    }
                });

                // Send small chunks frequently for real-time feel
                mediaRecorder.start(100);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'transcript') {
                        if (data.isFinal) {
                            onTranscriptFinalize(data.text);
                        } else {
                            onTranscriptUpdate(data.text);
                        }
                    } else if (data.type === 'Error') {
                        console.error('Backend reported error:', data.message);
                        setError(data.message);
                        stopRecording();
                    } else if (data.type === 'system') {
                        console.log('System message:', data.message);
                    }
                } catch (e) {
                    console.error('Error parsing websocket message:', e);
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket error:', e);
                setError('Connection to transcription server failed.');
                stopRecording();
            };

            ws.onclose = () => {
                console.log('WebSocket closed');
                // Only stop if this is still the active connection
                if (webSocketRef.current === ws) {
                    stopRecording();
                }
            };

        } catch (err) {
            console.error('Error accessing microphone:', err);
            setError('Microphone access denied or unavailable.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Grab ref and null it out immediately to prevent re-entry
        const ws = webSocketRef.current;
        webSocketRef.current = null;

        if (ws) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'stop' }));
            }
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 1000);
        }

        setIsRecording(false);
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
                type="button"
                onClick={toggleRecording}
                className="speech-rec-btn"
                data-recording={isRecording ? 'true' : 'false'}
            >
                {isRecording ? (
                    <>
                        <Square size={14} fill="currentColor" />
                        Stop
                    </>
                ) : (
                    <>
                        <Mic size={14} />
                        Speak
                    </>
                )}
            </button>

            {isRecording && (
                <span className="speech-rec-indicator">
                    <span className="speech-rec-dot" />
                    Live
                </span>
            )}

            {error && (
                <span style={{ fontSize: '11px', color: '#ef4444' }}>
                    {error}
                </span>
            )}

            <style>{`
        .speech-rec-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:20px;border:none;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .25s cubic-bezier(0.4,0,0.2,1);letter-spacing:0.3px;text-transform:uppercase;}
        .speech-rec-btn[data-recording="false"]{background:linear-gradient(135deg,#3dd68c,#2bc47a);color:#06080c;box-shadow:0 2px 12px rgba(61,214,140,0.35);}
        .speech-rec-btn[data-recording="false"]:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(61,214,140,0.45);}
        .speech-rec-btn[data-recording="true"]{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 2px 12px rgba(239,68,68,0.35);animation:recPulse 2s ease-in-out infinite;}
        .speech-rec-btn[data-recording="true"]:hover{box-shadow:0 4px 20px rgba(239,68,68,0.45);}
        .speech-rec-btn:active{transform:scale(0.96);}
        .speech-rec-indicator{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#ef4444;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.5px;}
        .speech-rec-dot{width:7px;height:7px;border-radius:50%;background:#ef4444;animation:dotPulse 1s infinite;}
        [data-theme="light"] .speech-rec-btn[data-recording="false"]{background:linear-gradient(135deg,#355872,#7AAACE);color:#F7F8F0;box-shadow:0 2px 12px rgba(53,88,114,0.3);}
        [data-theme="light"] .speech-rec-btn[data-recording="false"]:hover{box-shadow:0 4px 20px rgba(53,88,114,0.4);}
        @keyframes dotPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.3);}}
        @keyframes recPulse{0%,100%{box-shadow:0 2px 12px rgba(239,68,68,0.35);}50%{box-shadow:0 2px 20px rgba(239,68,68,0.55);}}
      `}</style>
        </div>
    );
};

export default SpeechRecorder;
