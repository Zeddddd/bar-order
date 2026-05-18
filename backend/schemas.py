from datetime import datetime

from pydantic import BaseModel


# ── DrinkCategory ──
class CategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


# ── Drink ──
class DrinkOut(BaseModel):
    id: int
    name: str
    price: float
    description: str
    image_url: str
    category_id: int
    stock: int
    is_available: bool

    model_config = {"from_attributes": True}


class DrinkCreate(BaseModel):
    name: str
    price: float
    description: str = ""
    image_url: str = ""
    category_id: int
    stock: int = 0
    is_available: bool = True


class DrinkUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    description: str | None = None
    image_url: str | None = None
    category_id: int | None = None
    stock: int | None = None
    is_available: bool | None = None


# ── Order ──
class OrderItemIn(BaseModel):
    drink_id: int
    quantity: int


class OrderCreate(BaseModel):
    table_number: str
    note: str = ""
    items: list[OrderItemIn]


class OrderItemOut(BaseModel):
    id: int
    drink_id: int
    drink_name: str = ""
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    table_number: str
    status: str
    total_price: float
    note: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: str


class StatsOut(BaseModel):
    today_orders: int
    today_revenue: float
    pending_count: int
    in_progress_count: int


# ── Analytics ──
class DailyPoint(BaseModel):
    date: str
    revenue: float
    orders: int


class TopDrink(BaseModel):
    drink_id: int
    name: str
    category_name: str
    quantity: int
    revenue: float


class CategorySlice(BaseModel):
    category_name: str
    revenue: float
    percentage: float


class HourlyPoint(BaseModel):
    hour: int
    orders: int


class DashboardOut(BaseModel):
    total_revenue: float
    total_orders: int
    avg_order_value: float
    daily_trend: list[DailyPoint]
    top_drinks: list[TopDrink]
    category_breakdown: list[CategorySlice]
    hourly_distribution: list[HourlyPoint]
