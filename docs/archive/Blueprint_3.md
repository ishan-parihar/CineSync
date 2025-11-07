# Audio2Face-3D Microservice Implementation Manual
## For WSL Arch Linux Environment

***

## Table of Contents

1. System Requirements
2. Prerequisites Setup
3. WSL GPU Configuration
4. Arch Linux Package Installation
5. NGC Account & API Key Setup
6. Docker & NVIDIA Container Toolkit
7. Audio2Face-3D Deployment
8. Configuration & Customization
9. Client Application Setup
10. API Usage & Examples
11. Troubleshooting
12. Advanced Topics

***

## 1. System Requirements

### Hardware Requirements
- **GPU**: NVIDIA RTX 2060 Super (8GB VRAM) ✓
- **Architecture**: Turing (Pascal or newer required) ✓
- **RAM**: 16GB+ recommended
- **Storage**: 20GB+ free space for Docker images

### Software Requirements
- **Windows**: Windows 11 or Windows 10 (Build 21H2+)
- **WSL**: WSL 2 with latest kernel
- **Linux Distribution**: Arch Linux on WSL ✓
- **NVIDIA Driver**: R535.54+ (Windows host only)
- **CUDA**: 12.1+ (no Linux driver installation needed)

***

## 2. Prerequisites Setup

### 2.1 Windows NVIDIA Driver Installation

Install the **Windows NVIDIA driver only** - this is critical for WSL GPU support.[1][2]

**From Windows PowerShell (Administrator):**

```powershell
# Check current driver version
nvidia-smi

# If driver is older than 535.54, download from:
# https://www.nvidia.com/Download/index.aspx
```

**Important Notes:**
- Only install Windows GPU driver
- **DO NOT** install any Linux GPU driver inside WSL[1]
- The Windows driver is automatically stubbed as `libcuda.so` in WSL[1]

### 2.2 WSL 2 Installation & Update

**From Windows PowerShell (Administrator):**

```powershell
# Install WSL 2
wsl.exe --install

# Update to latest kernel
wsl.exe --update

# Verify WSL version
wsl.exe --version

# List installed distributions
wsl.exe --list --verbose
```

Expected output should show WSL version 2.0.0+ and kernel 5.10.16.3+.[1]

### 2.3 Verify GPU Access in WSL

**Enter your Arch Linux WSL environment:**

```bash
# From Windows
wsl.exe

# Inside WSL - check GPU visibility
nvidia-smi
```

Expected output:[3]
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.xx.xx    Driver Version: 535.xx.xx    CUDA Version: 12.2   |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce ... Off  | 00000000:01:00.0  On |                  N/A |
```

If `nvidia-smi` is not found, verify Windows driver installation.[1]

***

## 3. WSL GPU Configuration

### 3.1 Verify CUDA Stub

```bash
# Check CUDA library stub
ls -la /usr/lib/wsl/lib/libcuda.so*

# Expected output:
# lrwxrwxrwx 1 root root libcuda.so -> libcuda.so.1
# lrwxrwxrwx 1 root root libcuda.so.1 -> libcuda.so.1.1
# -rwxr-xr-x 1 root root libcuda.so.1.1
```

### 3.2 Add CUDA to Library Path

**Edit or create `/etc/ld.so.conf.d/wsl-cuda.conf`:**

```bash
sudo nano /etc/ld.so.conf.d/wsl-cuda.conf
```

Add:
```
/usr/lib/wsl/lib
```

Update library cache:
```bash
sudo ldconfig
```

### 3.3 Environment Variables

**Add to `~/.bashrc` or `~/.zshrc`:**

```bash
# WSL CUDA Configuration
export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH
export PATH=/usr/local/cuda/bin:$PATH

# Optional: Limit GPU memory if needed
export CUDA_VISIBLE_DEVICES=0
```

Apply changes:
```bash
source ~/.bashrc
```

***

## 4. Arch Linux Package Installation

### 4.1 Update System

```bash
sudo pacman -Syu
```

### 4.2 Install CUDA Toolkit (Arch-specific)

Arch Linux provides CUDA through official repositories.[4][5]

```bash
# Install CUDA toolkit (no driver!)
sudo pacman -S cuda cuda-tools

