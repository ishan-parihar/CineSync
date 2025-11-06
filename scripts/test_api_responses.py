#!/usr/bin/env python3
"""
Test script to verify standardized API responses work correctly
"""

import json
import requests
import time
from typing import Dict, Any, Optional

class APIResponseTester:
    """Test class for validating standardized API responses"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.test_results = []
    
    def log_test(self, endpoint: str, test_name: str, passed: bool, message: str = "", response_data: Optional[Dict] = None):
        """Log test results"""
        result = {
            "endpoint": endpoint,
            "test": test_name,
            "passed": passed,
            "message": message,
            "timestamp": time.time()
        }
        if response_data:
            result["response_sample"] = response_data
        
        self.test_results.append(result)
        
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {endpoint} - {test_name}")
        if message:
            print(f"  -> {message}")
    
    def validate_response_structure(self, response: Dict, endpoint: str) -> bool:
        """Validate the standardized response structure"""
        required_fields = ["success", "data", "error", "metadata"]
        
        for field in required_fields:
            if field not in response:
                self.log_test(endpoint, "Required Field Check", False, f"Missing field: {field}")
                return False
        
        # Validate metadata structure
        metadata = response["metadata"]
        required_metadata_fields = ["timestamp", "request_id", "version"]
        
        for field in required_metadata_fields:
            if field not in metadata:
                self.log_test(endpoint, "Metadata Field Check", False, f"Missing metadata field: {field}")
                return False
        
        # Validate timestamp format
        try:
            from datetime import datetime
            datetime.fromisoformat(metadata["timestamp"].replace('Z', '+00:00'))
        except Exception:
            self.log_test(endpoint, "Timestamp Format", False, "Invalid timestamp format")
            return False
        
        # Validate success/error consistency
        if response["success"]:
            if response["error"] is not None:
                self.log_test(endpoint, "Success/Error Consistency", False, "Success response should not have error")
                return False
        else:
            if response["error"] is None:
                self.log_test(endpoint, "Success/Error Consistency", False, "Error response should have error object")
                return False
            
            # Validate error structure
            error = response["error"]
            required_error_fields = ["code", "message"]
            for field in required_error_fields:
                if field not in error:
                    self.log_test(endpoint, "Error Field Check", False, f"Missing error field: {field}")
                    return False
        
        self.log_test(endpoint, "Response Structure", True, "All required fields present and valid")
        return True
    
    def test_endpoint(self, method: str, endpoint: str, data: Optional[Dict] = None, headers: Optional[Dict] = None):
        """Test a specific endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                self.log_test(endpoint, "HTTP Method", False, f"Unsupported method: {method}")
                return
            
            # Check if response is JSON
            try:
                response_data = response.json()
            except Exception:
                self.log_test(endpoint, "JSON Response", False, f"Response is not valid JSON: {response.text[:100]}")
                return
            
            # Validate standardized structure
            self.validate_response_structure(response_data, endpoint)
            
            # Test response time
            processing_time = response_data.get("metadata", {}).get("processing_time_ms")
            if processing_time is not None:
                if processing_time < 0:
                    self.log_test(endpoint, "Processing Time", False, f"Negative processing time: {processing_time}")
                elif processing_time > 30000:  # 30 seconds
                    self.log_test(endpoint, "Processing Time", False, f"Very slow response: {processing_time}ms")
                else:
                    self.log_test(endpoint, "Processing Time", True, f"Response time: {processing_time:.2f}ms")
            
            # Log sample response
            self.log_test(endpoint, "Sample Response", True, "Response captured", {
                "success": response_data.get("success"),
                "has_data": response_data.get("data") is not None,
                "has_error": response_data.get("error") is not None,
                "request_id": response_data.get("metadata", {}).get("request_id"),
                "version": response_data.get("metadata", {}).get("version")
            })
            
        except requests.exceptions.ConnectionError:
            self.log_test(endpoint, "Connection", False, "Could not connect to server")
        except requests.exceptions.Timeout:
            self.log_test(endpoint, "Timeout", False, "Request timed out")
        except Exception as e:
            self.log_test(endpoint, "Unexpected Error", False, str(e))
    
    def run_all_tests(self):
        """Run comprehensive tests on all endpoints"""
        print("=" * 60)
        print("LipSyncAutomation API Standardized Response Tests")
        print("=" * 60)
        
        # Test basic endpoints
        self.test_endpoint("GET", "/")
        self.test_endpoint("GET", "/api/health")
        self.test_endpoint("GET", "/api/system-info")
        self.test_endpoint("GET", "/api/system/performance")
        
        # Test profiles endpoints
        self.test_endpoint("GET", "/api/profiles")
        
        # Test jobs endpoints
        self.test_endpoint("GET", "/api/jobs")
        
        # Test with invalid job ID (should return error)
        self.test_endpoint("GET", "/api/jobs/invalid_job_id_12345")
        
        # Test settings endpoints
        self.test_endpoint("GET", "/api/settings")
        
        # Test cinematography endpoints
        self.test_endpoint("GET", "/api/cinematography/config")
        self.test_endpoint("GET", "/api/cinematography/rules")
        self.test_endpoint("GET", "/api/cinematography/overrides")
        
        # Test error endpoints
        self.test_endpoint("GET", "/api/cinematography/overrides/invalid_override_id")
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["passed"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['endpoint']}: {result['test']} - {result['message']}")
        
        print("\n" + "=" * 60)
        
        # Save detailed results
        with open("api_test_results.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print("Detailed results saved to: api_test_results.json")

def main():
    """Main test function"""
    tester = APIResponseTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()