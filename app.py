from flask import Flask, render_template
from dotenv import load_dotenv
import os

load_dotenv()

from routes.chat   import bp as chat_bp
from routes.search import bp as search_bp

app = Flask(__name__)
app.secret_key = os.environ["SECRET_KEY"]

app.register_blueprint(chat_bp)
app.register_blueprint(search_bp)

@app.route("/")
def index():
    return render_template("index.html", google_maps_key=os.environ["GOOGLE_MAPS_API_KEY"])

if __name__ == "__main__":
    app.run(debug=True)