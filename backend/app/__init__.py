"""
LipSync Automation - Psycho-cinematic automation system for lip-sync video generation
"""

__version__ = "2.0.0"
__author__ = "Ishan Lagesh"

# Expose main modules at package level
from . import cinematography, config, core, presets, profiles, utils

# Main classes to expose
from .core.content_orchestrator import ContentOrchestrator
