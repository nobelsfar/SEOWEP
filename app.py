from flask import Flask, render_template, request, jsonify, session, send_file, Response
from flask_session import Session
from openai import OpenAI
import requests
from bs4 import BeautifulSoup
import re
import json
import os
import markdown
import base64
import mimetypes
import io
from urllib.parse import urlparse
import threading
import time
from datetime import datetime
import tempfile
import zipfile
import shutil
from functools import wraps
import pickle
import os.path
import argparse
import pandas as pd

def clean_html_output(html_content):
    """Clean HTML output to match the old app's formatting"""
    # Remove extra whitespace between tags
    html_content = re.sub(r'>\s+<', '><', html_content)
    
    # Ensure proper spacing after closing tags before opening tags
    html_content = re.sub(r'</([^>]+)><([^/>][^>]*)>', r'</\1>\n<\2>', html_content)
    
    # Clean up paragraph spacing
    html_content = re.sub(r'</p>\s*<p>', '</p>\n<p>', html_content)
    
    # Clean up heading spacing
    html_content = re.sub(r'</h([1-6])>\s*<', r'</h\1>\n<', html_content)
    html_content = re.sub(r'</p>\s*<h([1-6])', r'</p>\n<h\1', html_content)
    
    # Remove any trailing/leading whitespace from the entire content
    html_content = html_content.strip()
    
    return html_content

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Change this in production
app.config['SESSION_TYPE'] = 'filesystem'
app.config['JSON_AS_ASCII'] = False  # Allow non-ASCII characters in JSON responses
Session(app)

# Global storage for user data (in production, use a proper database)
user_data = {}

# File paths for persistent storage
PROFILES_FILE = 'profiles.pkl'
SAVED_TEXTS_FILE = 'saved_texts.pkl'
SETTINGS_FILE = 'settings.pkl'

# Cache busting timestamp
CACHE_BUST = str(int(time.time()))

# Add after the existing imports and before the Flask app creation
PROFILE_IMAGES_DIR = os.path.join(os.getcwd(), "profil_billeder")

def ensure_profile_image_dir(profile_name, product_id=None):
    """Ensure the profile image directory exists"""
    if product_id:
        dir_path = os.path.join(PROFILE_IMAGES_DIR, profile_name, str(product_id))
    else:
        dir_path = os.path.join(PROFILE_IMAGES_DIR, profile_name)
    
    os.makedirs(dir_path, exist_ok=True)
    return dir_path

def get_cached_images(profile_name, product_id=None):
    """Get cached images for a profile or specific product"""
    try:
        if product_id:
            cache_dir = os.path.join(PROFILE_IMAGES_DIR, profile_name, str(product_id))
            info_file = os.path.join(cache_dir, "images_info.json")
        else:
            cache_dir = os.path.join(PROFILE_IMAGES_DIR, profile_name)
            info_file = os.path.join(cache_dir, "all_images_info.json")
        
        print(f"Looking for cache file: {info_file}")
        
        if os.path.exists(info_file):
            with open(info_file, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
            
            print(f"Found cached data with {len(cached_data)} images")
            
            # For now, return all cached images even if they don't have local files
            # This allows us to use the cache for image metadata even if files aren't downloaded
            valid_images = []
            for img_info in cached_data:
                local_path = img_info.get("local_path")
                if local_path and os.path.exists(local_path):
                    # Image file exists locally
                    valid_images.append(img_info)
                elif not local_path:
                    # No local file, but we have the metadata (URL, etc.)
                    valid_images.append(img_info)
            
            print(f"Returning {len(valid_images)} valid cached images")
            return valid_images
    except Exception as e:
        print(f"Error reading cached images: {e}")
    
    return []

def save_cached_images(profile_name, images_data, product_id=None):
    """Save images data to cache"""
    try:
        if product_id:
            cache_dir = ensure_profile_image_dir(profile_name, product_id)
            info_file = os.path.join(cache_dir, "images_info.json")
        else:
            cache_dir = ensure_profile_image_dir(profile_name)
            info_file = os.path.join(cache_dir, "all_images_info.json")
        
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(images_data, f, ensure_ascii=False, indent=2)
        
        return True
    except Exception as e:
        print(f"Error saving cached images: {e}")
        return False

def save_profiles_to_file(user_session):
    """Save profiles to file"""
    try:
        with open(PROFILES_FILE, 'wb') as f:
            pickle.dump(user_session['profiles'], f)
    except Exception as e:
        print(f"Error saving profiles: {e}")

def load_profiles_from_file():
    """Load profiles from file"""
    try:
        if os.path.exists(PROFILES_FILE):
            with open(PROFILES_FILE, 'rb') as f:
                return pickle.load(f)
    except Exception as e:
        print(f"Error loading profiles: {e}")
    return {}

def save_texts_to_file(user_session):
    """Save texts to file"""
    try:
        with open(SAVED_TEXTS_FILE, 'wb') as f:
            pickle.dump(user_session['saved_texts'], f)
    except Exception as e:
        print(f"Error saving texts: {e}")

def load_texts_from_file():
    """Load texts from file"""
    try:
        if os.path.exists(SAVED_TEXTS_FILE):
            with open(SAVED_TEXTS_FILE, 'rb') as f:
                return pickle.load(f)
    except Exception as e:
        print(f"Error loading texts: {e}")
    return {}

def save_settings_to_file(user_session):
    """Save settings to file"""
    try:
        settings = {
            'api_key': user_session.get('api_key'),
            'shopify_credentials': user_session.get('shopify_credentials', {})
        }
        with open(SETTINGS_FILE, 'wb') as f:
            pickle.dump(settings, f)
    except Exception as e:
        print(f"Error saving settings: {e}")

def load_settings_from_file():
    """Load settings from file"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'rb') as f:
                return pickle.load(f)
    except Exception as e:
        print(f"Error loading settings: {e}")
    return {}

def filter_blocked_words(text, blocked_words):
    """Remove blocked words from text while maintaining readability"""
    if not blocked_words or not text:
        return text
    
    import re
    
    # Handle case where blocked_words might be a single string with commas
    if isinstance(blocked_words, str):
        blocked_words = [word.strip() for word in blocked_words.split(',')]
    elif isinstance(blocked_words, list):
        # Handle case where list items might contain multiple words separated by commas
        expanded_words = []
        for item in blocked_words:
            if ',' in str(item):
                expanded_words.extend([word.strip() for word in str(item).split(',')])
            else:
                expanded_words.append(str(item).strip())
        blocked_words = expanded_words
    
    print(f"DEBUG: Processing blocked words: {blocked_words}")
    
    # Create case-insensitive pattern for each blocked word
    filtered_text = text
    words_found = []
    
    for blocked_word in blocked_words:
        if not blocked_word.strip():
            continue
            
        # Create pattern that matches whole words only (not parts of words)
        pattern = r'\b' + re.escape(blocked_word.strip()) + r'\b'
        
        # Find matches (case-insensitive)
        matches = re.finditer(pattern, filtered_text, re.IGNORECASE)
        match_found = False
        
        for match in matches:
            match_found = True
            words_found.append(match.group())
        
        if match_found:
            # Replace with alternative phrasing or remove
            replacement = get_word_replacement(blocked_word.strip())
            filtered_text = re.sub(pattern, replacement, filtered_text, flags=re.IGNORECASE)
    
    if words_found:
        print(f"⚠️ Filtered blocked words: {words_found}")
    
    return filtered_text

def get_word_replacement(blocked_word):
    """Get appropriate replacement for blocked words"""
    # Common replacements for typical blocked words
    replacements = {
        'konkurrent': 'anden leverandør',
        'billig': 'prisvenlig',
        'billigt': 'prismæssigt attraktivt',
        'dårlig': 'mindre optimal',
        'problem': 'udfordring',
        'fejl': 'uoverensstemmelse',
        'svindel': 'tvivlsom praksis',
        'spam': 'uønsket indhold',
        'scam': 'tvivlsom aktivitet',
        'bæredygtighed': 'miljøansvar',
        'bæredygtig': 'miljøvenlig',
        'bæredyg': 'miljøvenlig',
        'klima': 'miljø',
        'klimavenlig': 'miljøvenlig',
        'skovbrug': 'træforvaltning',
        'statement piece': 'designelement'
    }
    
    # Return specific replacement if available, otherwise return generic alternative
    return replacements.get(blocked_word.lower(), 'kvalitetselement')

def create_image_alt_text(title):
    """Create SEO-optimized alt text from article title"""
    # Extract main topic by splitting on common separators
    short_title = title.split('?')[0] if '?' in title else title.split(' – ')[0] if ' – ' in title else title
    
    # Keep it concise (max 8 words for SEO)
    if len(short_title.split()) > 8:
        short_title = ' '.join(short_title.split()[:8])
    
    # Create descriptive alt text
    return f"Guide til {short_title.lower()}"

def get_user_session():
    """Get or create user session data"""
    if 'user_id' not in session:
        session['user_id'] = str(time.time())
    
    user_id = session['user_id']
    if user_id not in user_data:
        # Load persistent settings
        saved_settings = load_settings_from_file()
        profiles = load_profiles_from_file()
        
        # Ensure each profile has saved_texts initialized
        for profile_name, profile_data in profiles.items():
            if 'saved_texts' not in profile_data:
                profile_data['saved_texts'] = {}
        
        user_data[user_id] = {
            'profiles': profiles,
            'current_profile': None,
            'saved_texts': load_texts_from_file(),  # Keep for backward compatibility
            'api_key': saved_settings.get('api_key'),
            'shopify_credentials': saved_settings.get('shopify_credentials', {})
        }
    
    return user_data[user_id]

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html', cache_bust=CACHE_BUST)

@app.route('/test-shopify-images')
def test_shopify_images():
    """Test page for Shopify images"""
    return send_file('test_shopify_images.html')

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    """Get all user profiles"""
    user_session = get_user_session()
    return jsonify({
        'profiles': user_session['profiles'],
        'current_profile': user_session['current_profile']
    })

@app.route('/api/profiles', methods=['POST'])
def create_profile():
    user_session = get_user_session()
    profiles = user_session.get('profiles', {})
    
    data = request.get_json()
    profile_name = data.get('name', '').strip()
    
    print(f"=== Creating Profile: {profile_name} ===")
    print(f"Received data: {data}")
    
    if not profile_name:
        return jsonify({'error': 'Profile name is required'}), 400
    
    if profile_name in profiles:
        return jsonify({'error': 'Profile already exists'}), 400
    
    # Create new profile with all fields including Shopify credentials
    new_profile = {
        'name': profile_name,
        'description': data.get('description', ''),
        'values': data.get('values', ''),
        'tone': data.get('tone', ''),
        'api_key': data.get('api_key', ''),
        'blocked_words': data.get('blocked_words', []),
        'url': data.get('url', ''),
        'internal_links': data.get('internal_links', ''),
        # Shopify credentials
        'shopify_store_url': data.get('shopify_store_url', ''),
        'shopify_api_token': data.get('shopify_api_token', ''),
        'shopify_api_version': data.get('shopify_api_version', '2023-10'),
        # Initialize saved texts for this profile
        'saved_texts': {},
        # Initialize products for this profile
        'products': []
    }
    
    print(f"Created profile data: {new_profile}")
    print(f"Shopify credentials: store_url='{new_profile['shopify_store_url']}', api_token='{new_profile['shopify_api_token'][:10] if new_profile['shopify_api_token'] else 'EMPTY'}...', api_version='{new_profile['shopify_api_version']}'")
    
    profiles[profile_name] = new_profile
    user_session['profiles'] = profiles
    save_profiles_to_file(user_session)
    
    return jsonify({'message': 'Profile created successfully', 'profile': new_profile})

@app.route('/api/profiles/<profile_name>', methods=['DELETE'])
def delete_profile(profile_name):
    user_session = get_user_session()
    profiles = user_session.get('profiles', {})
    
    if profile_name not in profiles:
        return jsonify({'error': 'Profile not found'}), 404
    
    del profiles[profile_name]
    user_session['profiles'] = profiles
    save_profiles_to_file(user_session)
    
    return jsonify({'message': 'Profile deleted successfully'})

@app.route('/api/profiles/<profile_name>', methods=['PUT'])
def update_profile(profile_name):
    user_session = get_user_session()
    profiles = user_session.get('profiles', {})
    
    if profile_name not in profiles:
        return jsonify({'error': 'Profile not found'}), 404
    
    data = request.get_json()
    
    print(f"=== Updating Profile: {profile_name} ===")
    print(f"Received data: {data}")
    
    # Update profile with new data
    profiles[profile_name].update({
        'description': data.get('description', ''),
        'values': data.get('values', ''),
        'tone': data.get('tone', ''),
        'api_key': data.get('api_key', ''),
        'blocked_words': data.get('blocked_words', []),
        'url': data.get('url', ''),
        'internal_links': data.get('internal_links', ''),
        # Shopify credentials
        'shopify_store_url': data.get('shopify_store_url', ''),
        'shopify_api_token': data.get('shopify_api_token', ''),
        'shopify_api_version': data.get('shopify_api_version', '2023-10')
    })
    
    print(f"Updated profile data: {profiles[profile_name]}")
    print(f"Shopify credentials: store_url='{profiles[profile_name]['shopify_store_url']}', api_token='{profiles[profile_name]['shopify_api_token'][:10] if profiles[profile_name]['shopify_api_token'] else 'EMPTY'}...', api_version='{profiles[profile_name]['shopify_api_version']}'")
    
    user_session['profiles'] = profiles
    save_profiles_to_file(user_session)
    
    return jsonify({'message': 'Profile updated successfully', 'profile': profiles[profile_name]})

@app.route('/api/profiles/<profile_name>/select', methods=['POST'])
def select_profile(profile_name):
    """Select a profile as current"""
    user_session = get_user_session()
    
    if profile_name not in user_session['profiles']:
        return jsonify({'error': 'Profile not found'}), 404
    
    user_session['current_profile'] = profile_name
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Profile selected successfully'})

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get products for current profile"""
    user_session = get_user_session()
    current_profile = user_session['current_profile']
    
    if not current_profile or current_profile not in user_session['profiles']:
        return jsonify({'products': []})
    
    return jsonify({'products': user_session['profiles'][current_profile]['products']})

@app.route('/api/products', methods=['POST'])
def add_product():
    """Add a product to current profile"""
    data = request.json
    user_session = get_user_session()
    current_profile = user_session['current_profile']
    
    if not current_profile or current_profile not in user_session['profiles']:
        return jsonify({'error': 'No profile selected'}), 400
    
    product = {
        'name': data.get('name', '').strip(),
        'url': data.get('url', '').strip(),
        'description': data.get('description', '').strip()
    }
    
    if not product['name']:
        return jsonify({'error': 'Product name is required'}), 400
    
    user_session['profiles'][current_profile]['products'].append(product)
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Product added successfully'})

@app.route('/api/products/<int:product_index>', methods=['PUT'])
def update_product(product_index):
    """Update a product"""
    data = request.json
    user_session = get_user_session()
    current_profile = user_session['current_profile']
    
    if not current_profile or current_profile not in user_session['profiles']:
        return jsonify({'error': 'No profile selected'}), 400
    
    products = user_session['profiles'][current_profile]['products']
    if product_index >= len(products):
        return jsonify({'error': 'Product not found'}), 404
    
    products[product_index] = {
        'name': data.get('name', '').strip(),
        'url': data.get('url', '').strip(),
        'description': data.get('description', '').strip()
    }
    
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/products/<int:product_index>', methods=['DELETE'])
def delete_product(product_index):
    """Delete a product"""
    user_session = get_user_session()
    current_profile = user_session['current_profile']
    
    if not current_profile or current_profile not in user_session['profiles']:
        return jsonify({'error': 'No profile selected'}), 400
    
    products = user_session['profiles'][current_profile]['products']
    if product_index >= len(products):
        return jsonify({'error': 'Product not found'}), 404
    
    del products[product_index]
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Product deleted successfully'})

# Profile-specific product endpoints (aliases for compatibility)
@app.route('/api/profiles/<profile_name>/products', methods=['GET'])
def get_profile_products(profile_name):
    """Get products for specific profile"""
    user_session = get_user_session()
    
    if profile_name not in user_session['profiles']:
        return jsonify({'products': []})
    
    return jsonify({'products': user_session['profiles'][profile_name]['products']})

@app.route('/api/profiles/<profile_name>/products', methods=['POST'])
def add_profile_product(profile_name):
    """Add a product to specific profile"""
    data = request.json
    user_session = get_user_session()
    
    if profile_name not in user_session['profiles']:
        return jsonify({'error': 'Profile not found'}), 404
    
    product = {
        'name': data.get('name', '').strip(),
        'url': data.get('url', '').strip(),
        'description': data.get('description', '').strip()
    }
    
    if not product['name']:
        return jsonify({'error': 'Product name is required'}), 400
    
    # Check for duplicate product names (case-insensitive)
    existing_products = user_session['profiles'][profile_name]['products']
    for existing_product in existing_products:
        if existing_product['name'].lower() == product['name'].lower():
            return jsonify({'error': 'A product with this name already exists'}), 400
    
    user_session['profiles'][profile_name]['products'].append(product)
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Product added successfully'})

@app.route('/api/profiles/<profile_name>/products/<int:product_index>', methods=['PUT'])
def update_profile_product(profile_name, product_index):
    """Update a product in specific profile"""
    data = request.json
    user_session = get_user_session()
    
    if profile_name not in user_session['profiles']:
        return jsonify({'error': 'Profile not found'}), 404
    
    products = user_session['profiles'][profile_name]['products']
    if product_index >= len(products):
        return jsonify({'error': 'Product not found'}), 404
    
    products[product_index] = {
        'name': data.get('name', '').strip(),
        'url': data.get('url', '').strip(),
        'description': data.get('description', '').strip()
    }
    
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Product updated successfully'})

@app.route('/api/profiles/<profile_name>/products/<int:product_index>', methods=['DELETE'])
def delete_profile_product(profile_name, product_index):
    """Delete a product from specific profile"""
    user_session = get_user_session()
    
    if profile_name not in user_session['profiles']:
        return jsonify({'error': 'Profile not found'}), 404
    
    products = user_session['profiles'][profile_name]['products']
    if product_index >= len(products):
        return jsonify({'error': 'Product not found'}), 404
    
    del products[product_index]
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Product deleted successfully'})

@app.route('/api/fetch-url-info', methods=['POST'])
def fetch_url_info():
    """Fetch product information from URLs"""
    data = request.json
    urls = data.get('urls', '').strip().split('\n')
    
    results = []
    for url in urls:
        url = url.strip()
        if not url:
            continue
            
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.text.strip() if title_tag else 'Unknown Product'
            
            # Extract description
            desc_tag = soup.find('meta', attrs={'name': 'description'})
            description = desc_tag.get('content', '').strip() if desc_tag else ''
            
            # If no meta description, try to get first paragraph
            if not description:
                p_tag = soup.find('p')
                description = p_tag.text.strip()[:200] + '...' if p_tag else ''
            
            results.append({
                'name': title,
                'url': url,
                'description': description
            })
            
        except Exception as e:
            results.append({
                'name': f'Error fetching: {url}',
                'url': url,
                'description': f'Error: {str(e)}'
            })
    
    return jsonify({'products': results})

@app.route('/api/generate-seo', methods=['POST'])
def generate_seo():
    """Generate SEO content using OpenAI"""
    print("=== SEO Generation Request ===")  # Debug log
    
    data = request.json
    user_session = get_user_session()
    
    print(f"Request data: {data}")  # Debug log
    
    if not user_session.get('api_key'):
        print("No API key configured")  # Debug log
        return jsonify({'error': 'OpenAI API key not configured'}), 400
    
    # Get keywords from request
    keywords = data.get('keywords', '').strip()
    if not keywords:
        print("No keywords provided")  # Debug log
        return jsonify({'error': 'Keywords are required'}), 400
    
    print(f"Keywords: {keywords}")  # Debug log
    
    # Get optional settings
    include_meta_desc = data.get('includeMetaDesc', True)
    include_keywords = data.get('includeKeywords', True)
    
    # Try to get profile data if available
    profile_name = data.get('profile')
    products = []
    settings = {
        'tone': 'Professionel',
        'target_audience': 'Alle',
        'language': 'Dansk',
                'seo_focus': 'Høj'
    }
    
    if profile_name and profile_name in user_session['profiles']:
        profile = user_session['profiles'][profile_name]
        products = profile.get('products', [])
        settings = profile.get('settings', settings)
        print(f"Using profile: {profile_name} with {len(products)} products")  # Debug log
    else:
        print("No profile used, generating from keywords only")  # Debug log
    
    try:
        print("Initializing OpenAI client...")
        print(f"API key type: {type(user_session['api_key'])}")
        print(f"API key length: {len(user_session['api_key']) if user_session['api_key'] else 0}")
        
        # Try to create client with explicit parameters only
        try:
            # Create httpx client without proxies to avoid compatibility issues
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=user_session['api_key'], http_client=http_client)
            print("✓ OpenAI client created successfully")
        except Exception as client_error:
            print(f"❌ OpenAI client creation failed: {client_error}")
            print(f"Error type: {type(client_error)}")
            import traceback
            traceback.print_exc()
            # Try fallback without explicit http_client
            try:
                print("Trying fallback without explicit http_client...")
                client = OpenAI(api_key=user_session['api_key'])
                print("✓ Fallback OpenAI client created successfully")
            except Exception as fallback_error:
                print(f"❌ Fallback also failed: {fallback_error}")
                raise fallback_error
        
        # Build keyword-focused prompt
        prompt_parts = [
            f"PRIMÆRT FOKUS: Skriv SEO-optimeret indhold der er 100% relevant for keywordet: {keywords}",
            f"VIGTIGT: Hele teksten skal handle om '{keywords}' - undgå generelle oplysninger der ikke relaterer direkte til dette emne."
        ]
        
        # Prioritize products over general company info
        if products:
            product_info = "\n".join([
                f"- {p['name']}: {p['description']}" for p in products if p.get('description')
            ])
            if product_info:
                prompt_parts.append(f"\nHØJ PRIORITET - Integrer disse produkter naturligt med '{keywords}':\n{product_info}")
        
        prompt_parts.extend([
            f"\nIndstillinger:",
            f"- Tone: {settings['tone']}",
            f"- Målgruppe: {settings['target_audience']}",
            f"- Sprog: {settings['language']}",
            f"- SEO fokus: {settings['seo_focus']}",
            f"\nStruktur:"
        ])
        
        if include_meta_desc:
            prompt_parts.append("- H1 overskrift med keyword")
            prompt_parts.append("- Meta beskrivelse (150-160 tegn)")
        
        prompt_parts.append(f"- Hovedindhold fokuseret på '{keywords}' med naturlig keyword-integration")
        
        if include_keywords:
            prompt_parts.append("- Naturlig variation af keywords gennem teksten")
        
        prompt_parts.append("- Relevant call-to-action")
        prompt_parts.append("\nFormater med markdown for overskrifter og formatering.")
        
        prompt_parts.append("\nSkriv teksten med professionel struktur og god læsbarhed.")
        prompt_parts.append("VIGTIGT: Brug markdown-format med overskrifter (# for H1, ## for H2, ### for H3) og fed tekst (**tekst**).")
        prompt_parts.append(f"HUSK: Alt indhold skal være relevant for '{keywords}' - undgå off-topic information.")
        
        # Add blocked words restrictions for legacy generate_seo
        if profile_name and profile_name in user_session.get('profiles', {}):
            profile = user_session['profiles'][profile_name]
            blocked_words = profile.get('blocked_words', [])
            if blocked_words:
                blocked_words_text = ', '.join([word.strip() for word in blocked_words if word.strip()])
                prompt_parts.append(f"\nKRITISK VIGTIG: Du må ALDRIG bruge disse ord i teksten: {blocked_words_text}")
                prompt_parts.append(f"Find alternative formuleringer for disse ord.")
        
        prompt = "\n".join(prompt_parts)
        
        print("Sending request to OpenAI...")  # Debug log
        print(f"Prompt: {prompt[:200]}...")  # Debug log (first 200 chars)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Du er en ekspert SEO-tekstforfatter der skriver på dansk. Du fokuserer altid på keyword-relevans og undgår generelle virksomhedsoplysninger der ikke relaterer til det specifikke keyword."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        generated_text = response.choices[0].message.content
        print(f"Generated text length: {len(generated_text)}")  # Debug log
        
        # CRITICAL: Filter blocked words from legacy generate_seo content
        if profile_name and profile_name in user_session.get('profiles', {}):
            profile = user_session['profiles'][profile_name]
            blocked_words = profile.get('blocked_words', [])
            if blocked_words:
                generated_text = filter_blocked_words(generated_text, blocked_words)
                print(f"✅ Legacy SEO: Blocked words filtered from generated text")
        
        # Convert to HTML using markdown with same extensions as old app
        raw_html = markdown.markdown(generated_text, extensions=['tables', 'nl2br'])
        html_content = clean_html_output(raw_html)
        
        # DOUBLE CHECK: Also filter blocked words from HTML content
        if profile_name and profile_name in user_session.get('profiles', {}):
            profile = user_session['profiles'][profile_name]
            blocked_words = profile.get('blocked_words', [])
            if blocked_words:
                html_content = filter_blocked_words(html_content, blocked_words)
                print(f"✅ Legacy SEO: Blocked words filtered from HTML content")
        
        # Debug: Print the generated text and HTML
        print(f"=== DEBUG: Generated Text ===")
        print(generated_text[:500] + "..." if len(generated_text) > 500 else generated_text)
        print(f"=== DEBUG: HTML Content ===")
        print(html_content[:500] + "..." if len(html_content) > 500 else html_content)
        
        print("SEO generation successful")  # Debug log
        return jsonify({
            'text': generated_text,
            'html': html_content
        })
        
    except Exception as e:
        print(f"Error in SEO generation: {str(e)}")  # Debug log
        return jsonify({'error': f'Error generating content: {str(e)}'}), 500

