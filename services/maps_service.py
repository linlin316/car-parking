import os
import requests


# 場所名を緯度・経度に変換する
def get_location(location):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    url = "https://maps.googleapis.com/maps/api/geocode/json"

    params = {
        "address": location,
        "key": api_key,
        "language": "ja"
    }

    response = requests.get(url, params=params)
    data = response.json()

    # 場所が見つからない場合
    if not data.get("results"):
        return None

    result = data["results"][0]["geometry"]["location"]

    return f"{result['lat']},{result['lng']}"


# 駐車場を探す
def  search_parking(location, radius=500):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    # 場所名を緯度・経度に変換
    latlng = get_location(location)

    # 場所が見つからない場合
    if not latlng:
        return []

    # Places APIで駐車場を検索
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    params = {
        "location": latlng,
        "keyword": "駐車場",
        "language": "ja",
        "key": api_key,
        "rankby": "distance",
    }

    response = requests.get(url, params=params)
    data = response.json()

    results = data.get("results", [])
    results = results[:10]

    parkings = []
    for place in results:
        parkings.append({
            "name": place.get("name", "名称不明"),
            "address": place.get("vicinity", "住所不明"),
            "place_id": place.get("place_id", ""),
            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
            "lng": place.get("geometry", {}).get("location", {}).get("lng"),
        })
    
    return parkings
