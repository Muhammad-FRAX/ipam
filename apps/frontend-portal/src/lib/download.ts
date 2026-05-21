import axios from 'axios';

const FORMAT_EXT: Record<string, string> = {
  csv: 'csv',
  xlsx: 'xlsx',
  pdf: 'pdf',
  json: 'json',
};

function filenameFromHeader(disposition: string | undefined): string | null {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function downloadFromApi(
  path: string,
  fallbackName: string,
  format?: string
): Promise<void> {
  const res = await axios.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);

  const ext = format && FORMAT_EXT[format] ? `.${FORMAT_EXT[format]}` : '';
  const name =
    filenameFromHeader(res.headers['content-disposition']) ??
    `${fallbackName}${ext}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