# Install cuDNN for deep learning
sudo pacman -S cudnn

# Install development tools
sudo pacman -S base-devel git wget curl
```

**Important**: The Arch CUDA package includes GCC compatibility. Current CUDA 12.x works with system GCC.[5]

### 4.3 Install Docker

```bash
# Install Docker
sudo pacman -S docker docker-compose

# Enable Docker service
sudo systemctl enable docker.service
sudo systemctl start docker.service

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify Docker installation
docker --version
```

### 4.4 Install Python & Development Tools

```bash
# Install Python 3
sudo pacman -S python python-pip python-virtualenv

# Install additional dependencies
sudo pacman -S gcc make cmake pkg-config

# Install audio libraries
sudo pacman -S ffmpeg portaudio
```

***

## 5. NGC Account & API Key Setup

### 5.1 Create NGC Account

1. Navigate to: https://ngc.nvidia.com/
2. Click **Sign Up** (or **Sign In** if you have an account)
3. Complete registration with email verification[6][7]

### 5.2 Generate API Key

**From NGC Dashboard:**

1. Click your **username** (top right)
2. Select **Setup**
3. Click **Get API Key**[8][6]
4. Click **Generate API Key**
5. Click **Confirm** (invalidates previous keys)
6. **Copy and save your API key immediately** (shown only once)[6]

**Example API Key format:**
```
ZnZqYXRhbGFzamRmYWxza2RqZmFsc2tkamZhbHNrZGpmYWxza2RqZmFsc2tkamY=
```

### 5.3 Store API Key Securely

```bash
# Create credentials file
mkdir -p ~/.ngc
nano ~/.ngc/api_key

# Paste your API key, save and exit

# Secure the file
chmod 600 ~/.ngc/api_key
```

**Add to `~/.bashrc`:**

```bash
# NGC API Key
export NGC_API_KEY=$(cat ~/.ngc/api_key 2>/dev/null)
```

***

## 6. Docker & NVIDIA Container Toolkit

### 6.1 Install NVIDIA Container Toolkit

The NVIDIA Container Toolkit enables GPU access in Docker containers.[9][3]

```bash
# Add NVIDIA GPG key
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Add repository (use Ubuntu repo for compatibility)
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
```

**Install via AUR (Alternative for Arch):**

```bash
# Install yay if not already installed
sudo pacman -S --needed git base-devel
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
cd ..

# Install NVIDIA Container Toolkit
yay -S nvidia-container-toolkit
```

### 6.2 Configure Docker Runtime

```bash
# Configure NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker

# Restart Docker service
sudo systemctl restart docker
```

### 6.3 Test GPU Access in Docker

```bash
# Test CUDA container
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

Expected output should show your RTX 2060 Super.[3]

**If you encounter errors**, add the environment variable workaround:[10]

```bash
docker run --rm --gpus all --env NVIDIA_DISABLE_REQUIRE=1 nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### 6.4 Login to NGC Container Registry

```bash
# Login to NGC
docker login nvcr.io

# Username: $oauthtoken
# Password: <paste your NGC API key>
```

**For automated scripts, use:**

```bash
echo $NGC_API_KEY | docker login nvcr.io -u '$oauthtoken' --password-stdin
```

***

## 7. Audio2Face-3D Deployment

### 7.1 Clone Audio2Face-3D Samples

```bash
# Clone repository
cd ~
git clone https://github.com/NVIDIA/Audio2Face-3D-Samples.git
cd Audio2Face-3D-Samples

# Checkout specific version (v1.3 is latest stable)
git checkout tags/v1.3
```

Repository structure:[11][12]
```
Audio2Face-3D-Samples/
├── microservices/
│   └── audio_2_face_microservice/
│       └── quick-start/
│           ├── docker-compose.yml
│           └── config/
├── scripts/
│   └── audio2face_3d_microservices_interaction_app/
├── proto/
└── example_audio/
```

### 7.2 Configure Microservice

**Navigate to deployment directory:**

```bash
cd microservices/audio_2_face_microservice/quick-start
```

**Edit `docker-compose.yml`:**

```bash
nano docker-compose.yml
```

**Key configuration parameters:**[13][11]

```yaml
version: '3.8'

