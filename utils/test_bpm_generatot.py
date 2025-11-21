import json
import random
from datetime import datetime, timedelta, timezone

def generate_heart_rate_data(num_records=20, start_bpm=70, user="Shaq"):
    """
    Generates a list of heart rate data points with gradual fluctuations.
    """
    
    # Configuration for gradual changes
    MIN_BPM = 60
    MAX_BPM = 195
    MAX_STEP = 5  # Maximum change in BPM between intervals (controls "smoothness")
    TIME_INCREMENT_MINUTES = 5 # Matches the 5-minute gaps in your example
    
    # Initialize list and starting values
    data_points = []
    current_bpm = start_bpm
    
    # Set start time (using current UTC time or a specific start date)
    current_time = datetime.now(timezone.utc)
    
    for _ in range(num_records):
        # 1. Generate Gradual Fluctuation
        # Randomly change the BPM by a value between -MAX_STEP and +MAX_STEP
        fluctuation = random.randint(-MAX_STEP, MAX_STEP)
        current_bpm += fluctuation
        
        # 2. Clamp values to ensure they stay within 60-195 range
        if current_bpm < MIN_BPM:
            current_bpm = MIN_BPM
        elif current_bpm > MAX_BPM:
            current_bpm = MAX_BPM
            
        # 3. Format Timestamp to ISO 8601 (ending in Z to match example)
        # .replace(microsecond=0) removes milliseconds for cleaner output
        iso_timestamp = current_time.replace(microsecond=0).isoformat().replace("+00:00", "Z")
        
        # 4. Build the record object
        record = {
            "bpm": current_bpm,
            "user": user,
            "timestamp": iso_timestamp
        }
        
        data_points.append(record)
        
        # 5. Increment time for the next loop
        current_time += timedelta(minutes=TIME_INCREMENT_MINUTES)

    # Wrap in the parent "data" structure 
    return {"data": data_points}

if __name__ == "__main__":
    # Generate the data
    json_output = generate_heart_rate_data(num_records=20)
    
    # Print to console
    print(json.dumps(json_output, indent=2))
    
    # Optional: Write to a file
    with open("heart_rate_data.json", "w") as f:
        json.dump(json_output, f, indent=2)
    print("\nSuccessfully generated 'heart_rate_data.json'")