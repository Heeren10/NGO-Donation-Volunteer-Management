import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "ngo.db")
conn = sqlite3.connect(db_path)
try:
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, email FROM profile WHERE role="volunteer"')
    print(cursor.fetchall())
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
