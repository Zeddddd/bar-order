from datetime import datetime, timezone

from sqlalchemy import (Column, DateTime, Float, ForeignKey, Integer, String,
                        Text, Boolean)
from sqlalchemy.orm import relationship

from database import Base


def _now():
    return datetime.now(timezone.utc)


class DrinkCategory(Base):
    __tablename__ = "drink_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    sort_order = Column(Integer, default=0)

    drinks = relationship("Drink", back_populates="category")


class Drink(Base):
    __tablename__ = "drinks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text, default="")
    image_url = Column(String(500), default="")
    category_id = Column(Integer, ForeignKey("drink_categories.id"), nullable=False)
    stock = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)

    category = relationship("DrinkCategory", back_populates="drinks")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    table_number = Column(String(20), nullable=False)
    status = Column(String(20), default="pending")  # pending | in_progress | done | cancelled
    total_price = Column(Float, default=0)
    note = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    drink_id = Column(Integer, ForeignKey("drinks.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    drink = relationship("Drink")
