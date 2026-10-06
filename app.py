import os
import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import auth_client as AUTH
from main import solve_chain

app = FastAPI(title="Delta Bypass API")

# 开启跨域支持
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

@app.get("/api/bypass")
def bypass_api(url: str = Query(..., description="传入的目标链接或 Ticket")):
    try:
        # 1. 解析传入的链接/Ticket
        ticket = AUTH.extract_ticket_from_arg(url)
        if not ticket:
            raise HTTPException(status_code=400, detail="传入的链接或 Ticket 无效")

        # 2. 调用 main.py 中已有的 solve_chain 核心解题逻辑
        key, timer = solve_chain(ticket, verbose=False)

        # 3. 返回卡密结果
        if key:
            return {
                "status": "success",
                "key": key,
                "elapsed": round(timer.total(), 2) if timer else 0
            }
        else:
            reason = getattr(timer, 'invalid_reason', None) or "未成功解析到卡密"
            return {
                "status": "error",
                "message": reason
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器解析异常: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
