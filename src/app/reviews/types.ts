export type Review = {
  id: string;
  theme_id: string;
  theme_name: string;
  name: string;
  phone: string | null;
  rating: number | null;   // 블로그 후기는 별점이 없다(null)
  body: string;
  source?: string | null;
  source_url?: string | null;   // 원문 주소. 있으면 출처가 눌러서 갈 수 있는 링크가 된다
  created_at: string;
};
