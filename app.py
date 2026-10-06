import os
import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import auth_client as AUTH
import link_generator as LG
from main import solve_chain

app = FastAPI(title="Delta Bypass API", description="Delta / Platoboost 自动求解 API")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "online", "message": "Delta Bypass API 运行正常"}

# 1. 核心卡密绕过接口
@app.get("/api/bypass")
def bypass_api(
    url: str = Query(..., description="目标链接或 Ticket"),
    max_rounds: int = Query(3, ge=1, le=12, description="最大求解轮数，默认 3")
):
    try:
        # 解析提取 Ticket
        ticket = AUTH.extract_ticket_from_arg(url)
        if not ticket:
            raise HTTPException(status_code=400, detail="无效的 URL 或 Ticket 格式")

        # 调用核心逻辑
        key, timer = solve_chain(ticket, verbose=False, max_rounds=max_rounds)

        if key:
            return {
                "status": "success",
                "key": key,
                "elapsed": round(timer.total(), 2) if timer else 0
            }
        else:
            reason = getattr(timer, 'invalid_reason', None) or "未成功解析到卡密，可能链接已失效或触发限流"
            return {
                "status": "error",
                "message": reason,
                "elapsed": round(timer.total(), 2) if timer else 0
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器解析异常: {str(e)}")

# 2. 生成测试链接接口（对应 README 的 --generate 功能）
@app.get("/api/generate")
def generate_links(count: int = Query(1, ge=1, le=10, description="生成链接数量")):
    try:
        urls = LG.batch_links(count)
        return {
            "status": "success",
            "count": len(urls),
            "urls": urls
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成测试链接失败: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