@app.route('/api/save-text', methods=['POST'])
def save_text():
    """Save generated text with separate title, meta and body like the old code"""
    data = request.json
    user_session = get_user_session()
    
    text_name = data.get('name', '').strip()
    text_content = data.get('content', '').strip()
    title = data.get('title', '').strip()
    meta_description = data.get('meta_description', '').strip()
    current_profile = user_session.get('current_profile')
    
    if not text_name or not text_content:
        return jsonify({'error': 'Name and content are required'}), 400
    
    if not current_profile:
        return jsonify({'error': 'No profile selected'}), 400
    
    # Initialize profile's saved texts if not exists
    if current_profile not in user_session['profiles']:
        return jsonify({'error': 'Profile not found'}), 404
    
    if 'saved_texts' not in user_session['profiles'][current_profile]:
        user_session['profiles'][current_profile]['saved_texts'] = {}
    
    # Ensure saved_texts is a dictionary (fix for old data)
    if not isinstance(user_session['profiles'][current_profile]['saved_texts'], dict):
        user_session['profiles'][current_profile]['saved_texts'] = {}
    
    # Save text to current profile
    user_session['profiles'][current_profile]['saved_texts'][text_name] = {
        'content': text_content,  # Body text only
        'title': title,  # Separate title
        'meta_description': meta_description,  # Separate meta description
        'created_at': datetime.now().isoformat(),
        'profile': current_profile,
        'keywords': data.get('keywords', ''),
        'category': data.get('category', ''),
        'featured_image_url': data.get('featured_image_url', None)
    }
    
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Text saved successfully'})

@app.route('/api/auto-save-text', methods=['POST'])
def auto_save_text():
    """Auto-save edited text content"""
    data = request.json
    user_session = get_user_session()
    
    text_name = data.get('name', '').strip()
    text_content = data.get('content', '').strip()
    title = data.get('title', '').strip()
    current_profile = user_session.get('current_profile')
    
    if not text_name or not current_profile:
        return jsonify({'error': 'Name and profile required'}), 400
    
    if current_profile not in user_session['profiles']:
        return jsonify({'error': 'Profile not found'}), 404
    
    if 'saved_texts' not in user_session['profiles'][current_profile]:
        user_session['profiles'][current_profile]['saved_texts'] = {}
    
    saved_texts = user_session['profiles'][current_profile]['saved_texts']
    
    # Ensure saved_texts is a dictionary
    if not isinstance(saved_texts, dict):
        user_session['profiles'][current_profile]['saved_texts'] = {}
        saved_texts = user_session['profiles'][current_profile]['saved_texts']
    
    # Update existing text or create new one
    if text_name in saved_texts:
        # Update existing text
        saved_texts[text_name]['content'] = text_content
        if title:
            saved_texts[text_name]['title'] = title
        saved_texts[text_name]['updated_at'] = datetime.now().isoformat()
    else:
        # Create new text
        saved_texts[text_name] = {
            'content': text_content,
            'title': title,
            'meta_description': '',
            'created_at': datetime.now().isoformat(),
            'profile': current_profile,
            'keywords': '',
            'category': ''
        }
    
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Text auto-saved successfully'})

@app.route('/api/saved-texts', methods=['GET'])
def get_saved_texts():
    """Get saved texts for current profile"""
    user_session = get_user_session()
    current_profile = user_session.get('current_profile')
    
    if not current_profile or current_profile not in user_session['profiles']:
        return jsonify({'saved_texts': {}})
    
    profile_texts = user_session['profiles'][current_profile].get('saved_texts', {})
    return jsonify({'saved_texts': profile_texts})