services:
  audio2face-3d:
    image: nvcr.io/nvidia/ace/audio2face-3d:1.3.0
    container_name: audio2face_microservice
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=0  # GPU index
      - CUDA_VISIBLE_DEVICES=0
    ports:
      - "52000:50000"  # gRPC input port (host:container)
      - "52001:51000"  # gRPC output port
    volumes:
      - ./config:/config
      - ./logs:/logs
      - ./models:/models  # Optional: custom models
    command: >
      --config_path=/config/a2f_config.yaml
      --grpc_port=50000
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### 7.3 Configure a2f_config.yaml

**Edit configuration file:**

```bash
nano config/a2f_config.yaml
```

**Optimized configuration for RTX 2060 Super (8GB VRAM):**[14]

```yaml
common:
  # Number of concurrent audio streams (adjust based on use case)
  # RTX 2060 Super can handle 3-5 streams comfortably
  stream_number: 5
  
  # Add silence padding after audio
  add-silence-padding-after-audio: false
  
  # Queue sizes for processing pipeline
  queue-size-after-streammux: 1
  queue-size-after-a2e: 1
  queue-size-after-a2f: 300
  
  # Maximum UUID length
  max-len-uuid: 50
  
  # Sample rate constraints
  min-sample-rate: 16000
  max-sample-rate: 144000

grpc_input:
  # Input port (internal container port)
  port: 50000
  
  # Low FPS detection (disconnect faulty clients)
  low-fps: 29
  low-fps-max-duration-second: 7

grpc_output:
  # Output server configuration
  ip: 0.0.0.0
  port: 51000

# Audio2Emotion Configuration
A2E:
  # Enable emotion detection
  enabled: true
  
  # Inference interval (frames between emotion predictions)
  inference-interval: 10
  
  # Model path (internal to container)
  model_path: "/opt/nvidia/a2f_pipeline/a2e_data/data/networks/"
  
  # Emotion post-processing parameters
  emotions:
    # Emotion contrast (spread between values)
    # Range: 0.3-3.0, Default: 1.0
    emotion_contrast: 1.0
    
    # Temporal smoothing coefficient
    # Range: 0.0-1.0, Default: 0.7
    # 0 = no smoothing (jittery)
    # 1 = extreme smoothing (no updates)
    live_blend_coef: 0.7
    
    # Preferred emotion strength vs detected
    # Range: 0.0-1.0, Default: 0.5
    # 0 = only A2E output
    # 1 = only preferred emotions
    preferred_emotion_strength: 0.5
    
    # Enable preferred emotion blending
    enable_preferred_emotion: true
    
    # Global emotion strength multiplier
    # Range: 0.0-1.0, Default: 0.6
    # 0 = neutral only
    # 1 = full emotion intensity
    emotion_strength: 0.6
    
    # Maximum simultaneous emotions
    # Range: 1-6, Default: 3
    max_emotions: 3

# Audio2Face Configuration
A2F:
  # Model selection (internal path)
  # Available models: claire_v1.3, mark_v2.3, james_v2.3
  model_path: "/opt/nvidia/a2f_pipeline/a2f_data/data/networks/claire_v1.3"
  
  # Blendshape weight multipliers (52 ARKit blendshapes)
  api:
    bs_weight_multipliers: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 
                             1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 
                             1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 
                             1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 
                             1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 
                             1.0, 1.0]
```

### 7.4 Launch Microservice

```bash
# Start with Docker Compose
docker compose up -d

# View logs
docker compose logs -f

# Check container status
docker ps

# Stop service
docker compose down
```

**Expected log output:**
```
INFO: Loading Audio2Emotion model...
INFO: Loading Audio2Face model (claire_v1.3)...
INFO: gRPC server listening on 0.0.0.0:50000
INFO: Ready to accept connections (5 streams configured)
```

### 7.5 Verify Deployment

```bash
# Check if ports are exposed
docker port audio2face_microservice

# Expected output:
# 50000/tcp -> 0.0.0.0:52000
# 51000/tcp -> 0.0.0.0:52001
```

***

## 8. Configuration & Customization

### 8.1 Face Parameters

**Supported parameters:**[14]

