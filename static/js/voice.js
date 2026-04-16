// voice.js - 音声入力管理
// Web Speech API を使ったマイク入力・自動送信

 
let isRecording = false;
 

// ブラウザが音声入力に対応しているか確認する
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
 
if (recognition) {
    recognition.lang = "ja-JP";     // 日本語
    recognition.continuous = false; // 一発認識で止める
 
    // 認識結果をinputに反映する
    recognition.onresult = function (event) {
        document.getElementById("chatInput").value = event.results[0][0].transcript;
    };
 
    // 認識終了後、テキストがあれば自動送信する
    recognition.onend = function () {
        isRecording = false;
        const text = document.getElementById("chatInput").value;
        if (text.trim()) document.getElementById("chatSend").click();
    };
 
    // マイクボタンで録音開始・停止を切り替える
    document.getElementById("micBtn").addEventListener("click", function () {
        if (isRecording) {
            recognition.stop();
            isRecording = false;
        } else {
            recognition.start();
            isRecording = true;
        }
    });
 
} else {
    // 非対応ブラウザではマイクボタンを非表示にする
    document.getElementById("micBtn").style.display = "none";
}