import uvicorn
import os
import sys

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    print("Starting Prajaseva Python FastAPI Server on http://localhost:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