| Parameter | Min | Max | Default | Description |
|-----------|-----|-----|---------|-------------|
| `skinStrength` | 0.0 | 2.0 | 1.0 | Overall skin motion range |
| `upperFaceStrength` | 0.0 | 2.0 | 1.0 | Upper face motion range |
| `lowerFaceStrength` | 0.0 | 2.0 | 1.0 | Lower face motion range |
| `eyelidOpenOffset` | -1.0 | 1.0 | 0.0 | Eyelid default pose |
| `lipOpenOffset` | -0.2 | 0.2 | 0.0 | Lip default pose |
| `upperFaceSmoothing` | 0.0 | 0.1 | 0.0 | Upper face smoothing |
| `lowerFaceSmoothing` | 0.0 | 0.1 | 0.0 | Lower face smoothing |
| `faceMaskLevel` | 0.0 | 1.0 | 0.5 | Upper/lower face boundary |
| `faceMaskSoftness` | 0.001 | 0.5 | 0.1 | Boundary blend softness |

### 8.2 Audio Format Requirements

**Supported format:**[14]
- **Encoding**: Mono 16-bit PCM
- **Sample Rate**: 16kHz (recommended), 16-144kHz supported
- **Channels**: 1 (mono only)

**Convert audio using FFmpeg:**

```bash
# Convert to compatible format
ffmpeg -i input.mp3 -ar 16000 -ac 1 -acodec pcm_s16le output.wav
```

### 8.3 Blendshape Output

**52 ARKit-compatible blendshapes generated:**[14]

Facial expressions (animated):
- `browInnerUp`, `browDownLeft`, `browDownRight`
- `eyeBlinkLeft`, `eyeBlinkRight`, `eyeWideLeft`, `eyeWideRight`
- `mouthSmile`, `mouthFrown`, `mouthOpen`, `mouthClose`
- `jawOpen`, `jawForward`, `jawLeft`, `jawRight`
- And 37 more...

Always zero (not animated):[14]
- Eye look directions (8): `EyeLookDown/Up/In/Out` (Left/Right)
- Tongue: `TongueOut`
- Head rotation: `HeadRoll`, `HeadPitch`, `HeadYaw`

**Output frame rate**: Fixed at 30 FPS[14]

### 8.4 Performance Tuning

**For RTX 2060 Super (8GB VRAM):**[14]

| Stream Count | GPU Memory | Expected FPS | Use Case |
|--------------|------------|--------------|----------|
| 1 stream | ~2.2 GB | 300+ | Single avatar |
| 3 streams | ~2.7 GB | 150+ | Multiple avatars |
| 5 streams | ~3.0 GB | 90+ | Production |
| 10 streams | ~4.2 GB | 45+ | High load |

**Optimization tips:**
- Keep stream_number ≤ 5 for smooth 30+ FPS output
- Use FP16 models (default) for better performance
- Monitor GPU memory: `nvidia-smi dmon -s m`

***

## 9. Client Application Setup

### 9.1 Setup Python Environment

```bash
cd ~/Audio2Face-3D-Samples/scripts/audio2face_3d_microservices_interaction_app

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install gRPC client wheel
pip3 install ../../proto/sample_wheel/nvidia_ace-1.2.0-py3-none-any.whl

# Install dependencies
pip3 install -r requirements.txt
```

**`requirements.txt` contents:**
```
grpcio>=1.48.0
protobuf>=3.20.0
numpy>=1.21.0
pyyaml>=6.0
```

### 9.2 Client Script Overview

**Check available commands:**

```bash
python3 a2f_3d.py --help
```

Output:[15]
```
usage: a2f_3d.py [-h] {health_check,run_inference} ...

Sample application to send audio and receive animation data

positional arguments:
  {health_check,run_inference}
    health_check          Check gRPC service health
    run_inference         Send gRPC request and run inference

options:
  -h, --help            show this help message and exit
```

### 9.3 Health Check

```bash
# Check if service is running
python3 a2f_3d.py health_check --url localhost:52000
```

Expected output:
```
Checking health at localhost:52000...
✓ Audio2Face-3D microservice is healthy
Status: SERVING
```

### 9.4 Run Inference

