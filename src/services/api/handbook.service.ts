import { axiosInstance } from '@/services/api/axiosInstance';
import type { ApiResponse, HandbookArticleDetail, HandbookChapter } from '@/types';

// Buku Saku (E-Book). baseURL axios sudah termasuk suffix `/api`, jadi path mulai dari `/handbook/...`.
// Endpoint terfilter per tenant di sisi backend — tidak ada query param.

// Daftar Bab + seluruh daftar isi (Table of Contents) terurut.
export async function getHandbookChaptersApi(): Promise<HandbookChapter[]> {
  const { data } = await axiosInstance.get<ApiResponse<HandbookChapter[]>>('/handbook/chapters');
  return data.data;
}

// Detail isi satu halaman/materi.
export async function getHandbookArticleApi(
  articleId: number | string,
): Promise<HandbookArticleDetail> {
  const { data } = await axiosInstance.get<ApiResponse<HandbookArticleDetail>>(
    `/handbook/articles/${articleId}`,
  );
  return data.data;
}
