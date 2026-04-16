# 客先情報エンドポイント

from flask import Blueprint, jsonify, request, session
from services.maps_service import get_location
from datetime import date
import json
import os


bp = Blueprint("clients", __name__)


PATH = os.path.join(os.path.dirname(__file__), "../data/clients.json")


def load_clients():
    """
    clients.json を読み込んで返す
    ファイルがない・空・壊れている場合は空リストを返す
    """
    if not os.path.exists(PATH):
        return []
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except (json.JSONDecodeError, IOError):
        print("[CLIENTS] ファイルの読み込みに失敗しました。空のリストで続行します。")
        return []
 
 
def save_clients(clients):
    """clients.json に書き込む"""
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)
 
 
def next_id(clients):
    """現在のリストから次の id を生成する（最大値 + 1）"""
    if not clients:
        return 1
    return max(c["id"] for c in clients) + 1
 
 
def find_client(clients, client_id):
    """id で客先を検索して返す。見つからなければ None"""
    return next((c for c in clients if c["id"] == client_id), None)


# 客先一覧取得
@bp.route("/clients", methods=["GET"])
def get_clients():
    clients = load_clients()
    return jsonify(clients)


# 客先追加
@bp.route("/clients/add", methods=["POST"])
def add_client():
    data = request.get_json(silent=True) or {}
 
    name    = data.get("name", "").strip()
    address = data.get("address", "").strip()
 
    # 名前と住所は必須
    if not name or not address:
        return jsonify({"success": False}), 400
 
    # 住所から座標を取得
    location = get_location(address)
    lat = location[0] if location else None
    lng = location[1] if location else None
 
    clients = load_clients()
 
    new_client = {
        "id":             next_id(clients),
        "name":           name,
        "address":        address,
        "parking":        data.get("parking", "不明"),
        "source_url":     data.get("source_url", ""),
        "confirmed_date": str(date.today()),
        "confirmed":      False,
        "lat":            lat,
        "lng":            lng,
    }
 
    clients.append(new_client)
    save_clients(clients)
 
    return jsonify({"success": True})
 
 
# 客先編集
@bp.route("/clients/edit", methods=["POST"])
def edit_client():
    data      = request.get_json(silent=True) or {}
    client_id = data.get("id")
    name      = data.get("name", "").strip()
    address   = data.get("address", "").strip()
 
    if client_id is None:
        return jsonify({"success": False}), 400
 
    clients = load_clients()
    target  = find_client(clients, client_id)
 
    if target is None:
        return jsonify({"success": False}), 404
 
    # 住所が変わった場合のみ座標を再取得
    if address != target["address"]:
        location = get_location(address)
        lat = location[0] if location else None
        lng = location[1] if location else None
    else:
        lat = target["lat"]
        lng = target["lng"]
 
    # id・confirmed・confirmed_date はそのまま引き継ぐ
    target.update({
        "name":       name,
        "address":    address,
        "parking":    data.get("parking", "不明"),
        "source_url": data.get("source_url", ""),
        "lat":        lat,
        "lng":        lng,
    })
 
    save_clients(clients)
    return jsonify({"success": True})
 
 
# 客先削除
@bp.route("/clients/delete", methods=["POST"])
def delete_client():
    data      = request.get_json(silent=True) or {}
    client_id = data.get("id")
 
    if client_id is None:
        return jsonify({"success": False}), 400
 
    clients = load_clients()
    target  = find_client(clients, client_id)
 
    if target is None:
        return jsonify({"success": False}), 404
 
    clients.remove(target)
    save_clients(clients)
 
    return jsonify({"success": True})
 
 
# セッションに客先を保存（AI へのコンテキスト提供用）
@bp.route("/clients/select", methods=["POST"])
def select_client():
    data = request.get_json(silent=True) or {}
    session["selected_client"] = data
    return jsonify({"success": True})