```bash
# Basic inference
python3 a2f_3d.py run_inference \
  ../../example_audio/Mark_neutral.wav \
  config/config_james.yml \
  --url localhost:52000

# With custom output
python3 a2f_3d.py run_inference \
  /path/to/your/audio.wav \
  config/config_james.yml \
  --url localhost:52000 \
  --output ./output_animation.json
```

***

## 10. API Usage & Examples

### 10.1 Configuration File Format

**Create `config/my_avatar.yml`:**

```yaml
# Face parameters
face_params:
  skinStrength: 1.2
  upperFaceStrength: 1.0
  lowerFaceStrength: 1.5
  eyelidOpenOffset: 0.1
  lipOpenOffset: 0.0
  upperFaceSmoothing: 0.02
  lowerFaceSmoothing: 0.03
  faceMaskLevel: 0.5
  faceMaskSoftness: 0.15

# Blendshape weight multipliers (optional)
blendshape_multipliers:
  mouthSmile: 1.5
  mouthFrown: 0.8
  jawOpen: 1.2

# Preferred emotions (optional)
preferred_emotions:
  joy: 0.3
  neutral: 0.7
```

### 10.2 Custom Python Client Example

**Create `custom_client.py`:**

```python
#!/usr/bin/env python3
import grpc
import numpy as np
import yaml
from pathlib import Path
import wave

# Import generated gRPC classes
from nvidia_ace.a2f.v1 import audio2face_pb2
from nvidia_ace.a2f.v1 import audio2face_pb2_grpc

class Audio2FaceClient:
    def __init__(self, server_url="localhost:52000"):
        """Initialize Audio2Face gRPC client"""
        self.channel = grpc.insecure_channel(server_url)
        self.stub = audio2face_pb2_grpc.Audio2FaceStub(self.channel)
        
    def load_audio(self, audio_path):
        """Load WAV file and return PCM data"""
        with wave.open(str(audio_path), 'rb') as wav:
            # Verify format
            assert wav.getnchannels() == 1, "Audio must be mono"
            assert wav.getsampwidth() == 2, "Audio must be 16-bit"
            
            # Read audio data
            audio_data = wav.readframes(wav.getnframes())
            sample_rate = wav.getframerate()
            
            return audio_data, sample_rate
    
    def process_audio(self, audio_path, config_path=None):
        """Send audio and receive blendshapes + emotions"""
        
        # Load audio
        audio_data, sample_rate = self.load_audio(audio_path)
        
        # Load configuration
        face_params = {}
        emotions = {}
        if config_path:
            with open(config_path) as f:
                config = yaml.safe_load(f)
                face_params = config.get('face_params', {})
                emotions = config.get('preferred_emotions', {})
        
        # Create request iterator
        def request_iterator():
            # First message: header
            header = audio2face_pb2.AudioHeader(
                audio_format=audio2face_pb2.AudioFormat.PCM_16,
                samples_per_second=sample_rate,
                num_channels=1
            )
            
            # Face parameters
            face_params_msg = audio2face_pb2.FaceParameters(**face_params)
            
            # Emotions
            emotion_params = audio2face_pb2.EmotionParameters(
                emotions={
                    'joy': emotions.get('joy', 0.0),
                    'anger': emotions.get('anger', 0.0),
                    'sadness': emotions.get('sadness', 0.0),
                    'fear': emotions.get('fear', 0.0),
                    'disgust': emotions.get('disgust', 0.0),
                    'neutral': emotions.get('neutral', 0.0)
                }
            )
            
            # Send header
            yield audio2face_pb2.AudioWithEmotion(
                audio_stream_header=audio2face_pb2.AudioStreamHeader(
                    audio_header=header,
                    face_params=face_params_msg,
                    emotion_params=emotion_params
                )
            )
            
            # Send audio in chunks (1024 bytes)
            chunk_size = 1024
            for i in range(0, len(audio_data), chunk_size):
                chunk = audio_data[i:i+chunk_size]
                yield audio2face_pb2.AudioWithEmotion(
                    audio_buffer=chunk
                )
        
        # Send request and receive response stream
        responses = self.stub.ProcessAudioStream(request_iterator())
        
        # Process responses
        blendshapes_data = []
        emotions_data = []
        
        for response in responses:
            if response.HasField('animation_data'):
                # Extract blendshape values
                blendshapes = {
                    name: value 
                    for name, value in zip(
                        response.animation_data.blendshape_names,
                        response.animation_data.blendshape_values
                    )
                }
                blendshapes_data.append({
                    'time_code': response.animation_data.time_code,
                    'blendshapes': blendshapes
                })
            
            if response.HasField('emotion_data'):
                # Extract emotion values
                emotions_data.append({
                    'time_code': response.emotion_data.time_code,
                    'emotions': dict(response.emotion_data.emotion_values)
                })
        
        return blendshapes_data, emotions_data
    
    def close(self):
        """Close gRPC channel"""
        self.channel.close()


# Example usage
if __name__ == "__main__":
    client = Audio2FaceClient("localhost:52000")
    
    try:
        blendshapes, emotions = client.process_audio(
            audio_path="../../example_audio/Mark_neutral.wav",
            config_path="config/my_avatar.yml"
        )
        
        print(f"Received {len(blendshapes)} blendshape frames")
        print(f"Received {len(emotions)} emotion keyframes")
        
        # Print first frame
        if blendshapes:
            print("\nFirst frame blendshapes:")
            for name, value in list(blendshapes[0]['blendshapes'].items())[:5]:
                print(f"  {name}: {value:.3f}")
        
        if emotions:
            print("\nFirst emotion keyframe:")
            for name, value in emotions[0]['emotions'].items():
                print(f"  {name}: {value:.3f}")
                
    finally:
        client.close()
```

