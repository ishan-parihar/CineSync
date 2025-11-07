"""
Monitoring API endpoints for system performance and health checks
"""

from typing import Dict, Any

from ..responses import api_response_wrapper
from ...services.system_monitoring import SystemMonitoringService


class MonitoringAPI:
    """API endpoints for system monitoring and health checks"""
    
    def __init__(self, system_service: SystemMonitoringService):
        self.system_service = system_service
    
    @api_response_wrapper
    def get_system_info(self) -> Dict[str, Any]:
        """Get basic system information and status"""
        return self.system_service.get_system_info()
    
    @api_response_wrapper
    def get_system_performance(self) -> Dict[str, Any]:
        """Get comprehensive system performance metrics"""
        return self.system_service.get_system_performance()
    
    @api_response_wrapper
    def health_check(self) -> Dict[str, Any]:
        """Health check endpoint"""
        from datetime import datetime
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}