# Core modules
# Cinematography modules - these are imported from the top-level cinematography module
from ..cinematography.decision_engine import (
    CinematographicDecisionEngine,
    DecisionEngine,
)
from ..cinematography.grammar_machine import GrammarMachine
from ..cinematography.psycho_mapper import PsychoCinematicMapper, PsychoMapper
from ..cinematography.tension_engine import TensionEngine
from .content_orchestrator import ContentOrchestrator
from .emotion_analyzer import EmotionAnalyzer
from .profile_manager import ProfileManager
from .video_compositor_v2 import VideoCompositorV2

# Additional modules (imported safely)
try:
    from .lip_sync_generator import LipSyncGenerator
except ImportError:
    pass

try:
    from .preset_manager import PresetManager
except ImportError:
    pass
