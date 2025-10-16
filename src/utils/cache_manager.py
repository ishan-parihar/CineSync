import hashlib
import json
import os
from pathlib import Path
from typing import Optional, Dict
import logging

logger = logging.getLogger('lip_sync.cache')


class CacheManager:
    """Manages phoneme data caching to avoid redundant processing"""
    
    def __init__(self, cache_dir: str = "output/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.debug(f"CacheManager initialized: {self.cache_dir}")
    
    def get_audio_hash(self, audio_path: str) -> str:
        """Generate MD5 hash of audio file for cache key"""
        hash_md5 = hashlib.md5()
        
        with open(audio_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        
        return hash_md5.hexdigest()
    
    def get_cached_phoneme_data(self, audio_path: str) -> Optional[Dict]:
        """Retrieve cached phoneme data if available"""
        audio_hash = self.get_audio_hash(audio_path)
        cache_file = self.cache_dir / f"{audio_hash}.json"
        
        if not cache_file.exists():
            logger.debug(f"Cache miss for: {Path(audio_path).name}")
            return None
        
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
            
            logger.info(f"Cache hit for: {Path(audio_path).name}")
            return data
            
        except Exception as e:
            logger.warning(f"Failed to load cached data: {e}")
            return None
    
    def save_phoneme_data(self, audio_path: str, phoneme_data: Dict):
        """Store phoneme data in cache"""
        audio_hash = self.get_audio_hash(audio_path)
        cache_file = self.cache_dir / f"{audio_hash}.json"
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(phoneme_data, f, indent=2)
            
            logger.debug(f"Phoneme data cached: {cache_file}")
            
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")
    
    def clear_cache(self):
        """Remove all cached phoneme data"""
        count = 0
        for cache_file in self.cache_dir.glob('*.json'):
            cache_file.unlink()
            count += 1
        
        logger.info(f"Cache cleared: {count} files removed")
