from flask import Blueprint, request, jsonify, session
from services.ai_service  import text_to_ai
from services.maps_service import search_parking, get_facility_info


bp = Blueprint("chat", __name__)


@bp.route("/chat", methods=["POST"])
def chat():
    # ユーザーメッセージもらう
    data = request.get_json(silent=True) or {}
    user_text = (data.get("message") or "").strip()

    # メッセージを処理する
    result = handle_chat(user_text)

    print(f"[CHAT] source={result.get('source')}")

    return jsonify(result), 200


def handle_chat(user_text):
    # セッションから会話履歴を取得する
    history = session.get("history", [])

    # ユーザーのメッセージを履歴に追加する
    history.append({"role": "user", "content": user_text})

    # AIに会話履歴を渡す
    result = text_to_ai(history)

    # AIの返答を履歴に追加する
    history.append({"role": "assistant", "content": result.get("message", "")})

    #  直近10メッセージだけ保持する
    history = history[-10:]

    # セッションに保存する
    session["history"] = history

    # 場所があれば駐車場を検索する
    location = result.get("location")
    intent = result.get("intent")
    if location and result.get("ready_to_search"):
        if intent == "facility":
            facility = get_facility_info(location)
            result["facility"] = facility
        else:
            parkings = search_parking(location)
            result["parkings"] = parkings
            if len(parkings) == 0:
                result["message"] = "条件に合う駐車場が見つかりませんでした。別の場所名でもう一度お試しください。"
    return result


@bp.route("/reset", methods=["POST"])
def reset():
    session["history"] = []
    session["search_state"] = {}
    return jsonify({"status": "ok"}), 200


# 施設
@bp.route("/facility", methods=["POST"])
def facility():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    
    if not name:
        return jsonify({"facility": None}), 200
    
    facility = get_facility_info(name)
    return jsonify({"facility": facility}), 200