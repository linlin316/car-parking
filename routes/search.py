#駐車場検索エンドポイント

from flask import Blueprint, request, jsonify
from services.maps_service import search_parking_by_latlng


bp = Blueprint("search", __name__)


# 緯度・経度から駐車場を検索するエンドポイント
# 客先ボタン・GPSボタンから呼ばれる
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