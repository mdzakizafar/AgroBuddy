from datetime import date, datetime, timedelta
from typing import Optional, Tuple


def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def format_date(d: Optional[date]) -> Optional[str]:
    if not d:
        return None
    return d.isoformat()


DATA_AS_OF = date(2026, 9, 9)
DASHBOARD_DATE = date(2026, 9, 16)


def get_default_date_range(days: int = 30) -> Tuple[str, str]:
    end = DATA_AS_OF
    start = end - timedelta(days=days)
    return start.isoformat(), end.isoformat()

