#駐車場検索エンドポイント（場所名・GPS座標）

from flask import Blueprint, request, jsonify
from services.maps_service import search_parking, search_parking_by_latlng


bp = Blueprint("search", __name__)


# 検索エンドポイント
@bp.route("/search", methods=["POST"])
def search():
    # メッセージ中の場所をもらう
    data = request.get_json(silent=True) or {}
    location = (data.get("location") or "").strip()
    
    result = handle_search(location)

    return jsonify(result), 200


# 検索処理
def handle_search(location):
    # 駐車場を検索する
    result = search_parking(location)
    return {"parkings": result, "location": location}


# GPS座標（緯度・経度）から駐車場を検索するエンドポイント
@bp.route("/search_by_location", methods=["POST"])
def search_by_location():
    data = request.get_json(silent=True) or {}
    try:
        lat = float(data.get("lat"))
        lng = float(data.get("lng"))
    except (TypeError, ValueError):
        return jsonify({"parkings": []}), 200

    parkings = search_parking_by_latlng(lat, lng)
    return jsonify({"parkings": parkings}), 200