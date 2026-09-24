"""
MySQL Database Connection
"""

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

# Config
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'digitrix_studioarchwebsite'),
    'password': os.getenv('DB_PASSWORD', 'studioarch@70'),
    'database': os.getenv('DB_NAME', 'digitrix_studioarchwebsite'),
}

# Connection pool
connection = None

def init_db():
    """Initialize database connection"""
    global connection
    try:
        print("🗄️ [Database] Connecting to MySQL...")
        connection = mysql.connector.connect(**DB_CONFIG)
        print("✅ [Database] Connected successfully")
        print(f"📍 Host: {DB_CONFIG['host']}")
        print(f"📍 Database: {DB_CONFIG['database']}")
    except Error as e:
        print(f"❌ [Database] Connection error: {e}")
        raise

async def query(sql, params=()):
    """Execute SELECT query"""
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(sql, params)
        result = cursor.fetchall()
        cursor.close()
        return result
    except Error as e:
        print(f"❌ [Database] Query error: {e}")
        raise

async def insert(sql, params=()):
    """Execute INSERT query"""
    try:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        connection.commit()
        result = cursor.lastrowid
        cursor.close()
        return result
    except Error as e:
        connection.rollback()
        print(f"❌ [Database] Insert error: {e}")
        raise

async def update(sql, params=()):
    """Execute UPDATE query"""
    try:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        connection.commit()
        cursor.close()
        return True
    except Error as e:
        connection.rollback()
        print(f"❌ [Database] Update error: {e}")
        raise

async def delete(sql, params=()):
    """Execute DELETE query"""
    try:
        cursor = connection.cursor()
        cursor.execute(sql, params)
        connection.commit()
        cursor.close()
        return True
    except Error as e:
        connection.rollback()
        print(f"❌ [Database] Delete error: {e}")
        raise
