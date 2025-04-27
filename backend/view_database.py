import sqlite3
import os
from pathlib import Path

def print_separator(title):
    print("\n" + "=" * 50)
    print(f" {title} ".center(50, "="))
    print("=" * 50 + "\n")

def main():
    # Check if database file exists
    db_path = Path("./data/chat.db")
    if not db_path.exists():
        print(f"Database file not found at {db_path.absolute()}")
        return
    
    print(f"Database found at: {db_path.absolute()}")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    if not tables:
        print("No tables found in the database.")
        conn.close()
        return
    
    print_separator("DATABASE TABLES")
    for table in tables:
        print(f"• {table[0]}")
    
    # For each table, show structure and some data
    for table in tables:
        table_name = table[0]
        print_separator(f"TABLE: {table_name}")
        
        # Get table structure
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        print("COLUMNS:")
        for col in columns:
            print(f"  • {col[1]} ({col[2]}) {'PRIMARY KEY' if col[5] else ''}")
        
        # Count rows
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        row_count = cursor.fetchone()[0]
        print(f"\nTotal rows: {row_count}")
        
        # Show some sample data (up to 5 rows)
        if row_count > 0:
            print("\nSAMPLE DATA:")
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
            rows = cursor.fetchall()
            
            # Get column widths for pretty printing
            col_widths = [len(col[1]) for col in columns]
            for row in rows:
                for i, cell in enumerate(row):
                    col_widths[i] = max(col_widths[i], len(str(cell)))
            
            # Print header
            header = " | ".join(col[1].ljust(col_widths[i]) for i, col in enumerate(columns))
            print(header)
            print("-" * len(header))
            
            # Print rows
            for row in rows:
                print(" | ".join(str(cell).ljust(col_widths[i]) for i, cell in enumerate(row)))
    
    conn.close()

if __name__ == "__main__":
    main() 