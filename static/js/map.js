// map.js - 地図・マーカー管理
// GoogleMaps の初期化・ピン表示・フォーカス処理

 
// 地図関連の状態変数（utils.js の resetMap からも参照する）
let map = null;
let markers = [];
let activeInfoWindow = null;
let infoWindows = [];
 
 
/**
 * 駐車場一覧をGoogleマップ上にピンで表示する
 * @param {Array} parkings - 駐車場データの配列
 */
function showMap(parkings) {
    resetMap();
 
    const mapArea = document.getElementById("mapArea");
    mapArea.style.display = "block";
 
    // 最初の駐車場を中心に地図を初期化
    map = new google.maps.Map(mapArea, {
        zoom: 15,
        center: { lat: parkings[0].lat, lng: parkings[0].lng },
        mapId: "DEMO_MAP_ID",
    });
 
    // 各駐車場にピンを立てる
    parkings.forEach((p, index) => {
        if (!p.lat || !p.lng) return;
 
        // 赤丸のカスタムマーカー
        const pinEl = document.createElement("div");
        pinEl.style.cssText = `
            width: 16px; height: 16px;
            background: red; border: 2px solid darkred;
            border-radius: 50%;
        `;
 
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: p.lat, lng: p.lng },
            map,
            title: p.name,
            content: pinEl,
        });
        markers.push(marker);
 
        // InfoWindow（吹き出し）の中身
        const infoContent = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = p.name;
        infoContent.appendChild(strong);
        infoContent.appendChild(document.createElement("br"));
        infoContent.appendChild(document.createTextNode(p.address));
 
        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        infoWindows.push(infoWindow);
 
        // ピンをクリックしたら吹き出しを開き、対応カードをハイライトする
        marker.addListener("gmp-click", () => {
            if (activeInfoWindow) activeInfoWindow.close();
            infoWindow.open(map, marker);
            activeInfoWindow = infoWindow;
            highlightCard(index);
        });
    });
}
 
 
/**
 * 指定インデックスのマーカーに地図をフォーカスして吹き出しを開く
 * カードクリック時に呼ぶ
 * @param {number} index - マーカーのインデックス
 * @param {Object} p     - 駐車場データ
 */
function focusMarker(index, p) {
    if (!map || !p.lat || !p.lng) return;
 
    map.panTo({ lat: p.lat, lng: p.lng });
    map.setZoom(17);
 
    if (activeInfoWindow) activeInfoWindow.close();
    infoWindows[index].open(map, markers[index]);
    activeInfoWindow = infoWindows[index];
 
    highlightCard(index);
}
 
 
/**
 * 指定インデックスのカードだけ緑色にハイライトする
 * @param {number} index - カードのインデックス
 */
function highlightCard(index) {
    document.querySelectorAll(".parking-card").forEach(c => c.style.backgroundColor = "");
    const card = document.getElementById("card-" + index);
    if (card) {
        card.style.backgroundColor = "#63BB5B";
        card.scrollIntoView({ behavior: "smooth" });
    }
}