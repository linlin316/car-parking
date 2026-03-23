from flask import Blueprint, request, jsonify
from services.maps_service import search_parking


bp = Blueprint("search", __name__)


@bp.route("/search", methods=["POST"])
def search():
    # メッセージ中の場所をもらう
    data = request.get_json(silent=True) or {}
    location = (data.get("location") or "").strip()
    
    # 場所探す
    result = handle_search(location)

    return jsonify(result), 200


def handle_search(location):
    # 駐車場を検索する
    result = search_parking(location)
    return {"parkings": result, "location": location}