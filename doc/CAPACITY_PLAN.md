# Capacity Estimation (Order-of-Magnitude) - SmartMeet

This document provides a high-level estimation of the system's resource requirements and costs based on expected usage patterns. These are "back-of-the-envelope" calculations to guide infrastructure choices and pricing strategies.

## 📊 Assumptions
- **Monthly Active Users (MAU)**: 1,000
- **Usage Frequency**: 10 meetings per user per month
- **Average Meeting Duration**: 30 minutes
- **Total Meetings/Month**: 10,000

---

## 💾 1. Storage Capacity (Blob Storage)
We use Supabase Storage for audio files.

- **Audio Quality**: MP3 128kbps (Standard for speech)
- **Data Rate**: ~1 MB per minute
- **Per Meeting**: 30 minutes × 1 MB/min = **30 MB**
- **Monthly Ingress**: 10,000 meetings × 30 MB = **300 GB / month**
- **Annual Storage**: 3.6 TB
- **Recommendation**: Implement a retention policy (e.g., delete raw audio after 90 days) to keep costs manageable.

## 🗄️ 2. Database Capacity (PostgreSQL)
We use Prisma with PostgreSQL for metadata, transcripts, and summaries.

- **Transcription Text**: ~150 words/min → 4,500 words/meeting (~30 KB)
- **Summary & Metadata**: JSON/Text storage (~20 KB)
- **Total per Meeting**: ~50 KB
- **Monthly Growth**: 10,000 meetings × 50 KB = **500 MB / month**
- **Annual Growth**: **6 GB / year**
- **Recommendation**: Standard PostgreSQL instances can handle this easily. Consider indexing `userId` and `date` for performance.

## 🤖 3. AI API Costs (Estimated)
Based on current OpenAI pricing (subject to change).

- **Transcription (Whisper v2)**: $0.006 / minute
  - 10,000 meetings × 30 mins × $0.006 = **$1,800 / month**
- **Analysis (GPT-4o)**:
  - Avg. 6,000 input tokens + 2,000 output tokens per meeting.
  - ~$0.05 per meeting.
  - 10,000 meetings × $0.05 = **$500 / month**
- **Total AI Cost**: **$2,300 / month** ($2.30 per active user).

## ⚡ 4. Compute & Worker Throughput
- **Processing Time**: AI processing (Transcription + Analysis) takes ~2-4 minutes per meeting.
- **Monthly Compute Hours**: 10,000 meetings × 3 mins = **500 hours / month**.
- **Concurrency**: 
  - Spread evenly: ~14 meetings/hour.
  - Peak hours (e.g., 5 PM): Might spike to 500 meetings/hour.
- **Recommendation**: Our current `queue.ts` system with a background worker can handle this. For peak loads, increase the worker frequency or batch size.

## 🌐 5. Network Bandwidth
- **Ingress (Upload)**: 300 GB / month.
- **Egress (Processing)**: 300 GB / month (Worker downloading from Storage).
- **Total Traffic**: **~600 GB / month**.

---

## 📈 Summary Table

| Resource | Unit Cost (Est.) | Monthly Total | Scaling Limit |
| :--- | :--- | :--- | :--- |
| **Storage** | $0.02 / GB | $6.00 | High (S3/Supabase) |
| **Database** | $0.05 / GB | $0.25 | Medium (RDS/Supabase) |
| **AI (OpenAI)** | $0.23 / meeting | $2,300.00 | High (API Quotas) |
| **Bandwidth** | $0.09 / GB | $54.00 | High |
| **Total** | | **~$2,360 / month** | |

**Cost per user: ~$2.36/month.** 
*Note: This does not include hosting (Vercel), Redis (Upstash), or database instance costs.*
