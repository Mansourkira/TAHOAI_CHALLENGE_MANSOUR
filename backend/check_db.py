import sqlite3
import os
from pathlib import Path

# Check if database file exists
db_path = Path("./data/chat.db")
if not db_path.exists():
    print(f"Database file not found at {db_path.absolute()}")
    exit(1)

print(f"Database found at: {db_path.absolute()}")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get list of tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

if not tables:
    print("No tables found in the database.")
else:
    print("\nTables in the database:")
    for table in tables:
        print(f"- {table[0]}")
        
        # Show table schema
        print(f"\nSchema for {table[0]}:")
        cursor.execute(f"PRAGMA table_info({table[0]});")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[1]} ({col[2]}) {'PRIMARY KEY' if col[5] else ''}")
        
        # Count rows
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
        count = cursor.fetchone()[0]
        print(f"\n  Total rows: {count}")

conn.close() 