# Google Maps API（Geocoding・Places）を呼び出す

import os
import json
import requests
from datetime import date


# 検索結果から除外するキーワード（月極・専用駐車場など）
EXCLUDE_WORDS = ["月極", "契約", "専用", "関係者", "予約制", "管理用", "従業員", "業者専用", "搬入用", "身障者"]


# キャッシュの有効期限（日数）
CACHE_EXPIRE_DAYS = 90

# キャッシュファイルのパス
CACHE_PATH = os.path.join(os.path.dirname(__file__), "../data/parkings_cache.json")


# ===== キャッシュ管理 =====

def load_cache():
    """キャッシュファイルを読み込む。ファイルがない・空・壊れている場合は空dictを返す"""
    if not os.path.exists(CACHE_PATH):
        return {}
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return {}
            return json.loads(content)
    except (json.JSONDecodeError, IOError):
        print("[CACHE] ファイルの読み込みに失敗しました。空のキャッシュで続行します。")
        return {}


def save_cache(cache):
    """キャッシュファイルに書き込む"""
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def is_cache_valid(cached_at_str):
    """
    キャッシュが有効期限内かどうか確認する
    @param cached_at_str - "YYYY-MM-DD" 形式の日付文字列
    @returns 有効なら True、期限切れなら False
    """
    try:
        cached_date = date.fromisoformat(cached_at_str)
        delta = date.today() - cached_date
        return delta.days <= CACHE_EXPIRE_DAYS
    except Exception:
        return False
    

def get_cached_parkings(cache_key):
    """
    キャッシュから駐車場リストを取得する
    有効期限切れの場合は None を返す
    @param cache_key - キャッシュのキー（場所名）
    """
    cache = load_cache()
    entry = cache.get(cache_key)
 
    if not entry:
        return None
 
    if not is_cache_valid(entry.get("cached_at", "")):
        print(f"[CACHE] 期限切れ: {cache_key}")
        return None
 
    print(f"[CACHE] ヒット: {cache_key}（{entry['cached_at']} 保存）")
    return entry["parkings"]
 
 
def set_cached_parkings(cache_key, parkings):
    """
    駐車場リストをキャッシュに保存する
    @param cache_key - キャッシュのキー（場所名）
    @param parkings  - 保存する駐車場リスト
    """
    cache = load_cache()
    cache[cache_key] = {
        "cached_at": str(date.today()),
        "parkings":  parkings,
    }
    save_cache(cache)
    print(f"[CACHE] 保存: {cache_key}（{len(parkings)}件）")


# ===== Geocoding API =====
def get_location(location):
    """
    場所名を緯度・経度に変換する
    @param location - 場所名の文字列
    @returns (lat, lng) のタプル。見つからなければ None
    """
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address":  location,
        "key":      api_key,
        "language": "ja"
    }
 
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[MAP ERROR] {e}")
        return None
 
    if not data.get("results"):
        return None
 
    result = data["results"][0]["geometry"]["location"]
    return result["lat"], result["lng"]



# ===== Nearby Search(New) =====

def search_by_latlng(lat, lng):
    """
    緯度・経度から周辺の駐車場を検索する（APIを直接呼ぶ）
    キャッシュは使わない（キャッシュ制御は呼び出し元で行う）
    @param lat - 緯度
    @param lng - 経度
    @returns 駐車場データのリスト
    """
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]
    url = "https://places.googleapis.com/v1/places:searchNearby"
 
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
    }
 
    body = {
        "includedTypes":      ["parking"],
        "maxResultCount":     20,           # 多めに取得してフィルタリング後に絞る
        "rankPreference":     "DISTANCE",   # 近い順
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude":  lat,
                    "longitude": lng
                },
                "radius": 1000.0            # 半径1000m以内
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
 
        # 月極・専用駐車場などを除外
        if any(word in name for word in EXCLUDE_WORDS):
            continue
 
        parkings.append({
            "name":    name or "名称不明",
            "address": place.get("formattedAddress", "住所不明"),
            "place_id": place.get("id", ""),
            "lat":     place.get("location", {}).get("latitude"),
            "lng":     place.get("location", {}).get("longitude"),
        })
 
    # フィルタリング後の全件を返す
    return parkings


# 駐車場検索（キャッシュ対応）
def search_parking(location):
    """
    場所名から周辺駐車場を検索する
    キャッシュがあればAPIを呼ばずに返す
    @param location - 場所名の文字列
    @returns 駐車場データのリスト
    """
    # キャッシュを確認する
    cached = get_cached_parkings(location)
    if cached is not None:
        return cached
 
    # キャッシュがなければAPIを呼ぶ
    result = get_location(location)
    if not result:
        return []
 
    lat, lng = result
    parkings = search_by_latlng(lat, lng)
 
    # 結果をキャッシュに保存する
    if parkings:
        set_cached_parkings(location, parkings)
 
    return parkings


def search_parking_by_latlng(lat, lng):
    """
    緯度・経度から周辺駐車場を検索する（客先ボタンからの検索用）
    緯度・経度ベースのキーでキャッシュする
    @param lat - 緯度
    @param lng - 経度
    @returns 駐車場データのリスト
    """
    # 緯度・経度を小数点2桁に丸めてキャッシュキーにする
    cache_key = f"{round(lat, 2)}_{round(lng, 2)}"
 
    cached = get_cached_parkings(cache_key)
    if cached is not None:
        return cached
 
    parkings = search_by_latlng(lat, lng)
 
    if parkings:
        set_cached_parkings(cache_key, parkings)
 
    return parkings


# ===== 施設検索 =====

def get_facility_info(facility_name):
    """施設情報を取得する"""
    return search_facility(facility_name)


def search_facility(facility_name):
    """
    Places API (New) で施設情報を取得する
    @param facility_name - 施設名の文字列
    @returns 施設情報のdict。見つからなければ None
    """
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]
    url = "https://places.googleapis.com/v1/places:searchText"
 
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
    }
 
    body = {
        "textQuery":    facility_name,
        "pageSize":     1,
        "languageCode": "ja",
    }
 
    try:
        response = requests.post(url, headers=headers, json=body, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[MAP ERROR] {e}")
        return None
 
    results = data.get("places", [])
    if not results:
        return None
 
    place    = results[0]
    place_id = place.get("id", "")
 
    # Place Details API で HP を取得
    details = get_place_details(place_id)
    website = details.get("website") if details else None
 
    return {
        "name":     place.get("displayName", {}).get("text", "名称不明"),
        "address":  place.get("formattedAddress", "住所不明"),
        "website":  website,
        "lat":      place.get("location", {}).get("latitude"),
        "lng":      place.get("location", {}).get("longitude"),
        "place_id": place_id,
    }
 
 
def get_place_details(place_id):
    """
    Place Details API を呼んで公式HPのURLを取得する
    @param place_id - Google Places の place_id
    @returns { "website": URL } のdict
    """
    api_key = os.environ["GOOGLE_MAPS_API_KEY"]
    url = f"https://places.googleapis.com/v1/places/{place_id}"
 
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "websiteUri"
    }
 
    params = { "languageCode": "ja" }
 
    try:
        response = requests.get(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[MAP ERROR] {e}")
        return None
 
    return { "website": data.get("websiteUri") }