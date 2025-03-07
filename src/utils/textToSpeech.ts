import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export async function textToSpeech(text: string, speed: number = 1.0) {
  return new Promise<void>((resolve, reject) => {
    if (!text.trim()) {
      resolve(); // 空のテキストは処理しない
      return;
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!,
      process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!
    );
    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural"; // 英語の自然な音声

    // スピードを適切な値に変換（Azure TTSの `rate` は 1.0 = 0%）
    const ratePercentage = (speed - 1.0) * 100; // 例: 1.2 → 20%

    // SSML 形式でスピードを適用
    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice name='en-US-JennyNeural'>
          <prosody rate='${ratePercentage}%'>
            ${text.trim()}
          </prosody>
        </voice>
      </speak>`;

    const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakSsmlAsync(ssml, (result) => {
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        resolve();
      } else {
        console.error("TTS Error:", result.errorDetails);
        reject(`TTS failed: ${result.errorDetails}`);
      }
      synthesizer.close();
    });
  });
}
