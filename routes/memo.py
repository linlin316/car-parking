# 駐車場カードのメモ管理
# 料金・台数・メモ・非表示フラグを保存する

from flask import Blueprint, jsonify, request
import json
import os


bp = Blueprint("memo", __name__)


PATH = os.path.join(os.path.dirname(__file__), "../data/parkings_memo.json")


def load_memo():
    """
    メモファイルを読み込む
    ファイルがない・空・壊れている場合は空dictを返す
    """
    if not os.path.exists(PATH):
        return {}
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return {}
            return json.loads(content)
    except (json.JSONDecodeError, IOError):
        print("[MEMO] ファイルの読み込みに失敗しました。空のdictで続行します。")
        return {}


def save_memo_file(memo):
    """メモファイルに書き込む"""
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(memo, f, ensure_ascii=False, indent=2)


# メモを全件取得
@bp.route("/memo", methods=["GET"])
def get_memo():
    memo = load_memo()
    return jsonify(memo)


# メモを保存（料金・台数・メモ・非表示フラグ）
@bp.route("/memo/save", methods=["POST"])
def save_memo():
    data     = request.get_json(silent=True) or {}
    place_id = data.get("place_id", "").strip()
 
    if not place_id:
        return jsonify({"success": False}), 400
 
    memo = load_memo()
 
    memo[place_id] = {
        "fee":      data.get("fee", ""),
        "capacity": data.get("capacity", ""),
        "note":     data.get("note", ""),
        "hidden":   data.get("hidden", False),  # 非表示フラグ（Trueで次回から非表示）
    }
 
    save_memo_file(memo)
    return jsonify({"success": True})