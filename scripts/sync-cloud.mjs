#!/usr/bin/env node
/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Tự động hoá đồng bộ dữ liệu sạch và các bản cập nhật mới nhất lên Supabase Cloud
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/* Đọc biến môi trường từ .env nếu chưa được export */
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

loadEnv();

const SUPABASE_PROJECT_URL = process.env.VITE_SUPABASE_URL || 'https://zmswatzslnkeekwnlvqh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function syncToSupabase() {
  if (!SUPABASE_KEY) {
    console.warn('⚠️ Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong .env');
    return;
  }

  const dataPath = path.join(projectRoot, 'data', 'forum-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Không tìm thấy tệp data/forum-data.json');
    return;
  }

  const fileContent = fs.readFileSync(dataPath);
  console.log('🔄 Đang đồng bộ forum-data.json lên Supabase Storage bucket fforum-data...');

  try {
    const res = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/fforum-data/forum-data.json`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: fileContent,
    });

    if (res.ok) {
      const json = await res.json();
      console.log('✅ Đã đồng bộ thành công dữ liệu sạch lên Supabase Cloud!', json);
    } else {
      const err = await res.text();
      console.error('⚠️ Lỗi khi đồng bộ Supabase:', err);
    }
  } catch (error) {
    console.error('⚠️ Không thể kết nối tới Supabase:', error.message);
  }
}

syncToSupabase();
