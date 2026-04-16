// main.js - アプリ初期化
// 起動時のウェルカムメッセージ表示・客先一覧の読み込み

 
/**
 * 起動時のウェルカムメッセージを表示する
 */
function showWelcome() {
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = "welcome-message";
    div.textContent = "今日どこに行きたいですか？";
    chatBody.appendChild(div);
}
 
 
/**
 * アプリ起動時の初期化処理
 */
function initApp() {
    showWelcome();
    renderClients();
}
 
initApp();