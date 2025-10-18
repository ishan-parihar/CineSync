from .profile_manager import ProfileManager
from .emotion_analyzer import EmotionAnalyzer
from .content_orchestrator import ContentOrchestrator
from .video_compositor_v2 import VideoCompositorV2

# Import cinematography modules
from .cinematography.decision_engine import DecisionEngine
from .cinematography.grammar_machine import GrammarMachine
from .cinematography.psycho_mapper import PsychoCinematicMapper
from .cinematography.tension_engine import TensionEngine

# Re-export the old modules for backward compatibility if needed
from .lip_sync_generator import LipSyncGenerator
from .preset_manager import PresetManager
