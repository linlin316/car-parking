// ===== 変数宣言 =====
// 地図関連
let map = null;
let markers = [];
let activeInfoWindow = null;
let infoWindows = [];


// 音声入力関連
let isRecording = false;


// ブラウザが音声入力に対応しているか確認する
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if(recognition) {
    recognition.lang = "ja-JP";        // 日本語
    recognition.continuous = false;    // 一回で止まる
}


// ===== チャット =====
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
    if (e.key === "Enter" && !e.isComposing){
        document.getElementById("chatSend").click();
    }
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



// ===== 客先、施設関連 =====
// 客先、施設情報
function showFacility(facility) {
    document.querySelectorAll(".facility-card").forEach(el => el.remove());

    const chatBody = document.getElementById("chatBody");
    chatBody.innerHTML = "";

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
            btn.disabled = false;
        });
    });
    div.appendChild(btn);
    
    chatBody.scrollTop = chatBody.scrollHeight;
}


// 客先、施設情報ボタンを表示する
function renderClients() {
    fetch("/clients")
    .then(res => res.json())
    .then(clients => {
        const area = document.getElementById("clientArea");
        area.innerHTML = "";
        clients.forEach((client, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "history-item";

            const btn = document.createElement("button");
            btn.textContent = client.name;
            btn.className = "history-btn";
            btn.addEventListener("click", () => {
                showClient(client);
            });

            // 削除用×ボタン
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "x";
            deleteBtn.className = "history-delete-btn";
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteClient(index);
            });

            wrapper.appendChild(btn);
            wrapper.appendChild(deleteBtn);
            area.appendChild(wrapper);
        });
    })
    .catch(() => {
        console.error("客先データの取得に失敗しました。");
    });
}


// 客先、施設情報を表示する
function showClient(client) {
    const chatBody = document.getElementById("chatBody");
    chatBody.innerHTML = "";

    const welcome = document.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const div = document.createElement("div");
    div.className = "facility-card";

    const name = document.createElement("strong");
    name.textContent = client.name;

    const address = document.createElement("p");
    address.textContent = client.address;

    // 駐車場情報
    const parking = document.createElement("p");
    parking.textContent = "駐車場：" + client.parking;

    // 確認状態
    const confirmed = document.createElement("p");
    confirmed.textContent = client.confirmed ? "✅ 確認済み（" + client.confirmed_date + "）" : "⚠️ 未確認";

    // 情報元URL
    const link = document.createElement("a");
    link.href = client.source_url;
    link.target = "_blank";
    link.textContent = "情報元を見る";

    div.appendChild(name);
    div.appendChild(address);
    div.appendChild(parking);
    div.appendChild(confirmed);
    div.appendChild(link);
    div.appendChild(document.createElement("br"));

    // Googleマップへのリンク
    const mapsLink = document.createElement("a");
    mapsLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(client.address);
    mapsLink.target = "_blank";
    mapsLink.textContent = "Googleマップで見る";
    div.appendChild(mapsLink);

    chatBody.appendChild(div);

    // 駐車場が「なし」または「不明」の場合は周辺検索ボタンを表示
    if (client.parking !== "あり") {
        const btn = document.createElement("button");
        btn.textContent = "周辺の駐車場を探す";
        btn.className = "nearby-btn";
        btn.addEventListener("click", () => {
            btn.disabled = true;
            addMessage("周辺の駐車場を探します。", "ai");
            fetch("/search_by_location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat: client.lat, lng: client.lng }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.parkings && data.parkings.length > 0) {
                    setTimeout(() => showParkings(data.parkings), 1500);
                } else {
                    addMessage("近くの駐車場が見つかりませんでした。", "ai");
                }
            })
            .catch(() => {
                addMessage("通信エラーが発生しました。", "ai");
                btn.disabled = false;
            });
        });
        div.appendChild(btn);
    }

    chatBody.scrollTop = chatBody.scrollHeight;
}


