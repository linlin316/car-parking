// gps.js - 現在地から駐車場を検索
// ブラウザのGeolocation APIで現在地を取得して周辺駐車場を検索する

 
/**
 * 現在地を取得して周辺の駐車場を検索する
 * 「現在地から探す」ボタンから呼ぶ
 */
function searchByCurrentLocation() {
    const btn = document.getElementById("gpsBtn");
 
    // ブラウザがGeolocationに対応しているか確認
    if (!navigator.geolocation) {
        addMessage("このブラウザは現在地取得に対応していません。", "ai");
        return;
    }
 
    btn.disabled = true;
    btn.textContent = "取得中...";
 
    navigator.geolocation.getCurrentPosition(
        // 取得成功
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
 
            btn.disabled = false;
            btn.textContent = "📍 現在地から探す";
 
            resetChatBody();
            resetMap();
 
            addMessage("現在地の周辺駐車場を検索しています...", "ai");
 
            searchAndShowParkingsByLatLng(lat, lng, btn);
        },
        // 取得失敗
        (error) => {
            btn.disabled = false;
            btn.textContent = "📍 現在地から探す";
 
            // エラーの種類によってメッセージを変える
            const messages = {
                1: "位置情報の許可が必要です。ブラウザの設定を確認してください。",
                2: "現在地を取得できませんでした。もう一度お試しください。",
                3: "現在地の取得がタイムアウトしました。もう一度お試しください。",
            };
            addMessage(messages[error.code] || "現在地を取得できませんでした。", "error");
        },
        // オプション
        {
            enableHighAccuracy: true,  // 高精度モード
            timeout: 10000,            // 10秒でタイムアウト
            maximumAge: 0,             // キャッシュを使わず毎回取得
        }
    );
}

 
// 現在地ボタンのクリックイベント
document.getElementById("gpsBtn").addEventListener("click", function () {
    searchByCurrentLocation();
});