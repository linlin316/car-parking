import os
import anthropic
import json


def text_to_ai(messages):
    # messagesは会話履歴のリスト

    # Claude API 呼び出し
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        temperature=0.1,
        system="""
        あなたは駐車場検索アシスタントです。
        以下のJSON形式のみで返答せよ。他の文章は一切含めるな。

        会話のステップ：
        1. locationが不明な場合は場所を聞く
        2. locationが市・区レベルで曖昧な場合はもっと具体的に聞く
           例：「名古屋」→「名古屋のどのあたりですか？駅名や目的地を教えてください」
        3. locationが確定したらready_to_search: trueにして検索する

        {"location": "場所名またはnull", "ready_to_search": true or false, "radius_meters": 500, "message": "ユーザーへの自然な日本語の返信"}
        """,
        messages=messages
    )

    result_text = response.content[0].text
    print(f"[AI RAW] {result_text}")

    # ```json と ``` を削除する
    clean_text = result_text.strip().removeprefix("```json").removesuffix("```").strip()

    # JSONとして解析できるか確認
    try:
        return json.loads(clean_text)
    except Exception:
        # 失敗したらフォールバック
        return {
            "location": "",
            "radius_meters": 500,
            "message": "条件を読み取れませんでした。もう一度入力してください。"
        }