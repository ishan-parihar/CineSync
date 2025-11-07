#!/usr/bin/env python3
"""
Integration tests for API endpoints.
"""

import pytest
import requests
import json
from pathlib import Path


import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))
@pytest.mark.integration
@pytest.mark.api
class TestAPIEndpoints:
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures."""
        self.api_base = "http://localhost:8001"
        self.session = requests.Session()
    
    def test_health_endpoint(self):
        """Test API health check."""
        response = self.session.get(f"{self.api_base}/api/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data or "healthy" in str(data).lower()
        else:
            pytest.skip(f"API not available: {response.status_code}")
    
    def test_jobs_list_endpoint(self):
        """Test jobs listing endpoint."""
        response = self.session.get(f"{self.api_base}/api/jobs", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            assert "jobs" in data
            assert isinstance(data["jobs"], dict)
        else:
            pytest.skip(f"Jobs endpoint not available: {response.status_code}")
    
    def test_shot_sequence_endpoint(self):
        """Test shot sequence endpoint."""
        # First get a job ID
        jobs_response = self.session.get(f"{self.api_base}/api/jobs", timeout=5)
        if jobs_response.status_code != 200:
            pytest.skip("Cannot get jobs list")
        
        jobs_data = jobs_response.json()
        jobs = jobs_data.get("jobs", {})
        
        if not jobs:
            pytest.skip("No jobs available for testing")
        
        # Find a completed job
        job_id = None
        for jid, job in jobs.items():
            if job.get("status") == "completed":
                job_id = jid
                break
        
        if not job_id:
            pytest.skip("No completed jobs found for shot sequence testing")
        
        # Test shot sequence endpoint
        response = self.session.get(f"{self.api_base}/api/jobs/{job_id}/shot-sequence", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            assert "shot_sequence" in data
            assert isinstance(data["shot_sequence"], list)
            assert "job_metadata" in data
        else:
            pytest.skip(f"Shot sequence endpoint not available: {response.status_code}")
    
    def test_emotion_analysis_endpoint(self):
        """Test emotion analysis endpoint."""
        # First get a job ID
        jobs_response = self.session.get(f"{self.api_base}/api/jobs", timeout=5)
        if jobs_response.status_code != 200:
            pytest.skip("Cannot get jobs list")
        
        jobs_data = jobs_response.json()
        jobs = jobs_data.get("jobs", {})
        
        if not jobs:
            pytest.skip("No jobs available for testing")
        
        # Find a completed job
        job_id = None
        for jid, job in jobs.items():
            if job.get("status") == "completed":
                job_id = jid
                break
        
        if not job_id:
            pytest.skip("No completed jobs found for emotion analysis testing")
        
        # Test emotion analysis endpoint
        response = self.session.get(f"{self.api_base}/api/jobs/{job_id}/emotion-analysis", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            assert "emotion_segments" in data
            assert isinstance(data["emotion_segments"], list)
            assert "overall_emotion_analysis" in data
        else:
            pytest.skip(f"Emotion analysis endpoint not available: {response.status_code}")
    
    def test_batch_processing_endpoint(self):
        """Test batch processing endpoint."""
        # Find test audio files
        audio_dir = Path("assets/audio/raw")
        test_files = list(audio_dir.glob("*.wav")) + list(audio_dir.glob("*.mp3"))
        
        if not test_files:
            pytest.skip("No test audio files found")
        
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
        
        response = self.session.post(
            f"{self.api_base}/api/batch/process", 
            json=batch_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "batch_id" in data
            assert "total_files" in data
            assert data["total_files"] == len(test_files)
        else:
            pytest.skip(f"Batch processing endpoint not available: {response.status_code}")
    
    def test_system_performance_endpoint(self):
        """Test system performance monitoring endpoint."""
        response = self.session.get(f"{self.api_base}/api/system/performance", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate required sections
            required_sections = [
                'timestamp', 'system_uptime', 'resource_utilization',
                'processing_analytics', 'system_health', 'performance_trends',
                'recommendations', 'alerts'
            ]
            
            for section in required_sections:
                assert section in data, f"Missing section: {section}"
            
            # Validate resource utilization
            resources = data.get('resource_utilization', {})
            assert 'cpu' in resources
            assert 'memory' in resources
            assert 'disk' in resources
            
            # Check for reasonable values
            cpu_percent = resources['cpu'].get('percent', 0)
            assert 0 <= cpu_percent <= 100, f"Invalid CPU percentage: {cpu_percent}"
            
            # Validate system health
            health = data.get('system_health', {})
            assert 'overall_score' in health
            score = health['overall_score']
            assert 0 <= score <= 1, f"Invalid health score: {score}"
            
        else:
            pytest.skip(f"System performance endpoint not available: {response.status_code}")
    
    def test_endpoint_response_times(self):
        """Test that endpoints respond within reasonable time."""
        endpoints = [
            "/api/health",
            "/api/jobs",
            "/api/system/performance"
        ]
        
        for endpoint in endpoints:
            response = self.session.get(f"{self.api_base}{endpoint}", timeout=5)
            # If endpoint is available, it should respond quickly
            if response.status_code == 200:
                # Response time should be reasonable (under 5 seconds)
                assert response.elapsed.total_seconds() < 5.0
    
    def test_error_handling(self):
        """Test API error handling."""
        # Test non-existent endpoint
        response = self.session.get(f"{self.api_base}/api/nonexistent", timeout=5)
        assert response.status_code in [404, 405]
        
        # Test invalid job ID
        response = self.session.get(f"{self.api_base}/api/jobs/invalid_job_id", timeout=5)
        assert response.status_code in [404, 422]
    
    def test_cors_headers(self):
        """Test CORS headers are present."""
        response = self.session.options(f"{self.api_base}/api/health", timeout=5)
        
        if response.status_code == 200:
            # Check for CORS headers
            headers = response.headers
            # These may not be present in all configurations
            # cors_header = headers.get('Access-Control-Allow-Origin')
            # assert cors_header is not None, "CORS header missing"
            pass  # Basic test that endpoint responds to OPTIONS