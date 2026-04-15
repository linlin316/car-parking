# 駐車場カードに小さく「メモを追加」ボタンだけ置いて、クリックしたら料金・台数だけ入力できるようにする

from flask import Blueprint, jsonify, request
import json
import os

bp = Blueprint("memo", __name__)

PATH = os.path.join(os.path.dirname(__file__), "../data/parkings_memo.json")


# メモを全件取得
@bp.route("/memo", methods=["GET"])
def get_memo():
    with open(PATH, "r", encoding="utf-8") as f:
        memo = json.load(f)
    return jsonify(memo)


# メモを保存
@bp.route("/memo/save", methods=["POST"])
def save_memo():
    data = request.get_json(silent=True) or {}
    place_id = data.get("place_id", "").strip()

    if not place_id:
        return jsonify({"success": False}), 400

    with open(PATH, "r", encoding="utf-8") as f:
        memo = json.load(f)

    memo[place_id] = {
        "fee": data.get("fee", ""),
        "capacity": data.get("capacity", ""),
        "note": data.get("note", ""),
    }

    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(memo, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})