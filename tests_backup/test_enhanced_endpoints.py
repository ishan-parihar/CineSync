#!/usr/bin/env python3
"""
Test script for enhanced processing endpoints
"""
import json
import requests
import time
from pathlib import Path

API_BASE = "http://localhost:8001"

def test_health():
    """Test API health"""
    response = requests.get(f"{API_BASE}/api/health")
    print(f"Health check: {response.status_code}")
    return response.status_code == 200

def test_shot_sequence_endpoint(job_id: str):
    """Test shot sequence endpoint"""
    response = requests.get(f"{API_BASE}/api/jobs/{job_id}/shot-sequence")
    print(f"Shot sequence: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"  - Total shots: {len(data.get('shot_sequence', []))}")
        print(f"  - Job metadata: {data.get('job_metadata', {})}")
    else:
        print(f"  - Error: {response.text}")
    
    return response.status_code == 200

def test_emotion_analysis_endpoint(job_id: str):
    """Test emotion analysis endpoint"""
    response = requests.get(f"{API_BASE}/api/jobs/{job_id}/emotion-analysis")
    print(f"Emotion analysis: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"  - Total segments: {len(data.get('emotion_segments', []))}")
        print(f"  - Dominant emotion: {data.get('overall_emotion_analysis', {}).get('dominant_emotion', {})}")
    else:
        print(f"  - Error: {response.text}")
    
    return response.status_code == 200

def test_batch_processing():
    """Test batch processing endpoint"""
    # Find test audio files
    audio_dir = Path("assets/audio/raw")
    test_files = list(audio_dir.glob("*.wav")) + list(audio_dir.glob("*.mp3"))
    
    if not test_files:
        print("No test audio files found")
        return False
    
    # Use first 2 files for testing
    test_files = test_files[:2]
    
    batch_data = {
        "audio_files": [
            {"path": str(f)} for f in test_files
        ],
        "profile": "character_1",
        "cinematic_mode": "balanced",
        "priority": "medium"
    }
    
    response = requests.post(f"{API_BASE}/api/batch/process", json=batch_data)
    print(f"Batch processing: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        batch_id = data.get("batch_id")
        print(f"  - Batch ID: {batch_id}")
        print(f"  - Total files: {data.get('total_files')}")
        
        # Check batch status
        time.sleep(2)  # Wait a bit
        status_response = requests.get(f"{API_BASE}/api/batch/{batch_id}")
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"  - Batch status: {status_data.get('summary', {})}")
        
        return batch_id
    else:
        print(f"  - Error: {response.text}")
        return None

def main():
    """Run all tests"""
    print("Testing Enhanced Processing Endpoints")
    print("=" * 50)
    
    # Test health first
    if not test_health():
        print("API is not running or unhealthy")
        return
    
    # Get existing jobs to test with
    response = requests.get(f"{API_BASE}/api/jobs")
    if response.status_code != 200:
        print("Could not get jobs list")
        return
    
    jobs_data = response.json()
    jobs = jobs_data.get("jobs", {})
    
    # Find a completed job
    completed_job_id = None
    for job_id, job in jobs.items():
        if job.get("status") == "completed":
            completed_job_id = job_id
            break
    
    if completed_job_id:
        print(f"Testing with completed job: {completed_job_id}")
        test_shot_sequence_endpoint(completed_job_id)
        test_emotion_analysis_endpoint(completed_job_id)
    else:
        print("No completed jobs found. Creating new batch job...")
        batch_id = test_batch_processing()
        if batch_id:
            print(f"Created batch job: {batch_id}")
    
    print("\nTests completed!")

if __name__ == "__main__":
    main()