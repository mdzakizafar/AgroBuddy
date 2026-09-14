import sys
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.app.db.initialization import init_db


def main():
    print("Starting AgroBuddy DuckDB database initialization...")
    init_db()
    print("Database initialization done!")


if __name__ == "__main__":
    main()