@app.route('/api/saved-texts/<text_name>', methods=['DELETE'])
def delete_saved_text(text_name):
    """Delete a saved text from current profile"""
    user_session = get_user_session()
    current_profile = user_session.get('current_profile')
    
    if not current_profile or current_profile not in user_session['profiles']:
        return jsonify({'error': 'No profile selected'}), 400
    
    profile_texts = user_session['profiles'][current_profile].get('saved_texts', {})
    
    if text_name not in profile_texts:
        return jsonify({'error': 'Text not found'}), 404
    
    del user_session['profiles'][current_profile]['saved_texts'][text_name]
    save_profiles_to_file(user_session)
    return jsonify({'message': 'Text deleted successfully'})

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get user settings"""
    user_session = get_user_session()
    return jsonify({
        'api_key_configured': bool(user_session.get('api_key')),
        'shopify_configured': bool(user_session.get('shopify_credentials'))
    })

@app.route('/api/settings/openai', methods=['POST'])
def set_openai_key():
    """Set OpenAI API key"""
    data = request.json
    user_session = get_user_session()
    
    api_key = data.get('api_key', '').strip()
    print(f"Attempting to save API key: {api_key[:10] if api_key else 'None'}...")  # Debug log
    
    if not api_key:
        return jsonify({'error': 'API key is required'}), 400
    
    # Validate API key format
    if not api_key.startswith('sk-'):
        print(f"Invalid API key format provided: {api_key[:50]}...")  # Debug log
        return jsonify({'error': 'Invalid API key format. Please enter a valid OpenAI API key starting with sk-'}), 400
    
    user_session['api_key'] = api_key
    save_settings_to_file(user_session)
    print("API key saved successfully")  # Debug log
    return jsonify({'message': 'API key saved successfully'})

@app.route('/api/settings/openai/reset', methods=['POST'])
def reset_openai_key():
    """Reset/clear OpenAI API key"""
    user_session = get_user_session()
    user_session['api_key'] = None
    save_settings_to_file(user_session)
    print("API key reset successfully")  # Debug log
    return jsonify({'message': 'API key reset successfully'})

@app.route('/api/settings/shopify', methods=['POST'])
def set_shopify_credentials():
    """Set Shopify credentials"""
    data = request.json
    user_session = get_user_session()
    
    credentials = {
        'store_url': data.get('store_url', '').strip(),
        'api_token': data.get('api_token', '').strip(),
        'api_version': data.get('api_version', '2023-10').strip()
    }
    
    if not credentials['store_url'] or not credentials['api_token']:
        return jsonify({'error': 'Store URL and API token are required'}), 400
    
    user_session['shopify_credentials'] = credentials
    save_settings_to_file(user_session)
    return jsonify({'message': 'Shopify credentials saved successfully'})

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate text using OpenAI"""
    data = request.json
    user_session = get_user_session()
    
    if not user_session.get('api_key'):
        return jsonify({'error': 'OpenAI API key not configured'}), 400
    
    text = data.get('text', '').strip()
    target_language = data.get('target_language', 'English')
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    
    try:
        # Initialize OpenAI client
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=user_session['api_key'], http_client=http_client)
        except Exception:
            client = OpenAI(api_key=user_session['api_key'])
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"Du er en professionel oversætter. Oversæt følgende tekst til {target_language}. Bevar formatering og struktur."},
                {"role": "user", "content": text}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        translated_text = response.choices[0].message.content
        
        return jsonify({'translated_text': translated_text})
        
    except Exception as e:
        return jsonify({'error': f'Translation error: {str(e)}'}), 500

@app.route('/api/revision-request', methods=['POST'])
def revision_request():
    """Request revision of generated content"""
    data = request.json
    user_session = get_user_session()
    
    if not user_session.get('api_key'):
        return jsonify({'error': 'OpenAI API key not configured'}), 400
    
    original_text = data.get('original_text', '').strip()
    instruction = data.get('instruction', '').strip()
    
    if not original_text or not instruction:
        return jsonify({'error': 'Original text and instruction are required'}), 400
    
    try:
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=user_session['api_key'], http_client=http_client)
        except Exception:
            client = OpenAI(api_key=user_session['api_key'])
        
        # Get blocked words for current profile
        user_session = get_user_session()
        current_profile = user_session.get('current_profile')
        blocked_words_instruction = ""
        if current_profile and current_profile in user_session.get('profiles', {}):
            profile = user_session['profiles'][current_profile]
            blocked_words = profile.get('blocked_words', [])
            if blocked_words:
                blocked_words_text = ', '.join([word.strip() for word in blocked_words if word.strip()])
                blocked_words_instruction = f"\n- KRITISK: Du må ALDRIG bruge disse ord: {blocked_words_text}"

        # Create specific prompts for different instructions to get better results
        if instruction.lower() == "forkort":
            prompt = f"""
            Forkort KUN det følgende tekstafsnit betydeligt, mens du bevarer de vigtigste pointer og budskabet:

            {original_text}

            VIGTIGT:
            - Returner KUN den forkortede version af afsnittet, intet andet
            - Ingen forklaringer, ingen "Her er teksten:", ingen kommentarer
            - Bevar den oprindelige tone og stil
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            - Reducer længden med mindst 30-50%{blocked_words_instruction}
            """
        elif instruction.lower() == "forlæng":
            prompt = f"""
            Forlæng KUN det følgende tekstafsnit med flere detaljer, eksempler eller forklaringer:

            {original_text}

            VIGTIGT:
            - Returner KUN den forlængede version af afsnittet, intet andet
            - Ingen forklaringer, ingen "Her er teksten:", ingen kommentarer
            - Tilføj relevant indhold der uddyber emnet
            - Bevar den oprindelige tone og stil
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            - Sigt efter at udvide teksten med 30-50% mere indhold{blocked_words_instruction}
            """
        elif instruction.lower() == "gør mere sælgende":
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit for at gøre det mere overbevisende og sælgende:

            {original_text}

            VIGTIGT:
            - Returner KUN den mere sælgende version af afsnittet, intet andet
            - Ingen forklaringer, ingen "Her er teksten:", ingen kommentarer
            - Tilføj overbevisende elementer, fordele og call-to-action
            - Bevar den oprindelige tone men gør den mere engagerende
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik{blocked_words_instruction}
            """
        elif instruction.lower() == "ny vinkel":
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit med en ny og frisk vinkel eller tilgang:

            {original_text}

            VIGTIGT:
            - Returner KUN versionen med ny vinkel af afsnittet, intet andet
            - Ingen forklaringer, ingen "Her er teksten:", ingen kommentarer
            - Bevar samme information men præsenter den fra en ny vinkel
            - Bevar den oprindelige tone og stil
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik{blocked_words_instruction}
            """
        elif instruction.lower() == "mere simpel":
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit for at gøre det mere simpelt og lettere at forstå:

            {original_text}

            VIGTIGT:
            - Returner KUN den simplificerede version af afsnittet, intet andet
            - Ingen forklaringer, ingen "Her er teksten:", ingen kommentarer
            - Brug simplere ord og kortere sætninger
            - Gør komplekse koncepter mere tilgængelige
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik{blocked_words_instruction}
            """
        else:
            # General instruction
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit baseret på denne instruktion: "{instruction}"

            {original_text}

            VIGTIGT:
            - Returner KUN den omskrevne version af afsnittet, intet andet
            - Ingen forklaringer, ingen "Her er teksten:", ingen kommentarer
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik{blocked_words_instruction}
            """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du er en ekspert tekstredaktør der laver præcise ændringer til tekst. Du returnerer KUN den redigerede tekst uden forklaringer eller kommentarer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        revised_text = response.choices[0].message.content.strip()
        
        # CRITICAL: Filter blocked words from revised content
        user_session = get_user_session()
        current_profile = user_session.get('current_profile')
        if current_profile and current_profile in user_session.get('profiles', {}):
            profile = user_session['profiles'][current_profile]
            blocked_words = profile.get('blocked_words', [])
            if blocked_words:
                revised_text = filter_blocked_words(revised_text, blocked_words)
                print(f"✅ Revision: Blocked words filtered from revised text")
        
        # Clean up any unwanted AI responses
        # Remove common AI prefixes/suffixes
        unwanted_phrases = [
            "Her er den reviderede tekst:",
            "Her er teksten:",
            "Jeg håber, at dette opfylder dine behov",
            "Lad mig vide, hvis der er behov for yderligere ændringer",
            "---",
            "Her er resultatet:",
            "Her er den omskrevne version:",
            "Den reviderede tekst:"
        ]
        
        for phrase in unwanted_phrases:
            revised_text = revised_text.replace(phrase, "").strip()
        
        # Remove multiple dashes at start/end
        revised_text = revised_text.strip("-").strip()
        
        return jsonify({
            'success': True,
            'revised_text': revised_text,
            'revised_html': clean_html_output(markdown.markdown(revised_text, extensions=['tables', 'nl2br']))
        })
        
    except Exception as e:
        return jsonify({'error': f'Revision error: {str(e)}'}), 500

@app.route('/api/generate-seo-variations', methods=['POST'])
def generate_seo_variations():
    """Generate multiple SEO variations"""
    data = request.json
    user_session = get_user_session()
    
    if not user_session.get('api_key'):
        return jsonify({'error': 'OpenAI API key not configured'}), 400
    
    keywords = data.get('keywords', '').strip()
    variations_count = data.get('count', 3)
    
    if not keywords:
        return jsonify({'error': 'Keywords are required'}), 400
    
    try:
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=user_session['api_key'], http_client=http_client)
        except Exception:
            client = OpenAI(api_key=user_session['api_key'])
        variations = []
        
        for i in range(variations_count):
            prompt = f"""
            Skriv en kort SEO-optimeret tekst (ca. 150-200 ord) baseret på keywords: {keywords}
            
            Variation #{i+1} - Gør denne version unik med forskellig vinkel og tone.
            Inkluder:
            - Fængende overskrift
            - Naturlig brug af keywords
            - Call-to-action
            
            Formater med markdown.
            """
            
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "Du er en kreativ SEO-tekstforfatter."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.8
            )
            
            variations.append({
                'text': response.choices[0].message.content,
                'html': clean_html_output(markdown.markdown(response.choices[0].message.content, extensions=['tables', 'nl2br']))
            })
        
        return jsonify({'variations': variations})
        
    except Exception as e:
        return jsonify({'error': f'Error generating variations: {str(e)}'}), 500

@app.route('/api/profiles/export', methods=['GET'])
def export_profiles():
    """Export all profiles as JSON"""
    user_session = get_user_session()
    
    export_data = {
        'profiles': user_session['profiles'],
        'saved_texts': user_session['saved_texts'],
        'export_date': datetime.now().isoformat()
    }
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(export_data, temp_file, indent=2, ensure_ascii=False)
    temp_file.close()
    
    return send_file(temp_file.name, as_attachment=True, download_name='seo_profiles_export.json')

@app.route('/api/profiles/import', methods=['POST'])
def import_profiles():
    """Import profiles from JSON file"""
    user_session = get_user_session()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        import_data = json.load(file)
        
        # Merge profiles
        if 'profiles' in import_data:
            for profile_name, profile_data in import_data['profiles'].items():
                user_session['profiles'][profile_name] = profile_data
        
        # Merge saved texts
        if 'saved_texts' in import_data:
            for text_name, text_data in import_data['saved_texts'].items():
                user_session['saved_texts'][text_name] = text_data
        
        save_profiles_to_file(user_session)
        save_texts_to_file(user_session)
        
        return jsonify({'message': 'Profiles imported successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Import error: {str(e)}'}), 500

@app.route('/api/shopify/test-connection', methods=['POST'])
def test_shopify_connection():
    """Test Shopify connection for current profile"""
    user_session = get_user_session()
    
    data = request.get_json()
    profile_name = data.get('profile_name')
    
    if not profile_name:
        return jsonify({'error': 'Profile name is required'}), 400
    
    profiles = user_session.get('profiles', {})
    if profile_name not in profiles:
        return jsonify({'error': 'Profile not found'}), 404
    
    profile = profiles[profile_name]
    store_url = profile.get('shopify_store_url', '').strip()
    api_token = profile.get('shopify_api_token', '').strip()
    api_version = profile.get('shopify_api_version', '2023-10').strip()
    
    if not store_url or not api_token:
        return jsonify({'error': 'Shopify credentials not configured for this profile'}), 400
    
    try:
        headers = {
            'X-Shopify-Access-Token': api_token,
            'Content-Type': 'application/json',
            'User-Agent': 'SEO Generator Web App/1.0'
        }
        
        # Ensure store URL has proper format
        original_store_url = store_url
        if not store_url.startswith('https://'):
            store_url = f"https://{store_url}"
        if not store_url.endswith('.myshopify.com'):
            if not store_url.endswith('.myshopify.com/'):
                store_url = store_url.rstrip('/') + '.myshopify.com'
        
        url = f"{store_url}/admin/api/{api_version}/shop.json"
        
        print(f"Testing Shopify connection:")
        print(f"  Original URL: {original_store_url}")
        print(f"  Formatted URL: {store_url}")
        print(f"  Full API URL: {url}")
        print(f"  API Token: {api_token[:10]}...{api_token[-4:] if len(api_token) > 14 else api_token}")
        print(f"  API Version: {api_version}")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            shop_data = response.json()
            print(f"Success! Shop data: {shop_data}")
            return jsonify({
                'success': True,
                'shop_name': shop_data['shop']['name'],
                'domain': shop_data['shop']['domain']
            })
        elif response.status_code == 401:
            try:
                error_data = response.json()
                error_message = error_data.get('errors', 'Invalid API token or insufficient permissions')
            except:
                error_message = 'Invalid API token or insufficient permissions'
            
            return jsonify({
                'error': f'Authentication failed (401): {error_message}. Please check your API token and ensure it has the required permissions (read_products, read_content, write_content).'
            }), 400
        elif response.status_code == 404:
            return jsonify({
                'error': f'Store not found (404): The store URL "{original_store_url}" is incorrect. Please verify your store URL.'
            }), 400
        else:
            try:
                error_data = response.json()
                error_message = error_data.get('errors', f'HTTP {response.status_code}')
            except:
                error_message = f'HTTP {response.status_code}'
            
            return jsonify({
                'error': f'Connection failed ({response.status_code}): {error_message}'
            }), 400
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Connection timeout. Please check your internet connection and try again.'}), 500
    except requests.exceptions.ConnectionError:
        return jsonify({'error': f'Cannot connect to {store_url}. Please check the store URL and your internet connection.'}), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Connection error: {str(e)}'}), 500

@app.route('/api/shopify/products', methods=['GET'])
def get_shopify_products():
    """Get products from Shopify for current profile"""
    user_session = get_user_session()
    
    profile_name = request.args.get('profile_name')
    if not profile_name:
        return jsonify({'error': 'Profile name is required'}), 400
    
    profiles = user_session.get('profiles', {})
    if profile_name not in profiles:
        return jsonify({'error': 'Profile not found'}), 404
    
    profile = profiles[profile_name]
    store_url = profile.get('shopify_store_url', '').strip()
    api_token = profile.get('shopify_api_token', '').strip()
    api_version = profile.get('shopify_api_version', '2023-10').strip()
    
    if not store_url or not api_token:
        return jsonify({'error': 'Shopify credentials not configured for this profile'}), 400
    
    try:
        headers = {
            'X-Shopify-Access-Token': api_token,
            'Content-Type': 'application/json',
            'User-Agent': 'SEO Generator Web App/1.0'
        }
        
        # Ensure store URL has proper format
        if not store_url.startswith('https://'):
            store_url = f"https://{store_url}"
        if not store_url.endswith('.myshopify.com'):
            if not store_url.endswith('.myshopify.com/'):
                store_url = store_url.rstrip('/') + '.myshopify.com'
        
        url = f"{store_url}/admin/api/{api_version}/products.json"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            products_data = response.json()
            return jsonify({'products': products_data['products']})
        else:
            return jsonify({'error': f'Failed to fetch products: {response.status_code}'}), 400
            
    except Exception as e:
        return jsonify({'error': f'Error fetching products: {str(e)}'}), 500

