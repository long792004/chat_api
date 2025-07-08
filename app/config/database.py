import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:
    def __init__(self):
        self.SUPABASE_URL = os.getenv("Supabase_Project_URL")
        self.SUPABASE_KEY = os.getenv("Supabase_API_Key")
        
        if not self.SUPABASE_URL or not self.SUPABASE_KEY:
            raise ValueError("Supabase URL and API Key must be set in environment variables")
        
        self._client = None
    
    @property
    def client(self) -> Client:
        """Get Supabase client instance (singleton pattern)"""
        if self._client is None:
            self._client = create_client(self.SUPABASE_URL, self.SUPABASE_KEY)
        return self._client

# Global database instance
db_config = DatabaseConfig()

def get_supabase() -> Client:
    """Dependency function to get Supabase client"""
    return db_config.client