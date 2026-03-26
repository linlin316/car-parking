document.getElementById("chatSend").addEventListener("click", function() {
    
    const message = document.getElementById("chatInput").value;

    // 送信ボタンの連打防止
    const btn = document.getElementById("chatSend");

    // 空だったら処理を止める
    if (!message.trim()) return;
    document.getElementById("chatInput").value = "";

    addMessage(message, "user");

    btn.disabled = true;   
    
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

        // 駐車場リストがあれば表示する(1.5秒後)
        if (data.parkings && data.parkings.length > 0) {
            setTimeout(() => {
                showParkings(data.parkings)
            }, 1500);
        }
        btn.disabled = false;
        })
    .catch(() => {
        addMessage("通信エラーが発生しました。", "ai");
        btn.disabled = false;
    });
});


// リセットボタン
document.getElementById("chatReset").addEventListener("click", function() {
    fetch("/reset", {
        method: "POST",
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("chatBody").innerHTML = "";         // チャットを消す
        document.getElementById("mapArea").style.display = "none";  // 地図を隠す
        markers.forEach(m => m.setMap(null));                       // 地図からピンを消す
        markers = [];                                               // 配列を空にする
        map = null;
    })
    .catch(() => {
        addMessage("通信エラーが発生しました。", "ai");
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
    // 2回目の検索、古いカードが消えてから新しいカード表示する
    document.querySelectorAll(".parking-card").forEach(c => c.remove());

    const chatBody = document.getElementById("chatBody");

    // 駐車場リストを1件ずつ処理する（pが1件分のデータ）
    // XSSリスク対策のためcreateElementを使用
    parkings.forEach((p, index) => {
        const div = document.createElement("div");      // カード
        const name = document.createElement("strong");  // 駐車場名
        const address = document.createElement("p");    // 住所

        name.textContent = p.name;
        address.textContent = p.address;

        div.className = "parking-card";
        div.style.cursor = "pointer";
        div.id = "card-" + index;
        div.appendChild(name);
        div.appendChild(address);

        // Googleマップへのリンク
        const link = document.createElement("a");
        link.href = "https://www.google.com/maps/place/?q=place_id:" + p.place_id;
        link.target = "_blank";
        link.textContent = "Googleマップで見る";
        div.appendChild(link);

        // カードをクリックしたら地図をフォーカスする
        div.addEventListener("click", () => {
            if (map && p.lat && p.lng){
                map.panTo({ lat: p.lat, lng: p.lng});
                map.setZoom(17);
                google.maps.event.trigger(markers[index], "click");
            }      
        });

        chatBody.appendChild(div);
    })

    // 一番下までスクロールする
    chatBody.scrollTop = chatBody.scrollHeight;

    // 地図を表示する
    showMap(parkings);
}


let map = null;
let markers = [];
let activeInfoWindow = null;


function showMap(parkings){
    // 最初にリセットする
    markers.forEach(m => m.setMap(null));
    markers = [];
    
    // 地図エリアを表示する
    const mapArea = document.getElementById("mapArea");
    mapArea.style.display = "block";

    // 最初の駐車場を中心に地図を表示する
    map = new google.maps.Map(mapArea, {
        zoom: 15,
        center: { lat: parkings[0].lat, lng: parkings[0].lng }
    });

    // 各駐車場にピンを立てる
    parkings.forEach((p, index)=> {
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

            const div = document.createElement("div");
            const strong = document.createElement("strong");
            const br = document.createElement("br");
            const addr = document.createTextNode(p.address);

            strong.textContent = p.name;    
            div.appendChild(strong);
            div.appendChild(br);
            div.appendChild(addr);

            // クリックしたら名前を表示する
            const infoWindow = new google.maps.InfoWindow({ content: div });

            marker.addListener("click", () => {
                // 前のInfoWindowを閉じる
                if (activeInfoWindow) activeInfoWindow.close();
                infoWindow.open(map, marker);
                activeInfoWindow = infoWindow;

                // 全カードのハイライトを消す
                document.querySelectorAll(".parking-card").forEach(c => c.style.backgroundColor = "");

                // 対応するカードをハイライトする
                const card = document.getElementById("card-" + index);
                if (card) {
                    card.style.backgroundColor = '#63BB5B';
                    card.scrollIntoView({ behavior: "smooth" });
                }
            });
        }
    });
}


// GPS処理
document.getElementById("gpsSearch").addEventListener("click", function() {
    navigator.geolocation.getCurrentPosition(
        function(position) {
        // GPSを取得成功した時の処理
        const lat = position.coords.latitude;   // 緯度
        const lng = position.coords.longitude;  // 経度

        // サーバーに緯度・経度を送る
        addMessage("現在地周辺の駐車場を検索中...", "ai")
        fetch("/search_by_location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: lat, lng: lng }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.parkings && data.parkings.length > 0) {
                setTimeout(() => {
                    showParkings(data.parkings)
                }, 1500);
            }
            else {
                addMessage("現在地周辺の駐車場が見つかりません", "ai")
            };
        })
        .catch(() => {
            addMessage("通信エラーが発生しました。", "ai");
        });
    },
        function(error){
            addMessage("位置情報を取得できませんでした。", "ai")
        }
    );
});



let isRecording = false;  // 録音中かどうか
const recognition = new webkitSpeechRecognition();
recognition.lang = "ja-JP";        // 日本語
recognition.continuous = false;    // 一回で止まる

recognition.onresult = function(event){
    //認識結果をもらう
    const text = event.results[0][0].transcript;
    document.getElementById("chatInput").value = text;
}

// マイクボタンを押したら録音開始、もう一度押したら停止して送信
document.getElementById("micBtn").addEventListener("click", function() {
    if (isRecording) {
        recognition.stop();
        isRecording = false; 
    } else {
        recognition.start();
        isRecording = true;
    }
});

// 録音が終わった時自動送信
recognition.onend = function(){
    isRecording = false;
    const text = document.getElementById("chatInput").value;
    if (text.trim()) {
        document.getElementById("chatSend").click();
    }
}