from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import URLError, HTTPError
import json
import time
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv(Path(__file__).resolve().parent / ".env")

class GoogleLoginRequest(BaseModel):
    credential: str

from database import get_db
from models import User, Favorite, ShoppingListItem
from schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
)

app = FastAPI(
    title="FreshFilter API",
    description="Ingredient-first grocery shopping API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
   allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
))

# Simple in-memory cache: 30 minutes
CACHE = {}
CACHE_DURATION = 1800

FIELDS = [
    "code",
    "product_name",
    "brands",
    "categories",
    "categories_tags",
    "ingredients_text",
    "ingredients_text_en",
    "ingredients_tags",
    "labels_tags",
    "nutriments",
    "image_front_url",
    "quantity",
]


def get_real_products(search: str):
    cache_key = search.lower().strip()

    if cache_key in CACHE:
        saved_time, saved_data = CACHE[cache_key]
        if time.time() - saved_time < CACHE_DURATION:
            return saved_data

    if search.strip():
        params = {
            "search_terms": search.strip(),
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 100,
            "page": 1,
            "fields": ",".join(FIELDS),
        }

        url = (
            "https://world.openfoodfacts.org/cgi/search.pl?"
            + urlencode(params)
        )
    else:
        params = {
            "countries_tags_en": "india",
            "categories_tags_en": (
                "oat-flakes|lentils|nuts|seeds|"
                "peanut-butters|whole-wheat-breads|"
                "beans|yogurts|breakfast-cereals"
            ),
            "page_size": 100,
            "page": 1,
            "sort_by": "popularity_key",
            "fields": ",".join(FIELDS),
        }

        url = (
            "https://world.openfoodfacts.org/api/v2/search?"
            + urlencode(params)
        )

    request = Request(
        url,
        headers={
            "User-Agent": "FreshFilter/1.0 (student project)"
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))

    except (HTTPError, URLError, TimeoutError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Open Food Facts connection failed: {error}",
        )

    results = []

    for item in data.get("products", []):
        name = item.get("product_name", "").strip()

        if not name:
            continue

        ingredients_text = (
            item.get("ingredients_text_en")
            or item.get("ingredients_text")
            or ""
        )

        ingredients = [
            part.strip().lower()
            for part in ingredients_text.split(",")
            if part.strip()
        ]

        nutriments = item.get("nutriments") or {}

        protein = nutriments.get("proteins_100g")
        sugar = nutriments.get("sugars_100g")
        calories = (
            nutriments.get("energy-kcal_100g")
        )

        labels = " ".join(
            item.get("labels_tags") or []
        ).lower()

        diet = []

        if "vegan" in labels:
            diet.append("vegan")

        if "vegetarian" in labels:
            diet.append("vegetarian")

        categories = item.get("categories_tags") or []

        category = (
            categories[-1].split(":")[-1].replace("-", " ").title()
            if categories else "Groceries"
        )

        results.append({
            "id": item.get("code") or str(len(results) + 1),
            "name": name,
            "brand": item.get("brands") or "Brand unavailable",
            "price": None,
            "category": category,
            "unit": item.get("quantity") or "Pack size unavailable",
            "emoji": "🛒",
            "color": "#e9eadb",
            "ingredients": ingredients,
            "ingredients_text": ingredients_text,
            "diet": diet,
            "protein": protein,
            "sugar": sugar,
            "calories": calories,
            "image": item.get("image_front_url"),
            "badge": None,
        })

    CACHE[cache_key] = (time.time(), results)
    return results


@app.get("/")
def home():
    return {
        "message": "Welcome to FreshFilter API!",
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "FreshFilter"}


@app.get("/api/products")
def get_products(
    search: str = "",
    max_price: float = 10000,
    min_protein: float = 0,
    max_sugar: float = 100,
    include: str = "",
    exclude: str = "",
    diet: str = "",
):
    products = get_real_products(search)

    include_items = [
        item.strip().lower()
        for item in include.split(",") if item.strip()
    ]

    exclude_items = [
        item.strip().lower()
        for item in exclude.split(",") if item.strip()
    ]

    results = []

    for product in products:
        ingredients_text = product["ingredients_text"].lower()

        if any(word not in ingredients_text for word in include_items):
            continue

        if any(word in ingredients_text for word in exclude_items):
            continue

        # Do not invent prices. Unknown prices are kept visible.
        price = product["price"]
        if price is not None and price > max_price:
            continue

        protein = product["protein"]
        sugar = product["sugar"]

        if min_protein > 0:
            if protein is None or protein < min_protein:
                continue

        if max_sugar < 100:
            if sugar is None or sugar > max_sugar:
                continue

        if diet and diet.lower() not in product["diet"]:
            continue

        results.append(product)

    return {
        "count": len(results),
        "items": results,
    }
