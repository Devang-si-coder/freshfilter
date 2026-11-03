from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from sqlalchemy import JSON

from database import Base


# 1. User accounts
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    shopping_items = relationship("ShoppingListItem", back_populates="user", cascade="all, delete-orphan")
    searches = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")


# 2. Favorite products
class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="unique_user_favorite"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(100), nullable=False)
    product_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorites")


# 3. Shopping list
class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(100), nullable=False)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    is_checked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="shopping_items")


# 4. Search history
class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    search_query = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="searches")


# 5. Dietary preferences and allergies
class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    diet = Column(String(50), nullable=True)
    allergies = Column(JSON, default=list, nullable=False)
    excluded_ingredients = Column(JSON, default=list, nullable=False)

    user = relationship("User", back_populates="preferences")