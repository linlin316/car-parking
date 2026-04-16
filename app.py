# Flaskアプリの初期化・ルーティング設定

from flask import Flask, render_template
from dotenv import load_dotenv
import os
import json

# .envファイルから環境変数を読み込む
load_dotenv()


from routes.search import bp as search_bp
from routes.clients import bp as clients_bp
from routes.memo import bp as memo_bp


app = Flask(__name__)
app.secret_key = os.environ["SECRET_KEY"]


# Blueprint登録
app.register_blueprint(search_bp)
app.register_blueprint(clients_bp)
app.register_blueprint(memo_bp)


# ===== 起動時の初期化処理 =====

# data/ フォルダがなければ作成する
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)


# 存在しない場合に自動生成するファイルと初期値の定義
INITIAL_FILES = {
    "clients.json":        [],   # 客先リスト（空リスト）
    "parkings_memo.json":  {},   # 駐車場メモ（空dict）
    "parkings_cache.json": {},   # 検索キャッシュ（空dict）
}

for filename, initial_value in INITIAL_FILES.items():
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(initial_value, f, ensure_ascii=False, indent=2)
        print(f"[INIT] {filename} を作成しました。")


# ===== ルーティング =====

# ホームページ
@app.route("/")
def index():
    return render_template("index.html", google_maps_key=os.environ["GOOGLE_MAPS_API_KEY"])

if __name__ == "__main__":
    app.run (debug=True)