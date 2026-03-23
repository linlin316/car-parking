document.getElementById("chatSend").addEventListener("click", function() {
    
    // メッセージをもらう
    const message = document.getElementById("chatInput").value;

    // 空だったら処理を止める
    if (!message.trim()) return;
    document.getElementById("chatInput").value = "";

    // ユーザーメッセージを表示する
    addMessage(message, "user");

    // サーバーにメッセージを送信する
    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
    })
    .then(res => res.json())
    .then(data => {
        // AIの返信を画面に表示する
        addMessage(data.message, "ai");

        // 駐車場リストがあれば表示する
        if (data.parkings && data.parkings.length > 0) {
            showParkings(data.parkings);
        }
    });
});



document.getElementById("chatReset").addEventListener("click", function() {
    fetch("/reset", {
    method: "POST",
    headers: { "Content-Type": "" },
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("chatBody").innerHTML = "";  // チャットを消す
        document.getElementById("mapArea").style.display = "none";  // 地図を隠す
        markers = [];
        map = null;
    });

});



function addMessage(text, sender) {
    // メッセージをチャット画面に追加する
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = sender === "user" ? "bubble-user" : "bubble-ai";
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}



function showParkings(parkings){
    const chatBody = document.getElementById("chatBody");

    // 駐車場リストを1件ずつ処理する（pが1件分のデータ）
    parkings.forEach((p, index) => {
        const div = document.createElement("div");
        div.className = "parking-card";
        div.style.cursor = "pointer";

        // {p.name}:駐車場の名前 , {p.address}:住所
        div.innerHTML = `
            <strong>${p.name}</strong><br>
            ${p.address}<br>
            <a href="https://www.google.com/maps/place/?q=place_id:${p.place_id}" target="_blank">Googleマップで見る</a>
        `;

        // カードをクリックしたら地図をフォーカスする
        div.addEventListener("click", () => {
            if (map && p.lat && p.lng){
                map.panTo({ lat: p.lat, lng: p.lng});
                map.setZoom(17);
                google.maps.event.trigger(markers[index], "click");
            }      
        });

        chatBody.appendChild(div);
    });

    // 一番下までスクロールする
    chatBody.scrollTop = chatBody.scrollHeight;

    // 地図を表示する
    showMap(parkings);
}


let map = null;
let markers = [];
let activeInfoWindow = null;


function showMap(parkings){
    
    // 地図エリアを表示する
    const mapArea = document.getElementById("mapArea");
    mapArea.style.display = "block";

    // 最初の駐車場を中心に地図を表示する
    map = new google.maps.Map(mapArea, {
        zoom: 15,
        center: { lat: parkings[0].lat, lng: parkings[0].lng }
    });

    // 各駐車場にピンを立てる
    parkings.forEach(p => {
        if (p.lat && p.lng) {
            const marker = new google.maps.Marker({
                position: { lat: p.lat, lng: p.lng },
                map: map,
                title: p.name,
                icon:{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "red",
                    fillOpacity: 1,
                    strokeColor: "darkred",
                    strokeWeight: 1,
                    scale: 8
                }
            });
            markers.push(marker)

            // クリックしたら名前を表示する
            const infoWindow = new google.maps.InfoWindow({
                content: `<strong>${p.name}</strong><br>${p.address}`
            });

            marker.addListener("click", () => {
                // 前のInfoWindowを閉じる
                if (activeInfoWindow) {
                    activeInfoWindow.close();
                }
                infoWindow.open(map, marker);
                activeInfoWindow = infoWindow;
            });
        }
    });
}