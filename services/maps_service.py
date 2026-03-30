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


# Places API呼び出し・フィルタリング・結果整形(共用)
def search_by_latlng(latlng):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

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


# 駐車場を探す
def search_parking(location):
    latlng = get_location(location)

    # 場所が見つからない場合
    if not latlng:
        return []
    return search_by_latlng(latlng)


# 施設情報を取得する
def get_facility_info(facility_name):
    latlng = get_location(facility_name)
    if not latlng:
        return None
    return search_facility(latlng, facility_name)


# Places APIで施設情報取得
def search_facility(latlng, facility_name):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]
    
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    
    params = {
        "location": latlng,
        "rankby": "distance",
        "keyword": facility_name,
        "language": "ja",
        "key": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print (f"[MAP ERROR] {e}")
        return None
    
    results = data.get("results", [])
    if not results:
        return None
    
    place = results[0]

    place_id = place.get("place_id", "")

    # Place Details APIで詳細情報を取得
    details = get_place_details(place_id)
    if details:
        website = details.get("website")
        has_parking = details.get("has_parking")
    else:
        website = None
        has_parking = "確認できません"

    return {
        "name": place.get("name", "名称不明"),
        "address": place.get("vicinity", "住所不明"),
        "website": website,
        "has_parking": has_parking,
        "lat": place.get("geometry", {}).get("location", {}).get("lat"),
        "lng": place.get("geometry", {}).get("location", {}).get("lng"),
        "place_id": place_id,
    }


#Place Details APIを呼んで、HPと駐車場の有無を返す
def get_place_details(place_id):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    url = "https://maps.googleapis.com/maps/api/place/details/json"

    params = {
        "place_id": place_id,
        "fields": "website,wheelchair_accessible_entrance",
        "language": "ja",
        "key": api_key,
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[MAP ERROR] {e}")
        return None
    
    result = data.get("result", {})
    
    return {
        "website": result.get("website"),
        "has_parking": "確認できません",
    }


# GPS処理
def search_parking_by_latlng(lat, lng):
    # 現在の緯度・経度もらう
    latlng = f"{lat},{lng}"
    return search_by_latlng(latlng)