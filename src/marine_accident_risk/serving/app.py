"""FastAPI 앱 — 격자 위험·셀 상세·통계·XAI 엔드포인트.

라이브 실행: uv run uvicorn marine_accident_risk.serving.app:get_app --factory
(학습셋과 리포트가 먼저 만들어져 있어야 한다: build_dataset → run_stats → run_xai)
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException

from .service import RiskService

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / "data" / "cache"
REPORTS = ROOT / "reports"


def create_app(service: RiskService) -> FastAPI:
    app = FastAPI(title="연안 해양사고 위험 분석 API", version="0.1.0")

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "resolution": service.resolution, "cells": len(service.grid())}

    @app.get("/grid")
    def grid() -> dict:
        return {"resolution": service.resolution, "cells": service.grid()}

    @app.get("/cell/{grid_id}")
    def cell(grid_id: str) -> dict:
        result = service.cell(grid_id)
        if result is None:
            raise HTTPException(status_code=404, detail="격자를 찾을 수 없습니다")
        return result

    @app.get("/stats")
    def stats() -> dict:
        return service.stats()

    @app.get("/xai")
    def xai() -> dict:
        return service.xai()

    @app.get("/model")
    def model() -> dict:
        return service.model_metrics()

    return app


def get_app() -> FastAPI:
    """기본 경로(레포 data/cache·reports)로 서비스를 만들어 앱을 반환한다."""
    return create_app(RiskService(CACHE, REPORTS))