security = HTTPBearer()


# Register a new user
@app.post("/api/auth/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    new_user = User(
        name=user_data.name,
        email=str(user_data.email).lower(),
        password_hash=hash_password(user_data.password),
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    return new_user


# Login an existing user
@app.post("/api/auth/login", response_model=TokenResponse)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.email == str(login_data.email).lower()
    ).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    if not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
    }
@app.post("/api/auth/google", response_model=TokenResponse)
def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="Google login is not configured on the server"
        )

    try:
        google_user = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            client_id
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google login credential"
        )

    google_id = google_user.get("sub")
    email = google_user.get("email", "").lower().strip()
    name = google_user.get("name") or email.split("@")[0]

    if not google_id or not email or google_user.get("email_verified") is not True:
        raise HTTPException(
            status_code=401,
            detail="Google account email could not be verified"
        )

    # First, look for an account already linked to this Google ID.
    user = db.query(User).filter(User.google_id == google_id).first()

    if user is None:
        # Check whether this email already has a FreshFilter account.
        user = db.query(User).filter(User.email == email).first()

        if user:
            # Link the verified Google account to the existing account.
            if user.google_id and user.google_id != google_id:
                raise HTTPException(
                    status_code=409,
                    detail="This email is linked to another Google account"
                )

            user.google_id = google_id

        else:
            # Create a new Google-only account.
            user = User(
                name=name,
                email=email,
                google_id=google_id,
                password_hash=None
            )
            db.add(user)

        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Could not create or link this Google account. Please try again."
            )

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# Get the currently logged-in user
@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = verify_access_token(credentials.credentials)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return user
def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    user_id = verify_access_token(credentials.credentials)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    return user
@app.get("/api/favorites")
def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    favorites = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )

    return [
        {
            "product_id": item.product_id,
            "product_name": item.product_name,
        }
        for item in favorites
    ]


@app.post("/api/favorites")
def add_favorite(
    product_id: str,
    product_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.product_id == product_id,
    ).first()

    if existing:
        return {"message": "Already in favorites"}

    favorite = Favorite(
        user_id=current_user.id,
        product_id=product_id,
        product_name=product_name,
    )

    db.add(favorite)
    db.commit()

    return {"message": "Favorite added successfully"}


@app.delete("/api/favorites/{product_id}")
def remove_favorite(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.product_id == product_id,
    ).first()

    if not favorite:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found",
        )

    db.delete(favorite)
    db.commit()

    return {"message": "Favorite removed successfully"}
# SHOPPING LIST API

@app.get("/api/shopping-list")
def get_shopping_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    items = (
        db.query(ShoppingListItem)
        .filter(ShoppingListItem.user_id == current_user.id)
        .order_by(ShoppingListItem.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "is_checked": item.is_checked,
        }
        for item in items
    ]


@app.post("/api/shopping-list")
def add_shopping_item(
    product_id: str,
    product_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    existing = (
        db.query(ShoppingListItem)
        .filter(
            ShoppingListItem.user_id == current_user.id,
            ShoppingListItem.product_id == product_id,
        )
        .first()
    )

    if existing:
        existing.quantity += 1
        db.commit()
        return {"message": "Shopping quantity increased"}

    item = ShoppingListItem(
        user_id=current_user.id,
        product_id=product_id,
        product_name=product_name,
        quantity=1,
        is_checked=False,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return {"message": "Product added to shopping list"}


@app.patch("/api/shopping-list/{item_id}")
def update_shopping_item(
    item_id: int,
    quantity: int | None = None,
    is_checked: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    item = (
        db.query(ShoppingListItem)
        .filter(
            ShoppingListItem.id == item_id,
            ShoppingListItem.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if quantity is not None:
        if quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")
        item.quantity = quantity

    if is_checked is not None:
        item.is_checked = is_checked

    db.commit()

    return {"message": "Shopping item updated"}


@app.delete("/api/shopping-list/{item_id}")
def delete_shopping_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
):
    item = (
        db.query(ShoppingListItem)
        .filter(
            ShoppingListItem.id == item_id,
            ShoppingListItem.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return {"message": "Shopping item removed"}