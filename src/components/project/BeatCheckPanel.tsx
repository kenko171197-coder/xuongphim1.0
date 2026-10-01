import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw, Wand2, EyeOff, CheckCircle2, FileText, Sparkles, Clapperboard } from 'lucide-react';
import type { BeatCheck, BeatCheckIssue } from '../../types';
import { CopyButton, ErrorBox } from '../ui';

interface Props {
  check?: BeatCheck;
  /** prompt + ô Script hiện tại — khác basis của lần kiểm thì kết quả đã cũ */
  basis: string;
  /** Prompt đang cũ so với ô Script (ô Script sửa sau khi tạo prompt) */
  promptStale: boolean;
  busy: boolean;
  run: (previous: { tang: string; moTa: string; status: string }[]) => Promise<Omit<BeatCheck, 'at' | 'basis'>>;
  save: (check: BeatCheck) => void;
  /** Sửa ô Script theo yêu cầu rồi tự tạo lại prompt. Trả về true nếu thành công. */
  fixScript: (text: string) => Promise<boolean>;
  /** Chỉnh lại prompt bằng engine (giữ ô Script). */
  fixPrompt: (text: string) => Promise<boolean>;
}

const TANG: Record<BeatCheckIssue['tang'], { label: string; icon: React.ElementType; hint: string }> = {
  'kich-ban': { label: 'Kịch bản beat', icon: FileText, hint: 'Sửa ở bước 3 (ảnh hưởng cả các beat khác): chép yêu cầu dưới đây, dán vào ô "Yêu cầu sửa scene".' },
  script: { label: 'Ô Script', icon: Clapperboard, hint: 'Sửa ô Script rồi app tự tạo lại prompt.' },
  prompt: { label: 'Prompt Veo', icon: Sparkles, hint: 'Ô Script đúng, engine dựng lệch → chỉnh lại prompt, giữ nguyên ô Script.' },
};

const MUC: Record<BeatCheckIssue['mucDo'], { label: string; cls: string }> = {
  cao: { label: 'Cao', cls: 'bg-red-600 text-white' },
  vua: { label: 'Vừa', cls: 'bg-primary-400 text-black' },
  thap: { label: 'Thấp', cls: 'bg-gray-200 text-gray-700' },
};

const joinFix = (list: BeatCheckIssue[]) => 'Sửa theo AI kiểm tra beat:\n' + list.map((i) => `- ${i.moTa} → ${i.cachSua}`).join('\n');

