// ===== 変数宣言 =====
// 地図関連
let map = null;
let markers = [];
let activeInfoWindow = null;


let debounceTimer = null;    // タイマーのIDを保存する変数
//「ひ」を入力 → タイマー開始（ID: 1）→ debounceTimer = 1
//「が」を入力 → タイマー1をキャンセル → 新しいタイマー開始（ID: 2）→ debounceTimer = 2
//「し」を入力 → タイマー2をキャンセル → 新しいタイマー開始（ID: 3）→ debounceTimer = 3
// 300ms後 → タイマー3が実行 → APIを1回だけ呼ぶ



// 音声入力関連
let isRecording = false;


// ブラウザが音声入力に対応しているか確認する
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if(recognition) {
    recognition.lang = "ja-JP";        // 日本語
    recognition.continuous = false;    // 一回で止まる
}


// ===== チャット(下) =====
// 送信ボタンのクリック処理
document.getElementById("chatSend").addEventListener("click", function() {
    
    const message = document.getElementById("chatInput").value;

    // 送信ボタンの連打防止
    const btn = document.getElementById("chatSend");

    // 空だったら処理を止める
    if (!message.trim()) return;
    document.getElementById("chatInput").value = "";

    // 送信前にフロントをリセット
    document.getElementById("chatBody").innerHTML = "";
    document.getElementById("mapArea").style.display = "none";
    markers.forEach(m => m.setMap(null));
    markers = [];
    map = null;

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

        // 施設情報を表示する、駐車場があれば表示する(1.5秒後)
        if (data.facility) {
            setTimeout(() => {
                showFacility(data.facility);
            }, 1500);
        }
        else if (data.parkings && data.parkings.length > 0) {
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


// Enterキーが押されたら送信する
document.getElementById("chatInput").addEventListener("keydown", function(e) {
    if (e.key === "Enter"){
        document.getElementById("chatSend").click();
    }
});


// リセットボタン
document.getElementById("chatReset").addEventListener("click", function() {
    fetch("/reset", {
        method: "POST",
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("chatBody").innerHTML = "";
        showWelcome();
        document.getElementById("mapArea").style.display = "none";  // 地図を隠す
        markers.forEach(m => m.setMap(null));                       // 地図からピンを消す
        markers = [];                                               // 配列を空にする
        map = null;
    })
    .catch(() => {
        addMessage("通信エラーが発生しました。", "ai");
    });
});


// メッセージをチャット画面に追加する
function addMessage(text, sender) {
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = sender === "user" ? "bubble-user" : "bubble-ai";
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}



// ===== 施設関連 =====
// 施設情報
function showFacility(facility) {
    document.querySelectorAll(".facility-card").forEach(el => el.remove());
    saveHistory(facility);

    const chatBody = document.getElementById("chatBody");

    const div = document.createElement("div");
    div.className = "facility-card";

    const name = document.createElement("strong");
    name.textContent = facility.name;

    const address = document.createElement("p");
    address.textContent = facility.address;

    const parking = document.createElement("p");
    parking.textContent = "駐車場：公式HPでご確認ください";

    div.appendChild(name);
    div.appendChild(address);
    div.appendChild(parking);

    // HPがあれば表示、なければメッセージを表示
    if (facility.website) {
        const link = document.createElement("a");
        link.href = facility.website;
        link.target = "_blank";
        link.textContent = "公式HPを見る";
        div.appendChild(link);
    } else {
        const noHp = document.createElement("p");
        noHp.textContent = "公式HPは見つかりませんでした。";
        div.appendChild(noHp);
    }

    // 今日どこに行きたいですか？ メッセージを消す
    const welcome = document.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    chatBody.appendChild(div);

    // 「近くの駐車場を探しますか？」ボタン
    const btn = document.createElement("button");
    btn.textContent = "近くの駐車場を探す";
    btn.className = "nearby-btn";
    btn.addEventListener("click", () => {
        btn.disabled = true;
        addMessage("近くの駐車場を探します。", "ai");

        // facilityの座標を使って駐車場を検索する
        fetch("/search_by_location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: facility.lat, lng: facility.lng }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.parkings && data.parkings.length > 0) {
                setTimeout(() => {
                    showParkings(data.parkings);
                }, 1500);
            } else {
                addMessage("近くの駐車場が見つかりませんでした。", "ai");
            }
        })
        .catch(() => {
            addMessage("通信エラーが発生しました。", "ai");
        });
    });
    div.appendChild(btn);
    
    chatBody.scrollTop = chatBody.scrollHeight;
}


// 施設名で施設情報を検索する
function searchFacilityByName(name) {
    document.getElementById("facilityInput").value = "";
    document.getElementById("autocompleteList").innerHTML = "";
    document.getElementById("chatBody").innerHTML = "";
    document.getElementById("mapArea").style.display = "none";
    markers.forEach(m => m.setMap(null));
    markers = [];
    map = null;

    addMessage(name + "を検索中...", "ai");

    fetch("/facility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.facility) {
            showFacility(data.facility);
        } else {
            addMessage("施設情報が見つかりませんでした。", "ai");
        }
    })
    .catch(() => {
        addMessage("通信エラーが発生しました。", "ai");
    });
}


