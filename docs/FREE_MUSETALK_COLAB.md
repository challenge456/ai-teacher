# Free lip-synced teacher: MuseTalk on Google Colab

This is the no-payment option. The Next.js classroom remains the student-facing app. A free Colab GPU temporarily renders the video in the background.

## Before you start

- Use a photo or short video of a teacher/avatar **you own or have permission to animate**. Do not clone a real person without consent.
- Keep the teacher explanation short (about 10–20 seconds) for the demo. Free Colab is slow and disconnects after idle time.
- Do not use the broken public MuseTalk Hugging Face demo; it currently reports missing model files.

## Colab setup

1. Open a **fresh** Google Colab notebook and select **Runtime → Change runtime type → T4 GPU**. Do not reuse a runtime where `openmim` has already downgraded packages.
2. Colab currently uses Python 3.12 while MuseTalk requires Python 3.10. Run this cell once; it restarts the runtime:

```python
!pip -q install condacolab
import condacolab
condacolab.install()
```

3. After the automatic restart, run this setup cell. It keeps MuseTalk and all its older CUDA dependencies isolated from Colab's own Python:

```python
!conda create -y -n musetalk python=3.10
!conda run -n musetalk python -m pip install --upgrade pip setuptools wheel
!conda run -n musetalk pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cu118
!conda run -n musetalk pip install mmengine==0.10.7
!conda run -n musetalk pip install mmcv==2.0.1 -f https://download.openmmlab.com/mmcv/dist/cu118/torch2.0/index.html
!conda run -n musetalk pip install mmdet==3.1.0 mmpose==1.1.0
!git clone https://github.com/TMElyralab/MuseTalk.git
%cd MuseTalk
!conda run -n musetalk pip install -r requirements.txt fastapi uvicorn edge-tts
!pip -q install fastapi uvicorn edge-tts
!apt-get -qq update && apt-get -qq install -y ffmpeg
!bash download_weights.sh
!conda run -n musetalk python -c "import mmpose; print('mmpose OK:', mmpose.__version__)"
```

4. Upload one consented `teacher.jpg` or `teacher.mp4` into the Colab `MuseTalk/data/video/` folder.
5. Add the companion server below in a Colab cell, set a private `TOKEN`, then run it. The server contract is `POST /jobs` and `GET /jobs/{id}`; the Next app already uses it.

```python
import asyncio, os, secrets, shutil, subprocess, threading, time
from pathlib import Path
import edge_tts
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Change this. The Next.js app sends this same value as LOCAL_AVATAR_API_TOKEN.
TOKEN = "change-this-to-a-long-private-string"
ROOT = Path("/content/MuseTalk")
SOURCE = ROOT / "data/video/teacher.jpg"  # change to teacher.mp4 if that is what you uploaded
WORK = ROOT / "work"
jobs = {}
app = FastAPI()

class JobInput(BaseModel):
    script: str
    title: str = "AI Teacher"
    language: str = "en"

def require_token(authorization: str | None):
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "Unauthorized")

def voice_for(language: str):
    return "hi-IN-SwaraNeural" if language.startswith("hi") else "en-IN-NeerjaNeural" if language == "en-IN" else "en-US-JennyNeural"

def render(job_id: str, request: JobInput):
    job = jobs[job_id]
    try:
        audio = WORK / "audio" / f"{job_id}.mp3"
        config = WORK / "configs" / f"{job_id}.yaml"
        output_dir = WORK / "results"
        audio.parent.mkdir(parents=True, exist_ok=True)
        config.parent.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)
        asyncio.run(edge_tts.Communicate(request.script[:1800], voice_for(request.language)).save(str(audio)))
        output = f"{job_id}.mp4"
        config.write_text(f"task_0:\n  video_path: '{SOURCE}'\n  audio_path: '{audio}'\n  result_name: '{output}'\n")
        command = ["conda", "run", "--no-capture-output", "-n", "musetalk", "python", "-m", "scripts.inference", "--inference_config", str(config), "--result_dir", str(output_dir),
                   "--unet_model_path", "models/musetalkV15/unet.pth", "--unet_config", "models/musetalkV15/musetalk.json",
                   "--version", "v15", "--use_float16", "--batch_size", "4"]
        completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=1800)
        video = output_dir / "v15" / output
        if completed.returncode != 0 or not video.exists():
            raise RuntimeError((completed.stderr or completed.stdout or "MuseTalk did not create a video")[-1200:])
        job.update(status="completed", video_url=f"/files/{job_id}")
    except Exception as error:
        job.update(status="failed", error=str(error))

@app.post("/jobs")
def create_job(request: JobInput, background: BackgroundTasks, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if not SOURCE.exists(): raise HTTPException(400, "Upload teacher.jpg or teacher.mp4 first.")
    job_id = secrets.token_urlsafe(12)
    jobs[job_id] = {"id": job_id, "status": "processing"}
    background.add_task(render, job_id, request)
    return jobs[job_id]

@app.get("/jobs/{job_id}")
def job_status(job_id: str, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if job_id not in jobs: raise HTTPException(404, "Unknown job")
    job = dict(jobs[job_id])
    if job.get("video_url"): job["videoUrl"] = job.pop("video_url")
    return job

@app.get("/files/{job_id}")
def file(job_id: str):
    path = WORK / "results" / "v15" / f"{job_id}.mp4"
    if not path.exists(): raise HTTPException(404, "Video not ready")
    return FileResponse(path, media_type="video/mp4")

# Start API then start a free temporary Cloudflare tunnel in a second Colab cell.
threading.Thread(target=lambda: __import__("uvicorn").run(app, host="0.0.0.0", port=8000), daemon=True).start()
print("MuseTalk server started on port 8000")
```

5. Run this second Colab cell. It prints an `https://...trycloudflare.com` URL. Keep this Colab tab open.

```python
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
!chmod +x /usr/local/bin/cloudflared
!cloudflared tunnel --url http://127.0.0.1:8000
```

6. Add the printed URL and the same private token to this app's `.env`:

```env
LOCAL_AVATAR_API_URL="https://your-private-colab-url"
LOCAL_AVATAR_API_TOKEN="the-same-private-token"
```

7. Restart `npm run dev`, start a lesson, and click **Generate lip-sync teacher video**.

## Why this is staged

MuseTalk requires CUDA and model weights; Google Colab is a temporary free GPU, not a production host. For a hackathon demo, keep the Colab tab open and generate only one or two short teaching clips. The app automatically falls back to browser voice when no video renderer is available.
