import sqlite3
import os
from pathlib import Path
import datetime

# Ensure data directory exists
data_dir = Path("./data")
data_dir.mkdir(exist_ok=True)

# Database path
db_path = data_dir / "chat.db"

# Connect to SQLite database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Drop existing tables if they exist (for clean slate)
cursor.execute("DROP TABLE IF EXISTS messages")
cursor.execute("DROP TABLE IF EXISTS conversations")

# Create the conversations table
cursor.execute('''
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
''')

# Create index on updated_at for conversations
cursor.execute('''
CREATE INDEX ix_conversations_updated_at ON conversations(updated_at DESC)
''')

# Create the messages table
cursor.execute('''
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
)
''')

# Create index on conversation_id and created_at for messages
cursor.execute('''
CREATE INDEX ix_messages_conversation_id_created_at ON messages(conversation_id, created_at)
''')

# Insert some sample data
# Create a sample conversation
now = datetime.datetime.utcnow().isoformat()
cursor.execute('''
INSERT INTO conversations (title, created_at, updated_at) VALUES (?, ?, ?)
''', ("Sample Conversation", now, now))
conversation_id = cursor.lastrowid

# Add some sample messages
sample_messages = [
    (conversation_id, "user", "Hello, how are you?", now),
    (conversation_id, "assistant", "I'm doing great! How can I help you today?", now),
    (conversation_id, "user", "Tell me about SQLite databases.", now),
    (conversation_id, "assistant", "SQLite is a self-contained, serverless, zero-configuration, transactional SQL database engine. It is the most widely deployed SQL database engine in the world.", now)
]

cursor.executemany('''
INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)
''', sample_messages)

# Commit changes and close connection
conn.commit()
print("Database schema created successfully with sample data.")
print(f"Database location: {db_path.absolute()}")

# Close connection
conn.close() 