// 施設候補リストを取得
document.getElementById("facilityInput").addEventListener("input", function() {
    const input = this.value;
    
    // 2文字以上入力されたら候補を取得
    if (input.length < 2) {
        document.getElementById("autocompleteList").innerHTML = "";
        return;
    }

    // 前のタイマーをキャンセルして、300ms後に実行する
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        try {
            const { suggestions } = await google.maps.places.AutocompleteSuggestion
                .fetchAutocompleteSuggestions({ input: input, language: "ja" });

            const list = document.getElementById("autocompleteList");
            list.innerHTML = "";

            if (!suggestions || suggestions.length === 0) return;
                
            // 駐車場っぽい名前を候補から除外する
            const filtered = suggestions.filter(s => {
                const text = s.placePrediction.text.text;
                return !text.includes("駐車場") &&
                    !text.includes("パーキング") &&
                    !text.includes("パーク");
            });

            filtered.forEach(suggestion => {
                const text = suggestion.placePrediction.text.text;
                const item = document.createElement("div");
                item.className = "autocomplete-item";
                item.textContent = text;
                item.addEventListener("click", () => {
                    document.getElementById("facilityInput").value = text;
                    list.innerHTML = "";
                    // 選んだら施設検索する
                    searchFacilityByName(text);
                });
                list.appendChild(item);
            });
            
        }catch(e){
            console.error("[Autocomplete Error]", e);
        }
    }, 300);
});



// ===== 駐車場関連 =====
// 駐車場のリストカードを画面に表示する
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


// 駐車場の地図とピンを表示する
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
        center: { lat: parkings[0].lat, lng: parkings[0].lng },
        mapId: "DEMO_MAP_ID"
    });

    // 赤い丸
    const pinElement = document.createElement("div");
    pinElement.style.cssText = `
        width: 16px; height: 16px;
        background: red; border: 2px solid darkred;
        border-radius: 50%;
    `;

    // 各駐車場にピンを立てる
    parkings.forEach((p, index)=> {
        if (p.lat && p.lng) {
            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: p.lat, lng: p.lng },
                map: map,
                title: p.name,
                content: pinElement
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



// ===== 履歴関連 =====
// 履歴に保存する
function saveHistory(facility) {
    const history = JSON.parse(localStorage.getItem("facilityHistory") || "[]");
    
    // 重複チェック（同じ施設は保存しない）
    if (!history.find(h => h.place_id === facility.place_id)) {
        history.unshift(facility);  // 先頭に追加
        history.splice(10);         // 最大10件まで
        localStorage.setItem("facilityHistory", JSON.stringify(history));
        renderHistory();
    }
}


// 履歴を表示する
function renderHistory() {
    const history = JSON.parse(localStorage.getItem("facilityHistory") || "[]");
    const historyArea = document.getElementById("historyArea");
    historyArea.innerHTML = "";

    history.forEach((facility, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "history-item";

        const btn = document.createElement("button");
        btn.textContent = facility.name;
        btn.className = "history-btn";
        btn.addEventListener("click", () => {
            showFacility(facility);
        });

        // 削除用×ボタン
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "x";
        deleteBtn.className = "history-delete-btn";
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();  // 施設検索が動かないようにする
            history.splice(index, 1);
            localStorage.setItem("facilityHistory", JSON.stringify(history));
            renderHistory();
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(deleteBtn);
        historyArea.appendChild(wrapper);
    });
}



// ===== GPS処理 =====
// 現在地周辺の駐車場を検索する
document.getElementById("gpsSearch").addEventListener("click", function() {
    navigator.geolocation.getCurrentPosition(
        function(position) {
        // GPSを取得成功した時の処理
        const lat = position.coords.latitude;   // 緯度
        const lng = position.coords.longitude;  // 経度

        // サーバーに緯度・経度を送る
        document.getElementById("chatBody").innerHTML = "";
        document.getElementById("mapArea").style.display = "none";
        markers.forEach(m => m.setMap(null));
        markers = [];
        map = null;
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



// ===== 音声入力 =====
if (recognition) {
    //認識結果をもらう
    recognition.onresult = function(event){
        const text = event.results[0][0].transcript;
        document.getElementById("chatInput").value = text;
    };

    // 録音が終わった時自動送信
    recognition.onend = function(){
        isRecording = false;
        const text = document.getElementById("chatInput").value;
        if (text.trim()) {
            document.getElementById("chatSend").click();
        }
    };

    // マイクボタンの処理
    document.getElementById("micBtn").addEventListener("click", function() {
        if (isRecording){
            recognition.stop();
            isRecording = false;
        } else {
            recognition.start();
            isRecording = true;
        }
    });
} else {
    // 非対応ブラウザではマイクボタンを隠す
    document.getElementById("micBtn").style.display = "none";
}


// ===== 初期化関連 =====
// 最初の挨拶文
function showWelcome() {
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = "welcome-message";
    div.textContent = "今日どこに行きたいですか？";
    chatBody.appendChild(div);
}


// 初期化
function initApp() {
    showWelcome();
    renderHistory();
}

initApp();