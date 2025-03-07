import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple conversation history storage
let conversationHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
  {
    role: "system",
    content:
      "あなたは英語の会話パートナーです。ユーザーが英語で話したら、まず自然な返答をしてください。\n" +
      "その後、文法ミスや言い回しの間違いがあれば、適切な校正を行い、修正点を示してください。\n\n" +
      "出力フォーマットは以下のようにしてください。\n\n" +
      "[会話部分]\n" +
      "{ここに会話の続き}\n\n" +
      "[修正点]\n" +
      "❌ Mistake: '間違い' ✅ Correct: '修正' 💡 Explanation: '解説'",
  },
];

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json();
    if (!userInput) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    // Add user's message to conversation history
    conversationHistory.push({ role: "user", content: userInput });

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiReply = response.choices[0].message.content ?? "I couldn't generate a response.";

    // Split the reply at the "[修正点]" marker
    let conversationPart = aiReply;
    let correctionPart = "";
    const markerIndex = aiReply.indexOf("[修正点]");
    if (markerIndex !== -1) {
      conversationPart = aiReply.substring(0, markerIndex).trim();
      correctionPart = aiReply.substring(markerIndex).trim();
    }

    // If corrections indicate "なし" or no corrections, clear the corrections string.
    if (correctionPart.includes("なし") || correctionPart.includes("No corrections needed")) {
      correctionPart = "";
    }

    // Add only the conversation part to conversation history
    conversationHistory.push({ role: "assistant", content: conversationPart });

    return NextResponse.json({
      conversation: conversationPart, // For chat display and TTS (only conversation text)
      corrections: correctionPart,      // For Corrections area only
    });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
