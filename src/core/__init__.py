# Core modules
from .profile_manager import ProfileManager
from .emotion_analyzer import EmotionAnalyzer
from .content_orchestrator import ContentOrchestrator
from .video_compositor_v2 import VideoCompositorV2

# Cinematography modules
from .cinematography.decision_engine import CinematographicDecisionEngine, DecisionEngine
from .cinematography.grammar_machine import GrammarMachine
from .cinematography.psycho_mapper import PsychoCinematicMapper, PsychoMapper
from .cinematography.tension_engine import TensionEngine

# Additional modules (imported safely)
try:
    from .lip_sync_generator import LipSyncGenerator
except ImportError:
    pass

try:
    from .preset_manager import PresetManager
except ImportError:
    pass
