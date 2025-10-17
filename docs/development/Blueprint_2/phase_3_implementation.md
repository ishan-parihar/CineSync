# LipSyncAutomation v2.0 - Phase 3: Enhanced Video Composition & Integration

## Document Control

**Project:** LipSyncAutomation System Upgrade to Emotion-Aware Multi-Angle Video Generation  
**Version:** 2.0.0  
**Date:** October 18, 2025  
**Status:** Implementation Ready  
**Classification:** Internal Development  

## Phase 3 Overview

**Duration:** 2-3 weeks  
**Team:** 3-4 developers  
**Dependencies:** Phase 1 & 2 complete

### Phase Objectives

#### Primary Goals
1. Implement VideoCompositorV2 with multi-scene support
2. Build frame sequence generator merging phonemes + emotions + angles
3. Create transition effects system (dissolve, fade, wipe)
4. Integrate ContentOrchestrator coordinating full pipeline
5. Implement progress tracking and error recovery

#### Deliverables
- [ ] VideoCompositorV2 with FFmpeg transition support
- [ ] Frame sequence builder combining all data streams
- [ ] ContentOrchestrator master pipeline
- [ ] Progress tracking system
- [ ] Error recovery mechanisms
- [ ] Integration tests for complete pipeline
- [ ] Performance benchmarks

### FFmpeg Transition Techniques

#### Transition Filter Syntax

```bash
# Cut (instant)
# No filter needed, concatenate directly

# Dissolve (crossfade)
[0:v][1:v]xfade=transition=dissolve:duration=0.3:offset=3.2[video]

# Fade (fade out then fade in)
[0:v][1:v]xfade=transition=fade:duration=0.5:offset=7.3[video]

# Wipe (directional wipe)
[0:v][1:v]xfade=transition=wipeleft:duration=0.4:offset=5.0[video]

# Slide
[0:v][1:v]xfade=transition=slideleft:duration=0.3:offset=4.5[video]
```

#### Complete Multi-Scene Filter Graph

```python
def build_multi_scene_filter(scenes: List[Dict]) -> str:
    """
    Build FFmpeg filter complex for multi-scene composition.
    
    Example for 3 scenes with transitions:
    
    [0:v]trim=0:3.5,setpts=PTS-STARTPTS[v0];
    [1:v]trim=3.5:7.8,setpts=PTS-STARTPTS[v1];
    [2:v]trim=7.8:12.0,setpts=PTS-STARTPTS[v2];
    [v0][v1]xfade=transition=dissolve:duration=0.3:offset=3.2[vt1];
    [vt1][v2]xfade=transition=fade:duration=0.5:offset=7.3[video]
    """
    pass
```

### Implementation

#### ContentOrchestrator

**File:** `src/core/content_orchestrator.py`