**Run the custom client:**

```bash
chmod +x custom_client.py
python3 custom_client.py
```

### 10.3 Batch Processing Script

**Create `batch_process.py`:**

```python
#!/usr/bin/env python3
import os
import json
from pathlib import Path
from custom_client import Audio2FaceClient

def batch_process(input_dir, output_dir, config_path=None):
    """Process all WAV files in input directory"""
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Initialize client
    client = Audio2FaceClient("localhost:52000")
    
    # Process all WAV files
    audio_files = list(input_path.glob("*.wav"))
    print(f"Found {len(audio_files)} audio files")
    
    for audio_file in audio_files:
        print(f"\nProcessing: {audio_file.name}")
        
        try:
            # Process audio
            blendshapes, emotions = client.process_audio(
                audio_path=str(audio_file),
                config_path=config_path
            )
            
            # Save output
            output_file = output_path / f"{audio_file.stem}_animation.json"
            with open(output_file, 'w') as f:
                json.dump({
                    'audio_file': audio_file.name,
                    'blendshapes': blendshapes,
                    'emotions': emotions
                }, f, indent=2)
            
            print(f"  ✓ Saved to {output_file}")
            print(f"  Frames: {len(blendshapes)}, Emotions: {len(emotions)}")
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    client.close()
    print("\nBatch processing complete!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python3 batch_process.py <input_dir> <output_dir> [config.yml]")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    config = sys.argv[3] if len(sys.argv) > 3 else None
    
    batch_process(input_dir, output_dir, config)
```

**Usage:**

```bash
python3 batch_process.py ./audio_clips ./animations config/my_avatar.yml
```

***

## 11. Troubleshooting

### 11.1 GPU Not Detected in WSL

**Problem**: `nvidia-smi` command not found or returns error

**Solutions:**

1. Verify Windows driver version:
   ```powershell
   # From Windows PowerShell
   nvidia-smi
   ```
   Ensure version ≥ 535.54[1]

2. Check WSL kernel version:
   ```bash
   wsl cat /proc/version
   ```
   Should show kernel ≥ 5.10.16.3[1]

3. Update WSL kernel:
   ```powershell
   wsl --update
   ```

4. Verify CUDA stub exists:
   ```bash
   ls -la /usr/lib/wsl/lib/libcuda.so*
   ```

### 11.2 Docker GPU Access Fails

**Problem**: Container can't access GPU

**Error message**:
```
docker: Error response from daemon: could not select device driver "" with capabilities: [[gpu]]
```

**Solutions:**

1. Verify NVIDIA Container Toolkit:
   ```bash
   nvidia-ctk --version
   ```

2. Configure Docker runtime:
   ```bash
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```

3. Test with workaround flag:[10]
   ```bash
   docker run --rm --gpus all --env NVIDIA_DISABLE_REQUIRE=1 nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
   ```

