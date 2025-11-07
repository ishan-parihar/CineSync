"""
System monitoring service for performance metrics and health checks
"""

import os
import psutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

from .base import BaseService
from ..utils.validators import validate_dependencies


class SystemMonitoringService(BaseService):
    """Service for system monitoring and performance metrics"""
    
    def _validate_config(self) -> None:
        """Validate system monitoring configuration"""
        required_keys = ["system"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get basic system information and status"""
        from ..core.profile_manager import ProfileManager
        
        profile_manager = ProfileManager(self.config)
        
        # Validate dependencies
        try:
            dependencies_ok = validate_dependencies(
                self.config["system"]["rhubarb_path"], 
                self.config["system"]["ffmpeg_path"]
            )
        except Exception:
            dependencies_ok = False
        
        return {
            "dependencies": {
                "ffmpeg": dependencies_ok,
                "rhubarb": dependencies_ok,
            },
            "config": {
                "profile_directory": self.config["system"]["profiles_directory"],
                "cache_directory": self.config["system"]["cache_directory"],
                "temp_directory": self.config["system"]["temp_directory"],
            },
            "profiles": {
                "count": len(profile_manager.list_profiles()),
                "profiles": profile_manager.list_profiles(),
            },
        }
    
    def get_system_performance(self) -> Dict[str, Any]:
        """Get comprehensive system performance metrics"""
        # Resource Utilization Metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_count_physical = psutil.cpu_count(logical=False)
        cpu_freq = psutil.cpu_freq()
        load_avg = os.getloadavg() if hasattr(os, "getloadavg") else None
        
        # Memory Metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk Metrics
        disk_partitions = []
        for partition in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_partitions.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": (usage.used / usage.total) * 100,
                })
            except PermissionError:
                continue
        
        # Network Metrics
        network_io = psutil.net_io_counters()
        network_connections = len(psutil.net_connections())
        
        # Dependency Validation
        dependencies_healthy = True
        dependency_status = {}
        
        try:
            ffmpeg_check = validate_dependencies(
                self.config["system"]["rhubarb_path"], 
                self.config["system"]["ffmpeg_path"]
            )
            dependency_status["ffmpeg"] = ffmpeg_check
            dependency_status["rhubarb"] = ffmpeg_check
        except Exception:
            dependency_status["ffmpeg"] = False
            dependency_status["rhubarb"] = False
            dependencies_healthy = False
        
        # Cache Status Analysis
        cache_status = {
            "healthy": True,
            "size_mb": 0,
            "efficiency": 0.85,
            "last_cleanup": None,
        }
        
        cache_dir = self.project_root / self.config["system"]["cache_directory"]
        if cache_dir.exists():
            try:
                cache_size = sum(
                    f.stat().st_size for f in cache_dir.rglob("*") if f.is_file()
                )
                cache_status["size_mb"] = cache_size / (1024 * 1024)
                if cache_size > 1024 * 1024 * 1024:  # >1GB
                    cache_status["healthy"] = False
            except PermissionError:
                cache_status["healthy"] = False
        
        # Directory Health Checks
        directory_health = {}
        critical_dirs = ["profiles_directory", "cache_directory", "temp_directory"]
        
        for dir_key in critical_dirs:
            dir_path = self.project_root / self.config["system"][dir_key]
            dir_healthy = dir_path.exists() and dir_path.is_dir()
            
            if dir_healthy:
                try:
                    test_file = dir_path / ".health_check"
                    test_file.touch()
                    test_file.unlink()
                except (PermissionError, OSError):
                    dir_healthy = False
            
            directory_health[dir_key] = {
                "path": str(dir_path),
                "exists": dir_path.exists(),
                "writable": dir_healthy,
                "size_mb": (
                    sum(f.stat().st_size for f in dir_path.rglob("*") if f.is_file())
                    / (1024 * 1024)
                    if dir_path.exists() else 0
                ),
            }
        
        # System Resource Health
        resource_health = {
            "cpu": {
                "healthy": cpu_percent < 90,
                "status": (
                    "optimal" if cpu_percent < 70 
                    else "warning" if cpu_percent < 90 else "critical"
                ),
                "utilization": cpu_percent,
            },
            "memory": {
                "healthy": memory.percent < 85,
                "status": (
                    "optimal" if memory.percent < 70
                    else "warning" if memory.percent < 85 else "critical"
                ),
                "utilization": memory.percent,
            },
            "disk": {
                "healthy": all(part["percent"] < 90 for part in disk_partitions),
                "status": (
                    "optimal" if all(part["percent"] < 70 for part in disk_partitions)
                    else (
                        "warning" if all(part["percent"] < 90 for part in disk_partitions)
                        else "critical"
                    )
                ),
                "partitions": disk_partitions,
            },
        }
        
        # Overall System Health Score
        health_factors = [
            dependencies_healthy,
            cache_status["healthy"],
            all(dir_info["writable"] for dir_info in directory_health.values()),
            resource_health["cpu"]["healthy"],
            resource_health["memory"]["healthy"],
            resource_health["disk"]["healthy"],
        ]
        
        overall_health_score = sum(health_factors) / len(health_factors)
        overall_status = (
            "healthy" if overall_health_score >= 0.8
            else "degraded" if overall_health_score >= 0.6 else "unhealthy"
        )
        
        # System Uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        
        # Process-specific metrics
        current_process = psutil.Process()
        process_memory = current_process.memory_info()
        process_cpu = current_process.cpu_percent()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "system_uptime": {
                "boot_time": boot_time.isoformat(),
                "uptime_seconds": uptime.total_seconds(),
                "uptime_human": str(uptime).split(".")[0],
            },
            "resource_utilization": {
                "cpu": {
                    "utilization_percent": cpu_percent,
                    "logical_cores": cpu_count_logical,
                    "physical_cores": cpu_count_physical,
                    "frequency_mhz": cpu_freq.current if cpu_freq else None,
                    "load_average": (
                        {"1min": load_avg[0], "5min": load_avg[1], "15min": load_avg[2]}
                        if load_avg else None
                    ),
                },
                "memory": {
                    "total_gb": memory.total / (1024**3),
                    "available_gb": memory.available / (1024**3),
                    "used_gb": memory.used / (1024**3),
                    "utilization_percent": memory.percent,
                    "swap": {
                        "total_gb": swap.total / (1024**3),
                        "used_gb": swap.used / (1024**3),
                        "utilization_percent": swap.percent,
                    },
                },
                "disk": {
                    "partitions": disk_partitions,
                    "summary": {
                        "total_partitions": len(disk_partitions),
                        "healthy_partitions": sum(
                            1 for p in disk_partitions if p["percent"] < 90
                        ),
                        "critical_partitions": sum(
                            1 for p in disk_partitions if p["percent"] >= 90
                        ),
                    },
                },
                "network": {
                    "bytes_sent": network_io.bytes_sent,
                    "bytes_recv": network_io.bytes_recv,
                    "packets_sent": network_io.packets_sent,
                    "packets_recv": network_io.packets_recv,
                    "active_connections": network_connections,
                },
                "process": {
                    "pid": current_process.pid,
                    "memory_rss_mb": process_memory.rss / (1024**2),
                    "memory_vms_mb": process_memory.vms / (1024**2),
                    "cpu_percent": process_cpu,
                    "threads": current_process.num_threads(),
                    "file_descriptors": (
                        current_process.num_fds()
                        if hasattr(current_process, "num_fds") else None
                    ),
                },
            },
            "system_health": {
                "overall_status": overall_status,
                "health_score": overall_health_score,
                "dependencies": dependency_status,
                "cache": cache_status,
                "directories": directory_health,
                "resources": resource_health,
            },
            "recommendations": self._generate_performance_recommendations(
                cpu_percent, memory.percent, disk_partitions, cache_status
            ),
            "alerts": self._generate_system_alerts(
                cpu_percent, memory.percent, disk_partitions, dependencies_healthy, overall_status
            ),
        }
    
    def _generate_performance_recommendations(
        self, cpu_percent: float, memory_percent: float, 
        disk_partitions: List[Dict], cache_status: Dict
    ) -> List[Dict]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        if cpu_percent > 85:
            recommendations.append({
                "type": "cpu",
                "priority": "high",
                "message": "High CPU utilization detected",
                "suggestion": "Consider reducing parallel workers or upgrading CPU resources",
            })
        elif cpu_percent > 70:
            recommendations.append({
                "type": "cpu",
                "priority": "medium",
                "message": "Moderate CPU utilization",
                "suggestion": "Monitor for potential performance bottlenecks",
            })
        
        if memory_percent > 85:
            recommendations.append({
                "type": "memory",
                "priority": "high",
                "message": "High memory usage detected",
                "suggestion": "Consider adding more RAM or optimizing memory usage",
            })
        
        critical_partitions = [p for p in disk_partitions if p["percent"] > 90]
        if critical_partitions:
            recommendations.append({
                "type": "disk",
                "priority": "critical",
                "message": f"{len(critical_partitions)} disk partition(s) nearly full",
                "suggestion": "Immediate cleanup required. Consider disk expansion.",
            })
        
        if not cache_status.get("healthy", True):
            recommendations.append({
                "type": "cache",
                "priority": "medium",
                "message": "Cache system needs attention",
                "suggestion": "Run cache cleanup and verify cache configuration",
            })
        
        return recommendations
    
    def _generate_system_alerts(
        self, cpu_percent: float, memory_percent: float,
        disk_partitions: List[Dict], dependencies_healthy: bool, overall_status: str
    ) -> List[Dict]:
        """Generate system alerts based on critical thresholds"""
        alerts = []
        
        if cpu_percent > 95:
            alerts.append({
                "level": "critical",
                "type": "cpu",
                "message": f"Critical CPU utilization: {cpu_percent:.1f}%",
                "action_required": "immediate",
            })
        
        if memory_percent > 95:
            alerts.append({
                "level": "critical",
                "type": "memory",
                "message": f"Critical memory usage: {memory_percent:.1f}%",
                "action_required": "immediate",
            })
        
        if any(p["percent"] > 95 for p in disk_partitions):
            critical_disks = [p["mountpoint"] for p in disk_partitions if p["percent"] > 95]
            alerts.append({
                "level": "critical",
                "type": "disk",
                "message": f"Critical disk space on: {', '.join(critical_disks)}",
                "action_required": "immediate",
            })
        
        if not dependencies_healthy:
            alerts.append({
                "level": "critical",
                "type": "dependencies",
                "message": "System dependencies not functioning",
                "action_required": "immediate",
            })
        
        if overall_status == "unhealthy":
            alerts.append({
                "level": "warning",
                "type": "system",
                "message": "Overall system health is degraded",
                "action_required": "investigate",
            })
        
        return alerts