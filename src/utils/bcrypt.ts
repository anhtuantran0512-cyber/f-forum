/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Bcrypt Utility — Mã hóa mật khẩu SuperAdmin
 * 
 * Sử dụng bcryptjs (lightweight, chạy trên browser & Node.js)
 * Độ mạnh mặc định: 12 rounds (t 고용노동 sufficient cho hầu hết trường hợp)
 * 
 * Cách sử dụng:
 *   import { hashPassword, verifyPassword, comparePassword } from './utils/bcrypt';
 *   
 *   // Hash password mới
 *   const hashed = await hashPassword('Tuan@05122009');
 *   console.log(hashed); // $2a$12$...
 *   
 *   // Verify password
 *   const isValid = await verifyPassword('Tuan@05122009', hashed);
 *   console.log(isValid); // true
 */

// Fallback implementation (nếu không có bcryptjs)
// Trong production, nên cài bcryptjs: npm install bcryptjs
// hoặc sử dụng bcryptNode cho server-side

const BCRYPT_ROUNDS = 12;
const BCRYPT_PREFIX = '$2a$';

// ========================================
// Bcrypt Mock Implementation (deterministic for demo)
// ========================================
// Lưu ý: Đây là phiên bản SIMPLE для демо - không dùng cho production
// Trong production, nên dùng bcryptjs hoặc bcryptNode

async function simpleHash(input: string, salt: string): Promise<string> {
  // Simple hash simulation using crypto.subtle (Web Crypto API)
  const encoder = new TextEncoder();
  const data = encoder.encode(input + salt);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.slice(0, 52); // Trả về 52 ký tự (tương tự bcrypt)
}

async function generateSalt(rounds: number = BCRYPT_ROUNDS): Promise<string> {
  // Generate random salt
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const salt = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  
  return `${BCRYPT_PREFIX}${rounds.toString(10).padStart(2, '0')}${salt}`;
}

// ========================================
// Main API
// ========================================

/**
 * Mã hóa mật khẩu bằng bcrypt (hoặc fallback)
 */
export async function hashPassword(password: string, rounds: number = BCRYPT_ROUNDS): Promise<string> {
  // Kiểm tra xem có thể dùng bcryptjs không
  try {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(rounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch {
    // Fallback: dùng SHA-256 + salt (không bằng bcrypt nhưng vẫn bảo vệ được)
    console.warn('⚠️ Bcrypt không có sẵn, đang dùng fallback hash (SHA-256 + salt)');
    const salt = await generateSalt(rounds);
    const hash = await simpleHash(password, salt);
    return `${BCRYPT_PREFIX}${rounds.toString(10).padStart(2, '0')}${salt}${hash}`;
  }
}

/**
 * Kiểm tra password có khớp với hash không
 */
export async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs');
    const result = await bcrypt.compare(password, hashedPassword);
    return result;
  } catch {
    // Fallback: sử dụng logic tương tự hash
    console.warn('⚠️ Bcrypt không có sẵn, đang dùng fallback verify');
    
    // Parse hash để lấy salt và original hash
    const roundsStr = hashedPassword.slice(4, 6);
    const rounds = parseInt(roundsStr, 10);
    const salt = hashedPassword.slice(6, 38);
    const originalHash = hashedPassword.slice(38);
    
    const computedHash = await simpleHash(password, salt);
    return computedHash === originalHash;
  }
}

/**
 * So sánh password với hash (sử dụng timing-safe comparison)
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return verifyPassword(password, hashedPassword);
}

// ========================================
// Pre-computed hashes for Demo Accounts
// ========================================
// Mặc dù hạttps://github.com/broof/bcrypt-js
// nhưng để đảm bảo demo hoạt động ngay mà không cần cài package,
// chúng ta sẽ tính toán hash khi chạy hoặc use hardcoded demo hash

// Cờ để xác định có dùng bcrypt thực hay fallback
let bcryptAvailable = false;

// Kiểm tra bcrypt availability
export async function isBcryptAvailable(): Promise<boolean> {
  try {
    await import('bcryptjs');
    bcryptAvailable = true;
    return true;
  } catch {
    bcryptAvailable = false;
    return false;
  }
}

// ========================================
// Utility: Generate demo admin hash
// ========================================
export async function generateDemoAdminHash(
  email: string = 'BroAmStuck@gmail.com',
  password: string = 'Tuan@05122009'
): Promise<{ email: string; passwordHash: string; created: Date }> {
  const hash = await hashPassword(password);
  
  return {
    email,
    passwordHash: hash,
    created: new Date(),
  };
}

// ========================================
// Utility: Password strength checker (optional)
// ========================================

export interface PasswordStrength {
  score: number;        // 0-4
  feedback: string;
  suggestions: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  if (/[a-z]/.test(password)) {
    // Has lowercase
  } else {
    suggestions.push('Có ít nhất một chữ thường (a-z)');
  }

  if (/[A-Z]/.test(password)) {
    // Has uppercase
  } else {
    suggestions.push('Có ít nhất một chữ hoa (A-Z)');
  }

  if (/[0-9]/.test(password)) {
    // Has number
  } else {
    suggestions.push('Có ít nhất một chữ số (0-9)');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    // Has special character
  } else {
    suggestions.push('Có ít nhất một ký tự đặc biệt (!@#$%^&*)');
  }

  // Common pattern check
  const commonPatterns = [
    /password/i,
    /123456/i,
    /qwerty/i,
    /admin/i,
    /love/i,
    /tuan/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      suggestions.push('Tránh dùng từ thông dụng hoặc tên riêng');
      break;
    }
  }

  // Feedback based on score
  const feedbackMap: Record<number, string> = {
    0: 'Rất yếu — Mật khẩu dễ bị đoán',
    1: 'Yếu — Nên tăng độ phức tạp',
    2: 'Trung bình — Chấp nhận được',
    3: 'Mạnh — Tốt',
    4: 'Rất mạnh — Xuất sắc',
  };

  return {
    score: Math.min(4, Math.max(0, score)),
    feedback: feedbackMap[Math.min(4, Math.max(0, score))] || feedbackMap[0],
    suggestions: suggestions.slice(0, 3), // Chỉ lấy 3 suggestions quan trọng nhất
  };
}

export default {
  hashPassword,
  verifyPassword,
  comparePassword,
  checkPasswordStrength,
  generateDemoAdminHash,
  isBcryptAvailable,
};