4. Check Docker daemon config:
   ```bash
   cat /etc/docker/daemon.json
   ```
   Should contain:
   ```json
   {
     "runtimes": {
       "nvidia": {
         "path": "nvidia-container-runtime",
         "runtimeArgs": []
       }
     }
   }
   ```

### 11.3 NGC Authentication Fails

**Problem**: Cannot pull Docker images from nvcr.io

**Solutions:**

1. Verify API key:
   ```bash
   echo $NGC_API_KEY
   ```

2. Re-login to NGC:
   ```bash
   docker logout nvcr.io
   echo $NGC_API_KEY | docker login nvcr.io -u '$oauthtoken' --password-stdin
   ```

3. Ensure username is exactly `$oauthtoken` (with dollar sign)[6]

### 11.4 Microservice Connection Timeout

**Problem**: Client cannot connect to microservice

**Check service status:**

```bash
# Check if container is running
docker ps | grep audio2face

# Check logs
docker logs audio2face_microservice

# Check port mapping
docker port audio2face_microservice
```

**Test connectivity:**

```bash
# From WSL
nc -zv localhost 52000

# Health check
python3 a2f_3d.py health_check --url localhost:52000
```

**Common issues:**

1. **Firewall blocking**: Check Windows Firewall settings
2. **Port already in use**: Change host port in docker-compose.yml
3. **Service not started**: Run `docker compose up -d`

### 11.5 Poor Performance / Low FPS

**Problem**: Output FPS below 30 or stuttering

**Diagnostics:**

```bash
# Monitor GPU usage
nvidia-smi dmon -s mu -d 1

# Check container logs for FPS
docker logs -f audio2face_microservice | grep FPS
```

**Solutions:**

1. **Reduce stream_number** in `a2f_config.yaml`:[14]
   ```yaml
   stream_number: 3  # Reduce from 5 to 3
   ```

2. **Lower emotion inference frequency**:
   ```yaml
   A2E:
     inference-interval: 15  # Increase from 10
   ```

3. **Disable emotion detection** if not needed:
   ```yaml
   A2E:
     enabled: false
   ```

4. **Check VRAM usage**:
   ```bash
   nvidia-smi
   ```
   If near 8GB, reduce stream_number further

### 11.6 Audio Format Errors

**Problem**: Microservice rejects audio

**Error**: `Unsupported audio format` or `Invalid sample rate`

**Convert audio properly:**

```bash
# Check current audio format
ffprobe input.wav

# Convert to compatible format
ffmpeg -i input.wav -ar 16000 -ac 1 -acodec pcm_s16le output.wav

# Verify conversion
ffprobe output.wav
```

**Required specs:**[14]
- Format: PCM 16-bit
- Channels: 1 (mono)
- Sample rate: 16000 Hz (recommended) or 16000-144000 Hz

### 11.7 Out of Memory (OOM) Errors

**Problem**: Container crashes with OOM

**Check memory usage:**

```bash
docker stats audio2face_microservice
```

**Solutions:**

1. **Reduce concurrent streams**:
   ```yaml
   stream_number: 1  # Test with single stream
   ```

2. **Limit Docker memory** (if needed):
   ```yaml
   # In docker-compose.yml
   services:
     audio2face-3d:
       deploy:
         resources:
           limits:
             memory: 10G
   ```

3. **Close other GPU applications**:
   ```bash
   nvidia-smi  # Check what's using GPU
   ```

### 11.8 Permission Denied Errors

**Problem**: Cannot access files or directories

**Solutions:**

```bash
# Fix file permissions
sudo chown -R $USER:$USER ~/Audio2Face-3D-Samples

# Fix Docker socket permission
sudo chmod 666 /var/run/docker.sock

# Or add user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

***

## 12. Advanced Topics

### 12.1 Custom Model Deployment

**Download additional face models:**

Models available on HuggingFace:[16][17]
- `claire_v1.3` (default)
- `mark_v2.3` (male face)
- `james_v2.3.1` (male face)

**Download and mount custom model:**

```bash
# Create models directory
mkdir -p ~/Audio2Face-3D-Samples/models

