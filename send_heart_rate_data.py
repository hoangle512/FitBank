# send_heart_rate_data.py
import json
import requests
import os

# Configuration
API_ENDPOINT = "http://localhost:3000/api/heart-rate" # Change to 3001 if your server is running on that port
USERS = ['user_a', 'user_b', 'user_c']

def send_data_for_user(username):
    filename = f'{username}_heart_rate_data.json'
    if not os.path.exists(filename):
        print(f"Error: File {filename} not found.")
        return

    with open(filename, 'r') as f:
        data_entries = json.load(f)

    print(f"Sending {len(data_entries)} heart rate entries for {username} to {API_ENDPOINT}...")
    
    successful_sends = 0
    failed_sends = 0

    for entry in data_entries:
        try:
            response = requests.post(API_ENDPOINT, json=entry)
            if response.status_code == 200:
                successful_sends += 1
                # print(f"Successfully sent: {entry['timestamp']}")
            else:
                failed_sends += 1
                print(f"Failed to send entry at {entry['timestamp']}: Status Code {response.status_code}, Response: {response.text}")
        except requests.exceptions.ConnectionError:
            print(f"Connection Error: Could not connect to {API_ENDPOINT}. Is the server running?")
            break # Stop trying to send if connection fails
        except Exception as e:
            failed_sends += 1
            print(f"An unexpected error occurred: {e}")
            
    print(f"Finished sending data for {username}. Successful: {successful_sends}, Failed: {failed_sends}")

if __name__ == "__main__":
    for user in USERS:
        send_data_for_user(user)

