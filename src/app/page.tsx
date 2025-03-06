"use client";

import { useState } from "react";

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const handleSend = async () => {
    if (!userInput.trim()) return;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiResponse(data.reply);
      } else {
        console.error("Error:", data.error);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4 text-black">AI English Chat App</h1>
      <textarea
        className="w-full max-w-lg p-2 border border-gray-300 rounded mb-4"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button
        onClick={handleSend}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Send
      </button>
      {aiResponse && (
        <div className="mt-4 p-4 bg-white border border-gray-300 rounded shadow">
          <strong>AI:</strong> {aiResponse}
        </div>
      )}
    </div>
  );
}
