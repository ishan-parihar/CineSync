#!/usr/bin/env python3
"""
Test script for the new system performance monitoring endpoint
"""

import sys
import os
from pathlib import Path
import json
import requests
import asyncio
from datetime import datetime

def test_system_monitoring_endpoint():
    """Test the system monitoring endpoint via HTTP"""
    print("🔍 Testing System Monitoring Endpoint...")
    
    # Base URL for the API
    base_url = "http://localhost:8001"
    
    try:
        # Test the health check first
        print("📊 Testing health check...")
        health_response = requests.get(f"{base_url}/api/health", timeout=5)
        
        if health_response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {health_response.status_code}")
            return False
            
        # Test the system performance endpoint
        print("📈 Testing system performance endpoint...")
        perf_response = requests.get(f"{base_url}/api/system/performance", timeout=10)
        
        if perf_response.status_code == 200:
            print("✅ System performance endpoint responded successfully")
            
            # Parse the response
            perf_data = perf_response.json()
            
            # Validate response structure
            required_sections = [
                'timestamp', 'system_uptime', 'resource_utilization',
                'processing_analytics', 'system_health', 'performance_trends',
                'recommendations', 'alerts'
            ]
            
            for section in required_sections:
                if section in perf_data:
                    print(f"  ✅ {section} section present")
                else:
                    print(f"  ❌ {section} section missing")
                    return False
            
            # Validate resource utilization
            resources = perf_data.get('resource_utilization', {})
            if 'cpu' in resources and 'memory' in resources and 'disk' in resources:
                print("  ✅ Resource utilization data present")
                
                # Check for reasonable values
                cpu_percent = resources['cpu'].get('percent', 0)
                if 0 <= cpu_percent <= 100:
                    print(f"  ✅ CPU usage reasonable: {cpu_percent}%")
                else:
                    print(f"  ❌ CPU usage unreasonable: {cpu_percent}%")
                    return False
            else:
                print("  ❌ Missing key resource utilization data")
                return False
            
            # Validate system health
            health = perf_data.get('system_health', {})
            if 'overall_score' in health:
                score = health['overall_score']
                if 0 <= score <= 1:
                    print(f"  ✅ Health score reasonable: {score}")
                else:
                    print(f"  ❌ Health score unreasonable: {score}")
                    return False
            
            print("✅ System performance endpoint validation passed")
            return True
            
        else:
            print(f"❌ System performance endpoint failed: {perf_response.status_code}")
            if perf_response.status_code == 500:
                print("  Server error - check backend logs")
            elif perf_response.status_code == 404:
                print("  Endpoint not found - ensure backend is running latest code")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - ensure backend is running on port 8501")
        print("  Run: cd web-ui/backend && python main.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timeout - endpoint may be slow to respond")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_endpoint_functionality():
    """Test specific functionality of the monitoring endpoint"""
    print("\n🔍 Testing endpoint functionality...")
    
    base_url = "http://localhost:8001"
    
    try:
        # Get performance data
        response = requests.get(f"{base_url}/api/system/performance", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Test recommendations
            recommendations = data.get('recommendations', [])
            if isinstance(recommendations, list):
                print(f"✅ Recommendations format correct: {len(recommendations)} items")
            else:
                print("❌ Recommendations not in list format")
                return False
            
            # Test alerts
            alerts = data.get('alerts', {})
            if isinstance(alerts, dict):
                critical = alerts.get('critical', [])
                warnings = alerts.get('warnings', [])
                print(f"✅ Alerts format correct: {len(critical)} critical, {len(warnings)} warnings")
            else:
                print("❌ Alerts not in dict format")
                return False
            
            # Test trends
            trends = data.get('performance_trends', {})
            if isinstance(trends, dict):
                print("✅ Performance trends format correct")
            else:
                print("❌ Performance trends not in dict format")
                return False
            
            print("✅ All functionality tests passed")
            return True
        else:
            print(f"❌ Failed to get data for functionality tests: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Functionality test error: {e}")
        return False

async def main():
    """Main test function"""
    print("=" * 60)
    print("🧪 LipSyncAutomation System Monitoring Test")
    print("=" * 60)
    
    # Test basic endpoint functionality
    basic_test = test_system_monitoring_endpoint()
    
    if not basic_test:
        print("\n❌ Basic tests failed - skipping detailed tests")
        return False
    
    # Test detailed functionality
    detailed_test = test_endpoint_functionality()
    
    if basic_test and detailed_test:
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("✅ System monitoring endpoint is working correctly")
        print("✅ All required data sections are present")
        print("✅ Data validation checks passed")
        print("✅ Performance recommendations and alerts working")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("❌ SOME TESTS FAILED!")
        print("Please check the backend logs for details")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)