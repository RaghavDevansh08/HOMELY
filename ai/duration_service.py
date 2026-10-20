"""Optional duration service.

Run locally with: python ai/duration_service.py
Point Homely at it with DURATION_SERVICE_URL=http://127.0.0.1:8099

If scikit-learn is installed, a tiny linear model is fit on synthetic visits
at startup and responses are labelled source=sklearn. Otherwise the service
refuses to pretend and returns source=preliminary.
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

MODEL = None
try:
    import numpy as np
    from sklearn.linear_model import LinearRegression

    rng = np.random.default_rng(7)
    hours = rng.uniform(1, 4, 80)
    urgency = rng.integers(0, 3, 80)
    minutes = hours * 60 * (1 - 0.05 * urgency) + rng.normal(0, 12, 80)
    MODEL = LinearRegression().fit(np.column_stack([hours, urgency]), minutes)
    RESIDUAL = float(np.std(minutes - MODEL.predict(np.column_stack([hours, urgency]))))
except Exception:
    MODEL = None
    RESIDUAL = 0.0


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode() or "{}")
        except json.JSONDecodeError:
            body = {}
        minutes = float(body.get("minutes") or 90)
        urgency = {"standard": 0, "same_day": 1, "emergency": 2}.get(body.get("urgency"), 0)
        if MODEL is None:
            payload = {
                "source": "preliminary",
                "minutes": minutes,
                "low": minutes * 0.75,
                "high": minutes * 1.25,
                "label": "sklearn is not installed. This is not a model prediction.",
            }
        else:
            pred = float(MODEL.predict([[minutes / 60, urgency]])[0])
            payload = {
                "source": "sklearn",
                "minutes": round(pred),
                "low": round(pred - RESIDUAL),
                "high": round(pred + RESIDUAL),
                "label": "Linear model trained on synthetic visit lengths at service startup. Not production data.",
            }
        data = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8099), Handler).serve_forever()
