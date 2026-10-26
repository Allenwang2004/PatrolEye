"""Home / factory editions: which objects to watch, question keywords, answer tone, quick questions.
Both editions share the same backend and pan-tilt camera.

The spatial memory (build_memory.py) stores object names in Chinese; NAME_EN maps them to the English UI.
"""

MODES = {
    "home": {
        "title": "Home",
        # Objects pinned on the panorama map, in order (objects missing from memory are skipped)
        "watch": ["時鐘", "水龍頭", "門", "冰箱", "電視", "瓦斯爐", "窗戶"],
        "tone": "Answer warmly and casually, like reassuring a family member. One or two sentences.",
        "quick": ["What time is it?", "Where is the clock?", "Is the faucet off?", "Is the door closed?"],
    },
    "factory": {
        "title": "Plant patrol",
        "watch": ["平板儀表", "儀表", "閥門", "指示燈", "配電箱", "滅火器", "時鐘", "門"],
        "tone": "Answer like a concise inspection report: conclusion first, give readings with units, "
                "and say clearly if something can't be read.",
        "quick": ["What does the gauge read?", "Is the valve open?", "What color is the indicator?", "What time is it?"],
    },
}

NAME_EN = {
    "時鐘": "Clock", "水龍頭": "Faucet", "門": "Door", "冰箱": "Fridge", "電視": "TV", "瓦斯爐": "Stove",
    "窗戶": "Window", "水槽": "Sink", "平板儀表": "Gauge", "儀表": "Gauge", "閥門": "Valve",
    "指示燈": "Indicator light", "配電箱": "Breaker panel", "滅火器": "Fire extinguisher",
}


def en(name):
    return NAME_EN.get(name, name)


# Question keywords → memory object name. Checked first (lower-cased), then memory names, then the model.
KEYWORDS = {
    "時鐘": ["clock", "time", "o'clock", "時鐘", "幾點", "時間"],
    "水龍頭": ["faucet", "tap", "water", "水龍頭"],
    "平板儀表": ["gauge", "meter", "reading", "pressure", "儀表", "讀數"],
    "閥門": ["valve", "閥"],
    "指示燈": ["indicator", "status light", "指示燈"],
    "冰箱": ["fridge", "refrigerator", "冰箱"],
    "電視": ["tv", "television", "電視"],
    "瓦斯爐": ["stove", "gas", "cooker", "瓦斯", "爐"],
    "窗戶": ["window", "窗"],
    "門": ["door", "門"],
}
