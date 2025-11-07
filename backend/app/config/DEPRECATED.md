# DEPRECATED - Use shared/config/ instead

This directory is deprecated and no longer used.
All configuration files have been moved to the shared/config/ directory
to support the forked architecture.

## Migration Summary:

- backend/app/config/ → shared/config/
- All backend modules now load configuration from shared/config/
- Path resolution uses relative paths from module locations to shared/config/

## Files that were migrated:

- cinematography_rules.json → shared/config/cinematography_rules.json
- logging_config.json → shared/config/logging_config.json  
- settings.json → shared/config/settings.json
- shot_purpose_profiles.json → shared/config/shot_purpose_profiles.json
- transform_presets.json → shared/config/transform_presets.json

## Updated modules:

- app/cli.py
- app/cinematography/*.py
- app/core/*.py
- app/batch_processor.py
- scripts/*.py
- tests/*.py

The shared resources implementation is now complete and functional.