#!/usr/bin/env python3
"""
Visualization Integration Test
Tests all visualization components to ensure they work correctly
"""

import subprocess
import time
import json
import requests
from pathlib import Path

def test_frontend_build():
    """Test that the frontend builds successfully with all visualizations"""
    print("🔨 Testing frontend build...")
    
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd="web-ui/frontend",
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode == 0:
            print("✅ Frontend build successful")
            return True
        else:
            print("❌ Frontend build failed")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False
    except subprocess.TimeoutExpired:
        print("❌ Frontend build timed out")
        return False
    except Exception as e:
        print(f"❌ Frontend build error: {e}")
        return False

def test_frontend_dev_server():
    """Test that the frontend development server starts"""
    print("🚀 Testing frontend development server...")
    
    try:
        # Start dev server in background
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd="web-ui/frontend",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        time.sleep(10)
        
        # Check if server is responding
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            if response.status_code == 200:
                print("✅ Frontend dev server running")
                process.terminate()
                return True
            else:
                print(f"❌ Frontend dev server returned status {response.status_code}")
                process.terminate()
                return False
        except requests.RequestException as e:
            print(f"❌ Frontend dev server not responding: {e}")
            process.terminate()
            return False
            
    except Exception as e:
        print(f"❌ Frontend dev server error: {e}")
        return False

def test_visualization_components():
    """Test that all visualization components exist and have correct structure"""
    print("📊 Testing visualization components...")
    
    components_dir = Path("web-ui/frontend/src/components/visualization")
    required_components = [
        "EmotionHeatmap.tsx",
        "EmotionRadar.tsx", 
        "EmotionTimeline.tsx",
        "SystemPerformanceDashboard.tsx",
        "TensionCurve.tsx"
    ]
    
    missing_components = []
    for component in required_components:
        component_path = components_dir / component
        if not component_path.exists():
            missing_components.append(component)
        else:
            # Check component has basic structure
            content = component_path.read_text()
            if "export" not in content or "interface" not in content:
                print(f"⚠️  Component {component} may have structural issues")
            else:
                print(f"✅ Component {component} exists and appears valid")
    
    if missing_components:
        print(f"❌ Missing components: {missing_components}")
        return False
    else:
        print("✅ All visualization components present")
        return True

def test_visualization_page():
    """Test that the visualizations page exists and is properly structured"""
    print("📄 Testing visualizations page...")
    
    page_path = Path("web-ui/frontend/src/app/visualizations/page.tsx")
    if not page_path.exists():
        print("❌ Visualizations page missing")
        return False
    
    content = page_path.read_text()
    
    # Check for required imports
    required_imports = [
        "EmotionHeatmap",
        "EmotionRadar",
        "EmotionTimeline", 
        "SystemPerformanceDashboard"
    ]
    
    missing_imports = []
    for import_name in required_imports:
        if import_name not in content:
            missing_imports.append(import_name)
    
    if missing_imports:
        print(f"⚠️  Missing imports in visualizations page: {missing_imports}")
    
    # Check for sample data
    if "sampleData" not in content and "data=" not in content:
        print("⚠️  Visualizations page may not have sample data")
    
    print("✅ Visualizations page exists and appears structured")
    return True

def test_page_integrations():
    """Test that visualizations are integrated into main pages"""
    print("🔗 Testing page integrations...")
    
    integrations = [
        ("web-ui/frontend/src/app/cinematography/page.tsx", ["EmotionRadar", "EmotionTimeline"]),
        ("web-ui/frontend/src/app/process/page.tsx", ["SystemPerformanceDashboard"]),
        ("web-ui/frontend/src/app/page.tsx", ["EmotionHeatmap"]),
        ("web-ui/frontend/src/components/Navigation.tsx", ["Visualizations"])
    ]
    
    all_good = True
    for page_path, required_components in integrations:
        path = Path(page_path)
        if not path.exists():
            print(f"❌ Page {page_path} missing")
            all_good = False
            continue
        
        content = path.read_text()
        missing = []
        for component in required_components:
            if component not in content:
                missing.append(component)
        
        if missing:
            print(f"⚠️  Page {page_path} missing components: {missing}")
            all_good = False
        else:
            print(f"✅ Page {page_path} has required components")
    
    return all_good

def test_dependencies():
    """Test that required dependencies are installed"""
    print("📦 Testing dependencies...")
    
    package_json_path = Path("web-ui/frontend/package.json")
    if not package_json_path.exists():
        print("❌ package.json missing")
        return False
    
    content = package_json_path.read_text()
    package_data = json.loads(content)
    
    required_deps = [
        "d3",
        "@types/d3",
        "html2canvas",
        "react-use"
    ]
    
    missing_deps = []
    for dep in required_deps:
        if dep not in package_data.get("dependencies", {}) and dep not in package_data.get("devDependencies", {}):
            missing_deps.append(dep)
    
    if missing_deps:
        print(f"❌ Missing dependencies: {missing_deps}")
        return False
    else:
        print("✅ All required dependencies present")
        return True

def main():
    """Run all visualization integration tests"""
    print("🧪 Running Visualization Integration Tests\n")
    
    tests = [
        ("Dependencies", test_dependencies),
        ("Components Exist", test_visualization_components),
        ("Visualizations Page", test_visualization_page),
        ("Page Integrations", test_page_integrations),
        ("Frontend Build", test_frontend_build),
        ("Frontend Dev Server", test_frontend_dev_server)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Visualizations are ready for use.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    exit(main())