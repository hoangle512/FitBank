# generate_heart_rate_data.py
import datetime
import random
import json

def generate_user_data(username, start_date, end_date, z1, z2, z3):
    user_data = []
    current_date = start_date
    while current_date <= end_date:
        # Generate a few data points per day to simulate activity
        for _ in range(random.randint(5, 15)): # 5 to 15 entries per day
            timestamp = current_date + datetime.timedelta(minutes=random.randint(0, 24*60 - 1))
            
            # Generate BPMs across different zones
            bpm_category = random.choices(
                ['below_z1', 'in_z1', 'in_z2', 'in_z3'], 
                weights=[0.3, 0.3, 0.2, 0.2], 
                k=1
            )[0]

            if bpm_category == 'below_z1':
                bpm = random.randint(z1 - 30, z1 - 1) # Below z1
            elif bpm_category == 'in_z1':
                bpm = random.randint(z1, z2 - 1) # In z1
            elif bpm_category == 'in_z2':
                bpm = random.randint(z2, z3 - 1) # In z2
            else: # in_z3
                bpm = random.randint(z3, z3 + 40) # In z3 and above
            
            user_data.append({
                "username": username,
                "bpm": bpm,
                "timestamp": timestamp.isoformat()
            })
        current_date += datetime.timedelta(days=1)
    
    # Sort data by timestamp
    user_data.sort(key=lambda x: x["timestamp"])
    return user_data

# Define parameters
start_date = datetime.date(2025, 12, 1)
end_date = datetime.date(2025, 12, 7)
z1_val = 120
z2_val = 145
z3_val = 160
users = ['user_a', 'user_b', 'user_c']

# Generate data for each user and save to a JSON file
for user in users:
    data = generate_user_data(user, start_date, end_date, z1_val, z2_val, z3_val)
    with open(f'{user}_heart_rate_data.json', 'w') as f:
        json.dump(data, f, indent=2)

print("Heart rate data generated successfully for all users.")
