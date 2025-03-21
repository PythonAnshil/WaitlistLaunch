import csv
import os
from datetime import datetime

class Waitlist:
    """Class to handle waitlist operations"""
    CSV_FILE = 'data/waitlist.csv'
    
    @classmethod
    def ensure_csv_exists(cls):
        """Make sure the CSV file and its directory exist"""
        os.makedirs(os.path.dirname(cls.CSV_FILE), exist_ok=True)
        
        # Create the file if it doesn't exist
        if not os.path.exists(cls.CSV_FILE):
            with open(cls.CSV_FILE, 'w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(['email', 'name', 'date_added'])
    
    @classmethod
    def add_entry(cls, email, name):
        """Add an entry to the waitlist"""
        cls.ensure_csv_exists()
        
        # Check if email already exists
        if cls.email_exists(email):
            return False
        
        # Add new entry
        with open(cls.CSV_FILE, 'a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([email, name, datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        return True
    
    @classmethod
    def email_exists(cls, email):
        """Check if an email already exists in the waitlist"""
        cls.ensure_csv_exists()
        
        with open(cls.CSV_FILE, 'r', newline='') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if row and row[0] == email:
                    return True
        return False
    
    @classmethod
    def get_all_entries(cls):
        """Get all entries from the waitlist"""
        cls.ensure_csv_exists()
        
        entries = []
        with open(cls.CSV_FILE, 'r', newline='') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if row:
                    entries.append({
                        'email': row[0],
                        'name': row[1],
                        'date_added': row[2]
                    })
        return entries