export default function BeatCheckPanel({ check, basis, promptStale, busy, run, save, fixScript, fixPrompt }: Props) {
  const [working, setWorking] = useState<'' | 'check' | 'fix'>('');
  const [error, setError] = useState('');
  const outdated = !!check && check.basis !== basis;

  const doCheck = async () => {
    setWorking('check');
    setError('');
    try {
      const previous = (check?.issues || []).map((i) => ({ tang: i.tang, moTa: i.moTa, status: i.status || '' }));
      const r = await run(previous);
      save({ ...r, at: Date.now(), basis });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorking('');
    }
  };

  const mark = (ids: string[], status?: BeatCheckIssue['status']) =>
    check && save({ ...check, issues: check.issues.map((i) => (ids.includes(i.id) ? { ...i, status } : i)) });

  const doFix = async (tang: 'script' | 'prompt', list: BeatCheckIssue[]) => {
    if (!list.length || !check) return;
    setWorking('fix');
    setError('');
    const snapshot = check;
    try {
      const ok = tang === 'script' ? await fixScript(joinFix(list)) : await fixPrompt(joinFix(list));
      if (!ok) throw new Error('Không sửa được — xem thông báo lỗi phía trên.');
      const ids = list.map((i) => i.id);
      save({ ...snapshot, issues: snapshot.issues.map((i) => (ids.includes(i.id) ? { ...i, status: 'da-sua' } : i)) });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorking('');
    }
  };

  const open = (check?.issues || []).filter((i) => !i.status);
  const openScript = open.filter((i) => i.tang === 'script');
  const openPrompt = open.filter((i) => i.tang === 'prompt');
  const ready = check && !outdated && check.ketLuan === 'san-sang';

  return (
    <section className={`border-2 rounded-2xl p-4 space-y-3 ${!check || outdated ? 'border-gray-300' : ready ? 'border-green-400 bg-green-50/40' : 'border-red-300 bg-red-50/30'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 className="font-bold text-black flex items-center gap-2">
            {ready ? <ShieldCheck className="w-5 h-5 text-green-700" /> : <ShieldAlert className="w-5 h-5 text-gray-600" />}
            AI kiểm tra beat
          </h5>
          <p className="text-sm text-gray-600 mt-0.5">
            {promptStale
              ? 'Ô Script đã đổi sau khi tạo prompt — bấm "Tạo lại prompt" trước rồi mới kiểm.'
              : !check
              ? 'Soát 3 tầng từ gốc lên ngọn: kịch bản beat → ô Script → prompt, trước khi mang prompt lên Flow.'
              : outdated
              ? 'Prompt hoặc ô Script đã đổi sau lần kiểm trước — bấm "Kiểm tra lại".'
              : ready
              ? `Sẵn sàng chạy trên Flow. ${check.tomTat}`
              : `Nên sửa trước khi chạy. ${check.tomTat}`}
          </p>
        </div>
        <button
          onClick={doCheck}
          disabled={busy || !!working || promptStale}
          className="px-4 py-2 rounded-full text-sm font-bold bg-black text-primary-400 flex items-center gap-2 disabled:opacity-50"
        >
          {working === 'check' ? <Loader2 className="w-4 h-4 animate-spin" /> : check ? <RefreshCw className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          {working === 'check' ? 'AI đang kiểm tra…' : check ? 'Kiểm tra lại' : 'AI kiểm tra beat'}
        </button>
      </div>

      <ErrorBox message={error} />

      {check && !outdated && (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {(
              [
                ['Kịch bản beat', check.danhGia.kichBan],
                ['Ô Script', check.danhGia.script],
                ['Prompt Veo', check.danhGia.prompt],
              ] as const
            ).map(([label, v]) => (
              <span key={label} className={`rounded-lg px-2 py-1.5 font-bold text-center ${v === 'dat' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                {label}: {v === 'dat' ? 'đạt' : 'chưa'}
              </span>
            ))}
          </div>

          {(['kich-ban', 'script', 'prompt'] as const).map((tang) => {
            const list = check.issues.filter((i) => i.tang === tang);
            if (!list.length) return null;
            const T = TANG[tang];
            const Icon = T.icon;
            return (
              <div key={tang} className="space-y-2">
                <p className="text-sm font-bold text-black flex items-center gap-1.5">
                  <Icon className="w-4 h-4" /> Tầng {T.label} ({list.filter((i) => !i.status).length})
                </p>
                <p className="text-xs text-gray-500 -mt-1">{T.hint}</p>
                <ul className="space-y-2">
                  {list.map((i) => (
                    <li key={i.id} className={`bg-white rounded-xl border border-gray-200 p-3 text-sm space-y-1 ${i.status ? 'opacity-60' : ''}`}>
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${MUC[i.mucDo].cls}`}>{MUC[i.mucDo].label}</span>
                        {i.status === 'da-sua' && <span className="text-xs font-bold text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> đã gửi sửa</span>}
                        {i.status === 'bo-qua' && <span className="text-xs font-bold text-gray-500">đã bỏ qua</span>}
                      </p>
                      <p className="text-gray-800">{i.moTa}</p>
                      <p className="text-gray-600"><span className="font-bold">Cách sửa:</span> {i.cachSua}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {!i.status && tang !== 'kich-ban' && (
                          <button
                            onClick={() => doFix(tang, [i])}
                            disabled={busy || !!working}
                            className="px-3 py-1 rounded-full text-xs font-bold bg-black text-primary-400 flex items-center gap-1 disabled:opacity-50"
                          >
                            <Wand2 className="w-3.5 h-3.5" /> {tang === 'script' ? 'Sửa ô Script & tạo lại prompt' : 'Chỉnh lại prompt'}
                          </button>
                        )}
                        {tang === 'kich-ban' && <CopyButton text={i.cachSua} label="Chép yêu cầu sửa scene" />}
                        {!i.status ? (
                          <button onClick={() => mark([i.id], 'bo-qua')} className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-200 flex items-center gap-1">
                            <EyeOff className="w-3.5 h-3.5" /> Bỏ qua
                          </button>
                        ) : (
                          <button onClick={() => mark([i.id], undefined)} className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-200">
                            Mở lại
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {(openScript.length > 1 || (openScript.length && openPrompt.length)) && (
            <button
              onClick={() => doFix('script', openScript)}
              disabled={busy || !!working}
              className="w-full py-2.5 rounded-xl bg-black text-primary-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {working === 'fix' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Sửa cùng lúc {openScript.length} lỗi ô Script (prompt tạo lại theo)
            </button>
          )}
          {openScript.length === 0 && openPrompt.length > 1 && (
            <button
              onClick={() => doFix('prompt', openPrompt)}
              disabled={busy || !!working}
              className="w-full py-2.5 rounded-xl bg-black text-primary-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {working === 'fix' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Chỉnh prompt theo {openPrompt.length} lỗi cùng lúc
            </button>
          )}
          {openScript.length > 0 && openPrompt.length > 0 && (
            <p className="text-xs text-gray-500">Có lỗi ở cả ô Script và prompt: sửa ô Script trước — prompt sẽ được tạo lại theo ô Script mới, rồi "Kiểm tra lại".</p>
          )}
          {check.issues.some((i) => i.status === 'da-sua') && <p className="text-xs text-gray-500">Đã sửa → bấm "Kiểm tra lại" để AI xác nhận lỗi đã hết.</p>}
        </>
      )}
    </section>
  );
}