// 客先、施設情報を追加ボタン
document.getElementById("addClient").addEventListener("click", function() {
    const chatBody = document.getElementById("chatBody");
    chatBody.innerHTML = "";

    const welcome = document.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const div = document.createElement("div");
    div.className = "facility-card";

    // タイトル
    const title = document.createElement("strong");
    title.textContent = "客先を追加";
    div.appendChild(title);

    // 入力フィールドを作る関数
    function createInput(labelText, id, placeholder) {
        const label = document.createElement("p");
        label.textContent = labelText;
        const input = document.createElement("input");
        input.type = "text";
        input.id = id;
        input.placeholder = placeholder;
        input.style.width = "100%";
        div.appendChild(label);
        div.appendChild(input);
    }

    createInput("施設名", "input-name", "株式会社〇〇");
    createInput("住所", "input-address", "愛知県名古屋市...");
    createInput("情報元URL", "input-url", "https://...");

    // 駐車場
    const parkingLabel = document.createElement("p");
    parkingLabel.textContent = "駐車場";
    const select = document.createElement("select");
    select.id = "input-parking";
    ["あり", "なし", "不明"].forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
    div.appendChild(parkingLabel);
    div.appendChild(select);

    // 保存ボタン
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.className = "nearby-btn";
    saveBtn.addEventListener("click", () => {
        saveClient();
    });
    div.appendChild(saveBtn);

    chatBody.appendChild(div);
});


// 客先、施設情報を保存する
function saveClient() {
    const name = document.getElementById("input-name").value.trim();
    const address = document.getElementById("input-address").value.trim();
    const url = document.getElementById("input-url").value.trim();
    const parking = document.getElementById("input-parking").value;

    // 名前と住所は必須
    if (!name || !address) {
        alert("施設名と住所は必須です。");
        return;
    }

    fetch("/clients/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            address: address,
            source_url: url,
            parking: parking,
        }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            addMessage("客先を追加しました。", "ai");
            renderClients();
        } else {
            addMessage("保存に失敗しました。", "ai");
        }
    })
    .catch(() => {
        addMessage("通信エラーが発生しました。", "ai");
    });
}


// 客先、施設情報を削除する
function deleteClient(index) {
    fetch("/clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: index }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            renderClients();
        } else {
            addMessage("削除に失敗しました。", "ai");
        }
    })
    .catch(() => {
        addMessage("通信エラーが発生しました。", "ai");
    });
}


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
        link.addEventListener("click", (e) =>{
            e.stopPropagation();
        });
        div.appendChild(link);

        // カードをクリックしたら地図をフォーカスする
        div.addEventListener("click", () => {
            if (map && p.lat && p.lng){
                map.panTo({ lat: p.lat, lng: p.lng});
                map.setZoom(17);

                if (activeInfoWindow) activeInfoWindow.close();
                infoWindows[index].open(map, markers[index]);
                activeInfoWindow = infoWindows[index];

                document.querySelectorAll(".parking-card").forEach(c => c.style.backgroundColor = "");
                div.style.backgroundColor = '#63BB5B';
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
    infoWindows = [];
    
    // 地図エリアを表示する
    const mapArea = document.getElementById("mapArea");
    mapArea.style.display = "block";

    // 最初の駐車場を中心に地図を表示する
    map = new google.maps.Map(mapArea, {
        zoom: 15,
        center: { lat: parkings[0].lat, lng: parkings[0].lng },
        mapId: "DEMO_MAP_ID"
    });

    // 各駐車場にピンを立てる
    parkings.forEach((p, index)=> {
        if (p.lat && p.lng) {
            // 赤い丸
            const pinElement = document.createElement("div");
            pinElement.style.cssText= `
                width: 16px; height: 16px;
                background: red; border: 2px solid darkred;
                border-radius: 50%;
            `;

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
            infoWindows.push(infoWindow);

            marker.addListener("gmp-click", () => {
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
    renderClients();
}

initApp();