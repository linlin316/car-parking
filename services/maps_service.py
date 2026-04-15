# Google Maps API（Geocoding・Places）を呼び出す

import os
import requests


# 検索結果から除外するキーワード（月極・専用駐車場など）
EXCLUDE_WORDS = ["月極", "契約", "専用", "関係者", "予約制", "管理用", "従業員", "業者専用", "搬入用", "身障者"]



# ===== Geocoding API =====
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
    except requests.exceptions.RequestException as e:
        print(f"[MAP ERROR] {e}")
        return None

    # 場所が見つからない場合
    if not data.get("results"):
        return None

    result = data["results"][0]["geometry"]["location"]

    return result["lat"], result["lng"]  # タプルで返す



# ===== Nearby Search(New) =====
# フィルタリング・結果整形(共用)
def search_by_latlng(lat, lng):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    url = "https://places.googleapis.com/v1/places:searchNearby"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,

        # 必要なフィールドだけ指定するとコストを抑えられる（Essentials SKU）
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
    }

    # ボディにJSON形式でパラメータを指定する
    body = {
        "includedTypes": ["parking"],  # 駐車場に絞る
        "maxResultCount": 20,          # 多めに取得してフィルタリング後に10件にする
        "rankPreference": "DISTANCE",  # 近い順
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": lat,
                    "longitude": lng
                },
                "radius" : 1000.0      # 半径500m以内
            }
        },
        "languageCode": "ja"
    }

    try:
        response = requests.post(url, headers=headers, json=body, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[MAP ERROR] {e}")
        return []

    results = data.get("places", [])

    parkings = []
    for place in results:
        name = place.get("displayName", {}).get("text", "")
        if any(word in name for word in EXCLUDE_WORDS):
                continue
        
        parkings.append({
            "name": name or "名称不明",
            "address": place.get("formattedAddress", "住所不明"),
            "place_id": place.get("id", ""),
            "lat": place.get("location", {}).get("latitude"),
            "lng": place.get("location", {}).get("longitude"),
        })

        # フィルタリング後に10件に絞る
        if len(parkings) >= 10:
            break
    
    return parkings



# 駐車場を探す
def search_parking(location):
    result = get_location(location)

    # 場所が見つからない場合
    if not result:
        return []
    
    lat, lng = result  # タプルから取り出す
    return search_by_latlng(lat, lng)


# 施設情報を取得する
def get_facility_info(facility_name):
    return search_facility(facility_name)



# Places API (New) で施設情報取得
def search_facility(facility_name):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    # searchTextは施設名のテキストで検索できる
    url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
    }

    body = {
        "textQuery": facility_name,  # 施設名で検索
        "pageSize": 1,
        "languageCode": "ja",
    }

    try:
        response = requests.post(url, headers=headers, json=body, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print (f"[MAP ERROR] {e}")
        return None
    
    results = data.get("places", [])
    if not results:
        return None
    
    place = results[0]
    place_id = place.get("id", "")


    # Place Details APIで詳細情報を取得
    details = get_place_details(place_id)
    website = details.get("website") if details else None

    return {
        "name": place.get("displayName", {}).get("text", "名称不明"),
        "address": place.get("formattedAddress", "住所不明"),
        "website": website,
        "has_parking": "確認できません",
        "lat": place.get("location", {}).get("latitude"),
        "lng": place.get("location", {}).get("longitude"),
        "place_id": place_id,
    }



#Place Details APIを呼んでHPを取得
def get_place_details(place_id):
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]

    # APIはURLにplace_idを直接埋め込む
    url = f"https://places.googleapis.com/v1/places/{place_id}"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "websiteUri"
    }

    params = {
        "languageCode": "ja"
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[MAP ERROR] {e}")
        return None
    
    return {
        "website": data.get("websiteUri"),  # websiteからwebsiteUriへ
    }



# 現在の緯度・経度から検索する
def search_parking_by_latlng(lat, lng):
    return search_by_latlng(lat, lng)