import sqlite3
import os
from pathlib import Path
from datetime import datetime
import textwrap

def format_timestamp(timestamp_str):
    """Format timestamp string for display"""
    try:
        formats = [
            "%Y-%m-%dT%H:%M:%S.%f",  # ISO format with microseconds
            "%Y-%m-%dT%H:%M:%S",     # ISO format without microseconds
            "%Y-%m-%d %H:%M:%S.%f",  # SQLite default with microseconds
            "%Y-%m-%d %H:%M:%S"      # SQLite default without microseconds
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(timestamp_str, fmt)
                return dt.strftime("%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue
        
        # If all formats fail, return as is
        return timestamp_str
    except Exception as e:
        print(f"Error formatting timestamp: {e}")
        return timestamp_str

# Connect to the database
db_path = Path("./data/chat.db")
if not db_path.exists():
    print(f"Database file not found at {db_path.absolute()}")
    exit(1)

print(f"Database located at: {db_path.absolute()}")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row  # This enables column access by name
cursor = conn.cursor()

# Get conversation count
cursor.execute("SELECT COUNT(*) FROM conversations")
conv_count = cursor.fetchone()[0]
print(f"\nTotal conversations: {conv_count}")

# Get message count
cursor.execute("SELECT COUNT(*) FROM messages")
msg_count = cursor.fetchone()[0]
print(f"Total messages: {msg_count}")

# Message counts by role
cursor.execute("SELECT role, COUNT(*) as count FROM messages GROUP BY role")
role_counts = cursor.fetchall()
print("\nMessages by role:")
for role in role_counts:
    print(f"  - {role['role']}: {role['count']}")

# Get all conversations
print("\n" + "=" * 50)
print("CONVERSATIONS")
print("=" * 50)

cursor.execute("""
    SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as msg_count
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
""")
conversations = cursor.fetchall()

for conv in conversations:
    print(f"\nConversation #{conv['id']}: {conv['title']}")
    print(f"  Created: {conv['created_at']}")
    print(f"  Updated: {conv['updated_at']}")
    print(f"  Messages: {conv['msg_count']}")
    
    # Get messages for this conversation
    cursor.execute("""
        SELECT id, role, content, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at
    """, (conv['id'],))
    messages = cursor.fetchall()
    
    print("\n  Message history:")
    for msg in messages:
        role_display = "🧑 User" if msg['role'] == 'user' else "🤖 Assistant" if msg['role'] == 'assistant' else "⚙️ System"
        print(f"\n  {role_display} (Message #{msg['id']} - {msg['created_at']}):")
        
        # Wrap and indent the content for better readability
        content = msg['content']
        wrapped_content = textwrap.fill(content, width=70, 
                                      initial_indent="    ", subsequent_indent="    ")
        print(wrapped_content)

# Close the connection
conn.close()

print("\n" + "=" * 50) 