```python
"""
ContentOrchestrator: Master pipeline coordinator.

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, List, Optional
import logging
from pathlib import Path
from .emotion_analyzer import EmotionAnalyzer
from .cinematography.decision_engine import CinematographicDecisionEngine
from .profile_manager import ProfileManager
from .lip_sync_generator import LipSyncGenerator
from .video_compositor_v2 import VideoCompositorV2

logger = logging.getLogger(__name__)


class ContentOrchestrator:
    """
    Master orchestrator coordinating complete content generation pipeline.
    
    Pipeline Stages:
    1. Emotion Analysis
    2. Cinematic Direction
    3. Lip Sync Generation
    4. Frame Sequence Building
    5. Video Composition
    """
    
    def __init__(self, config: Dict):
        """Initialize orchestrator with all components"""
        self.config = config
        
        # Initialize components
        self.emotion_analyzer = EmotionAnalyzer(config)
        self.cinematography = CinematographicDecisionEngine(config)
        self.profile_manager = ProfileManager(config)
        self.lip_sync_generator = LipSyncGenerator(config)
        self.compositor = VideoCompositorV2(config)
        
        logger.info("ContentOrchestrator initialized")
    
    def generate_content(self,
                         audio_path: str,
                         profile_name: str,
                         script_context: Optional[str] = None,
                         output_path: Optional[str] = None,
                         progress_callback: Optional[callable] = None) -> Dict:
        """
        Complete end-to-end content generation.
        
        Args:
            audio_path: Path to input audio file
            profile_name: Character profile to use
            script_context: Optional narrative context
            output_path: Output video path (auto-generated if None)
            progress_callback: Optional callback(stage, progress) for UI updates
        
        Returns:
            Generation report with statistics and paths
        """
        logger.info(f"Starting content generation: {audio_path}")
        
        try:
            # Stage 1: Emotion Analysis (20%)
            if progress_callback:
                progress_callback("emotion_analysis", 0.0)
            
            emotion_data = self.emotion_analyzer.analyze_audio(audio_path)
            
            if progress_callback:
                progress_callback("emotion_analysis", 1.0)
            
            # Stage 2: Cinematic Direction (40%)
            if progress_callback:
                progress_callback("cinematography", 0.0)
            
            shot_sequence = self.cinematography.generate_shot_sequence(
                emotion_segments=emotion_data['emotion_segments'],
                audio_duration=emotion_data['metadata']['duration']
            )
            
            if progress_callback:
                progress_callback("cinematography", 1.0)
            
            # Stage 3: Lip Sync Generation (60%)
            if progress_callback:
                progress_callback("lip_sync", 0.0)
            
            phoneme_data = self.lip_sync_generator.generate_phonemes(audio_path)
            
            if progress_callback:
                progress_callback("lip_sync", 1.0)
            
            # Stage 4: Frame Sequence Building (80%)
            if progress_callback:
                progress_callback("frame_building", 0.0)
            
            frame_sequences = self._build_frame_sequences(
                phoneme_data=phoneme_data,
                shot_sequence=shot_sequence,
                emotion_data=emotion_data,
                profile_name=profile_name
            )
            
            if progress_callback:
                progress_callback("frame_building", 1.0)
            
            # Stage 5: Video Composition (100%)
            if progress_callback:
                progress_callback("composition", 0.0)
            
            if output_path is None:
                output_path = self._generate_output_path(audio_path)
            
            success = self.compositor.compose_multi_angle_video(
                audio_path=audio_path,
                shot_sequence=shot_sequence,
                frame_sequences=frame_sequences,
                output_path=output_path
            )
            
            if progress_callback:
                progress_callback("composition", 1.0)
            
            # Build report
            report = {
                'success': success,
                'output_path': output_path,
                'statistics': {
                    'emotion_segments': len(emotion_data['emotion_segments']),
                    'scenes': len(shot_sequence),
                    'total_duration': emotion_data['metadata']['duration'],
                    'dominant_emotion': emotion_data['overall_sentiment']['dominant_emotion'],
                    'profile_used': profile_name
                }
            }
            
            logger.info(f"Content generation complete: {output_path}")
            return report
        
        except Exception as e:
            logger.error(f"Content generation failed: {e}", exc_info=True)
            raise
    
    def _build_frame_sequences(self,
                                phoneme_data: Dict,
                                shot_sequence: List[Dict],
                                emotion_data: Dict,
                                profile_name: str) -> List[Dict]:
        """
        Merge phoneme, emotion, and angle data into frame-by-frame sequences.
        
        Returns:
            List of frame sequences, one per shot
        """
        frame_sequences = []
        
        for shot in shot_sequence:
            # Find corresponding emotion segment
            emotion_segment = self._find_emotion_segment(
                emotion_data['emotion_segments'],
                shot['emotion_segment_ref']
            )
            
            # Extract phoneme cues for this time range
            phoneme_cues = self._extract_phoneme_cues(
                phoneme_data,
                shot['start_time'],
                shot['end_time']
            )
            
            # Build frame-by-frame sequence
            frames = []
            fps = self.config.get('video_composition', {}).get('fps', 30)
            duration = shot['end_time'] - shot['start_time']
            total_frames = int(duration * fps)
            
            for frame_num in range(total_frames):
                frame_time = shot['start_time'] + (frame_num / fps)
                
                # Get viseme at this frame time
                viseme = self._get_viseme_at_time(phoneme_cues, frame_time)
                
                # Get viseme image path
                viseme_path = self.profile_manager.get_viseme_path(
                    profile_name=profile_name,
                    angle=shot['distance'],
                    emotion=shot['emotion'],
                    viseme=viseme
                )
                
                frames.append({
                    'frame_number': frame_num,
                    'time': frame_time,
                    'viseme': viseme,
                    'image_path': str(viseme_path)
                })
            
            frame_sequences.append({
                'scene_id': shot['scene_id'],
                'start_time': shot['start_time'],
                'end_time': shot['end_time'],
                'angle': shot['distance'],
                'emotion': shot['emotion'],
                'transition': shot.get('transition', {'type': 'cut', 'duration': 0.0}),
                'frames': frames
            })
        
        return frame_sequences
    
    def _find_emotion_segment(self, segments: List[Dict], segment_id: str) -> Dict:
        """Find emotion segment by ID"""
        for segment in segments:
            if segment['segment_id'] == segment_id:
                return segment
        raise ValueError(f"Emotion segment not found: {segment_id}")
    
    def _extract_phoneme_cues(self, phoneme_data: Dict, 
                               start_time: float, end_time: float) -> List[Dict]:
        """Extract phoneme cues within time range"""
        cues = []
        for cue in phoneme_data.get('mouthCues', []):
            cue_start = cue['start']
            cue_end = cue['end']
            
            # Check if cue overlaps with time range
            if cue_start < end_time and cue_end > start_time:
                cues.append(cue)
        
        return cues
    
    def _get_viseme_at_time(self, phoneme_cues: List[Dict], time: float) -> str:
        """Get viseme at specific time"""
        for cue in phoneme_cues:
            if cue['start'] <= time < cue['end']:
                return cue['value']
        
        # Default to X (rest position)
        return 'X'
    
    def _generate_output_path(self, audio_path: str) -> str:
        """Generate output path from input audio path"""
        audio_file = Path(audio_path)
        output_dir = Path(self.config.get('output_directory', './output'))
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_name = f"{audio_file.stem}_lipsync.mp4"
        return str(output_dir / output_name)
```

