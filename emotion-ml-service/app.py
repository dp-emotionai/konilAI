from fastapi import FastAPI

app = FastAPI(title="ELAS Emotion ML Service")

@app.get("/")
def root():
    return {
        "service": "emotion-ml-service",
        "status": "ok",
    }

@app.get("/health")
def health():
    return {"status": "ok"}