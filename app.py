from flask import Flask, jsonify, render_template, request
import xml.etree.ElementTree as ET
import re
import requests
import os
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

CACHE_FILE = 'release_notes_cache.json'
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def get_clean_text(html_content):
    """Helper to convert simple HTML content to clean text (stripping tags, formatting links, etc.)."""
    # Remove HTML comments
    text = re.sub(r'<!--.*?-->', '', html_content, flags=re.DOTALL)
    # Replace link tags with text + URL
    text = re.sub(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (\1)', text)
    # Replace list items with bullet points
    text = re.sub(r'<li>(.*?)</li>', r'• \1\n', text)
    # Replace paragraph and header tags with newlines
    text = re.sub(r'</?(p|h3|ul|ol|code|strong|em|div|span)[^>]*>', ' ', text)
    # Decode basic HTML entities
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'")
    # Collapse multiple whitespaces and trim
    text = re.sub(r'\s+', ' ', text)
    # Restore some newlines for bullets
    text = text.replace(' • ', '\n• ').strip()
    return text

def fetch_and_parse_feed():
    try:
        logging.info(f"Fetching release notes from {FEED_URL}")
        response = requests.get(FEED_URL, timeout=12)
        response.raise_for_status()
        
        xml_content = response.content
        root = ET.fromstring(xml_content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        
        for entry_el in root.findall('atom:entry', ns):
            title = entry_el.find('atom:title', ns)
            title_text = title.text.strip() if title is not None else ""
            
            updated = entry_el.find('atom:updated', ns)
            updated_text = updated.text.strip() if updated is not None else ""
            
            # Extract links
            links = entry_el.findall('atom:link', ns)
            link_text = ""
            for l in links:
                if l.attrib.get('rel') == 'alternate' or not l.attrib.get('rel'):
                    link_text = l.attrib.get('href', '')
                    break
            
            content_el = entry_el.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Split content_html by <h3> tags
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            if len(parts) > 1:
                # The split results are: [before_first, type1, content1, type2, content2, ...]
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    update_html = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    update_id = f"{updated_text}_{i}"
                    plain_text = get_clean_text(update_html)
                    
                    entries.append({
                        "id": update_id,
                        "date": title_text,
                        "updated": updated_text,
                        "link": link_text,
                        "type": update_type,
                        "content_html": update_html,
                        "content_text": plain_text
                    })
            else:
                # Fallback if no <h3> tags
                update_id = f"{updated_text}_0"
                plain_text = get_clean_text(content_html)
                
                entries.append({
                    "id": update_id,
                    "date": title_text,
                    "updated": updated_text,
                    "link": link_text,
                    "type": "Update",
                    "content_html": content_html.strip(),
                    "content_text": plain_text
                })
        
        # Write to local cache
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)
            
        logging.info(f"Successfully cached {len(entries)} release note updates.")
        return entries, False  # list, error=False
        
    except Exception as e:
        logging.error(f"Error fetching feed: {str(e)}")
        # Try to read from cache if available
        if os.path.exists(CACHE_FILE):
            try:
                logging.info("Attempting to load release notes from local cache...")
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                logging.info(f"Loaded {len(entries)} updates from cache.")
                return entries, True  # Return cached entries, but flag that it was a cached response due to fetch error
            except Exception as cache_err:
                logging.error(f"Failed to read from cache: {str(cache_err)}")
        
        return [], True  # Empty list, error=True

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    # If not force refresh, and cache file exists, we can load from cache
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            # Let's check file age. If cache is fresh (less than 1 hour), return it.
            # Otherwise we'll try to fetch new data.
            cache_mtime = os.path.getmtime(CACHE_FILE)
            cache_age = datetime.now().timestamp() - cache_mtime
            if cache_age < 3600: # 1 hour cache duration
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
                return jsonify({
                    "success": True,
                    "source": "cache",
                    "data": entries
                })
        except Exception as e:
            logging.error(f"Failed to read fresh cache: {str(e)}")
            
    # Fetch from web
    entries, error = fetch_and_parse_feed()
    
    if not entries and error:
        return jsonify({
            "success": False,
            "message": "Failed to fetch release notes and no local cache was found."
        }), 500
        
    return jsonify({
        "success": True,
        "source": "feed" if not error else "cache_fallback",
        "data": entries
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
