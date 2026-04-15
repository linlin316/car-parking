# チャット送受信・セッション管理・施設検索エンドポイント

from flask import Blueprint, request, jsonify, session
from services.ai_service  import text_to_ai
from services.maps_service import search_parking, get_facility_info


bp = Blueprint("chat", __name__)


# チャットエンドポイント
@bp.route("/chat", methods=["POST"])
def chat():
    # ユーザーメッセージもらう
    data = request.get_json(silent=True) or {}
    user_text = (data.get("message") or "").strip()

    if not user_text:
        return jsonify({"message": "メッセージを入力してください。"}), 200

    # メッセージを処理する
    result = handle_chat(user_text)

    print(f"[CHAT] source={result.get('source')}")

    return jsonify(result), 200



# チャットの処理（AI呼び出し・履歴管理・検索）
def handle_chat(user_text):
    history = session.get("history", [])
    selected_client = session.get("selected_client")

    # ユーザーのメッセージを履歴に追加する
    history.append({"role": "user", "content": user_text})

    result = text_to_ai(history, selected_client)

    # 場所があれば駐車場を検索する
    location = result.get("location")
    intent = result.get("intent")

    if not location:
        location = session.get("last_location")
        if location:
            result["ready_to_search"] = True
            if not result.get("intent"):
                result["intent"] = "parking"

    if location and result.get("ready_to_search") and intent:
        session["last_location"] = location
        if intent == "facility":
            facility = get_facility_info(location)
            result["facility"] = facility
            # 施設が見つかったときも履歴に追加する
            history.append({"role": "assistant", "content": result.get("message", "")})
        else:
            parkings = search_parking(location)
            result["parkings"] = parkings
            if parkings:
                # 駐車場名のリストを文字列にして履歴に追加する
                parking_names = "、".join([p["name"] for p in parkings])
                history.append({
                    "role": "assistant",
                    "content": result.get("message", "") + f"。見つかった駐車場：{parking_names}"
                })

            else:
                result["message"] = "条件に合う駐車場が見つかりませんでした。別の場所名でもう一度お試しください。"
                history.append({"role": "assistant", "content": result.get("message", "")})

    else:
        # 検索しないときも履歴に追加する
        history.append({"role": "assistant", "content": result.get("message", "")})

    #  直近10メッセージだけ保持する
    history = history[-10:]

    # セッションに保存する
    session["history"] = history

    return result



# リセットエンドポイント（会話履歴・検索状態をクリア）
@bp.route("/reset", methods=["POST"])
def reset():
    session["history"] = []
    session["search_state"] = {}
    return jsonify({"status": "ok"}), 200



# 施設検索エンドポイント
@bp.route("/facility", methods=["POST"])
def facility():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    
    if not name:
        return jsonify({"facility": None}), 200
    
    facility = get_facility_info(name)
    return jsonify({"facility": facility}), 200