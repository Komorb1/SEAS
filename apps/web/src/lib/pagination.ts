export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;

export function parsePage(value?: string, fallback = DEFAULT_PAGE): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return fallback;
  return Math.floor(page);
}

export function getPagination(page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
}

export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}