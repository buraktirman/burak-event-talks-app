# BigQuery Release Notes Explorer

A modern, fast, and visually stunning web application that tracks Google Cloud BigQuery Release Notes in real-time, caches them for efficiency, and allows you to customize and share specific updates directly to Twitter/X with accurate character limit estimation.

---

## ✨ Features

- **🚀 Flask Backend**: Built with Python Flask utilizing the standard `xml.etree.ElementTree` parser for fast, low-overhead XML-to-JSON conversion.
- **⚡ Smart Parsing & Splitting**: Automatically splits daily aggregated release notes into separate cards (e.g., separating Features, Issues, and Announcements) so you can share individual details.
- **📁 Automated Cache & Offline Fallback**: Features a 1-hour memory cache (`release_notes_cache.json`) to minimize GCP feed hits and acts as an offline fallback if the network is disconnected.
- **🎨 Glassmorphic Dark-Mode UI**: Designed with clean vanilla CSS, floating glow blobs, smooth scrollbars, card-hover transitions, and interactive typography (Inter & Plus Jakarta Sans).
- **🔍 Filter & Search**: Instantly filter release notes by category tags (Features, Issues, Announcements, Deprecations) and execute real-time text search.
- **🐦 Twitter Share Composer**: Integrated modal composer with a custom character counter that accurately respects Twitter's 23-character shortening rule for URLs, accompanied by a dynamic SVG progress ring.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11, Flask, Requests
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom styling system), Vanilla JavaScript (ES6)
- **Typography & Icons**: Google Fonts, custom inline vector SVGs

---

## 📂 Project Structure

| File / Folder | Purpose |
| :--- | :--- |
| [**`app.py`**](file:///D:/Burak/agy-cli-projects/bq-releases-notes/app.py) | Python Flask backend server, caching, XML/HTML parsing logic. |
| [**`templates/index.html`**](file:///D:/Burak/agy-cli-projects/bq-releases-notes/templates/index.html) | Layout structure, filter UI, feed container, and tweet composer modal. |
| [**`static/css/style.css`**](file:///D:/Burak/agy-cli-projects/bq-releases-notes/static/css/style.css) | Custom styling, glassmorphism cards, loader skeletons, animations, and modal designs. |
| [**`static/js/main.js`**](file:///D:/Burak/agy-cli-projects/bq-releases-notes/static/js/main.js) | Data fetching, filtering/search controls, modal states, and X Web Intent logic. |
| [**`.gitignore`**](file:///D:/Burak/agy-cli-projects/bq-releases-notes/.gitignore) | Git configurations for excluding Python cache, venv, and local feed JSON file. |

---

## 🚀 Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/buraktirman/burak-event-talks-app.git
   cd burak-event-talks-app
   ```

2. **Install Dependencies**:
   ```bash
   pip install flask requests
   ```

3. **Start the Application**:
   ```bash
   python app.py
   ```

4. **Explore the Application**:
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## 🔄 How the Data Flows

1. **Client Request**: The frontend UI requests updates from the Flask API `/api/release-notes`.
2. **Server Check**: Flask checks if a local cache `release_notes_cache.json` exists and is less than 1 hour old.
3. **Parse & Store**: If the cache is invalid or a refresh is forced via `?refresh=true`, Flask fetches the Google Cloud RSS XML feed, parses it, cleans HTML tags, splits entries by categories, saves it to the cache file, and sends the JSON back to the UI.
4. **Rendering**: The UI removes loading skeleton states, populates the grid, and sets up filters.
5. **Composing & Sharing**: Clicking the Twitter button parses the card content, prepares a draft (including URL budget calculation), opens the Twitter intent link, and directs you to share.
