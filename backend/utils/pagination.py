"""One helper for every list endpoint: {"items": [...], "page", "per_page", "total"}.

Default per_page is 20 and the maximum is 100. Tasks default to 100 so one call loads a whole day.
"""
from utils.validators import query_int


def paginate(query, serialize, default_per_page=20):
    page = query_int("page", default=1, lo=1, hi=1_000_000)
    per_page = query_int("per_page", default=default_per_page, lo=1, hi=100)
    total = query.count()
    rows = query.limit(per_page).offset((page - 1) * per_page).all()
    return {"items": [serialize(row) for row in rows], "page": page, "per_page": per_page, "total": total}
