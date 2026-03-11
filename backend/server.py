import os
import json
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "VisualScript Speech-to-Text Backend Running!"}


DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen"


@app.websocket("/api/speech")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to /api/speech")

    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key or deepgram_api_key == "your_deepgram_api_key_here":
        await websocket.send_text(json.dumps({"type": "Error", "message": "Deepgram API key not configured."}))
        await websocket.close(code=1011)
        logger.error("Deepgram API key is missing or invalid.")
        return

    dg_ws = None
    forward_task = None

    try:
        # Build Deepgram streaming URL — do NOT specify encoding so Deepgram
        # auto-detects from the WebM container sent by the browser's MediaRecorder
        params = "&".join([
            "model=nova-2",
            "language=en-US",
            "encoding=linear16",
            "sample_rate=16000",
            "channels=1",
            "smart_format=true",
            "interim_results=true",
            "vad_events=true",
            "endpointing=150",
        ])
        url = f"{DEEPGRAM_WS_URL}?{params}"

        # Connect directly to Deepgram's WebSocket API
        headers = {"Authorization": f"Token {deepgram_api_key}"}
        dg_ws = await websockets.connect(url, additional_headers=headers, compression=None)

        logger.info("Connected to Deepgram")
        await websocket.send_text(json.dumps({"type": "system", "message": "Deepgram connected and ready."}))

        # Task: forward Deepgram transcript responses back to the frontend
        async def forward_deepgram_responses():
            try:
                async for msg in dg_ws:
                    data = json.loads(msg)

                    # Deepgram sends results with type "Results"
                    if data.get("type") == "Results":
                        channel = data.get("channel", {})
                        alternatives = channel.get("alternatives", [])
                        if alternatives:
                            transcript = alternatives[0].get("transcript", "")
                            if transcript:
                                is_final = data.get("is_final", False)
                                await websocket.send_text(json.dumps({
                                    "type": "transcript",
                                    "text": transcript,
                                    "isFinal": is_final,
                                }))
            except websockets.exceptions.ConnectionClosed:
                logger.info("Deepgram WebSocket closed")
            except Exception as e:
                logger.error(f"Error forwarding Deepgram response: {e}")

        forward_task = asyncio.create_task(forward_deepgram_responses())

        # Main loop: receive audio from frontend, forward to Deepgram
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                await dg_ws.send(message["bytes"])
            elif "text" in message:
                try:
                    parsed = json.loads(message["text"])
                    if parsed.get("type") == "stop":
                        logger.info("Client requested stop")
                        break
                except Exception:
                    pass

    except WebSocketDisconnect:
        logger.info("Frontend client disconnected.")
    except Exception as e:
        logger.error(f"Unexpected error in websocket_endpoint: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        if forward_task:
            forward_task.cancel()
        if dg_ws:
            try:
                await dg_ws.close()
            except Exception:
                pass
        logger.info("WebSocket connection fully closed.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=3001, reload=True)
