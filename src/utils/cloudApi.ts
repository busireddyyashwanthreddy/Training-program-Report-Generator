import type {
  ReportFormData,
  SavedAttendanceSheet,
  SavedReport,
} from '../types/report';

export interface RemoteActiveDraft {
  activeReportId: string | null;
  formData: Partial<ReportFormData>;
  updatedAt: string;
}

export interface RemoteReportsResponse {
  reports: SavedReport[];
  activeDraft: RemoteActiveDraft | null;
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 502, 503, 504]);
const DEFAULT_REQUEST_TIMEOUT_MS = 35_000;
const MAX_TRANSIENT_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function authorizedFetch(
  url: string,
  token: string | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'PUT';

  for (let attempt = 0; attempt <= (canRetry ? MAX_TRANSIENT_RETRIES : 0); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      DEFAULT_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
        signal: controller.signal,
      });

      if (response.ok) {
        return response;
      }

      if (
        canRetry &&
        attempt < MAX_TRANSIENT_RETRIES &&
        RETRYABLE_STATUS_CODES.has(response.status)
      ) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      let message =
        response.status === 401
          ? 'Your session expired. Please log in again.'
          : response.status === 429
            ? 'Too many requests in a short time. Please wait a moment and try again.'
            : 'Request failed. Please try again.';
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload?.error) message = payload.error;
      } catch {
        // Ignore JSON parse failure
      }
      throw new Error(message);
    } catch (error) {
      const isAbort =
        error instanceof DOMException && error.name === 'AbortError';
      const isNetworkFailure =
        error instanceof TypeError || isAbort;

      if (canRetry && attempt < MAX_TRANSIENT_RETRIES && isNetworkFailure) {
        await sleep(600 * (attempt + 1));
        continue;
      }

      if (isAbort) {
        throw new Error(
          'The server took too long to respond. Please check your connection and try again.'
        );
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new Error('Request failed. Please try again.');
}

export async function fetchCloudReportsAndDraft(
  token: string | null
): Promise<RemoteReportsResponse> {
  const res = await authorizedFetch('/api/reports', token, { method: 'GET' });
  return (await res.json()) as RemoteReportsResponse;
}

export async function saveCloudReport(
  token: string | null,
  report: SavedReport
): Promise<SavedReport> {
  const res = await authorizedFetch(
    `/api/reports/${encodeURIComponent(report.id)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(report),
    }
  );
  return (await res.json()) as SavedReport;
}

export async function deleteCloudReport(
  token: string | null,
  reportId: string
): Promise<void> {
  await authorizedFetch(`/api/reports/${encodeURIComponent(reportId)}`, token, {
    method: 'DELETE',
  });
}

export async function saveCloudActiveDraft(
  token: string | null,
  draft: { activeReportId: string | null; formData: Partial<ReportFormData> }
): Promise<RemoteActiveDraft> {
  const res = await authorizedFetch('/api/draft', token, {
    method: 'PUT',
    body: JSON.stringify(draft),
  });
  return (await res.json()) as RemoteActiveDraft;
}

export async function fetchCloudAttendanceSheets(
  token: string | null
): Promise<SavedAttendanceSheet[]> {
  const res = await authorizedFetch('/api/attendance-sheets', token, { method: 'GET' });
  const payload = (await res.json()) as { sheets?: SavedAttendanceSheet[] };
  return Array.isArray(payload.sheets) ? payload.sheets : [];
}

export async function saveCloudAttendanceSheet(
  token: string | null,
  sheet: SavedAttendanceSheet
): Promise<SavedAttendanceSheet> {
  const res = await authorizedFetch(
    `/api/attendance-sheets/${encodeURIComponent(sheet.id)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify(sheet),
    }
  );
  return (await res.json()) as SavedAttendanceSheet;
}

export async function deleteCloudAttendanceSheet(
  token: string | null,
  sheetId: string
): Promise<void> {
  await authorizedFetch(
    `/api/attendance-sheets/${encodeURIComponent(sheetId)}`,
    token,
    { method: 'DELETE' }
  );
}
