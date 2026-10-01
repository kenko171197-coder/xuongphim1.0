import { useEffect, useState } from 'react';
import { getImage } from './images';

/** Đọc ảnh từ kho IndexedDB theo id, trả về data URL (hoặc undefined khi chưa có). */
export function useImage(id?: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(undefined);
      return;
    }
    getImage(id)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(undefined));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}
