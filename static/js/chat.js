// chat.js - チャット送受信
// ユーザーメッセージの送信・AIレスポンスの表示

 
// 送信ボタンのクリックイベント
document.getElementById("chatSend").addEventListener("click", function () {
    const message = document.getElementById("chatInput").value.trim();
    if (!message) return;
 
    const btn = document.getElementById("chatSend");
    document.getElementById("chatInput").value = "";
 
    // 画面をリセットしてから送信
    resetChatBody();
    resetMap();
 
    addMessage(message, "user");
    btn.disabled = true;
 
    apiFetch("/chat", { message })
        .then(data => {
            addMessage(data.message, "ai");
 
            // 施設情報または駐車場リストを1.5秒後に表示
            if (data.facility) {
                setTimeout(() => showFacility(data.facility), 1500);
            } else if (data.parkings?.length > 0) {
                setTimeout(() => showParkings(data.parkings), 1500);
            }
        })
        .catch(() => addMessage("通信エラーが発生しました。", "ai"))
        .finally(() => { btn.disabled = false; });
});
 
 
// Enterキーで送信（IME変換中は無視する）
document.getElementById("chatInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.isComposing) {
        document.getElementById("chatSend").click();
    }
});
 
 
/**
 * チャット画面にメッセージ吹き出しを追加する
 * @param {string} text   - メッセージ内容
 * @param {string} sender - "user" または "ai"
 */
function addMessage(text, sender) {
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = sender === "user" ? "bubble-user" : "bubble-ai";
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}