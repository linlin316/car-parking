from flask import Blueprint, jsonify, request
from services.maps_service import get_location
from datetime import date
import json
import os


bp = Blueprint("clients", __name__)


# 客先、施設情報検索
@bp.route("/clients", methods=["GET"])
def get_clients():
    path = os.path.join(os.path.dirname(__file__), "../data/clients.json")
    with open(path, "r", encoding="utf-8") as f:
        clients = json.load(f)
    return jsonify(clients)


# 客先、施設情報追加
@bp.route("/clients/add", methods=["POST"])
def add_client():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    address = data.get("address", "").strip()

    # 名前と住所は必須
    if not name or not address:
        return jsonify({"success": False}), 400
    
    # 住所から座標を取得
    location = get_location(address)
    lat = location[0] if location else None
    lng = location[1] if location else None

    path = os.path.join(os.path.dirname(__file__), "../data/clients.json")
    with open(path, "r", encoding="utf-8") as f:
        clients = json.load(f)

    new_client = {
        "name": name,
        "address": address,
        "parking": data.get("parking", "不明"),
        "source_url": data.get("source_url", ""),
        "confirmed_date": str(date.today()),
        "confirmed": False,
        "lat": lat,
        "lng": lng,
    }

    clients.append(new_client)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})


# 客先、施設情報削除
@bp.route("/clients/delete", methods=["POST"])
def delete_client():
    data = request.get_json(silent=True) or {}
    index = data.get("index")

    if index is None:
        return jsonify({"success": False}), 400

    path = os.path.join(os.path.dirname(__file__), "../data/clients.json")
    with open(path, "r", encoding="utf-8") as f:
        clients = json.load(f)

    if index < 0 or index >= len(clients):
        return jsonify({"success": False}), 400

    clients.pop(index)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})