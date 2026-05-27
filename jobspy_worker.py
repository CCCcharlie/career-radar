import sys
import json
from jobspy import scrape_jobs

def fetch_jobs(search_term, location):
    print(f"🕵️ [Python] 开始潜入领英抓取: {search_term} | 地点: {location}...")
    
    try:
        # 核心抓取逻辑
        jobs = scrape_jobs(
            site_name=["linkedin", "indeed"], # 开启 LinkedIn 和 Indeed
            search_term=search_term,
            location=location,
            results_wanted=15,      # 防封策略：每次只拿最新 15 个
            hours_old=168,           # 防封策略：只看最近 7 天 (168小时) 的新坑位
            enforce_description=True # 强制抓取 JD 详情
        )
        
        # 检查是否抓到数据
        if (not jobs.empty):
            print(f"📊 [Python] Available columns: {jobs.columns.tolist()}")
            # 提取核心字段，包括 description 用于本地持久化
            results = jobs[['title', 'company', 'job_url', 'description']].to_dict(orient='records')
            print(f"✅ [Python] 成功抓取到 {len(results)} 个岗位，正在移交 Node.js...")
        else:
            results = []
            print("⚠️ [Python] 本次搜索没有找到符合条件的新岗位。")

        # 将结果写入 JSON，供 Node.js 读取
        with open('jobspy_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    except Exception as e:
        print(f"❌ [Python] 抓取崩溃: {str(e)}")
        # 崩溃时也要写个空数组，防止 Node.js 读取报错
        with open('jobspy_results.json', 'w', encoding='utf-8') as f:
            json.dump([], f)

if __name__ == "__main__":
    # 从 Node.js 接收命令行参数
    if len(sys.argv) >= 3:
        query = sys.argv[1]
        loc = sys.argv[2]
        fetch_jobs(query, loc)
    else:
        print("❌ [Python] 缺少参数！")