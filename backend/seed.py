from database import SessionLocal, engine, Base
from models import Drink, DrinkCategory

_data = [
    ("啤酒", [
        ("朝日生啤 Asahi Draft", 38, "日本进口朝日生啤，清爽口感", 50),
        ("喜力 Heineken", 35, "荷兰经典拉格啤酒", 60),
        ("白熊 Vedett Extra White", 42, "比利时白啤，柑橘香气", 30),
        ("鹅岛 IPA Goose Island", 45, "美式IPA，浓郁啤酒花香", 25),
    ]),
    ("葡萄酒", [
        ("佩德罗萨干红 Montepulciano", 68, "意大利阿布鲁佐产区，果香浓郁", 20),
        ("马尔堡长相思 Sauvignon Blanc", 62, "新西兰马尔堡，爽脆酸度", 18),
        ("普罗旺斯桃红 Côtes de Provence", 75, "法国普罗旺斯，清新莓果香", 15),
    ]),
    ("鸡尾酒", [
        ("古典 Old Fashioned", 78, "波本威士忌 / 苦精 / 方糖 / 橙皮", 999),
        ("玛格丽特 Margarita", 68, "龙舌兰 / 君度 / 青柠汁 / 盐边", 999),
        ("莫吉托 Mojito", 58, "朗姆 / 薄荷 / 青柠 / 苏打 / 砂糖", 999),
        ("威士忌酸 Whiskey Sour", 72, "波本 / 柠檬汁 / 糖浆 / 蛋清", 999),
        ("长岛冰茶 Long Island Iced Tea", 88, "五种基酒 / 柠檬汁 / 可乐", 999),
        ("金汤力 Gin & Tonic", 48, "金酒 / 汤力水 / 青柠角", 999),
    ]),
    ("烈酒/纯饮", [
        ("山崎 12年 Yamazaki 12Y", 128, "日本单一麦芽威士忌，12年陈酿", 10),
        ("麦卡伦 12年 Macallan 12Y", 118, "苏格兰单一麦芽，雪莉桶陈酿", 8),
        ("添加利十号 Tanqueray No.10", 52, "英国伦敦干金酒", 20),
        ("灰雁伏特加 Grey Goose", 48, "法国小麦伏特加", 25),
    ]),
    ("无酒精", [
        ("无醇莫吉托 Virgin Mojito", 35, "薄荷 / 青柠 / 苏打 / 砂糖", 999),
        ("西柚气泡 Grapefruit Spritz", 30, "西柚汁 / 苏打 / 迷迭香", 999),
        ("椰林飘香无醇版 Virgin Piña Colada", 38, "椰浆 / 菠萝汁 / 冰沙", 999),
    ]),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(DrinkCategory).count() > 0:
        db.close()
        return

    for i, (cat_name, drinks) in enumerate(_data):
        cat = DrinkCategory(name=cat_name, sort_order=i)
        db.add(cat)
        db.flush()
        for name, price, desc, stock in drinks:
            db.add(Drink(name=name, price=price, description=desc,
                         category_id=cat.id, stock=stock, is_available=stock > 0))

    db.commit()
    db.close()
    print("Seed data created.")


if __name__ == "__main__":
    seed()