# Download from HuggingFace (example)
git lfs install
git clone https://huggingface.co/nvidia/Audio2Face-3D-v2.3-Mark models/mark_v2.3
```

**Update docker-compose.yml:**

```yaml
volumes:
  - ./models:/opt/nvidia/a2f_pipeline/custom_models
```

**Update a2f_config.yaml:**

```yaml
A2F:
  model_path: "/opt/nvidia/a2f_pipeline/custom_models/mark_v2.3"
```

### 12.2 Production Deployment with Reverse Proxy

**Install Nginx in WSL:**

```bash
sudo pacman -S nginx
```

**Configure gRPC proxy (`/etc/nginx/nginx.conf`):**

```nginx
http {
    upstream audio2face {
        server localhost:52000;
    }
    
    server {
        listen 80 http2;
        server_name audio2face.local;
        
        location / {
            grpc_pass grpc://audio2face;
            grpc_set_header Host $host;
            grpc_set_header X-Real-IP $remote_addr;
        }
    }
}
```

**Enable and start Nginx:**

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 12.3 Monitoring & Logging

**Setup log rotation:**

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/audio2face
```

Add:
```
/path/to/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

**Real-time monitoring script:**

```bash
#!/bin/bash
# monitor_a2f.sh

while true; do
    clear
    echo "=== Audio2Face Monitoring ==="
    echo
    echo "Container Status:"
    docker ps | grep audio2face
    echo
    echo "GPU Usage:"
    nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits
    echo
    echo "Recent Logs:"
    docker logs --tail 10 audio2face_microservice
    sleep 5
done
```

### 12.4 Integration with Your 3D Workflows

**Export to Unreal Engine:**

Blendshapes are ARKit-compatible and can be imported directly into UE5's MetaHuman or custom characters.[18]

**Export to Maya:**

Use the blendshape JSON data with Maya's Python API for rigging.[19]

**Real-time Streaming:**

Implement WebSocket bridge for browser-based applications using the gRPC output stream.[20]

***

## Quick Reference

### Essential Commands

```bash
# Check GPU
nvidia-smi

# Start service
cd ~/Audio2Face-3D-Samples/microservices/audio_2_face_microservice/quick-start
docker compose up -d

# Check logs
docker logs -f audio2face_microservice

# Stop service
docker compose down

# Health check
python3 a2f_3d.py health_check --url localhost:52000

# Run inference
python3 a2f_3d.py run_inference audio.wav config.yml --url localhost:52000
```

### Key File Locations

```
~/Audio2Face-3D-Samples/
├── microservices/audio_2_face_microservice/quick-start/
│   ├── docker-compose.yml          # Container configuration
│   └── config/a2f_config.yaml      # Microservice settings
├── scripts/audio2face_3d_microservices_interaction_app/
│   ├── a2f_3d.py                   # Client script
│   └── config/                     # Avatar configurations
└── example_audio/                  # Test audio files

~/.ngc/
└── api_key                         # NGC credentials
```

### Port Mapping

| Service | Container Port | Host Port | Protocol |
|---------|---------------|-----------|----------|
| gRPC Input | 50000 | 52000 | gRPC |
| gRPC Output | 51000 | 52001 | gRPC |

### Performance Specs (RTX 2060 Super)

| Streams | VRAM | FPS Range | Recommended Use |
|---------|------|-----------|-----------------|
| 1 | ~2.2GB | 300+ | Development/Testing |
| 3 | ~2.7GB | 150+ | Small production |
| 5 | ~3.0GB | 90+ | Production |

***

## Resources

- **Official Documentation**: https://docs.nvidia.com/ace/audio2face-3d-microservice/latest/
- **GitHub Repository**: https://github.com/NVIDIA/Audio2Face-3D-Samples
- **NGC Catalog**: https://catalog.ngc.nvidia.com/orgs/nvidia/teams/ace/containers/audio2face-3d
- **HuggingFace Models**: https://huggingface.co/collections/nvidia/audio2face-3d-6865d22d6daec4ac85887b17
- **NVIDIA Developer Forums**: https://forums.developer.nvidia.com/c/gpu-graphics/audio2face/
- **CUDA on WSL Guide**: https://docs.nvidia.com/cuda/wsl-user-guide/

***