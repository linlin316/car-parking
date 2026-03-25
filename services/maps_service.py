import os
import requests


EXCLUDE_WORDS = ["月極", "契約", "専用", "関係者", "予約制", "管理用", "従業員", "業者専用", "搬入用", "身障者"]


# 場所名を緯度・経度に変換する
def get_location(location):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    url = "https://maps.googleapis.com/maps/api/geocode/json"

    params = {
        "address": location,
        "key": api_key,
        "language": "ja"
    }
    
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
         print(f"[MAP ERROR] {e}")
         return None

    # 場所が見つからない場合
    if not data.get("results"):
        return None

    result = data["results"][0]["geometry"]["location"]

    return f"{result['lat']},{result['lng']}"


# 駐車場を探す
def  search_parking(location):
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
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
         print(f"[MAP ERROR] {e}")
         return []

    results = data.get("results", [])
    results = results[:10]

    parkings = []
    for place in results:
        name = place.get("name", "")
        if any(word in name for word in EXCLUDE_WORDS):
                continue
        parkings.append({
            "name": place.get("name", "名称不明"),
            "address": place.get("vicinity", "住所不明"),
            "place_id": place.get("place_id", ""),
            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
            "lng": place.get("geometry", {}).get("location", {}).get("lng"),
        })
    
    return parkings


# 現在地からGPS処理
def search_parking_by_latlng(lat, lng):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    latlng = f"{lat},{lng}"

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    params = {
        "location": latlng,
        "keyword": "駐車場",
        "language": "ja",
        "key": api_key,
        "rankby": "distance",
    }
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
         print(f"[MAP ERROR] {e}")
         return []

    results = data.get("results", [])
    results = results[:10]

    parkings = []
    for place in results:
        name = place.get("name", "")
        if any(word in name for word in EXCLUDE_WORDS):
                continue
        parkings.append({
            "name": place.get("name", "名称不明"),
            "address": place.get("vicinity", "住所不明"),
            "place_id": place.get("place_id", ""),
            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
            "lng": place.get("geometry", {}).get("location", {}).get("lng"),
        })
    
    return parkings