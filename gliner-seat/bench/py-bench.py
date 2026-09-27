"""py-bench.py — the Python gliner2 package, on the same fixtures and phrasings.

The reference runtime (PyTorch), here for the checkpoint that has no browser
export yet: fastino/gliner2.5-small-v1 (74M, DeBERTa-v3-xsmall, Apache-2.0).
Everything it downloads stays in gliner-seat/.cache/hf. The four label
phrasings are read from results/labels-webgpu.json, so they are word for word
the ones the ONNX graph was asked; long text is read in the same pieces as
processor.mjs's chunkText (lines packed to 200 words). Spans are written per
phrasing, threshold and item; bench/score-python.mjs scores them.

    .venv/bin/python bench/py-bench.py [--model fastino/gliner2.5-small-v1] [--device cpu|mps] [--repeats 5]
"""
import argparse
import json
import os
import resource
import statistics
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
os.environ.setdefault("HF_HOME", os.path.join(ROOT, ".cache", "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

p = argparse.ArgumentParser()
p.add_argument("--model", default="fastino/gliner2.5-small-v1")
p.add_argument("--device", default="cpu")
p.add_argument("--repeats", type=int, default=5)
args = p.parse_args()

t0 = time.perf_counter()
import torch  # noqa: E402
from gliner2 import AutoExtractor  # noqa: E402
from gliner2.processing.word_splitter import WhitespaceTokenSplitter  # noqa: E402

t1 = time.perf_counter()
model = AutoExtractor.from_pretrained(args.model, map_location=args.device)
model.eval()
t2 = time.perf_counter()

THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
FIXTURES = ["apron.sample.json", "tunic.sample.json", "briefs.json", "castle-sketch.brief.json"]
fixtures = [json.load(open(os.path.join(ROOT, "fixtures", f))) for f in FIXTURES]
items = [dict(item, fixture=f["id"]) for f in fixtures for item in f["items"]]
sets = json.load(open(os.path.join(ROOT, "results", "labels-webgpu.json")))["sets"]
split = WhitespaceTokenSplitter()


def pieces(text, max_words=200):
    """processor.mjs chunkText, for texts whose lines all fit (these do)."""
    lines, at = [], 0
    for line in text.split("\n"):
        n = sum(1 for _ in split(line))
        if n:
            lines.append([at, at + len(line), n])
        at += len(line) + 1
    out, open_ = [], None
    for start, end, n in lines:
        assert n <= max_words, "a line longer than a piece; windowing is not ported here"
        if open_ and open_[2] + n <= max_words:
            open_[1], open_[2] = end, open_[2] + n
        else:
            if open_:
                out.append(open_)
            open_ = [start, end, n]
    if open_:
        out.append(open_)
    return [(s, e) for s, e, _ in out]


def labels_of(label_set):
    if any("description" in l for l in label_set):
        return {l["name"]: l.get("description", "") for l in label_set}
    return [l["name"] for l in label_set]


def ask(text, label_set, threshold):
    kind = {l["name"]: l["kind"] for l in label_set}
    spans = []
    for s, e in pieces(text):
        with torch.inference_mode():
            r = model.extract_entities(text[s:e], labels_of(label_set), threshold=threshold, include_confidence=True, include_spans=True)
        for name, found in r.get("entities", {}).items():
            for x in found or []:
                spans.append({"label": kind[name], "text": x["text"], "start": x["start"] + s, "end": x["end"] + s, "score": float(x["confidence"])})
    return spans


# The first call pays for lazy work; it is timed on its own.
t3 = time.perf_counter()
ask(items[0]["text"], sets["plan, bare"]["labels"], 0.5)
first_call = time.perf_counter() - t3

latency = {}
for name in ["plan, bare", "plan, described"]:
    calls = []
    for item in items:
        for _ in range(args.repeats):
            t = time.perf_counter()
            ask(item["text"], sets[name]["labels"], 0.5)
            calls.append({"group": item["fixture"], "ms": (time.perf_counter() - t) * 1000})
    ms = [c["ms"] for c in calls]
    q = statistics.quantiles(ms, n=20)
    latency[name] = {
        "n": len(ms),
        "median": statistics.median(ms),
        "p95": q[18],
        "byGroup": {g: statistics.median([c["ms"] for c in calls if c["group"] == g]) for g in sorted({c["group"] for c in calls})},
    }
    print(f"{name}: per call median {latency[name]['median']:.0f} ms, p95 {latency[name]['p95']:.0f} ms", file=sys.stderr)

spans = {}
for name, s in sets.items():
    spans[name] = {str(t): {item["id"]: ask(item["text"], s["labels"], t) for item in items} for t in THRESHOLDS}
    print(f"asked: {name}", file=sys.stderr)

out = {
    "measured": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "runner": f"{args.model} · gliner2 2.0.0 · torch {torch.__version__} · {args.device}",
    "load": {"importS": t1 - t0, "fromPretrainedS": t2 - t1, "firstCallMs": first_call * 1000},
    # ru_maxrss is bytes on macOS
    "maxRssMB": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576),
    "parameters": sum(p.numel() for p in model.parameters()),
    "latency": latency,
    "spans": spans,
}
name = args.model.split("/")[-1]
path = os.path.join(ROOT, "results", f"py-{name}-{args.device}.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
    f.write("\n")
print(f"→ {path}", file=sys.stderr)
