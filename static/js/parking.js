// parking.js - 駐車場カード・メモ管理
// 駐車場リストの表示・メモの編集・保存・非表示フラグ管理

 
/**
 * 緯度・経度で駐車場を検索して結果を表示する
 * showFacility・showClient の「近くを探す」ボタンから呼ぶ
 * @param {number}      lat - 緯度
 * @param {number}      lng - 経度
 * @param {HTMLElement} btn - 呼び出し元ボタン（エラー時に再活性化）
 */
function searchAndShowParkingsByLatLng(lat, lng, btn) {
    apiFetch("/search_by_location", { lat, lng })
        .then(data => {
            if (data.parkings?.length > 0) {
                setTimeout(() => showParkings(data.parkings), 1500);
            } else {
                addMessage("近くの駐車場が見つかりませんでした。", "ai");
                btn.disabled = false;
            }
        })
        .catch(() => {
            addMessage("通信エラーが発生しました。", "ai");
            btn.disabled = false;
        });
}
 
 
/**
 * 駐車場カードの一覧を表示し、地図も描画する
 * hidden フラグが true のものは表示しない
 * @param {Array} parkings - 駐車場データの配列
 */
function showParkings(parkings) {
    document.querySelectorAll(".parking-card").forEach(c => c.remove());
    const chatBody = document.getElementById("chatBody");
 
    fetch("/memo")
        .then(res => res.json())
        .then(memoData => {
            // hidden フラグが true のものを除外する
            const visibleParkings = parkings.filter(p => {
                const memo = memoData[p.place_id];
                return !memo?.hidden;
            });
 
            if (visibleParkings.length === 0) {
                addMessage("表示できる駐車場がありません。メモから非表示を解除してください。", "ai");
                return;
            }
 
            // 非表示件数をメッセージで伝える
            const hiddenCount = parkings.length - visibleParkings.length;
            if (hiddenCount > 0) {
                addMessage(`${hiddenCount}件の駐車場を非表示にしています。`, "ai");
            }
 
            visibleParkings.forEach((p, index) => {
                const card = createParkingCard(p, index, memoData, parkings);
                chatBody.appendChild(card);
            });
 
            chatBody.scrollTop = chatBody.scrollHeight;
            showMap(visibleParkings);
        })
        .catch(() => addMessage("メモデータの取得に失敗しました。", "ai"));
}
 
 
/**
 * 駐車場カード要素を生成して返す
 * @param {Object} p        - 駐車場データ
 * @param {number} index    - 表示順のインデックス
 * @param {Object} memoData - 全メモデータ（place_id をキーとする）
 * @param {Array}  parkings - 全駐車場データ（メモ保存後の再描画用）
 * @returns {HTMLElement} 生成したカード要素
 */
function createParkingCard(p, index, memoData, parkings) {
    const div = document.createElement("div");
    div.className = "parking-card";
    div.style.cursor = "pointer";
    div.id = "card-" + index;
 
    // 名前・住所
    const name = document.createElement("strong");
    name.textContent = p.name;
 
    const address = document.createElement("p");
    address.textContent = p.address;
 
    div.appendChild(name);
    div.appendChild(address);
 
    // メモがあれば料金・台数・メモを表示
    const memo = memoData[p.place_id];
    if (memo) {
        const memoDiv = document.createElement("p");
        memoDiv.style.color = "gray";
        memoDiv.style.fontSize = "0.9em";
        let memoText = "";
        if (memo.fee)      memoText += "💰 " + memo.fee + "　";
        if (memo.capacity) memoText += "🚗 " + memo.capacity + "　";
        if (memo.note)     memoText += "📝 " + memo.note;
        memoDiv.textContent = memoText;
        div.appendChild(memoDiv);
    }
 
    // Googleマップリンク
    const mapsLink = document.createElement("a");
    mapsLink.href = "https://www.google.com/maps/place/?q=place_id:" + p.place_id;
    mapsLink.target = "_blank";
    mapsLink.textContent = "Googleマップで見る";
    mapsLink.className = "link-btn";
    mapsLink.addEventListener("click", e => e.stopPropagation());
    div.appendChild(mapsLink);
 
    // メモ編集ボタン
    const memoBtn = document.createElement("button");
    memoBtn.textContent = "メモを編集";
    memoBtn.className = "memo-btn";
    memoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showMemoForm(p.place_id, memoData[p.place_id] || {}, div, parkings);
    });
    div.appendChild(memoBtn);
 
    // カードをクリックしたら地図の対応ピンにフォーカスする
    div.addEventListener("click", () => focusMarker(index, p));
 
    return div;
}
 
 
/**
 * メモ編集フォームをカード内に開閉する（トグル動作）
 * @param {string}      place_id - 駐車場のplace_id
 * @param {Object}      memo     - 現在のメモデータ
 * @param {HTMLElement} card     - 親カード要素
 * @param {Array}       parkings - 全駐車場データ（保存後の再描画用）
 */
function showMemoForm(place_id, memo, card, parkings) {
    // すでに開いていれば閉じる
    const existing = card.querySelector(".memo-form");
    if (existing) {
        existing.remove();
        return;
    }
 
    const form = document.createElement("div");
    form.className = "memo-form";
 
    // メモ用入力フィールドを生成（クリックがカードに伝播しないよう stopPropagation）
    function createMemoField(labelText, value) {
        const label = document.createElement("p");
        label.textContent = labelText;
 
        const input = document.createElement("input");
        input.type = "text";
        input.value = value || "";
        input.style.width = "100%";
        input.addEventListener("click", e => e.stopPropagation());
 
        form.appendChild(label);
        form.appendChild(input);
        return input;
    }
 
    const feeInput      = createMemoField("料金", memo.fee);
    const capacityInput = createMemoField("台数", memo.capacity);
    const noteInput     = createMemoField("メモ", memo.note);
 
    // メモを保存する共通関数（hidden フラグだけ切り替える）
    function saveMemo(hidden) {
        apiFetch("/memo/save", {
            place_id,
            fee:      feeInput.value,
            capacity: capacityInput.value,
            note:     noteInput.value,
            hidden:   hidden,
        })
        .then(data => {
            if (data.success) {
                form.remove();
                showParkings(parkings);
            }
        })
        .catch(() => addMessage("通信エラーが発生しました。", "ai"));
    }
 
    // ボタン行
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex; gap:8px; margin-top:8px;";

    // 保存ボタン
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.className = "nearby-btn";
    saveBtn.style.flex = "1";
    saveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        saveMemo(false);
    });
 
    // 非表示ボタン（hidden: true でメモも保存して非表示に）
    const hideBtn = document.createElement("button");
    hideBtn.textContent = "🚫 非表示にする";
    hideBtn.className = "edit-btn";
    hideBtn.style.flex = "1";
    hideBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        saveMemo(true);
    });

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(hideBtn);
    form.appendChild(btnRow);
    card.appendChild(form);
}