@app.route('/api/enhanced-generate-seo', methods=['POST'])
def enhanced_generate_seo():
    try:
        print("=== Enhanced SEO Generation Request ===")
        
        # Get JSON data with proper encoding handling
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        print(f"Request data: {data}")
        
        # Extract all parameters with proper encoding handling
        keywords = data.get('keywords', '').strip()
        secondary_keywords = data.get('secondary_keywords', '').strip()
        lsi_keywords = data.get('lsi_keywords', '').strip()
        target_audience = data.get('target_audience', 'Alle')
        content_purpose = data.get('content_purpose', 'Information')
        content_type = data.get('content_type', 'Blog Post')
        custom_instructions = data.get('custom_instructions', '').strip()
        text_length = data.get('text_length', 500)
        include_meta = data.get('include_meta', True)
        include_keywords = data.get('include_keywords', True)
        include_faq = data.get('include_faq', False)
        include_cta = data.get('include_cta', False)
        include_schema = data.get('include_schema', False)
        include_internal_links = data.get('include_internal_links', False)
        selected_products = data.get('selected_products', [])
        profile_name = data.get('profile', '')
        
        print(f"Keywords: {keywords}")
        
        # Get API key from the selected profile
        user_session = get_user_session()
        profiles = user_session.get('profiles', {})
        
        if not profile_name or profile_name not in profiles:
            return jsonify({'error': 'Ingen profil valgt eller profil ikke fundet'}), 400
            
        profile = profiles[profile_name]
        api_key = profile.get('api_key', '').strip()
        
        if not api_key:
            return jsonify({'error': 'Ingen API nøgle fundet for denne profil. Tilføj en API nøgle i profil indstillingerne.'}), 400
        
        print(f"Retrieved API key from profile '{profile_name}': {api_key[:10]}...")
        
        if not keywords:
            return jsonify({'error': 'Keywords are required'}), 400
        
        try:
            print("Initializing OpenAI client...")
            print(f"API key type: {type(api_key)}")
            print(f"API key length: {len(api_key) if api_key else 0}")
            
            # Try to create client with explicit parameters only
            try:
                # Create httpx client without proxies to avoid compatibility issues
                import httpx
                http_client = httpx.Client()
                client = OpenAI(api_key=api_key, http_client=http_client)
                print("✓ OpenAI client created successfully")
            except Exception as client_error:
                print(f"❌ OpenAI client creation failed: {client_error}")
                print(f"Error type: {type(client_error)}")
                import traceback
                traceback.print_exc()
                # Try fallback without explicit http_client
                try:
                    print("Trying fallback without explicit http_client...")
                    client = OpenAI(api_key=api_key)
                    print("✓ Fallback OpenAI client created successfully")
                except Exception as fallback_error:
                    print(f"❌ Fallback also failed: {fallback_error}")
                    raise fallback_error
            
            # Build comprehensive prompt with detailed structure (based on old working code)
            prompt_parts = []
            
            # Detailed output structure instructions with keyword focus
            prompt_parts.append(f"Du er en ekspert SEO-tekstforfatter. PRIMÆRT FOKUS: Alt indhold skal være 100% relevant for keywordet '{keywords}'.")
            prompt_parts.append(f"VIGTIGT: Undgå generelle virksomhedsoplysninger der ikke direkte relaterer til '{keywords}'. Dit output SKAL struktureres PRÆCIS sådan:")
            
            # Line 1: H1 Title
            prompt_parts.append(f"1. ALLERFØRSTE linje: KUN den foreslåede H1-titel til teksten, startende med '# '.")
            prompt_parts.append(f"   - H1-titlen skal følge reglen om kun stort begyndelsesbogstav i første ord samt i eventuelle egennavne (sentence case). SKAL indeholde det primære keyword '{keywords}' eller en tæt variant.")
            prompt_parts.append(f"   - H1 skal være specifik for '{keywords}' - ikke generel virksomhedsinfo.")
            prompt_parts.append(f"   - Eksempel KORREKT H1: '# Sådan vælger du den rigtige boremaskine' | Eksempel FORKERT H1: '# Sådan Vælger Du Den Rigtige Boremaskine'")
            
            # Line 2: Meta Description (if requested)
            if include_meta:
                prompt_parts.append(f"2. ANDEN linje: KUN den foreslåede Meta Beskrivelse (max 155 tegn), startende med 'META: '. INGEN andre markeringer.")
                prompt_parts.append(f"   - Meta Beskrivelsen må ALDRIG inkluderes i brødteksten nedenfor.")
                prompt_parts.append(f"   - Meta beskrivelsen er KUN til søgemaskiner - ikke synlig tekst for læseren.")
            
            # Line 3+: Body content with keyword focus
            body_start_line = "3. TREDJE" if include_meta else "2. ANDEN"
            prompt_parts.append(f"{body_start_line} linje og FREMEFTER: KUN selve brødteksten (body content) til SEO-teksten på PRÆCIS {text_length} ord.")
            prompt_parts.append(f"   - VIGTIGT: Teksten SKAL være mindst {text_length} ord lang. Hvis du er i tvivl, skriv længere frem for kortere.")
            prompt_parts.append(f"   - Brødteksten må IKKE indeholde H1-titlen eller Meta Beskrivelsen igen.")
            prompt_parts.append(f"   - Start ALTID brødteksten med en kort, engagerende indledning (2-3 sætninger) om '{keywords}', der fanger læserens interesse.")
            prompt_parts.append(f"   - HELE teksten skal handle om '{keywords}' - undgå generelle virksomhedsoplysninger der ikke relaterer til emnet.")
            prompt_parts.append(f"   - Brug H2, H3, H4 underoverskrifter i brødteksten der alle relaterer til '{keywords}'.")
            prompt_parts.append(f"   - Hvis virksomhedsinfo nævnes, skal det være direkte relevant for '{keywords}' - ikke generelle beskrivelser.")
            
            prompt_parts.append("\n")  # Line break
            
            # Minimal company context - only if relevant to keywords
            company_context_parts = []
            if profile_name and profile_name in user_session.get('profiles', {}):
                profile_data = user_session['profiles'][profile_name]
                company_context_parts.append(f"Virksomhed: {profile_name}")
                
                # Only include company description if it's short and relevant
                if profile_data.get('description'):
                    description = profile_data['description']
                    # Limit company description to max 150 characters to avoid overwhelming the AI
                    if len(description) > 150:
                        # Take first sentence or first 150 chars, whichever is shorter
                        first_sentence = description.split('.')[0] + '.'
                        limited_description = first_sentence if len(first_sentence) <= 150 else description[:147] + '...'
                    else:
                        limited_description = description
                    company_context_parts.append(f"Kort virksomhedskontext (brug kun hvis relevant for keywordet): {limited_description}")
                
                if profile_data.get('tone'):
                    company_context_parts.append(f"Tone of Voice: {profile_data['tone']}")
            
            if company_context_parts:
                prompt_parts.extend(company_context_parts)
                prompt_parts.append("\n")
            
            # PRIMARY FOCUS: Keywords and content purpose
            prompt_parts.append(f"PRIMÆRT FOKUS: Skriv {content_type} der er 100% optimeret for søgeordet '{keywords}' målrettet {target_audience} med formål: {content_purpose}")
            prompt_parts.append(f"VIGTIGT: Hele teksten skal være relevant for '{keywords}' - undgå generelle virksomhedsoplysninger der ikke relaterer til dette keyword.")
            
            if secondary_keywords:
                prompt_parts.append(f"Sekundære keywords til naturlig integration: {secondary_keywords}")
            if lsi_keywords:
                prompt_parts.append(f"LSI keywords til semantisk relevans: {lsi_keywords}")
            
            # Add custom instructions
            if custom_instructions:
                prompt_parts.append(f"\nFølg disse generelle instruktioner nøje:\n{custom_instructions}\n")
            
            # Content features
            features_list = []
            # Note: Meta description is NOT included in body content - it's only metadata
            if include_faq: 
                features_list.append("FAQ sektion")
            if include_cta: 
                features_list.append("Call-to-action")
            if include_schema: 
                features_list.append("Schema markup (som tekst)")
            if include_internal_links: 
                features_list.append("Interne Links")
            
            if features_list:
                prompt_parts.append(f"\nInkluder i brødteksten: {', '.join(features_list)}")
            
            # Important formatting and language rules
            prompt_parts.append(f"\n\nVIGTIGT (Brødtekst): Korrekt dansk retskrivning og grammatik er essentielt.")
            prompt_parts.append(f"DANSKE OVERSKRIFTER (H2/H3/H4): Følg danske regler - KUN stort begyndelsesbogstav i det første ord. Almindelige substantiver, adjektiver og verber skal være små.")
            prompt_parts.append(f"Eksempel KORREKT dansk: '## Møbeldesign team', '## Historie om virksomheden', '## Kvalitet og håndværk'")
            prompt_parts.append(f"Eksempel FORKERT engelsk stil: '## Møbeldesign Team', '## Historie Om Virksomheden', '## Kvalitet Og Håndværk'")
            prompt_parts.append(f"UNDTAGELSER: Kun egennavne (firmanavne, personnavne, stednavne) får stort begyndelsesbogstav: '## Noyer virksomhed', '## København som base'")
            
            # Note: Blocked words are NOT used in main SEO generation (only in revisions)
            # This matches the behavior of the original desktop application
            
            # PRIORITIZED: Product information if selected (higher priority than company info)
            if selected_products:
                print(f"Selected products: {selected_products}")
                profile_products = profile.get('products', [])
                print(f"Available products in profile: {[p.get('name') for p in profile_products]}")
                
                products_info = []
                for product_name in selected_products:
                    # Find product details from current profile's products
                    for product in profile_products:
                        if product.get('name') == product_name:
                            product_desc = product.get('description', '')
                            product_url = product.get('url', '')
                            product_info = f"Produktnavn: {product['name']}"
                            if product_desc:
                                # Keep full product description as it's directly relevant
                                product_info += f"\nBeskrivelse: {product_desc}"
                            if product_url:
                                product_info += f"\nURL: {product_url}"
                            products_info.append(product_info)
                            print(f"Found product: {product_name}")
                            break
                    else:
                        print(f"Product not found: {product_name}")
                
                if products_info:
                    product_section = f"\n\nHØJ PRIORITET - Fokuser primært på disse produkter i relation til '{keywords}':\n---\n" + "\n---\n".join(products_info) + "\n---"
                    product_section += f"\nSkriv teksten så den naturligt integrerer disse produkter med keywordet '{keywords}'. Produktinformation har højere prioritet end generel virksomhedsinfo."
                    prompt_parts.append(product_section)
                    print(f"Added prioritized product information to prompt")
                else:
                    print("No matching products found for selected products")
            
            # Add internal links if enabled
            if include_internal_links:
                internal_links = profile.get('internal_links', '')
                if internal_links:
                    # Parse internal links (assuming they're stored as text, one per line)
                    links_list = [link.strip() for link in internal_links.split('\n') if link.strip()]
                    if links_list:
                        # Take max 3 links
                        link_details = "\n".join([f"  - {link}" for link in links_list[:3]])
                        link_section = (
                            "\n\n**Interne Links:**\n"
                            f"Hvis det er relevant og naturligt, flet da op til 3 af følgende interne links ind i teksten. Brug linkets navn som ankertekst.\n"
                            f"{link_details}\n"
                            "Prioriter links i en eventuel Call-to-Action sektion, hvis en sådan genereres."
                        )
                        prompt_parts.append(link_section)
            
            prompt = "\n".join(prompt_parts)
            print(f"Prompt length: {len(prompt)} characters")
            
            print("Sending request to OpenAI...")
            # Calculate appropriate max_tokens based on text length
            # Rule of thumb: 1 word ≈ 1.3 tokens, plus extra for formatting and structure
            estimated_tokens = int(text_length * 1.5) + 500  # Extra for H1, meta, formatting
            max_tokens = max(estimated_tokens, 3000)  # Minimum 3000 tokens
            
            print(f"Text length requested: {text_length} words")
            print(f"Max tokens set to: {max_tokens}")
            
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": "Du er en ekspert SEO-tekstforfatter der skriver på dansk. Du fokuserer altid på keyword-relevans og undgår generelle virksomhedsoplysninger der ikke relaterer til det specifikke keyword. Du følger danske sproglige konventioner og skriver engagerende indhold."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            
            generated_text = response.choices[0].message.content
            print(f"Generated text length: {len(generated_text)}")
            print("=== DEBUG: Generated Text ===")
            print(generated_text[:500] + "..." if len(generated_text) > 500 else generated_text)
            
            # CRITICAL: Filter blocked words from generated content
            blocked_words = profile.get('blocked_words', [])
            print(f"DEBUG: Blocked words for filtering: {blocked_words}")
            if blocked_words:
                original_length = len(generated_text)
                generated_text = filter_blocked_words(generated_text, blocked_words)
                print(f"✅ Blocked words filtered from generated text (length: {original_length} -> {len(generated_text)})")
            
            # Convert markdown to HTML with same extensions as old app
            import markdown
            import re
            raw_html = markdown.markdown(generated_text, extensions=['tables', 'nl2br'])
            
            # Clean HTML like the old app - remove extra whitespace and format properly
            html_content = clean_html_output(raw_html)
            
            # DOUBLE CHECK: Also filter blocked words from HTML content
            if blocked_words:
                html_content = filter_blocked_words(html_content, blocked_words)
                print(f"✅ Blocked words filtered from HTML content")
            
            # IMPORTANT: Remove any META lines that might have leaked into the content
            # Meta descriptions should only be metadata, not visible content
            html_content = re.sub(r'<p>\s*META:.*?</p>\s*', '', html_content, flags=re.IGNORECASE | re.DOTALL)
            html_content = re.sub(r'<p>.*?META:.*?</p>\s*', '', html_content, flags=re.IGNORECASE | re.DOTALL)
            print("=== DEBUG: HTML Content ===")
            print(html_content[:500] + "..." if len(html_content) > 500 else html_content)
            
            # Extract title and meta description
            lines = generated_text.split('\n')
            title = ""
            meta_description = ""
            
            for line in lines:
                line = line.strip()
                if line.startswith('# ') and not title:
                    title = line[2:].strip()
                elif 'meta' in line.lower() and 'beskrivelse' in line.lower() and not meta_description:
                    # Try to extract meta description
                    if ':' in line:
                        meta_description = line.split(':', 1)[1].strip()
            
            # If no meta description found, create one from first paragraph
            if not meta_description and include_meta:
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#') and not line.startswith('**') and len(line) > 50:
                        meta_description = line[:150] + "..." if len(line) > 150 else line
                        break
            
            result = {
                'title': title,
                'meta_description': meta_description,
                'content': generated_text,
                'html_content': html_content,
                'keywords': keywords,
                'profile': profile_name
            }
            
            print("Enhanced SEO generation successful")
            return jsonify(result)
            
        except Exception as openai_error:
            print(f"OpenAI API error: {openai_error}")
            return jsonify({'error': f'OpenAI API error: {str(openai_error)}'}), 500
            
    except Exception as e:
        print(f"Error in enhanced SEO generation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/shopify/upload-blog-post', methods=['POST'])
def upload_blog_post_to_shopify():
    """Upload blog post to Shopify following the old app structure exactly"""
    try:
        data = request.json
        user_session = get_user_session()
        
        print(f"=== Shopify Upload Request ===")
        print(f"Request data: {data}")
        
        # Get required data
        title = data.get('title', '').strip()
        body_html = data.get('body_html', '').strip()
        author = data.get('author', 'SEO Generator App').strip()
        profile_name = data.get('profile_name')  # Get profile name from request
        
        print(f"Title: {title}")
        print(f"Author: {author}")
        print(f"Profile: {profile_name}")
        print(f"Body HTML length: {len(body_html)}")
        
        if not title or not body_html:
            return jsonify({'error': 'Title and body content are required'}), 400
        
        if not profile_name:
            return jsonify({'error': 'Profile name is required'}), 400
        
        # Get Shopify credentials from profile
        profiles = user_session.get('profiles', {})
        if profile_name not in profiles:
            return jsonify({'error': 'Profile not found'}), 404
        
        profile = profiles[profile_name]
        store_url = profile.get('shopify_store_url', '').strip()
        api_token = profile.get('shopify_api_token', '').strip()
        
        # FORCE API VERSION to 2023-10 to match the old working app
        # We will ignore the version saved in the profile for this function
        api_version = "2023-10"
        
        print(f"Store URL (original): {store_url}")
        print(f"API Token: {api_token[:10] if api_token else 'EMPTY'}...")
        print(f"FORCING API Version to: {api_version} to match old app.")
        
        if not store_url or not api_token:
            return jsonify({'error': 'Shopify credentials not configured for this profile'}), 400
        
        # Format store URL exactly like the old app
        if store_url.startswith("https://"):
            store_url = store_url[len("https://"):]
        if store_url.endswith("/"):
            store_url = store_url[:-1]
        
        if not store_url.endswith('.myshopify.com'):
            store_url = store_url + '.myshopify.com'
        
        print(f"Store URL (formatted): {store_url}")
        
        headers = {
            'X-Shopify-Access-Token': api_token,
            'Content-Type': 'application/json',
            'User-Agent': 'SEO Generator Web App/1.0'
        }
        
        # --- EXACTLY LIKE OLD APP: Get available blogs first ---
        print("Fetching blogs from Shopify...")
        
        # Build the endpoint URL with the FORCED api_version
        blogs_endpoint = f"https://{store_url}/admin/api/{api_version}/blogs.json"
        upload_endpoint_base = f"https://{store_url}/admin/api/{api_version}/blogs"
        
        print(f"Using endpoint: {blogs_endpoint}")
        
        try:
            # --- PRIMARY: REST API approach (like old app) ---
            print("Using REST API (like old app)...")
            response = requests.get(blogs_endpoint, headers=headers, timeout=10)
            response.raise_for_status()
            blogs_data = response.json()
            available_blogs = blogs_data.get("blogs", [])
            print(f"REST API found {len(available_blogs)} blogs")
            
            if not available_blogs:
                return jsonify({
                    'error': 'No blogs found in Shopify store. Please create a blog in Shopify admin first.'
                }), 400
            
            target_blog_id = None
            target_blog_title = ""
            
            # EXACTLY like old app: if only one blog, use it automatically
            if len(available_blogs) == 1:
                target_blog_id = available_blogs[0].get("id")
                target_blog_title = available_blogs[0].get("title", "Unknown Blog")
                if not target_blog_id:
                    return jsonify({'error': 'Could not read ID for the only blog found'}), 400
                print(f"Only one blog found, using automatically: {target_blog_title} (ID: {target_blog_id})")
            else:
                # Multiple blogs - return them for frontend selection
                blog_options = []
                for blog in available_blogs:
                    blog_options.append({
                        'id': blog.get('id'),
                        'title': blog.get('title', f'Unknown Blog (ID: {blog.get("id")})')
                    })
                print(f"Multiple blogs found, returning for selection: {[b['title'] for b in blog_options]}")
                return jsonify({
                    'blogs': blog_options,
                    'requires_selection': True
                })
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching blogs: {e}")
            # FALLBACK: If we can't read blogs (403 Forbidden, missing read_content scope), 
            # try uploading directly to common blog IDs like the old working method
            print("GET blogs failed, trying fallback strategy: direct upload to common blog IDs...")
            
            common_blog_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            
            for test_blog_id in common_blog_ids:
                print(f"Testing direct upload to blog ID: {test_blog_id}")
                
                # Try to upload directly to this blog ID
                test_upload_url = f"{upload_endpoint_base}/{test_blog_id}/articles.json"
                
                # Prepare a test payload (same structure as real upload)
                test_payload = {
                    "article": {
                        "title": title,
                        "author": author,
                        "body_html": body_html,
                        "published": False
                    }
                }
                
                # Add featured image if provided with alt text for SEO
                featured_image_url = data.get('featured_image_url')
                if featured_image_url:
                    # Create SEO-optimized alt text
                    image_alt_text = create_image_alt_text(title)
                    test_payload["article"]["image"] = {
                        "src": featured_image_url,
                        "alt": image_alt_text
                    }
                    print(f"Adding featured image: {featured_image_url}")
                    print(f"With alt text: {image_alt_text}")
                
                print(f"Testing upload to: {test_upload_url}")
                test_response = requests.post(test_upload_url, headers=headers, json=test_payload)
                print(f"Test upload response status: {test_response.status_code}")
                
                if test_response.status_code == 201:
                    # Success! This blog ID works
                    target_blog_id = test_blog_id
                    print(f"✓ Success! Found working blog ID: {target_blog_id}")
                    
                    # Parse the successful response
                    created_article = test_response.json().get('article', {})
                    article_id = created_article.get('id')
                    admin_url = f"https://{store_url}/admin/blogs/{target_blog_id}/articles/{article_id}" if article_id else None
                    
                    return jsonify({
                        'success': True,
                        'message': f'Nyt blogindlæg "{title}" blev oprettet i Shopify!',
                        'article_id': article_id,
                        'admin_url': admin_url,
                        'blog_id': target_blog_id,
                        'blog_title': f'Blog {target_blog_id}',
                        'status': 'Kladde'
                    })
                
                elif test_response.status_code == 404:
                    print(f"Blog ID {test_blog_id} not found, trying next...")
                    continue
                    
                elif test_response.status_code == 403:
                    print(f"Access denied for blog ID {test_blog_id} - insufficient permissions")
                    continue
                    
                else:
                    print(f"Blog ID {test_blog_id} returned {test_response.status_code}, trying next...")
                    continue
            
            # If we get here, both methods failed
            return jsonify({'error': f'Could not access blogs in your Shopify store. Error: {str(e)}. Please check your API permissions include "read_content" and "write_content" scopes, or create a blog manually in Shopify admin.'}), 500
        
        # Continue with single blog upload...
        print(f"Proceeding with blog: {target_blog_title} (ID: {target_blog_id})")
        
        # Create the blog post payload following old code structure
        payload_article = {
            "title": title,  # Separate title like old code
            "author": author,
            "body_html": body_html,  # Body content only like old code
            "published": False  # Create as draft first
        }
        
        # Add featured image if provided with alt text for SEO
        featured_image_url = data.get('featured_image_url')
        if featured_image_url:
            # Create image object with alt text based on the article title
            image_alt_text = create_image_alt_text(title)
            payload_article["image"] = {
                "src": featured_image_url,
                "alt": image_alt_text
            }
            print(f"Adding featured image: {featured_image_url}")
            print(f"With alt text: {image_alt_text}")
        
        payload = {"article": payload_article}
        print(f"Upload payload created: {payload}")
        
        # Upload to Shopify
        upload_endpoint = f"{upload_endpoint_base}/{target_blog_id}/articles.json"
        print(f"Uploading to: {upload_endpoint}")
        
        response = requests.post(upload_endpoint, headers=headers, json=payload, timeout=20)
        print(f"Upload response status: {response.status_code}")
        
        if response.status_code != 201:  # Shopify returns 201 for successful creation
            error_message = f"Upload failed: HTTP {response.status_code}"
            try:
                error_data = response.json()
                if 'errors' in error_data:
                    if isinstance(error_data['errors'], dict):
                        error_details = []
                        for key, value in error_data['errors'].items():
                            if isinstance(value, list):
                                error_details.append(f"{key}: {', '.join(value)}")
                            else:
                                error_details.append(f"{key}: {value}")
                        error_message += f" - {'; '.join(error_details)}"
                    else:
                        error_message += f" - {error_data['errors']}"
                else:
                    error_message += f" - {error_data}"
            except:
                error_message += f" - {response.text}"
            print(f"Upload error: {error_message}")
            return jsonify({'error': error_message}), 400
        
        # Success!
        created_article_data = response.json().get("article", {})
        article_id = created_article_data.get('id')
        article_admin_url = f"https://{store_url}/admin/blogs/{target_blog_id}/articles/{article_id}" if article_id else None
        
        print(f"✓ Upload successful! Article ID: {article_id}")
        print(f"Admin URL: {article_admin_url}")
        
        return jsonify({
            'success': True,
            'message': f'Nyt blogindlæg "{title}" blev oprettet i Shopify!',
            'article_id': article_id,
            'admin_url': article_admin_url,
            'blog_title': target_blog_title,
            'status': 'Kladde' if not payload['article']['published'] else 'Publiceret'
        })
        
    except requests.exceptions.Timeout:
        print("Upload timeout error")
        return jsonify({'error': 'Timeout under upload til Shopify'}), 500
    except requests.exceptions.HTTPError as err:
        print(f"HTTP error: {err}")
        error_message = f"HTTP Fejl {err.response.status_code}: {err.response.reason}"
        try:
            error_details = err.response.json()
            errors = error_details.get('errors', err.response.text)
            if isinstance(errors, dict):
                error_message += "\nDetaljer:\n" + "\n".join([f"- {k}: {v}" for k, v in errors.items()])
            else:
                error_message += f"\nDetaljer: {errors}"
        except:
            error_message += f"\nServer svar: {err.response.text}"
        return jsonify({'error': error_message}), 500
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return jsonify({'error': f'Netværksfejl ved upload til Shopify: {str(e)}'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Uventet fejl under Shopify upload: {str(e)}'}), 500

@app.route('/api/shopify/upload-blog-post-to-blog', methods=['POST'])
def upload_blog_post_to_specific_blog():
    """Upload blog post to a specific Shopify blog"""
    try:
        data = request.json
        user_session = get_user_session()
        
        print(f"=== Shopify Specific Blog Upload Request ===")
        print(f"Request data: {data}")
        
        # Get required data
        title = data.get('title', '').strip()
        body_html = data.get('body_html', '').strip()
        author = data.get('author', 'SEO Generator App').strip()
        blog_id = data.get('blog_id')
        profile_name = data.get('profile_name')  # Get profile name from request
        
        print(f"Title: {title}")
        print(f"Author: {author}")
        print(f"Blog ID: {blog_id}")
        print(f"Profile: {profile_name}")
        print(f"Body HTML length: {len(body_html)}")
        
        if not title or not body_html or not blog_id:
            return jsonify({'error': 'Title, body content and blog ID are required'}), 400
        
        if not profile_name:
            return jsonify({'error': 'Profile name is required'}), 400
        
        # Get Shopify credentials from profile
        profiles = user_session.get('profiles', {})
        if profile_name not in profiles:
            return jsonify({'error': 'Profile not found'}), 404
        
        profile = profiles[profile_name]
        store_url = profile.get('shopify_store_url', '').strip()
        api_token = profile.get('shopify_api_token', '').strip()
        api_version = profile.get('shopify_api_version', '2023-10').strip()
        
        print(f"Store URL (original): {store_url}")
        print(f"API Token: {api_token[:10] if api_token else 'EMPTY'}...")
        print(f"API Version: {api_version}")
        
        if not store_url or not api_token:
            return jsonify({'error': 'Shopify credentials not configured for this profile'}), 400
        
        # Format store URL exactly like the old app
        if store_url.startswith("https://"):
            store_url = store_url[len("https://"):]
        if store_url.endswith("/"):
            store_url = store_url[:-1]
        
        # Add the .myshopify.com suffix if missing
        if not store_url.endswith('.myshopify.com'):
            store_url = store_url + '.myshopify.com'
        
        print(f"Store URL (formatted): {store_url}")
        
        headers = {
            'X-Shopify-Access-Token': api_token,
            'Content-Type': 'application/json',
            'User-Agent': 'SEO Generator Web App/1.0'
        }
        
        # Create the blog post payload following old code structure
        payload_article = {
            "title": title,  # Separate title like old code
            "author": author,
            "body_html": body_html,  # Body content only like old code
            "published": False  # Create as draft first
        }
        
        # Add featured image if provided with alt text for SEO
        featured_image_url = data.get('featured_image_url')
        if featured_image_url:
            # Create image object with alt text based on the article title
            image_alt_text = create_image_alt_text(title)
            payload_article["image"] = {
                "src": featured_image_url,
                "alt": image_alt_text
            }
            print(f"Adding featured image: {featured_image_url}")
            print(f"With alt text: {image_alt_text}")
        
        payload = {"article": payload_article}
        print(f"Upload payload created: {payload}")
        
        # Upload to Shopify
        api_version = profile.get('shopify_api_version', '2023-10').strip()
        if not api_version:
            upload_endpoint = f"https://{store_url}/admin/blogs/{blog_id}/articles.json"
        else:
            upload_endpoint = f"https://{store_url}/admin/api/{api_version}/blogs/{blog_id}/articles.json"
        print(f"Uploading to: {upload_endpoint}")
        
        response = requests.post(upload_endpoint, headers=headers, json=payload, timeout=20)
        print(f"Upload response status: {response.status_code}")
        
        if response.status_code != 201:  # Shopify returns 201 for successful creation
            error_message = f"Upload failed: HTTP {response.status_code}"
            try:
                error_data = response.json()
                if 'errors' in error_data:
                    if isinstance(error_data['errors'], dict):
                        error_details = []
                        for key, value in error_data['errors'].items():
                            if isinstance(value, list):
                                error_details.append(f"{key}: {', '.join(value)}")
                            else:
                                error_details.append(f"{key}: {value}")
                        error_message += f" - {'; '.join(error_details)}"
                    else:
                        error_message += f" - {error_data['errors']}"
                else:
                    error_message += f" - {error_data}"
            except:
                error_message += f" - {response.text}"
            print(f"Upload error: {error_message}")
            return jsonify({'error': error_message}), 400
        
        # Success!
        created_article_data = response.json().get("article", {})
        article_id = created_article_data.get('id')
        article_admin_url = f"https://{store_url}/admin/blogs/{blog_id}/articles/{article_id}" if article_id else None
        
        print(f"✓ Upload successful! Article ID: {article_id}")
        print(f"Admin URL: {article_admin_url}")
        
        return jsonify({
            'success': True,
            'message': f'Nyt blogindlæg "{title}" blev oprettet i Shopify!',
            'article_id': article_id,
            'admin_url': article_admin_url,
            'status': 'Kladde' if not payload['article']['published'] else 'Publiceret'
        })
        
    except requests.exceptions.Timeout:
        print("Upload timeout error")
        return jsonify({'error': 'Timeout under upload til Shopify'}), 500
    except requests.exceptions.HTTPError as err:
        print(f"HTTP error: {err}")
        error_message = f"HTTP Fejl {err.response.status_code}: {err.response.reason}"
        try:
            error_details = err.response.json()
            errors = error_details.get('errors', err.response.text)
            if isinstance(errors, dict):
                error_message += "\nDetaljer:\n" + "\n".join([f"- {k}: {v}" for k, v in errors.items()])
            else:
                error_message += f"\nDetaljer: {errors}"
        except:
            error_message += f"\nServer svar: {err.response.text}"
        return jsonify({'error': error_message}), 500
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return jsonify({'error': f'Netværksfejl ved upload til Shopify: {str(e)}'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Uventet fejl under Shopify upload: {str(e)}'}), 500

@app.route('/api/shopify/product-images', methods=['GET'])
def get_shopify_product_images():
    """Get images from Shopify products for current profile (with local cache support)"""
    user_session = get_user_session()
    
    profile_name = request.args.get('profile_name')
    product_id = request.args.get('product_id')
    
    print(f"=== Fetching Shopify Images ===")
    print(f"Profile name: {profile_name}")
    print(f"Product ID: {product_id}")
    
    if not profile_name:
        return jsonify({'error': 'Profile name is required'}), 400
    
    # First, try to get cached images
    cached_images = get_cached_images(profile_name, product_id)
    if cached_images:
        print(f"Using cached images: {len(cached_images)} images found")
        return jsonify({
            'images': cached_images,
            'total': len(cached_images),
            'source': 'cache'
        })
    
    print("No cached images found, trying Shopify API...")
    
    profiles = user_session.get('profiles', {})
    if profile_name not in profiles:
        return jsonify({'error': 'Profile not found'}), 404
    
    profile = profiles[profile_name]
    store_url = profile.get('shopify_store_url', '').strip()
    api_token = profile.get('shopify_api_token', '').strip()
    api_version = profile.get('shopify_api_version', '2023-10').strip()
    
    print(f"Store URL: {store_url}")
    print(f"API Token: {api_token[:10] if api_token else 'EMPTY'}...")
    print(f"API Version: {api_version}")
    
    if not store_url or not api_token:
        return jsonify({'error': 'Shopify credentials not configured for this profile'}), 400
    
    try:
        headers = {
            'X-Shopify-Access-Token': api_token,
            'Content-Type': 'application/json',
            'User-Agent': 'SEO Generator Web App/1.0'
        }
        
        # Ensure store URL has proper format
        if not store_url.startswith('https://'):
            store_url = f"https://{store_url}"
        if not store_url.endswith('.myshopify.com'):
            if not store_url.endswith('.myshopify.com/'):
                store_url = store_url.rstrip('/') + '.myshopify.com'
        
        # Get all products if no specific product_id
        if product_id:
            url = f"{store_url}/admin/api/{api_version}/products/{product_id}/images.json"
            print(f"Fetching images for specific product: {url}")
        else:
            # Try different approaches to get products and images
            # First try: Get products with images included (like old app)
            products_url = f"{store_url}/admin/api/{api_version}/products.json?fields=id,title,images"
            print(f"Fetching all products with images: {products_url}")
            
            products_response = requests.get(products_url, headers=headers, timeout=15)
            print(f"Products response status: {products_response.status_code}")
            
            if products_response.status_code != 200:
                print(f"Failed to fetch products: {products_response.text}")
                
                # If 403, try a simpler approach - just get product IDs first
                if products_response.status_code == 403:
                    print("Trying fallback approach - getting products without images field...")
                    simple_products_url = f"{store_url}/admin/api/{api_version}/products.json?fields=id,title"
                    simple_response = requests.get(simple_products_url, headers=headers, timeout=15)
                    print(f"Simple products response status: {simple_response.status_code}")
                    
                    if simple_response.status_code == 200:
                        # Success with simple approach, now get images for each product individually
                        simple_products_data = simple_response.json()
                        products = simple_products_data.get("products", [])
                        print(f"Found {len(products)} products with simple approach")
                        
                        all_images = []
                        for product in products[:5]:  # Limit to first 5 products to avoid too many API calls
                            product_id = product.get('id')
                            product_title = product.get('title', 'Unknown Product')
                            
                            # Get images for this specific product
                            images_url = f"{store_url}/admin/api/{api_version}/products/{product_id}/images.json"
                            try:
                                images_response = requests.get(images_url, headers=headers, timeout=10)
                                if images_response.status_code == 200:
                                    images_data = images_response.json()
                                    product_images = images_data.get('images', [])
                                    print(f"Product '{product_title}' has {len(product_images)} images")
                                    
                                    for image in product_images:
                                        image_data = {
                                            'id': image['id'],
                                            'product_id': product_id,
                                            'product_title': product_title,
                                            'src': image['src'],
                                            'alt': image.get('alt', ''),
                                            'width': image.get('width'),
                                            'height': image.get('height')
                                        }
                                        all_images.append(image_data)
                                else:
                                    print(f"Failed to get images for product {product_id}: {images_response.status_code}")
                            except Exception as e:
                                print(f"Error getting images for product {product_id}: {e}")
                        
                        print(f"Total images found with fallback approach: {len(all_images)}")
                        
                        # Cache the images for future use
                        if all_images:
                            save_cached_images(profile_name, all_images)
                            print(f"Cached {len(all_images)} images for profile '{profile_name}' (fallback)")
                        
                        return jsonify({
                            'images': all_images, 
                            'total': len(all_images),
                            'source': 'api_fallback'
                        })
                    else:
                        # Both approaches failed, show detailed error
                        return jsonify({
                            'error': 'Adgang nægtet til Shopify produkter',
                            'details': 'Din Shopify API token har ikke tilladelse til at læse produkter. Sørg for at din Shopify App har "read_products" scope/tilladelsen.',
                            'solution': 'Gå til din Shopify Admin → Apps → Private apps → Din app → og tilføj "read_products" tilladelsen.'
                        }), 403
                else:
                    return jsonify({'error': f'Failed to fetch products: {products_response.status_code}'}), 400
            
            products_data = products_response.json()
            print(f"Found {len(products_data['products'])} products")
            
            all_images = []
            
            for product in products_data['products']:
                product_title = product.get('title', 'Unknown Product')
                product_images = product.get('images', [])
                print(f"Product '{product_title}' has {len(product_images)} images")
                
                if product_images:
                    for image in product_images:
                        image_data = {
                            'id': image['id'],
                            'product_id': product['id'],
                            'product_title': product_title,
                            'src': image['src'],
                            'alt': image.get('alt', ''),
                            'width': image.get('width'),
                            'height': image.get('height')
                        }
                        all_images.append(image_data)
                        print(f"  - Image: {image['src'][:50]}...")
            
            print(f"Total images found: {len(all_images)}")
            
            # Cache the images for future use
            if all_images:
                save_cached_images(profile_name, all_images)
                print(f"Cached {len(all_images)} images for profile '{profile_name}'")
            
            return jsonify({
                'images': all_images, 
                'total': len(all_images),
                'source': 'api'
            })
        
        # Get images for specific product
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Specific product images response status: {response.status_code}")
        
        if response.status_code == 200:
            images_data = response.json()
            images = images_data['images']
            print(f"Found {len(images)} images for product {product_id}")
            
            # Cache the images for this specific product
            if images:
                save_cached_images(profile_name, images, product_id)
                print(f"Cached {len(images)} images for product {product_id}")
            
            return jsonify({
                'images': images, 
                'total': len(images),
                'source': 'api'
            })
        else:
            print(f"Failed to fetch images: {response.text}")
            return jsonify({'error': f'Failed to fetch images: {response.status_code}'}), 400
            
    except Exception as e:
        print(f"Error fetching images: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error fetching images: {str(e)}'}), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    """Upload image file and return base64 data"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_extension not in allowed_extensions:
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP'}), 400
        
        # Read file data
        file_data = file.read()
        
        # Get MIME type
        mime_type = mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
        
        # Convert to base64
        base64_data = base64.b64encode(file_data).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_data}"
        
        return jsonify({
            'success': True,
            'data_url': data_url,
            'filename': file.filename,
            'size': len(file_data),
            'mime_type': mime_type
        })
        
    except Exception as e:
        return jsonify({'error': f'Error uploading image: {str(e)}'}), 500

@app.route('/api/cached-image/<profile_name>/<path:image_path>')
def serve_cached_image(profile_name, image_path):
    """Serve cached images from local storage"""
    try:
        # Construct the full path to the cached image
        full_path = os.path.join(PROFILE_IMAGES_DIR, profile_name, image_path)
        
        # Security check - ensure the path is within our cache directory
        if not os.path.abspath(full_path).startswith(os.path.abspath(PROFILE_IMAGES_DIR)):
            return jsonify({'error': 'Invalid image path'}), 400
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'Image not found'}), 404
        
        # Determine MIME type
        mime_type = mimetypes.guess_type(full_path)[0] or 'image/jpeg'
        
        # Read and return the image file
        with open(full_path, 'rb') as f:
            image_data = f.read()
        
        return Response(image_data, mimetype=mime_type)
        
    except Exception as e:
        return jsonify({'error': f'Error serving cached image: {str(e)}'}), 500

@app.route('/api/insert-image-html', methods=['POST'])
def insert_image_html():
    """Generate HTML for image insertion"""
    try:
        data = request.get_json()
        image_url = data.get('image_url', '').strip()
        alt_text = data.get('alt_text', '').strip()
        width = data.get('width')
        height = data.get('height')
        
        if not image_url:
            return jsonify({'error': 'Image URL is required'}), 400
        
        # Generate HTML
        html_parts = ['<img']
        html_parts.append(f'src="{image_url}"')
        
        if alt_text:
            html_parts.append(f'alt="{alt_text}"')
        
        if width:
            html_parts.append(f'width="{width}"')
        
        if height:
            html_parts.append(f'height="{height}"')
        
        html_parts.append('style="max-width: 100%; height: auto;"')
        html_parts.append('/>')
        
        image_html = ' '.join(html_parts)
        
        return jsonify({
            'success': True,
            'html': image_html
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating image HTML: {str(e)}'}), 500

@app.route('/api/test-openai-simple', methods=['POST'])
def test_openai_simple():
    """Simple OpenAI test endpoint"""
    try:
        print("=== SIMPLE OPENAI TEST IN MAIN APP ===")
        
        # Get user session
        user_session = get_user_session()
        profiles = user_session.get('profiles', {})
        
        # Find Noyer profile
        if 'Noyer' not in profiles:
            return jsonify({'error': 'Noyer profile not found'}), 400
            
        profile = profiles['Noyer']
        api_key = profile.get('api_key', '').strip()
        
        if not api_key:
            return jsonify({'error': 'No API key found'}), 400
        
        print(f"Found API key: {api_key[:10]}...")
        
        # Create OpenAI client
        print("Creating OpenAI client...")
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=api_key, http_client=http_client)
        except Exception:
            client = OpenAI(api_key=api_key)
        print("✓ OpenAI client created successfully")
        
        # Test API call
        print("Making API call...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello in Danish"}],
            max_tokens=20
        )
        
        generated_text = response.choices[0].message.content
        print(f"✓ API call successful: {generated_text}")
        
        return jsonify({
            'status': 'success',
            'text': generated_text
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'type': str(type(e))
        }), 500

def get_blogs_graphql(store_url, api_token, api_version):
    """
    Get blogs using Shopify GraphQL API instead of REST API
    This might have different permission requirements
    """
    graphql_endpoint = f"https://{store_url}/admin/api/{api_version}/graphql.json"
    
    headers = {
        'X-Shopify-Access-Token': api_token,
        'Content-Type': 'application/json'
    }
    
    # GraphQL query to get blogs (matching the official documentation)
    graphql_query = {
        "query": """
        query BlogList {
            blogs(first: 50) {
                edges {
                    node {
                        id
                        handle
                        title
                        updatedAt
                        createdAt
                    }
                }
            }
        }
        """
    }
    
    try:
        response = requests.post(graphql_endpoint, headers=headers, json=graphql_query, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        print(f"GraphQL response: {result}")
        
        # Check for GraphQL errors
        if 'errors' in result:
            print(f"GraphQL errors: {result['errors']}")
            return None
            
        # Extract blogs from GraphQL response 
        blogs_edges = result.get('data', {}).get('blogs', {}).get('edges', [])
        blogs_data = [edge.get('node', {}) for edge in blogs_edges]
        
        # Convert GraphQL format to REST format for compatibility
        converted_blogs = []
        for blog in blogs_data:
            # Extract numeric ID from GraphQL GID
            gid = blog.get('id', '')
            blog_id = gid.split('/')[-1] if '/' in gid else gid
            
            converted_blogs.append({
                'id': int(blog_id) if blog_id.isdigit() else blog_id,
                'title': blog.get('title', ''),
                'handle': blog.get('handle', ''),
                'created_at': blog.get('createdAt', ''),
                'updated_at': blog.get('updatedAt', '')
            })
        
        return converted_blogs
        
    except Exception as e:
        print(f"GraphQL request failed: {e}")
        return None



@app.route('/api/generate-text', methods=['POST'])
def generate_text_api():
    """
    API endpoint to generate text based on the input data.
    """
    data = request.get_json()
    user_session = get_user_session()
    
    if not user_session.get('api_key'):
        return jsonify({'error': 'OpenAI API key not configured'}), 400
    
    prompt = data.get('prompt', '')
    max_tokens = data.get('max_tokens', 100)
    temperature = data.get('temperature', 0.7)
    
    try:
        client = OpenAI(api_key=user_session['api_key'])
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature
        )
        return jsonify({
            'status': 'success',
            'generated_text': response.choices[0].message.content
        })
    except Exception as e:
        return jsonify({'error': f'Error generating text: {str(e)}'}), 500

@app.route('/api/ai-edit-selection', methods=['POST'])
def ai_edit_selection():
    """AI edit only the selected text portion while keeping surrounding text unchanged"""
    data = request.json
    user_session = get_user_session()
    
    if not user_session.get('api_key'):
        return jsonify({'error': 'OpenAI API key not configured'}), 400
    
    full_text = data.get('full_text', '').strip()
    selected_text = data.get('selected_text', '').strip()
    instruction = data.get('instruction', '').strip()
    start_index = data.get('start_index', 0)
    end_index = data.get('end_index', 0)
    
    if not full_text or not selected_text or not instruction:
        return jsonify({'error': 'Full text, selected text and instruction are required'}), 400
    
    try:
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=user_session['api_key'], http_client=http_client)
        except Exception:
            client = OpenAI(api_key=user_session['api_key'])
        
        # Create specific prompts for different instructions to get better results
        if instruction.lower() == "forkort":
            prompt = f"""
            Forkort KUN det følgende tekstafsnit betydeligt, mens du bevarer de vigtigste pointer og budskabet:

            Tekst der skal forkortes:
            {selected_text}

            VIGTIGT:
            - Returner KUN den forkortede version af det valgte afsnit, intet andet
            - Bevar den oprindelige tone og stil
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            - Reducer længden med mindst 30-50%
            """
        elif instruction.lower() == "forlæng":
            prompt = f"""
            Forlæng KUN det følgende tekstafsnit med flere detaljer, eksempler eller forklaringer:

            Tekst der skal forlænges:
            {selected_text}

            VIGTIGT:
            - Returner KUN den forlængede version af det valgte afsnit, intet andet
            - Tilføj relevant indhold der uddyber emnet
            - Bevar den oprindelige tone og stil
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            - Sigt efter at udvide teksten med 30-50% mere indhold
            """
        elif instruction.lower() == "gør mere sælgende":
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit for at gøre det mere overbevisende og sælgende:

            Tekst der skal gøres mere sælgende:
            {selected_text}

            VIGTIGT:
            - Returner KUN den mere sælgende version af det valgte afsnit, intet andet
            - Tilføj overbevisende elementer, fordele og call-to-action
            - Bevar den oprindelige tone men gør den mere engagerende
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            """
        elif instruction.lower() == "ny vinkel":
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit med en ny og frisk vinkel eller tilgang:

            Tekst der skal have ny vinkel:
            {selected_text}

            VIGTIGT:
            - Returner KUN versionen med ny vinkel af det valgte afsnit, intet andet
            - Bevar samme information men præsenter den fra en ny vinkel
            - Bevar den oprindelige tone og stil
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            """
        elif instruction.lower() == "mere simpel":
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit for at gøre det mere simpelt og lettere at forstå:

            Tekst der skal simplificeres:
            {selected_text}

            VIGTIGT:
            - Returner KUN den simplificerede version af det valgte afsnit, intet andet
            - Brug simplere ord og kortere sætninger
            - Gør komplekse koncepter mere tilgængelige
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            """
        else:
            # General instruction
            prompt = f"""
            Omskriv KUN det følgende tekstafsnit baseret på denne instruktion: "{instruction}"

            Tekst der skal omskrives:
            {selected_text}

            VIGTIGT:
            - Returner KUN den omskrevne version af det valgte afsnit, intet andet
            - Bevar formatering hvis relevant (markdown overskrifter etc.)
            - Dansk retskrivning og grammatik
            """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Du er en ekspert tekstredaktør der laver præcise ændringer til valgte tekstafsnit uden at påvirke andre dele af teksten."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        edited_text = response.choices[0].message.content.strip()
        
        # CRITICAL: Filter blocked words from AI edited content
        user_session = get_user_session()
        current_profile = user_session.get('current_profile')
        if current_profile and current_profile in user_session.get('profiles', {}):
            profile = user_session['profiles'][current_profile]
            blocked_words = profile.get('blocked_words', [])
            if blocked_words:
                edited_text = filter_blocked_words(edited_text, blocked_words)
                print(f"✅ AI Edit Selection: Blocked words filtered from edited text")
        
        # Construct the new full text with the edited selection
        new_full_text = full_text[:start_index] + edited_text + full_text[end_index:]
        
        return jsonify({
            'success': True,
            'edited_selection': edited_text,
            'new_full_text': new_full_text,
            'original_selection': selected_text
        })
        
    except Exception as e:
        return jsonify({'error': f'AI editing error: {str(e)}'}), 500

@app.route('/api/batch-generate-seo', methods=['POST'])
def batch_generate_seo():
    """Generate multiple SEO content variations with different approaches"""
    try:
        print("=== Batch SEO Generation Request ===")
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        print(f"Request data: {data}")
        
        # Extract parameters
        keywords = data.get('keywords', '').strip()
        batch_count = int(data.get('batch_count', 3))
        profile_name = data.get('profile', '')
        
        # Limit batch count for performance
        if batch_count > 5:
            batch_count = 5
        elif batch_count < 2:
            batch_count = 2
        
        print(f"Keywords: {keywords}, Batch count: {batch_count}, Profile: {profile_name}")
        
        # Get API key from profile
        user_session = get_user_session()
        profiles = user_session.get('profiles', {})
        
        if not profile_name or profile_name not in profiles:
            return jsonify({'error': 'Ingen profil valgt eller profil ikke fundet'}), 400
            
        profile = profiles[profile_name]
        api_key = profile.get('api_key', '').strip()
        
        if not api_key:
            return jsonify({'error': 'Ingen API nøgle fundet for denne profil'}), 400
        
        if not keywords:
            return jsonify({'error': 'Keywords are required'}), 400
        
        # Initialize OpenAI client
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=api_key, http_client=http_client)
        except Exception:
            client = OpenAI(api_key=api_key)
        
        print("✓ OpenAI client created successfully")
        
        # Define different variation approaches
        variations = [
            {
                'name': 'Fokuseret Tilgang',
                'description': 'Konkret og direkte tilgang til emnet',
                'temperature': 0.6,
                'approach': 'Skriv en fokuseret og konkret tekst der går direkte til sagen og giver praktiske informationer.',
                'style': 'Klar og direkte kommunikation med fokus på faktuelle oplysninger og praktisk anvendelse.'
            },
            {
                'name': 'Engagerende Tilgang', 
                'description': 'Mere engagerende og personlig stil',
                'temperature': 0.8,
                'approach': 'Skriv en engagerende tekst der fanger læserens interesse med personlige elementer og relaterbare eksempler.',
                'style': 'Varm og personlig tone der skaber forbindelse til læseren gennem historier og relaterbare situationer.'
            },
            {
                'name': 'Ekspert Tilgang',
                'description': 'Dybdegående og autoritativ vinkel',
                'temperature': 0.7,
                'approach': 'Skriv en autoritativ tekst der viser ekspertise og går i dybden med tekniske detaljer og baggrundsviden.',
                'style': 'Professionel og pålidelig tone der demonstrerer dyb viden og troværdighed inden for emnet.'
            },
            {
                'name': 'Løsningsorienteret',
                'description': 'Fokus på problemer og løsninger',
                'temperature': 0.75,
                'approach': 'Skriv en løsningsorienteret tekst der identificerer problemer og præsenterer konkrete løsninger.',
                'style': 'Hjælpsom og løsningsorienteret tilgang med fokus på at guide læseren til handling.'
            },
            {
                'name': 'Kreativ Vinkel',
                'description': 'Unik og kreativ tilgang til emnet',
                'temperature': 0.9,
                'approach': 'Skriv en kreativ tekst med en unik vinkel eller perspektiv der adskiller sig fra mainstream tilgange.',
                'style': 'Innovativ og tankevækkende tilgang der udfordrer konventionel tænkning og byder på nye perspektiver.'
            }
        ]
        
        # Generate variations
        results = []
        
        for i in range(batch_count):
            variation = variations[i]
            print(f"Generating variation {i+1}: {variation['name']}")
            
            # Build prompt for this variation
            prompt_parts = []
            prompt_parts.append(f"Du er en ekspert SEO-tekstforfatter. Skriv SEO-optimeret indhold for keywordet: '{keywords}'")
            prompt_parts.append(f"\nTILGANG: {variation['approach']}")
            prompt_parts.append(f"STIL: {variation['style']}")
            
            # Add basic requirements
            prompt_parts.append(f"\nSTRUKTUR:")
            prompt_parts.append(f"1. ALLERFØRSTE linje: H1-titel startende med '# ' og indeholder '{keywords}'")
            prompt_parts.append(f"2. TREDJE linje og fremefter: Brødtekst på mindst 400 ord")
            prompt_parts.append(f"3. Brug H2/H3 underoverskrifter der relaterer til '{keywords}'")
            
            # Add profile context if available
            if profile.get('description'):
                prompt_parts.append(f"\nVirksomhedskontext (brug kun hvis relevant): {profile['description'][:150]}")
            
            # Add blocked words restrictions
            blocked_words = profile.get('blocked_words', [])
            print(f"DEBUG: Raw blocked_words from profile: {blocked_words}")
            if blocked_words:
                blocked_words_text = ', '.join([word.strip() for word in blocked_words if word.strip()])
                print(f"DEBUG: Processed blocked_words_text: {blocked_words_text}")
                prompt_parts.append(f"\nVIGTIGT - BLOKEREDE ORD:")
                prompt_parts.append(f"- Du må ALDRIG bruge disse ord i teksten: {blocked_words_text}")
                prompt_parts.append(f"- Find alternative formuleringer for disse ord")
                prompt_parts.append(f"- Dette er kritisk vigtigt - disse ord må ikke forekomme")
            
            prompt_parts.append(f"\nVIGTIGT:")
            prompt_parts.append(f"- Hele teksten skal handle om '{keywords}'")
            prompt_parts.append(f"- Dansk retskrivning og grammatik")
            prompt_parts.append(f"- Formater med markdown")
            prompt_parts.append(f"- Gør teksten unik og forskellig fra standard tilgange")
            
            prompt = "\n".join(prompt_parts)
            
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": f"Du er en ekspert SEO-tekstforfatter der skriver på dansk. {variation['style']}"},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=variation['temperature']
                )
                
                generated_text = response.choices[0].message.content
                
                # CRITICAL: Filter blocked words from batch generated content
                blocked_words = profile.get('blocked_words', [])
                if blocked_words:
                    generated_text = filter_blocked_words(generated_text, blocked_words)
                    print(f"✅ Batch variation {i+1}: Blocked words filtered from generated text")
                
                # Convert to HTML
                import markdown
                raw_html = markdown.markdown(generated_text, extensions=['tables', 'nl2br'])
                html_content = clean_html_output(raw_html)
                
                # DOUBLE CHECK: Also filter blocked words from HTML content
                if blocked_words:
                    html_content = filter_blocked_words(html_content, blocked_words)
                    print(f"✅ Batch variation {i+1}: Blocked words filtered from HTML content")
                
                # Extract title
                lines = generated_text.split('\n')
                title = ""
                for line in lines:
                    line = line.strip()
                    if line.startswith('# '):
                        title = line[2:].strip()
                        break
                
                if not title:
                    title = f"{keywords} - {variation['name']}"
                
                results.append({
                    'id': i + 1,
                    'name': variation['name'],
                    'description': variation['description'],
                    'title': title,
                    'content': generated_text,
                    'html_content': html_content,
                    'keywords': keywords,
                    'temperature': variation['temperature'],
                    'approach': variation['approach']
                })
                
                print(f"✓ Generated variation {i+1}: {len(generated_text)} characters")
                
            except Exception as e:
                print(f"Error generating variation {i+1}: {e}")
                results.append({
                    'id': i + 1,
                    'name': variation['name'],
                    'description': variation['description'],
                    'title': f"Fejl i {variation['name']}",
                    'content': f"Fejl ved generering: {str(e)}",
                    'html_content': f"<p>Fejl ved generering: {str(e)}</p>",
                    'keywords': keywords,
                    'temperature': variation['temperature'],
                    'error': str(e)
                })
        
        print(f"✓ Batch generation completed: {len(results)} variations")
        
        return jsonify({
            'success': True,
            'variations': results,
            'total': len(results),
            'keywords': keywords,
            'profile': profile_name
        })
        
    except Exception as e:
        print(f"Error in batch SEO generation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    """Upload and validate multiple Shopify CSV files for translation"""
    try:
        files = request.files.getlist('csv_file')
        if not files or len(files) == 0:
            return jsonify({'error': 'Ingen CSV-filer blev uploaded'}), 400
        
        user_session = get_user_session()
        
        # Clear any existing CSV files and start fresh
        user_session['translator_csv_files'] = {}
        # Also clear any filtered data from previous sessions
        if 'translator_csv_data' in user_session:
            del user_session['translator_csv_data']
        if 'translator_csv_filename' in user_session:
            del user_session['translator_csv_filename']
        
        uploaded_files = []
        total_rows = 0
        total_untranslated = 0
        all_locales = set()
        
        import pandas as pd
        import io
        
        for file in files:
            if file.filename == '':
                continue
                
            if not file.filename.lower().endswith('.csv'):
                return jsonify({'error': f'Filen {file.filename} skal være en CSV-fil'}), 400
            
            try:
                # Read the file content as string first to handle encoding
                stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
                csv_input = pd.read_csv(stream)
                
                # Clean column names (remove whitespace and make lowercase)
                csv_input.columns = csv_input.columns.str.strip().str.lower()
                
                # Validate required columns for Shopify translation CSV
                required_cols = ["locale", "default content", "translated content", "type", "field"]
                missing_cols = [col for col in required_cols if col not in csv_input.columns]
                
                if missing_cols:
                    return jsonify({
                        'error': f'CSV-filen {file.filename} mangler følgende nødvendige kolonner: {", ".join(missing_cols)}',
                        'available_columns': list(csv_input.columns),
                        'required_columns': required_cols
                    }), 400
                
                # Get unique locales for this file
                file_locales = csv_input["locale"].dropna().unique().tolist()
                all_locales.update(file_locales)
                
                if not file_locales:
                    return jsonify({'error': f'CSV-filen {file.filename} indeholder ingen værdier i locale-kolonnen'}), 400
                
                # Convert NaN values to empty strings before storing
                csv_dict_data = csv_input.fillna('').to_dict('records')
                
                # Count rows that need translation
                untranslated_count = 0
                for row in csv_dict_data:
                    translated_content = row.get('translated content', '')
                    if (not translated_content or 
                        str(translated_content).strip() == '' or 
                        str(translated_content) == 'nan'):
                        untranslated_count += 1
                
                # Store file data
                file_id = f"{file.filename}_{len(user_session['translator_csv_files'])}"
                user_session['translator_csv_files'][file_id] = {
                    'filename': file.filename,
                    'data': csv_dict_data,
                    'total_rows': len(csv_dict_data),
                    'untranslated_rows': untranslated_count,
                    'locales': file_locales
                }
                
                uploaded_files.append({
                    'id': file_id,
                    'filename': file.filename,
                    'total_rows': len(csv_dict_data),
                    'untranslated_rows': untranslated_count,
                    'locales': file_locales
                })
                
                total_rows += len(csv_dict_data)
                total_untranslated += untranslated_count
                
            except Exception as file_error:
                print(f"Error processing file {file.filename}: {file_error}")
                return jsonify({'error': f'Fejl ved behandling af {file.filename}: {str(file_error)}'}), 400
        
        # Calculate locale statistics
        locale_stats = {}
        csv_files_copy = dict(user_session['translator_csv_files'])  # Create a copy to avoid iteration issues
        
        for locale in all_locales:
            locale_total = 0
            locale_untranslated = 0
            
            for file_id, file_data in csv_files_copy.items():
                for row in file_data['data']:
                    if row.get('locale') == locale:
                        locale_total += 1
                        translated_content = row.get('translated content', '')
                        if (not translated_content or 
                            str(translated_content).strip() == '' or 
                            str(translated_content) == 'nan'):
                            locale_untranslated += 1
            
            locale_stats[locale] = {
                'total_rows': locale_total,
                'needs_translation': locale_untranslated
            }
        
        return jsonify({
            'success': True,
            'uploaded_files': uploaded_files,
            'total_files': len(uploaded_files),
            'total_rows': total_rows,
            'total_untranslated': total_untranslated,
            'available_locales': sorted(list(all_locales)),
            'locale_stats': locale_stats
        })
        
    except Exception as e:
        print(f"Error uploading CSV files: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Fejl ved indlæsning af CSV-filer: {str(e)}'}), 500

@app.route('/api/translate-csv', methods=['POST'])
def translate_csv():
    """Translate CSV content using OpenAI"""
    try:
        data = request.get_json()
        user_session = get_user_session()
        
        # Get profile and API key
        profile_name = data.get('profile_name')
        if not profile_name:
            return jsonify({'error': 'Profil navn er påkrævet'}), 400
        
        profiles = user_session.get('profiles', {})
        if profile_name not in profiles:
            return jsonify({'error': 'Profil ikke fundet'}), 404
        
        profile = profiles[profile_name]
        api_key = profile.get('api_key', '').strip()
        
        if not api_key:
            return jsonify({'error': 'Ingen API nøgle fundet for denne profil'}), 400
        
        # Get translation parameters
        selected_locales = data.get('selected_locales', [])
        if not selected_locales:
            return jsonify({'error': 'Ingen sprog valgt til oversættelse'}), 400
        
        # Get CSV data - try filtered data first, then fall back to uploaded files
        csv_data = user_session.get('translator_csv_data')
        if not csv_data:
            # Fall back to uploaded files
            csv_files = user_session.get('translator_csv_files', {})
            if not csv_files:
                return jsonify({'error': 'Ingen CSV data fundet. Upload en CSV-fil først.'}), 400
            
            # Combine all uploaded files
            csv_data = []
            for file_id, file_data in csv_files.items():
                csv_data.extend(file_data['data'])
        
        # Initialize OpenAI client
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=api_key, http_client=http_client)
        except Exception:
            client = OpenAI(api_key=api_key)
        
        # Language mapping - same as desktop app
        supported_languages = {
            "da": "dansk",
            "de": "tysk", 
            "en": "engelsk",
            "es": "spansk",
            "fr": "fransk",
            "it": "italiensk",
            "nl": "hollandsk",
            "sv": "svensk",
            "no": "norsk",
            "fi": "finsk",
            "pl": "polsk",
            "pt": "portugisisk",
            "ru": "russisk",
            "zh": "kinesisk",
            "ja": "japansk",
            "ko": "koreansk"
        }
        
        # Find rows that need translation
        rows_to_translate = []
        for i, row in enumerate(csv_data):
            locale = row.get('locale')
            if locale in selected_locales and locale in supported_languages:
                translated_content = row.get('translated content', '')
                # Check if translation is missing or empty
                if (not translated_content or 
                    str(translated_content).strip() == '' or 
                    str(translated_content) == 'nan'):
                    rows_to_translate.append((i, row))
        
        if not rows_to_translate:
            return jsonify({
                'success': True,
                'message': f'Alle valgte rækker har allerede oversættelser',
                'translated_count': 0
            })
        
        translated_count = 0
        errors = []
        progress_updates = []
        
        # Translate each row
        print(f"Starting translation of {len(rows_to_translate)} rows...")
        for i, (row_index, row) in enumerate(rows_to_translate):
            locale = row.get('locale')
            original_text = row.get('default content', '')
            
            if original_text and str(original_text).strip():
                try:
                    print(f"[{i+1}/{len(rows_to_translate)}] Translating to {locale}: {original_text[:50]}...")
                    
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {
                                "role": "system", 
                                "content": f"Du er en professionel oversætter. Oversæt nøjagtigt og ordret fra dansk til {supported_languages[locale]}. Bevar alle HTML-tags og strukturen præcis som den er. Du må ikke forklare noget. Returnér KUN den oversatte tekst."
                            },
                            {
                                "role": "user", 
                                "content": str(original_text)
                            }
                        ],
                        max_tokens=4000,
                        temperature=0.3
                    )
                    
                    translated_text = response.choices[0].message.content.strip()
                    
                    # Update the row in our data
                    csv_data[row_index]['translated content'] = translated_text
                    translated_count += 1
                    
                    print(f"✅ Successfully translated row {row_index + 1} to {locale}")
                    
                    # Add progress update
                    progress_updates.append({
                        'row_index': row_index,
                        'locale': locale,
                        'original_text': original_text[:100] + '...' if len(original_text) > 100 else original_text,
                        'translated_text': translated_text[:100] + '...' if len(translated_text) > 100 else translated_text,
                        'status': 'completed',
                        'progress': f"{i + 1}/{len(rows_to_translate)}"
                    })
                    
                    # Small delay to respect API rate limits
                    import time
                    time.sleep(0.5)
                    
                except Exception as e:
                    error_msg = f"Fejl ved oversættelse af række {row_index + 1}: {str(e)}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
                    
                    # Check if it's a rate limit error and add longer delay
                    if "rate_limit" in str(e).lower() or "quota" in str(e).lower():
                        print("⏳ Rate limit detected, waiting 5 seconds...")
                        import time
                        time.sleep(5)
                    
                    # Set error marker in translation
                    csv_data[row_index]['translated content'] = f"[ERROR] {original_text}"
                    
                    # Add error to progress updates
                    progress_updates.append({
                        'row_index': row_index,
                        'locale': locale,
                        'original_text': original_text[:100] + '...' if len(original_text) > 100 else original_text,
                        'translated_text': f"[ERROR] {str(e)}",
                        'status': 'error',
                        'progress': f"{i + 1}/{len(rows_to_translate)}"
                    })
        
        # Save updated data back to session
        user_session['translator_csv_data'] = csv_data
        
        result = {
            'success': True,
            'translated_count': translated_count,
            'total_rows': len(rows_to_translate),
            'errors': errors,
            'progress_updates': progress_updates,
            'message': f'Oversættelse fuldført! {translated_count} rækker blev oversat.'
        }
        
        if errors:
            result['message'] += f' {len(errors)} fejl opstod.'
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in CSV translation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Fejl under oversættelse: {str(e)}'}), 500

@app.route('/api/download-translated-csv', methods=['GET'])
def download_translated_csv():
    """Download the translated CSV file"""
    try:
        user_session = get_user_session()
        csv_data = user_session.get('translator_csv_data')
        original_filename = user_session.get('translator_csv_filename', 'translated.csv')
        
        if not csv_data:
            return jsonify({'error': 'Ingen CSV data fundet'}), 400
        
        # Convert back to DataFrame and then CSV
        import pandas as pd
        df = pd.DataFrame(csv_data)
        
        # Create CSV content
        output = io.StringIO()
        df.to_csv(output, index=False)
        csv_content = output.getvalue()
        
        # Generate filename
        base_name = original_filename.rsplit('.', 1)[0] if '.' in original_filename else original_filename
        new_filename = f"{base_name}_translated.csv"
        
        # Return as file download
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{new_filename}"'
            }
        )
        
    except Exception as e:
        print(f"Error downloading CSV: {e}")
        return jsonify({'error': f'Fejl ved download: {str(e)}'}), 500

@app.route('/api/csv-preview', methods=['GET'])
def get_csv_preview():
    """Get preview of current CSV files data"""
    try:
        user_session = get_user_session()
        csv_files = user_session.get('translator_csv_files', {})
        
        if not csv_files:
            return jsonify({'error': 'Ingen CSV data fundet'}), 400
        
        # Return all files data for preview
        files_data = {}
        for file_id, file_info in csv_files.items():
            files_data[file_id] = {
                'filename': file_info['filename'],
                'data': file_info['data'],
                'total_rows': file_info['total_rows'],
                'untranslated_rows': file_info['untranslated_rows'],
                'locales': file_info['locales'],
                'columns': list(file_info['data'][0].keys()) if file_info['data'] else []
            }
        
        return jsonify({
            'files': files_data,
            'total_files': len(files_data)
        })
        
    except Exception as e:
        print(f"Error getting CSV preview: {e}")
        return jsonify({'error': f'Fejl ved hentning af preview: {str(e)}'}), 500

@app.route('/api/filter-untranslated', methods=['POST'])
def filter_untranslated():
    """Filter and combine only untranslated rows from all CSV files"""
    try:
        user_session = get_user_session()
        csv_files = user_session.get('translator_csv_files', {})
        
        if not csv_files:
            return jsonify({'error': 'Ingen CSV filer fundet'}), 400
        
        # Combine all untranslated rows from all files
        untranslated_rows = []
        
        for file_id, file_info in csv_files.items():
            for row in file_info['data']:
                translated_content = row.get('translated content', '')
                default_content = row.get('default content', '')
                
                # Check if row needs translation (translated content is empty) 
                # AND has content to translate (default content is not empty)
                needs_translation = (not translated_content or 
                                   str(translated_content).strip() == '' or 
                                   str(translated_content) == 'nan')
                
                has_content_to_translate = (default_content and 
                                          str(default_content).strip() != '' and 
                                          str(default_content) != 'nan')
                
                if needs_translation and has_content_to_translate:
                    # Add source file info to the row
                    row_with_source = row.copy()
                    row_with_source['_source_file'] = file_info['filename']
                    untranslated_rows.append(row_with_source)
        
        # Store filtered data for translation and export
        user_session['translator_csv_data'] = untranslated_rows
        user_session['translator_csv_filename'] = 'filtered_untranslated.csv'
        
        # Calculate locale statistics for the filtered data
        all_locales = set()
        for row in untranslated_rows:
            locale = row.get('locale')
            if locale:
                all_locales.add(locale)
        
        locale_stats = {}
        for locale in all_locales:
            locale_count = sum(1 for row in untranslated_rows if row.get('locale') == locale)
            locale_stats[locale] = {
                'total_rows': locale_count,
                'needs_translation': locale_count  # All filtered rows need translation
            }
        
        return jsonify({
            'success': True,
            'untranslated_rows': len(untranslated_rows),
            'available_locales': sorted(list(all_locales)),
            'locale_stats': locale_stats,
            'message': f'Filtreret {len(untranslated_rows)} uoversatte rækker fra {len(csv_files)} filer'
        })
        
    except Exception as e:
        print(f"Error filtering untranslated: {e}")
        return jsonify({'error': f'Fejl ved filtrering: {str(e)}'}), 500

@app.route('/api/export-untranslated', methods=['GET'])
def export_untranslated():
    """Export only untranslated rows as CSV"""
    try:
        user_session = get_user_session()
        csv_files = user_session.get('translator_csv_files', {})
        
        if not csv_files:
            return jsonify({'error': 'Ingen CSV filer fundet'}), 400
        
        # Combine all untranslated rows from all files
        untranslated_rows = []
        
        for file_id, file_info in csv_files.items():
            for row in file_info['data']:
                translated_content = row.get('translated content', '')
                default_content = row.get('default content', '')
                
                # Check if row needs translation (translated content is empty) 
                # AND has content to translate (default content is not empty)
                needs_translation = (not translated_content or 
                                   str(translated_content).strip() == '' or 
                                   str(translated_content) == 'nan')
                
                has_content_to_translate = (default_content and 
                                          str(default_content).strip() != '' and 
                                          str(default_content) != 'nan')
                
                if needs_translation and has_content_to_translate:
                    # Don't include source file info in export (keep original format)
                    untranslated_rows.append(row)
        
        if not untranslated_rows:
            return jsonify({'error': 'Ingen uoversatte rækker fundet'}), 400
        
        # Convert to DataFrame and then CSV
        import pandas as pd
        df = pd.DataFrame(untranslated_rows)
        
        # Create CSV content
        output = io.StringIO()
        df.to_csv(output, index=False)
        csv_content = output.getvalue()
        
        # Generate filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"untranslated_rows_{timestamp}.csv"
        
        # Return as file download
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        print(f"Error exporting untranslated: {e}")
        return jsonify({'error': f'Fejl ved eksport: {str(e)}'}), 500

@app.route('/api/remove-csv-file', methods=['POST'])
def remove_csv_file():
    """Remove a specific CSV file from the session"""
    try:
        data = request.get_json()
        file_id = data.get('file_id')
        
        if not file_id:
            return jsonify({'error': 'Fil ID er påkrævet'}), 400
        
        user_session = get_user_session()
        csv_files = user_session.get('translator_csv_files', {})
        
        if file_id not in csv_files:
            return jsonify({'error': 'Fil ikke fundet'}), 404
        
        filename = csv_files[file_id]['filename']
        del csv_files[file_id]
        user_session['translator_csv_files'] = csv_files
        
        return jsonify({
            'success': True,
            'message': f'Fil {filename} blev fjernet'
        })
        
    except Exception as e:
        print(f"Error removing CSV file: {e}")
        return jsonify({'error': f'Fejl ved fjernelse af fil: {str(e)}'}), 500

@app.route('/api/update-translation', methods=['POST'])
def update_translation():
    """Update a specific translation in the CSV data"""
    try:
        data = request.get_json()
        user_session = get_user_session()
        csv_data = user_session.get('translator_csv_data')
        
        if not csv_data:
            return jsonify({'error': 'Ingen CSV data fundet'}), 400
        
        row_index = data.get('row_index')
        new_translation = data.get('translated_content', '').strip()
        
        if row_index is None or row_index >= len(csv_data):
            return jsonify({'error': 'Ugyldig række index'}), 400
        
        # Update the translation
        csv_data[row_index]['translated content'] = new_translation
        user_session['translator_csv_data'] = csv_data
        
        return jsonify({
            'success': True,
            'message': 'Oversættelse opdateret',
            'updated_row': csv_data[row_index]
        })
        
    except Exception as e:
        print(f"Error updating translation: {e}")
        return jsonify({'error': f'Fejl ved opdatering: {str(e)}'}), 500

@app.route('/api/quick-translate', methods=['POST'])
def quick_translate():
    """Quick text translation using OpenAI - same logic as CSV translator"""
    try:
        data = request.get_json()
        user_session = get_user_session()
        
        # Get profile and API key
        profile_name = data.get('profile_name')
        if not profile_name:
            return jsonify({'error': 'Profil navn er påkrævet'}), 400
        
        profiles = user_session.get('profiles', {})
        if profile_name not in profiles:
            return jsonify({'error': 'Profil ikke fundet'}), 404
        
        profile = profiles[profile_name]
        api_key = profile.get('api_key', '').strip()
        
        if not api_key:
            return jsonify({'error': 'Ingen API nøgle fundet for denne profil'}), 400
        
        # Get translation parameters
        text = data.get('text', '').strip()
        target_language = data.get('target_language', 'engelsk')
        
        if not text:
            return jsonify({'error': 'Tekst er påkrævet'}), 400
        
        # Initialize OpenAI client
        try:
            import httpx
            http_client = httpx.Client()
            client = OpenAI(api_key=api_key, http_client=http_client)
        except Exception:
            client = OpenAI(api_key=api_key)
        
        print(f"Quick translating to {target_language}: {text[:50]}...")
        
        # Use same translation prompt as CSV translator
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": f"Du er en professionel oversætter. Oversæt nøjagtigt og ordret fra dansk til {target_language}. Bevar alle HTML-tags og strukturen præcis som den er. Du må ikke forklare noget. Returnér KUN den oversatte tekst."
                },
                {
                    "role": "user", 
                    "content": text
                }
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        translated_text = response.choices[0].message.content.strip()
        
        print(f"✓ Quick translation completed: {len(translated_text)} characters")
        
        return jsonify({
            'success': True,
            'translated_text': translated_text,
            'original_text': text,
            'target_language': target_language
        })
        
    except Exception as e:
        print(f"Error in quick translation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Oversættelsesfejl: {str(e)}'}), 500

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    args = parser.parse_args()
    app.run(debug=True, host='0.0.0.0', port=args.port) 