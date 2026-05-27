import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// 1. Load user profile to get target roles and location
const profilePath = path.resolve('./config/profile.yml');
let searchTerm = '"Software Engineer" OR "Full-Stack"';
let locations = ['Melbourne, VIC', 'Sydney, NSW', 'Shenzhen, China', 'Guangzhou, China'];

try {
    const profile = yaml.load(fs.readFileSync(profilePath, 'utf8'));
    if (profile.target_roles && profile.target_roles.primary) {
        const roles = profile.target_roles.primary.map(role => `"${role}"`);
        searchTerm = roles.join(' OR ');
    }
    // We keep the hardcoded multi-region list to cover your preferences (AU + Guangdong)
} catch (e) {
    console.warn("⚠️ [Node] Could not load profile.yml, using defaults.");
}

const pipelinePath = path.resolve('./data/pipeline.md');

for (const location of locations) {
    console.log(`\n🚀 [Node] Dispatching JobSpy radar for: ${searchTerm} in ${location}...`);

    try {
        const pythonProcess = spawnSync('python', ['jobspy_worker.py', searchTerm, location], { stdio: 'inherit' });
        
        if (pythonProcess.error) {
            console.error(`❌ [Node] Error for ${location}:`, pythonProcess.error.message);
            continue;
        }

        const resultPath = path.resolve('./jobspy_results.json');
        if (!fs.existsSync(resultPath)) continue;

        const rawData = fs.readFileSync(resultPath, 'utf-8');
        const jobs = JSON.parse(rawData);
        
        if (jobs.length === 0) {
            console.log(`💤 [Node] No new jobs in ${location}.`);
            continue;
        }

        // Read current pipeline to avoid duplicates
        const currentPipeline = fs.existsSync(pipelinePath) ? fs.readFileSync(pipelinePath, 'utf8') : '';

        let markdownAppend = `\n### 🕵️ JobSpy External Scrape: ${location} (${new Date().toISOString().split('T')[0]})\n`;
        let addedCount = 0;

        jobs.forEach(job => {
            // Check if URL already exists in pipeline
            if (currentPipeline.includes(job.job_url)) {
                return;
            }

            // 为每个岗位生成本地文件名，清理非法字符
            const safeCompanyName = job.company.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeTitle = job.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeCompanyName}-${safeTitle}.txt`;
            const jdPath = path.resolve('./jds', fileName);
            
            // 写入 JD 原文到本地 jds/ 文件夹 (如果为 null 则写入提示)
            const content = job.description || `--- NO DESCRIPTION CAPTURED ---\nPlease paste the Job Description for [${job.title}] at [${job.company}] here.\nURL: ${job.job_url}`;
            fs.writeFileSync(jdPath, content, 'utf8');

            // 格式: - [ ] [公司名 - 职位名](URL) | local:jds/文件名
            markdownAppend += `- [ ] [${job.company} - ${job.title}](${job.job_url}) | local:jds/${fileName}\n`;
            addedCount++;
        });
        
        if (addedCount > 0) {
            fs.appendFileSync(pipelinePath, markdownAppend);
            console.log(`🎉 [Node] Added ${addedCount} new jobs from ${location} to data/pipeline.md!`);
        } else {
            console.log(`✅ [Node] All ${jobs.length} jobs from ${location} already exist in pipeline.`);
        }
        
    } catch (error) {
        console.error(`❌ [Node] Dispatch failed for ${location}:`, error.message);
    }
}

console.log(`\n👉 Next step: Run /career-ops pipeline to start AI evaluation.`);