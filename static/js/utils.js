// utils.js - 共通ユーティリティ
// 他の全ファイルから使う共通関数をここにまとめる

 
/**
 * fetch のラッパー関数
 * 全APIリクエストをここで一元管理する
 * apiFetchは、サーバーにデータを送って、結果を受け取る関数
 * @param {string} url  - リクエスト先のURL
 * @param {Object} body - 送信するJSONデータ
 * @returns {Promise<Object>} レスポンスのJSONデータ
 */
async function apiFetch(url, body) {
    // bodyをJSON文字列に変換してPOSTリクエストを送り、レスポンスを待つ（await）
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    // res.ok はHTTPステータスが200〜299のときだけ true になります
    // throw new Error はエラーを意図的に発生させて、処理を止める命令(throw がないとエラーでも気にせず続け)
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return res.json();
}
 
 
/**
 * 地図・マーカーをリセットする
 * 新しい検索結果を表示する前に必ず呼ぶ
 */
function resetMap() {
    document.getElementById("mapArea").style.display = "none";
    markers.forEach(m => m.setMap(null));
    markers = [];
    infoWindows = [];
    activeInfoWindow = null;
    map = null;
}
 
 
/**
 * チャットエリアをリセットする
 * ウェルカムメッセージと古いカードを消す
 */
function resetChatBody() {
    document.getElementById("chatBody").innerHTML = "";
    const welcome = document.querySelector(".welcome-message");
    if (welcome) welcome.remove();
}
 
 
/**
 * 入力フィールドを動的に生成してコンテナに追加する
 * 客先の追加・編集フォームで共用
 * @param {HTMLElement} container - 追加先の親要素
 * @param {string} labelText      - ラベルのテキスト
 * @param {string} id             - inputのid
 * @param {string} value          - 初期値（編集時）またはplaceholder（追加時）
 * @param {boolean} isEdit        - 編集モードかどうか
 * @returns {HTMLInputElement} 生成したinput要素
 */
function createInputField(container, labelText, id, value, isEdit = false) {
    const label = document.createElement("p");
    label.textContent = labelText;
 
    const input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.style.width = "100%";
 
    if (isEdit) {
        input.value = value || "";
    } else {
        input.placeholder = value || "";
    }
 
    container.appendChild(label);
    container.appendChild(input);
    return input;
}
 
 
/**
 * 駐車場の選択ドロップダウンを生成してコンテナに追加する
 * @param {HTMLElement} container - 追加先の親要素
 * @param {string} currentValue   - 選択中の値（編集時）
 * @returns {HTMLSelectElement} 生成したselect要素
 */
function createParkingSelect(container, currentValue = "") {
    const label = document.createElement("p");
    label.textContent = "駐車場";
 
    const select = document.createElement("select");
    select.id = "input-parking";
 
    ["あり", "なし", "不明"].forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
 
    if (currentValue) select.value = currentValue;
 
    container.appendChild(label);
    container.appendChild(select);
    return select;
}


/**
 * チャットエリアにメッセージを追加する
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