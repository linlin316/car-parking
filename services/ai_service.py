#  Claude APIを呼び出して意図・場所を解析する

import os
import anthropic
import json
import re


# claude api 会話
def text_to_ai(messages, selected_client=None):
    # messagesは会話履歴のリスト

    # Claude API 呼び出し
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # 客先情報をシステムプロンプトに追加
    client_info = ""
    if selected_client:
        client_info = f"""
        現在選択中の客先：
        - 名前: {selected_client.get("name")}
        - 住所: {selected_client.get("address")}
        - 駐車場: {selected_client.get("parking")}
        """

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        temperature=0.1,
        system="""
        あなたは駐車場・施設検索アシスタントです。
        以下のJSON形式のみで返答せよ。他の文章は一切含めるな。

        intentの種類：
        - "facility": 施設名を指定して、その施設自体の情報を調べたい場合
        - "parking": 特定の場所の周辺駐車場を探したい場合（「他の駐車場」も含む）

        会話のステップ：
        1. locationが不明な場合は場所を聞く
        2. locationが市・区レベルで曖昧な場合はもっと具体的に聞く
        3. locationが確定したらready_to_search: trueにして検索する

        messageのルール：
        - 検索結果について話す場合は「再検索しました。」など一言だけにする
        - 駐車場名を列挙しない
        - 短く自然な日本語で返す
        """ + client_info + """

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