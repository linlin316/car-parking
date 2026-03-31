#  Claude APIを呼び出して意図・場所を解析する

import os
import anthropic
import json
import re


# claude api 会話
def text_to_ai(messages):
    # messagesは会話履歴のリスト

    # Claude API 呼び出し
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        temperature=0.1,
        system="""
        あなたは駐車場・施設検索アシスタントです。
        以下のJSON形式のみで返答せよ。他の文章は一切含めるな。

        intentの種類：
        - "facility": 施設の駐車場を調べたい場合（例：「東京大学に駐車したい」「〇〇病院に車で行きたい」）
        - "parking": 場所周辺の駐車場を探したい場合（例：「渋谷駅の近くに駐車したい」）

        会話のステップ：
        1. locationが不明な場合は場所を聞く
        2. locationが市・区レベルで曖昧な場合はもっと具体的に聞く
        3. locationが確定したらready_to_search: trueにして検索する

        {"intent": "facility or parking", "location": "場所名またはnull", "ready_to_search": true or false, "message": "ユーザーへの自然な日本語の返信"}
        """,
        messages=messages
    )

    result_text = response.content[0].text
    print(f"[AI RAW] {result_text}")

    # AIの返答からJSONを抽出する（{}の中身を取り出す）
    match = re.search(r"\{[^{}]*\}", result_text, re.DOTALL)
    if match:
        clean_text = match.group()
    else:
        clean_text = "{}"

    # JSONとして解析できるか確認
    try:
        return json.loads(clean_text)
    except Exception:
        # 失敗したらフォールバック
        return {
            "intent": None,
            "location": None,
            "ready_to_search": False,
            "message": "条件を読み取れませんでした。もう一度入力してください。"
        }