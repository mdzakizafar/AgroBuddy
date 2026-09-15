import json
import time
import hashlib
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from backend.app.core.config import settings
from backend.app.core.logging import logger


class _InMemoryCache:
    """Thread-safe in-memory cache fallback for development."""

    def __init__(self, max_size: int = 500):
        self._store: Dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._max_size = max_size

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._store:
                return None
            val, expiry = self._store[key]
            if time.time() > expiry:
                del self._store[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: int):
        with self._lock:
            if len(self._store) >= self._max_size:
                # Evict oldest or expired items
                now = time.time()
                expired = [k for k, (_, exp) in self._store.items() if now > exp]
                for k in expired:
                    del self._store[k]
                if len(self._store) >= self._max_size:
                    # Remove first inserted item
                    first_key = next(iter(self._store))
                    del self._store[first_key]
            self._store[key] = (value, time.time() + ttl)

    def clear(self):
        with self._lock:
            self._store.clear()


def get_data_version(data_dir: Path = settings.DATA_DIR) -> str:
    """Computes dataset fingerprint from modification times of processed files."""
    try:
        if not data_dir.exists():
            return "v1_default"
        mtimes = []
        for file_path in sorted(data_dir.glob("*.csv")):
            mtimes.append(f"{file_path.name}:{file_path.stat().st_mtime}")
        if not mtimes:
            return "v1_default"
        raw_str = ";".join(mtimes)
        return hashlib.md5(raw_str.encode("utf-8")).hexdigest()[:12]
    except Exception as e:
        logger.warning(f"Error computing data version fingerprint: {str(e)}")
        return "v1_fallback"


class LLMCacheService:
    def __init__(self):
        self.enabled = settings.LLM_CACHE_ENABLED
        self.ttl = settings.LLM_INSIGHT_CACHE_TTL_SECONDS
        self.memory_cache = _InMemoryCache()
        self.redis_client = None

        if settings.REDIS_URL:
            try:
                import redis
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                logger.info(f"Connected to Redis cache at {settings.REDIS_URL}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis ({str(e)}). Falling back to in-memory LLM cache.")
                self.redis_client = None

    def generate_insight_cache_key(
        self,
        page: str,
        filters: Dict[str, Any],
        context_dict: Dict[str, Any],
        model: str = settings.INSIGHT_MODEL,
        prompt_version: str = settings.INSIGHT_PROMPT_VERSION
    ) -> str:
        data_ver = get_data_version()
        canonical_payload = {
            "page": page.lower().strip(),
            "filters": {k: v for k, v in sorted(filters.items()) if v is not None},
            "context_hash": hashlib.sha256(json.dumps(context_dict, sort_keys=True).encode("utf-8")).hexdigest(),
            "model": model,
            "prompt_version": prompt_version,
            "data_version": data_ver
        }
        serialized = json.dumps(canonical_payload, sort_keys=True)
        key_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:24]
        return f"agrobuddy:insight:{page.lower()}:{key_hash}"

    def generate_agent_cache_key(
        self,
        query: str,
        filters: Dict[str, Any],
        model: str = settings.AGENT_MODEL,
        prompt_version: str = settings.AGENT_PROMPT_VERSION
    ) -> str:
        data_ver = get_data_version()
        normalized_query = " ".join(query.lower().strip().split())
        canonical_payload = {
            "query": normalized_query,
            "filters": {k: v for k, v in sorted(filters.items()) if v is not None},
            "model": model,
            "prompt_version": prompt_version,
            "data_version": data_ver
        }
        serialized = json.dumps(canonical_payload, sort_keys=True)
        key_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:24]
        return f"agrobuddy:agent:{key_hash}"

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None
        try:
            if self.redis_client:
                cached_str = self.redis_client.get(key)
                if cached_str:
                    logger.info(f"[CACHE HIT] Redis key: {key}")
                    return json.loads(cached_str)
            else:
                cached_data = self.memory_cache.get(key)
                if cached_data:
                    logger.info(f"[CACHE HIT] In-Memory key: {key}")
                    return cached_data

            logger.info(f"[CACHE MISS] Key: {key}")
            return None
        except Exception as e:
            logger.error(f"[CACHE ERROR] Error reading key {key}: {str(e)}")
            return None

    def set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None):
        if not self.enabled:
            return
        effective_ttl = ttl or self.ttl
        try:
            if self.redis_client:
                self.redis_client.setex(key, effective_ttl, json.dumps(value))
                logger.info(f"[CACHE SET] Redis key: {key} (TTL: {effective_ttl}s)")
            else:
                self.memory_cache.set(key, value, effective_ttl)
                logger.info(f"[CACHE SET] In-Memory key: {key} (TTL: {effective_ttl}s)")
        except Exception as e:
            logger.error(f"[CACHE ERROR] Error writing key {key}: {str(e)}")


llm_cache = LLMCacheService()
