/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { AlertTriangle, Check, Cpu, Eye, EyeOff, KeyRound, LoaderCircle, Plus, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { authHeaders, postJson } from '../../utils/session';
import './AiProviderStudio.css';

type AIProviderProtocol = 'openai-compatible' | 'anthropic' | 'gemini';

interface AIProviderRecord {
  id: string;
  name: string;
  protocol: AIProviderProtocol;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  supportsImages: boolean;
  hasApiKey: boolean;
  updatedAt: number;
}

interface ProviderResponse {
  success: boolean;
  providers: AIProviderRecord[];
  vaultConfigured: boolean;
  message?: string;
}

const DEFAULT_BASE_URL: Record<AIProviderProtocol, string> = {
  'openai-compatible': 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

const PROTOCOL_LABEL: Record<AIProviderProtocol, string> = {
  'openai-compatible': 'OpenAI-compatible · Chat Completions',
  anthropic: 'Anthropic · Messages API',
  gemini: 'Google · Gemini API',
};

const emptyForm = () => ({
  id: '',
  name: '',
  protocol: 'openai-compatible' as AIProviderProtocol,
  baseUrl: DEFAULT_BASE_URL['openai-compatible'],
  model: '',
  apiKey: '',
  enabled: true,
  isDefault: true,
  supportsImages: false,
});

export const AiProviderStudio: FC = () => {
  const [providers, setProviders] = useState<AIProviderRecord[]>([]);
  const [vaultConfigured, setVaultConfigured] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showKey, setShowKey] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/ai/providers', {
        headers: authHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null) as ProviderResponse | null;
      if (!response.ok || !data?.success) {
        setError(data?.message || `Không tải được cấu hình AI (HTTP ${response.status}).`);
        return;
      }
      setError('');
      setProviders(Array.isArray(data.providers) ? data.providers : []);
      setVaultConfigured(data.vaultConfigured === true);
    } catch {
      setError('Không kết nối được máy chủ để tải cấu hình AI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refresh = () => {
    if (loading) return;
    setLoading(true);
    setError('');
    void load();
  };

  const resetForm = () => {
    setForm(emptyForm());
    setShowKey(false);
    setError('');
    setNotice('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { status, data } = await postJson('/api/admin/ai/providers', form);
      if (status < 200 || status >= 300 || !data?.success) {
        setError(String(data?.message || `Không lưu được cấu hình (HTTP ${status}).`));
        return;
      }
      setProviders(Array.isArray(data.providers) ? data.providers : []);
      setVaultConfigured(data.vaultConfigured === true);
      setNotice('Đã lưu cấu hình. API key chỉ được gửi tới máy chủ và lưu dưới dạng mã hoá.');
      setForm(emptyForm());
      setShowKey(false);
    } catch {
      setError('Không kết nối được máy chủ. Cấu hình chưa được xác nhận; hãy tải lại trước khi thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (provider: AIProviderRecord) => {
    setForm({
      id: provider.id,
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      model: provider.model,
      apiKey: '',
      enabled: provider.enabled,
      isDefault: provider.isDefault,
      supportsImages: provider.supportsImages,
    });
    setShowKey(false);
    setError('');
    setNotice('Để trống API key để giữ khóa hiện tại; nhập khóa mới nếu muốn thay.');
    document.getElementById('ai-provider-name')?.focus();
  };

  const remove = async (provider: AIProviderRecord) => {
    if (deletingId || !window.confirm(`Xoá cấu hình “${provider.name}” khỏi máy chủ?`)) return;
    setDeletingId(provider.id);
    setError('');
    setNotice('');
    try {
      const { status, data } = await postJson('/api/admin/ai/providers', {
        action: 'delete',
        providerId: provider.id,
      });
      if (status < 200 || status >= 300 || !data?.success) {
        setError(String(data?.message || `Không xoá được cấu hình (HTTP ${status}).`));
        return;
      }
      setProviders(Array.isArray(data.providers) ? data.providers : []);
      if (form.id === provider.id) setForm(emptyForm());
      setNotice(`Đã xoá cấu hình “${provider.name}”.`);
    } catch {
      setError('Không kết nối được máy chủ để xoá cấu hình.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="ff-ai-studio">
      <header className="ff-ai-studio__header">
        <div className="ff-ai-studio__seal"><Sparkles size={17} aria-hidden="true" /></div>
        <div className="ff-ai-studio__heading">
          <p className="faa-eyebrow">CHỈ SUPER ADMIN · Q&amp;A TUTOR</p>
          <h2>Nhà cung cấp & mô hình AI</h2>
          <p>Chọn một adapter rõ ràng cho lời gợi ý học tập. Mỗi giao thức có định dạng request và xác thực riêng.</p>
        </div>
        <button type="button" className="ff-ai-studio__refresh ff-tactile-btn" onClick={refresh} disabled={loading} aria-label="Tải lại cấu hình AI">
          {loading ? <LoaderCircle className="faa-spin" size={15} /> : <RefreshCw size={15} />}
          <span>Tải lại</span>
        </button>
      </header>

      <div className={`ff-ai-vault ${vaultConfigured ? 'is-ready' : 'is-missing'}`} role="status">
        <span className="ff-ai-vault__icon">{vaultConfigured ? <ShieldCheck size={16} /> : <KeyRound size={16} />}</span>
        <div>
          <b>{vaultConfigured ? 'Khoá mã hoá đã sẵn sàng' : 'Chưa cấu hình khoá mã hoá trên máy chủ'}</b>
          <p>
            {vaultConfigured
              ? 'API key được mã hoá bằng AES-256-GCM trước khi ghi xuống data store; khoá giải mã chỉ nằm trong môi trường máy chủ.'
              : 'Quản trị viên vận hành cần đặt FFORUM_AI_VAULT_KEY (64 ký tự hex ngẫu nhiên) trong secret môi trường máy chủ rồi khởi động lại. Không đặt giá trị này trong giao diện hoặc Git.'}
          </p>
        </div>
      </div>

      {(error || notice) && (
        <div className={`ff-ai-alert ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>
          {error ? <AlertTriangle size={15} /> : <Check size={15} />}
          <span>{error || notice}</span>
        </div>
      )}

      <div className="ff-ai-studio__grid">
        <form className="ff-ai-form" onSubmit={(event) => void save(event)}>
          <div className="ff-ai-form__title">
            <span><Cpu size={16} aria-hidden="true" /></span>
            <div>
              <h3>{form.id ? 'Sửa cấu hình' : 'Thêm provider'}</h3>
              <p>Chỉ lưu cấu hình riêng do bạn quản lý.</p>
            </div>
          </div>

          <label className="ff-ai-field">
            <span>Tên hiển thị</span>
            <input
              id="ai-provider-name"
              value={form.name}
              maxLength={60}
              required
              autoComplete="off"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ví dụ: OpenAI Vision · tài khoản trường"
            />
          </label>

          <label className="ff-ai-field">
            <span>Adapter / giao thức</span>
            <select
              value={form.protocol}
              onChange={(event) => {
                const protocol = event.target.value as AIProviderProtocol;
                setForm((current) => ({
                  ...current,
                  protocol,
                  baseUrl: current.baseUrl === DEFAULT_BASE_URL[current.protocol]
                    ? DEFAULT_BASE_URL[protocol]
                    : current.baseUrl,
                }));
              }}
            >
              {(Object.keys(PROTOCOL_LABEL) as AIProviderProtocol[]).map((protocol) => (
                <option key={protocol} value={protocol}>{PROTOCOL_LABEL[protocol]}</option>
              ))}
            </select>
          </label>

          <label className="ff-ai-field">
            <span>Base URL HTTPS</span>
            <input
              type="url"
              value={form.baseUrl}
              maxLength={500}
              required
              onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder={DEFAULT_BASE_URL[form.protocol]}
              spellCheck={false}
            />
            <small>Chỉ URL HTTPS công khai; máy chủ từ chối localhost và IP riêng.</small>
          </label>

          <label className="ff-ai-field">
            <span>Model ID</span>
            <input
              value={form.model}
              maxLength={120}
              required
              onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
              placeholder={form.protocol === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4.1-mini'}
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="ff-ai-field">
            <span>API key {form.id && <small>(để trống để giữ khóa hiện tại)</small>}</span>
            <span className="ff-ai-key-input">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                maxLength={4096}
                required={!form.id}
                autoComplete="new-password"
                onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder={form.id ? '••••••••  ·  đã lưu ở máy chủ' : 'Dán key provider tại đây'}
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowKey((visible) => !visible)} aria-label={showKey ? 'Ẩn API key' : 'Hiện API key'}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
            <small>Không gửi key trong URL, log, hay câu trả lời API. Sau khi lưu, key không thể xem lại.</small>
          </label>

          <div className="ff-ai-toggles">
            <label><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} /><span>Bật cấu hình này</span></label>
            <label><input type="checkbox" checked={form.isDefault} disabled={!form.enabled} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} /><span>Dùng làm model mặc định</span></label>
            <label><input type="checkbox" checked={form.supportsImages} onChange={(event) => setForm((current) => ({ ...current, supportsImages: event.target.checked }))} /><span>Model nhận ảnh (vision)</span></label>
          </div>
          <p className="ff-ai-form__hint">
            Bật “nhận ảnh” chỉ khi model và tài khoản provider thực sự hỗ trợ vision. Giao thức tương thích không đồng nghĩa mọi model đều nhận ảnh; AI chỉ nhận tối đa 4 ảnh tải trực tiếp (PNG/JPEG/WebP, tổng cộng 6 MiB), không tải URL bên ngoài.
          </p>

          <div className="ff-ai-form__actions">
            {form.id && <button type="button" className="ff-ai-button ff-ai-button--quiet" onClick={resetForm}>Huỷ sửa</button>}
            <button type="submit" className="ff-ai-button ff-ai-button--primary" disabled={saving || !vaultConfigured}>
              {saving ? <LoaderCircle className="faa-spin" size={15} /> : form.id ? <Save size={15} /> : <Plus size={15} />}
              <span>{saving ? 'Đang lưu…' : form.id ? 'Lưu thay đổi' : 'Lưu provider'}</span>
            </button>
          </div>
        </form>

        <section className="ff-ai-provider-list" aria-label="Provider AI đã cấu hình">
          <div className="ff-ai-provider-list__head">
            <div>
              <p className="faa-eyebrow">SERVER-SIDE</p>
              <h3>Cấu hình đã lưu <span>{providers.length}</span></h3>
            </div>
            {loading && <LoaderCircle className="faa-spin" size={16} aria-label="Đang tải" />}
          </div>

          {providers.length === 0 && !loading ? (
            <div className="ff-ai-provider-empty">
              <KeyRound size={20} aria-hidden="true" />
              <b>Chưa có provider</b>
              <p>Thêm adapter và chọn model mặc định. Trợ lý AI sẽ báo chưa sẵn sàng cho tới lúc đó.</p>
            </div>
          ) : (
            <ul className="ff-ai-provider-list__items">
              {providers.map((provider) => (
                <li key={provider.id} className={`${provider.enabled ? 'is-enabled' : 'is-disabled'} ${provider.isDefault ? 'is-default' : ''}`}>
                  <div className="ff-ai-provider-card__top">
                    <span className="ff-ai-provider-card__icon"><Cpu size={15} aria-hidden="true" /></span>
                    <div className="ff-ai-provider-card__identity">
                      <b>{provider.name}</b>
                      <small>{provider.model}</small>
                    </div>
                    {provider.isDefault && provider.enabled && <span className="ff-ai-default">MẶC ĐỊNH</span>}
                  </div>
                  <div className="ff-ai-provider-card__meta">
                    <span>{PROTOCOL_LABEL[provider.protocol]}</span>
                    <span>{provider.supportsImages ? 'Vision đã bật' : 'Chỉ văn bản'}</span>
                    <span>{provider.hasApiKey ? 'Key đã mã hoá' : 'Thiếu key'}</span>
                    <span>{provider.enabled ? 'Đang bật' : 'Đang tắt'}</span>
                  </div>
                  <code title={provider.baseUrl}>{provider.baseUrl}</code>
                  <div className="ff-ai-provider-card__actions">
                    <button type="button" onClick={() => edit(provider)} disabled={Boolean(deletingId)}>Sửa</button>
                    <button type="button" className="is-danger" onClick={() => void remove(provider)} disabled={Boolean(deletingId)} aria-label={`Xoá ${provider.name}`}>
                      {deletingId === provider.id ? <LoaderCircle className="faa-spin" size={13} /> : <Trash2 size={13} />}
                      Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="ff-ai-studio__footer">
        <ShieldCheck size={15} aria-hidden="true" />
        <p>AI chỉ tạo gợi ý, có thể sai hoặc từ chối khi thiếu dữ kiện. Nội dung câu hỏi và ảnh chỉ được gửi tới provider sau khi người dùng bấm nút trợ giúp. Hãy rà soát chính sách lưu trữ dữ liệu của provider trước khi bật tính năng.</p>
      </footer>
    </div>
  );
};