### VideoCompositorV2 Implementation

The VideoCompositorV2 handles:
- FFmpeg filter graph construction for multi-scene composition
- Scene-by-scene rendering with transition effects
- Audio stream preservation across all scenes
- Support for xfade transitions (dissolve, fade, wipe, slide)
- Hardware acceleration when available

### Integration Testing

#### End-to-End Pipeline Test

**File:** `tests/integration/test_full_pipeline.py`

```python
import pytest
from src.core.content_orchestrator import ContentOrchestrator
import json

def test_complete_pipeline():
    """Test complete end-to-end pipeline"""
    # Load configuration
    with open('config/settings.json', 'r') as f:
        config = json.load(f)
    
    # Initialize orchestrator
    orchestrator = ContentOrchestrator(config)
    
    # Test with sample audio
    result = orchestrator.generate_content(
        audio_path='tests/data/sample_audio.wav',
        profile_name='test_character',
        output_path='tests/output/test_video.mp4'
    )
    
    assert result['success'] == True
    assert result['statistics']['emotion_segments'] > 0
    assert result['statistics']['scenes'] > 0
```

### Performance Requirements

- **Target Processing Time**: <2 seconds per minute of audio
- **Memory Usage**: <500MB for 5-minute audio processing
- **Disk I/O**: Efficient caching to minimize repeated asset loading
- **Parallel Processing**: Support for concurrent processing of multiple segments

### Error Handling and Recovery

#### Robust Error Recovery

```python
def handle_pipeline_error(error_type: str, context: Dict) -> Dict:
    """
    Handle different types of pipeline errors with appropriate recovery.
    
    Error Types:
    - emotion_analysis_failed: Use default emotion mapping
    - cinematography_error: Use basic shot selection
    - profile_missing_assets: Use fallback assets or default emotion
    - composition_failed: Retry with simplified settings
    """
    recovery_strategies = {
        'emotion_analysis_failed': {
            'action': 'use_default_emotions',
            'fallback': generate_default_emotion_data(context['audio_path'])
        },
        'cinematography_error': {
            'action': 'use_basic_shots',
            'fallback': generate_basic_shot_sequence(context['emotion_data'])
        },
        'profile_missing_assets': {
            'action': 'use_fallback_assets',
            'fallback': find_closest_available_viseme(context['requested_asset'])
        },
        'composition_failed': {
            'action': 'simplify_and_retry',
            'fallback': retry_with_simplified_settings(context['composition_params'])
        }
    }
    
    return recovery_strategies.get(error_type, {'action': 'abort', 'fallback': None})
```

### Phase 3 Acceptance Criteria

#### Functionality Requirements
- [ ] ContentOrchestrator successfully coordinates all pipeline stages
- [ ] VideoCompositorV2 correctly applies transitions between scenes
- [ ] Frame sequence builder accurately merges phoneme and emotion data
- [ ] Progress tracking provides accurate feedback during generation
- [ ] Error recovery mechanisms handle common failure scenarios

#### Performance Requirements
- [ ] End-to-end processing completes within target time limits
- [ ] Memory usage remains within acceptable bounds
- [ ] Disk I/O operations are optimized with caching

#### Testing Requirements
- [ ] Integration tests cover complete pipeline scenarios
- [ ] Error recovery tests validate fallback mechanisms
- [ ] Performance benchmarks meet established targets

### Development Timeline

#### Week 1: ContentOrchestrator Implementation
- Days 1-2: Pipeline coordination logic
- Days 3-4: Progress tracking and error handling
- Day 5: Integration with existing components

#### Week 2: VideoCompositorV2 Implementation
- Days 1-2: FFmpeg filter graph construction
- Days 3-4: Transition effects implementation
- Day 5: Performance optimization

#### Week 3: Integration and Testing
- Days 1-2: End-to-end integration testing
- Days 3-4: Performance benchmarking and optimization
- Day 5: Documentation and code review

---
**End of Phase 3 Documentation**