# send_heart_rate_data.py
import json
import requests
import os
from datetime import datetime, timedelta, timezone

# Configuration
API_ENDPOINT = "https://fit-bank-wb44.vercel.app/api/heart-rate"
USERS = ['user_a', 'user_b', 'user_c']

def update_timestamps(entries):
    """Updates timestamps of entries to be recent, ensuring they are 'new' data."""
    updated_entries = []
    # Create a timezone object for UTC+1
    tz = timezone(timedelta(hours=1))
    # Start from current time minus a few minutes, and increment for each entry
    current_time = datetime.now(tz) - timedelta(minutes=len(entries) + 1)

    for entry in entries:
        entry['timestamp'] = current_time.isoformat(timespec='seconds')
        updated_entries.append(entry)
        current_time += timedelta(minutes=1) # Increment for next entry
    return updated_entries


def send_data_for_user(username):
    filename = f'{username}_heart_rate_data.json'
    if not os.path.exists(filename):
        print(f"Error: File {filename} not found.")
        return

    with open(filename, 'r') as f:
        data_entries = json.load(f)

    if not data_entries:
        print(f"No data to send for {username}.")
        return

    # Update timestamps to ensure they are new for each run
    data_entries = update_timestamps(data_entries)

    print(f"Sending {len(data_entries)} heart rate entries for {username} to {API_ENDPOINT}...")

    # Separate bpm and timestamp values and join them with newline characters
    bpm_string = '\n'.join([str(entry['bpm']) for entry in data_entries])
    timestamp_string = '\n'.join([entry['timestamp'] for entry in data_entries])
    username = data_entries[0]['username'] # Assuming username is consistent across entries

    payload = {
        "bpm": bpm_string,
        "username": username,
        "timestamp": timestamp_string
    }

    try:
        response = requests.post(API_ENDPOINT, json=payload)
        if response.status_code in [200, 201]:
            print(f"Successfully sent data for {username}. Response: {response.json()}")
        else:
            print(f"Failed to send data for {username}: Status Code {response.status_code}, Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print(f"Connection Error: Could not connect to {API_ENDPOINT}. Is the server running?")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    for user in USERS:
        send_data_for_user(user)
