from flask import Blueprint, jsonify
import json
import os

bp = Blueprint("clients", __name__)

@bp.route("/clients", methods=["GET"])
def get_clients():
    path = os.path.join(os.path.dirname(__file__), "../data/clients.json")
    with open(path, "r", encoding="utf-8") as f:
        clients = json.load(f)
    return jsonify(clients)