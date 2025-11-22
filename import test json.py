import json
import random
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta

# Configuration
API_URL = "localhost:3000/api/heart-rate"
USERNAME = "test_runner_01"
DURATION_MINUTES = 60
START_BPM = 75

def generate_and_send():
    current_bpm = START_BPM
    # Start time: 2 hours ago (so data ends at "now")
    start_time = datetime.utcnow() - timedelta(minutes=DURATION_MINUTES)

    print(f"--- Starting Data Seed to {API_URL} ---")
    print(f"Generating {DURATION_MINUTES} entries (2 hours)...")

    success_count = 0
    fail_count = 0

    for i in range(DURATION_MINUTES):
        # 1. Logic for Gradual Fluctuation
        # Randomly go up or down by small amount (-3 to +4)
        change = random.randint(-3, 4)
        current_bpm += change
        
        # Clamp BPM to realistic human limits (e.g., 60 to 185)
        current_bpm = max(60, min(185, current_bpm))

        # 2. Create the Timestamp
        entry_time = start_time + timedelta(minutes=i)
        
        # 3. Construct Payload
        payload = {
            "username": USERNAME,
            "bpm": current_bpm,
            "timestamp": entry_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        # 4. Send Request using Standard Library (No pip install needed)
        try:
            json_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                API_URL, 
                data=json_data, 
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            
            with urllib.request.urlopen(req) as response:
                # 200-299 is success
                if 200 <= response.getcode() < 300:
                    print(f"[{i+1}/{DURATION_MINUTES}] Sent: {payload['bpm']} BPM at {payload['timestamp']} -> OK")
                    success_count += 1
                else:
                    print(f"[{i+1}/{DURATION_MINUTES}] Failed: Status {response.getcode()}")
                    fail_count += 1

        except urllib.error.HTTPError as e:
            print(f"[{i+1}/{DURATION_MINUTES}] HTTP Error: {e.code} {e.reason}")
            fail_count += 1
        except urllib.error.URLError as e:
            print(f"[{i+1}/{DURATION_MINUTES}] Connection Error: {e.reason}")
            fail_count += 1
            break # Stop if server is down
        
        # Optional: Small sleep to be nice to the server (0.1s)
        time.sleep(0.1)

    print("-" * 30)
    print(f"Completed. Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    generate_and_send()