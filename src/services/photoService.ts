/**
 * Serviço de captura e compressão otimizada de imagens para caber com folga em localStorage
 * mantendo nitidez excelente para identificação visual do item e da etiqueta física.
 */

export interface PhotoProcessOptions {
  maxDimension?: number; // px (default 900)
  quality?: number; // 0..1 (default 0.72)
  watermarkTag?: string; // Ex.: "ETQ #001 • ES-005.27.1"
}

export async function compressImageFile(
  file: File,
  options: PhotoProcessOptions = {},
): Promise<{ dataUrl: string; sizeKB: number; width: number; height: number }> {
  const maxDimension = options.maxDimension ?? 900;
  const quality = options.quality ?? 0.72;

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: rawDataUrl, sizeKB: estimateDataUrlKB(rawDataUrl), width, height };
  }

  ctx.drawImage(img, 0, 0, width, height);

  // Carimbo opcional de etiqueta e data/hora no canto inferior para rastreabilidade visual
  if (options.watermarkTag) {
    const padX = Math.max(10, Math.round(width * 0.02));
    const fontSize = Math.max(14, Math.round(width * 0.032));
    const barHeight = Math.round(fontSize * 1.9);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, height - barHeight, width, barHeight);

    ctx.fillStyle = '#fbbf24';
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(options.watermarkTag, padX, height - barHeight / 2);

    const stamp = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `500 ${Math.round(fontSize * 0.8)}px system-ui, -apple-system, sans-serif`;
    const stampWidth = ctx.measureText(stamp).width;
    if (stampWidth + padX * 3 < width * 0.5) {
      ctx.fillText(stamp, width - stampWidth - padX, height - barHeight / 2);
    }
  }

  // Prefere JPEG pela compatibilidade universal (iOS Safari, Android, Windows, Excel/HTML)
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return {
    dataUrl,
    sizeKB: estimateDataUrlKB(dataUrl),
    width,
    height,
  };
}

export function estimateDataUrlKB(dataUrl: string): number {
  if (!dataUrl) return 0;
  return Math.round((dataUrl.length * 0.75) / 1024);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao decodificar imagem.'));
    img.src = src;
  });
}
