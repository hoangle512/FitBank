import json
import random
from datetime import datetime, timedelta, timezone

def generate_heart_rate_data(num_records=20, start_bpm=70, user="Shaq"):
    # Configuration
    MIN_BPM = 150
    MAX_BPM = 195
    MAX_STEP = 5
    TIME_INCREMENT_MINUTES = 5
    
    data_points = []
    current_bpm = start_bpm
    current_time = datetime.now(timezone.utc)
    
    for _ in range(num_records):
        # 1. Calculate BPM
        fluctuation = random.randint(-MAX_STEP, MAX_STEP)
        current_bpm += fluctuation
        
        if current_bpm < MIN_BPM: current_bpm = MIN_BPM
        elif current_bpm > MAX_BPM: current_bpm = MAX_BPM
            
        # 2. Format Timestamp
        iso_timestamp = current_time.replace(microsecond=0).isoformat().replace("+00:00", "Z")
        
        # 3. Build Record (CORRECTED KEY BELOW)
        record = {
            "bpm": current_bpm,
            "username": user,  # Changed from "user" to "username"
            "timestamp": iso_timestamp
        }
        
        data_points.append(record)
        current_time += timedelta(minutes=TIME_INCREMENT_MINUTES)

    return {"data": data_points}

if __name__ == "__main__":
    json_output = generate_heart_rate_data(num_records=20)
    
    # Overwrite the file with the corrected data
    with open("heart_rate_data.json", "w") as f:
        json.dump(json_output, f, indent=2)
    print("Successfully generated 'heart_rate_data.json' with 'username' key.")