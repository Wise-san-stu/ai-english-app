"use client";

import { useState, useRef, useEffect } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { textToSpeech } from "@/utils/textToSpeech";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [corrections, setCorrections] = useState<string[]>([]);
  const [userInput, setUserInput] = useState("");
  const [speechRate, setSpeechRate] = useState(1.0);

  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const correctionsEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll corrections to bottom whenever corrections change
  useEffect(() => {
    correctionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [corrections]);

  // Initialize Azure SpeechRecognizer once on mount
  useEffect(() => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!,
      process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Each time a phrase is recognized, append it
    recognizer.recognized = (_, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
        // Accumulate recognized text
        setRecognizedText((prev) => (prev ? prev + " " + event.result.text : event.result.text));
      }
    };

    // In case of errors
    recognizer.canceled = (_, event) => {
      console.error("Recognition canceled:", event.reason, event.errorDetails);
    };

    // Save recognizer in ref
    recognizerRef.current = recognizer;

    // Cleanup on unmount
    return () => {
      recognizer.close();
      recognizerRef.current = null;
    };
  }, []);

  // Toggle continuous recognition
  const handleSpeechToggle = async () => {
    if (!recognizerRef.current) return;

    if (!isListening) {
      // START recognition
      setRecognizedText("");
      setIsListening(true);
      recognizerRef.current.startContinuousRecognitionAsync();
    } else {
      // STOP recognition
      setIsListening(false);
      recognizerRef.current.stopContinuousRecognitionAsync(() => {
        // Once we stop, we have recognizedText accumulated
        if (recognizedText.trim()) {
          setUserInput(recognizedText.trim());
          // Optionally, auto-send recognized text
          handleSend(recognizedText.trim());
        }
      });
    }
  };

  // Send message to AI
  const handleSend = async (inputText?: string) => {
    const textToSend = inputText || userInput;
    if (!textToSend.trim()) return;

    // Add user message to chat
    setMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setUserInput("");
    setRecognizedText(""); // clear recognized text

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: textToSend }),
      });

      const data = await res.json();
      if (res.ok) {
        // Add AI conversation part
        setMessages((prev) => [...prev, { sender: "ai", text: data.conversation }]);

        // Update corrections if present
        if (data.corrections && data.corrections.trim() !== "") {
          setCorrections(
            data.corrections.split("\n").filter((line: string) => line.trim() !== "")
          );
        } else {
          setCorrections([]);
        }

        // TTS only for the conversation part
        await textToSpeech(data.conversation, speechRate);
      } else {
        console.error("Error:", data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4 text-black">AI English Chat</h1>

      {/* Chat area */}
      <div className="w-full max-w-lg bg-white shadow-lg rounded-lg p-4 overflow-y-auto h-96 border border-gray-300">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            } mb-2`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Corrections area */}
      {corrections.length > 0 && (
        <div className="w-full max-w-lg bg-gray-100 shadow-md rounded-lg p-4 overflow-y-auto h-48 border border-gray-300 mt-4">
          <h2 className="text-lg font-bold mb-2">Corrections</h2>
          {corrections.map((correction, index) => (
            <div key={index} className="p-2 bg-white rounded mb-2 shadow">
              {correction}
            </div>
          ))}
          <div ref={correctionsEndRef} />
        </div>
      )}

      {/* Speech speed slider */}
      <div className="w-full max-w-lg mt-4 flex flex-col items-center">
        <label className="text-sm font-semibold">Speech Speed: {speechRate.toFixed(1)}x</label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={speechRate}
          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
          className="w-full mt-2"
        />
      </div>

      {/* Input area */}
      <div className="w-full max-w-lg flex flex-col items-center mt-4">
        <textarea
          className="w-full p-2 border border-gray-300 rounded mb-2"
          rows={2}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
        />
        <div className="flex gap-4">
          <button
            onClick={() => handleSend()}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Send
          </button>

          {/* Toggle speech recognition */}
          <button
            onClick={handleSpeechToggle}
            className={`px-4 py-2 rounded ${
              isListening ? "bg-red-500" : "bg-green-500"
            } text-white`}
          >
            {isListening ? "Stop" : "Speak"}
          </button>
        </div>
      </div>
    </div>
  );
}
