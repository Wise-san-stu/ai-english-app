import { useEffect, useRef, useState } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export function useSpeechRecognizer() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);

  useEffect(() => {
    // ① AzureのSpeechConfigを作成
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!,
      process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    // ② AudioConfigとSpeechRecognizerを生成
    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const newRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // ③ イベントハンドラ：認識結果を受け取る
    newRecognizer.recognized = (sender, event) => {
      if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
        // 認識したテキストを追記していく（都度更新）
        setRecognizedText((prev) => (prev ? prev + " " + event.result.text : event.result.text));
      }
    };

    // ④ refに格納
    recognizerRef.current = newRecognizer;

    // コンポーネントがアンマウントされたら閉じる
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
    };
  }, []);

  // 音声入力をトグル開始/終了
  const toggleRecognition = () => {
    if (!recognizerRef.current) return;

    if (!isListening) {
      // 開始
      setRecognizedText(""); // 前回のテキストをクリア
      setIsListening(true);
      recognizerRef.current.startContinuousRecognitionAsync();
    } else {
      // 停止
      setIsListening(false);
      recognizerRef.current.stopContinuousRecognitionAsync();
    }
  };

  return {
    isListening,
    recognizedText,
    toggleRecognition,
  };
}
