"""
Multi-face tracking with per-ID analytics.

Each tracked face maintains:
- RiskEngine: temporal emotion analysis
- FaceMotionAnalyzer: motion-based risk indicators

This separation allows independent analysis of emotional and behavioral
signals, which are then fused at a higher level.
"""

import math
from risk.risk_engine import RiskEngine
from motion.face_motion import FaceMotionAnalyzer


# ================== HELPERS ==================
def centroid(box):
    """Compute centroid of a bounding box (x, y, w, h)."""
    x, y, w, h = box
    return (x + w // 2, y + h // 2)


def distance(p1, p2):
    """Euclidean distance between two points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


# ================== TRACKER ==================
class FaceTracker:
    """
    Multi-face tracker with per-ID analytics.

    Maintains independent analytics engines for each tracked face:
    - RiskEngine: emotion-based temporal analysis
    - FaceMotionAnalyzer: motion-based behavioral indicators

    The tracker uses simple centroid-based matching with distance thresholding.
    This is sufficient for real-time applications where faces move smoothly.
    """

    def __init__(self, scenario="PUBLIC", max_distance=80, ttl_frames=30):
        """
        Initialize the face tracker.

        Parameters
        ----------
        scenario : str
            Scenario profile ("PUBLIC", "SCHOOL", "TRANSPORT") for risk engine.
        max_distance : float
            Maximum pixel distance for matching faces across frames.
        ttl_frames : int
            Frames to wait before removing a face that disappears.
        """
        self.next_id = 1
        self.faces = {}
        self.max_distance = max_distance
        self.ttl_frames = ttl_frames
        self.scenario = scenario

    def update(self, detections):
        """
        Update tracker with new face detections.

        Parameters
        ----------
        detections : List[Tuple[int, int, int, int]]
            List of bounding boxes as (x, y, width, height).

        Returns
        -------
        List[Tuple[int, Tuple[int, int, int, int]]]
            List of (face_id, box) for successfully tracked faces.
        """
        results = []
        used_ids = set()

        for box in detections:
            c = centroid(box)
            match_id = None

            # Find closest existing face within threshold
            for fid, data in self.faces.items():
                if distance(c, data["centroid"]) < self.max_distance:
                    match_id = fid
                    break

            # Create new face if no match found
            if match_id is None:
                match_id = self.next_id
                self.next_id += 1
                self.faces[match_id] = {
                    "centroid": c,
                    "engine": RiskEngine(self.scenario),
                    "motion_analyzer": FaceMotionAnalyzer(),
                    "ttl": self.ttl_frames,
                }

            # Update matched face
            self.faces[match_id]["centroid"] = c
            self.faces[match_id]["ttl"] = self.ttl_frames
            # Update motion analyzer with new position
            self.faces[match_id]["motion_analyzer"].update(box)
            used_ids.add(match_id)
            results.append((match_id, box))

        # Decrement TTL for faces not seen this frame
        for fid in list(self.faces.keys()):
            if fid not in used_ids:
                self.faces[fid]["ttl"] -= 1
                if self.faces[fid]["ttl"] <= 0:
                    del self.faces[fid]

        return results

    def get_engine(self, face_id):
        """Get the RiskEngine for a specific face ID."""
        return self.faces[face_id]["engine"]

    def get_motion_analyzer(self, face_id):
        """Get the FaceMotionAnalyzer for a specific face ID."""
        return self.faces[face_id]["motion_analyzer"]
