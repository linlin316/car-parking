// client.js - 客先・施設管理
// 客先の一覧表示・追加・編集・削除・検索絞り込み


 
/**
 * ヘッダーの客先ボタン一覧を再描画する
 * 検索ボックスの入力内容で絞り込む
 * 追加・削除・編集の後に必ず呼ぶ
 */
function renderClients() {
    fetch("/clients")
        .then(res => res.json())
        .then(clients => {
            const area = document.getElementById("clientArea");
            area.innerHTML = "";
 
            const query = document.getElementById("clientSearch").value.toLowerCase();
            const filtered = clients.filter(c => c.name.toLowerCase().includes(query));

            filtered.forEach(client => {
                // ボタン＋削除×のセット
                const wrapper = document.createElement("div");
                wrapper.className = "history-item";
 
                const btn = document.createElement("button");
                btn.textContent = client.name;
                btn.className = "history-btn";
                btn.addEventListener("click", () => showClient(client));
 
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "x";
                deleteBtn.className = "history-delete-btn";
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteClient(client.id);
                });
 
                wrapper.appendChild(btn);
                wrapper.appendChild(deleteBtn);
                area.appendChild(wrapper);
            });
        })
        .catch(() => console.error("客先データの取得に失敗しました。"));
}
 
 
/**
 * 選択した客先の詳細カードを表示する
 * @param {Object} client - 客先データ
 */
function showClient(client) {
    resetChatBody();
    resetMap();
 
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = "facility-card";
 
    // 基本情報
    const name = document.createElement("strong");
    name.textContent = client.name;
 
    const address = document.createElement("p");
    address.textContent = client.address;
 
    const parking = document.createElement("p");
    parking.textContent = "駐車場：" + client.parking;
 
    // 確認状態（済み or 未確認）
    const confirmed = document.createElement("p");
    confirmed.textContent = client.confirmed
        ? "✅ 確認済み（" + client.confirmed_date + "）"
        : "⚠️ 未確認";
 
    // 情報元URL
    const sourceLink = document.createElement("a");
    sourceLink.href = client.source_url;
    sourceLink.target = "_blank";
    sourceLink.textContent = "情報元を見る";
    sourceLink.className = "link-btn";
 
    // Googleマップリンク
    const mapsLink = document.createElement("a");
    mapsLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(client.address);
    mapsLink.target = "_blank";
    mapsLink.textContent = "Googleマップで見る";
    mapsLink.className = "link-btn";
 
    div.appendChild(name);
    div.appendChild(address);
    div.appendChild(parking);
    div.appendChild(confirmed);
    div.appendChild(sourceLink);
    div.appendChild(mapsLink);
 
    // 編集ボタン
    const editBtn = document.createElement("button");
    editBtn.textContent = "編集";
    editBtn.className = "edit-btn";
    editBtn.addEventListener("click", () => showClientForm("edit", client));
    div.appendChild(editBtn);
 
    // 周辺駐車場検索ボタン
    const nearbyBtn = document.createElement("button");
    nearbyBtn.textContent = "周辺の駐車場を探す";
    nearbyBtn.className = "nearby-btn";
    nearbyBtn.addEventListener("click", () => {
        nearbyBtn.disabled = true;
        addMessage("周辺の駐車場を探します。", "ai");
        searchAndShowParkingsByLatLng(client.lat, client.lng, nearbyBtn);
    });
    div.appendChild(nearbyBtn);
 
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}
 
 
/**
 * 客先の追加・編集フォームを表示する
 * mode="add" または mode="edit" で共用
 * @param {string} mode     - "add" または "edit"
 * @param {Object} [client] - 編集時の既存データ
 */
function showClientForm(mode, client = {}) {
    resetChatBody();
    resetMap();
 
    const isEdit = mode === "edit";
    const chatBody = document.getElementById("chatBody");
    const div = document.createElement("div");
    div.className = "facility-card";
 
    // タイトル
    const title = document.createElement("strong");
    title.textContent = isEdit ? "客先を編集" : "客先を追加";
    div.appendChild(title);
 
    // 入力フィールド（編集時は既存値、追加時はplaceholder）
    createInputField(div, "施設名または会社名", "input-name",    isEdit ? client.name       : "〇〇ビル、株式会社〇〇",      isEdit);
    createInputField(div, "住所",              "input-address", isEdit ? client.address    : "愛知県名古屋市...", isEdit);
    createInputField(div, "情報元URL(任意)",   "input-url",     isEdit ? client.source_url : "https://...",       isEdit);
    createParkingSelect(div, isEdit ? client.parking : "");

    // 確認済みチェックボックス（編集時のみ表示）
    if (isEdit) {
    const label = document.createElement("p");
    label.textContent = "確認済み";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "input-confirmed";
    checkbox.checked = client.confirmed || false;
    div.appendChild(label);
    div.appendChild(checkbox);
    }
 
    // 保存ボタン
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.className = "nearby-btn";
    saveBtn.addEventListener("click", () => {
        isEdit ? updateClient(client.id) : saveClient();
    });
    div.appendChild(saveBtn);
 
    chatBody.appendChild(div);
}
 
 
/**
 * 新しい客先をサーバーに保存する
 */
function saveClient() {
    const name    = document.getElementById("input-name").value.trim();
    const address = document.getElementById("input-address").value.trim();
 
    if (!name || !address) {
        alert("施設名と住所は必須です。");
        return;
    }
 
    apiFetch("/clients/add", {
        name,
        address,
        source_url: document.getElementById("input-url").value.trim(),
        parking:    document.getElementById("input-parking").value,
    })
    .then(data => {
        if (data.success) {
            addMessage("客先を追加しました。", "ai");
            renderClients();
        } else {
            addMessage("保存に失敗しました。", "ai");
        }
    })
    .catch(() => addMessage("通信エラーが発生しました。", "ai"));
}
 
 
/**
 * 既存の客先情報を更新する
 * @param {number} clientId - 更新対象の客先 id
 */
function updateClient(clientId) {
    apiFetch("/clients/edit", {
        id:         clientId,
        name:       document.getElementById("input-name").value.trim(),
        address:    document.getElementById("input-address").value.trim(),
        source_url: document.getElementById("input-url").value.trim(),
        parking:    document.getElementById("input-parking").value,
        confirmed:  document.getElementById("input-confirmed").checked,
    })
    .then(data => {
        if (data.success) {
            addMessage("客先を編集しました。", "ai");
            renderClients();
        } else {
            addMessage("編集に失敗しました。", "ai");
        }
    })
    .catch(() => addMessage("通信エラーが発生しました。", "ai"));
}
 
 
/**
 * 客先を削除する
 * @param {number} clientId - 削除対象の客先 id
 */
function deleteClient(clientId) {
    apiFetch("/clients/delete", { id: clientId })
        .then(data => {
            if (data.success) {
                renderClients();
            } else {
                addMessage("削除に失敗しました。", "ai");
            }
        })
        .catch(() => addMessage("通信エラーが発生しました。", "ai"));
}
 
 
// 客先追加ボタンのクリックイベント
document.getElementById("clientSearch").addEventListener("input", renderClients);
document.getElementById("addClient").addEventListener("click", function () {
    showClientForm("add");
});