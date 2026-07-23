import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getClass } from "@/features/classes/queries";
import { getClassBooks } from "@/features/books/queries";
import { getGalleryWorks } from "@/features/works/queries";
import { getSignedPosterUrl } from "@/features/works/posters";

export const metadata: Metadata = { title: "학급 갤러리" };

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ kind?: string; bookId?: string; q?: string; sort?: string }>;
}) {
  const { classId } = await params;
  const sp = await searchParams;
  await requireProfile();

  const klass = await getClass(classId);
  if (!klass) notFound();

  const kind = sp.kind === "review" || sp.kind === "poster" ? sp.kind : undefined;
  const books = await getClassBooks(classId);
  const works = await getGalleryWorks(classId, {
    kind,
    bookId: sp.bookId,
    q: sp.q,
    random: sp.sort === "random",
  });

  const cards = await Promise.all(
    works.map(async (w) => ({
      work: w,
      thumbUrl: w.kind === "poster" ? await getSignedPosterUrl(w.poster_thumb_path) : null,
    })),
  );

  return (
    <div>
      <PageHeader title="학급 갤러리" description={`${klass.name} · 학급 내부 공개`} />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="kind" className="block text-xs text-stone-500">
            종류
          </label>
          <select id="kind" name="kind" defaultValue={kind ?? ""} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">전체</option>
            <option value="review">서평</option>
            <option value="poster">북포스터</option>
          </select>
        </div>
        <div>
          <label htmlFor="bookId" className="block text-xs text-stone-500">
            도서
          </label>
          <select id="bookId" name="bookId" defaultValue={sp.bookId ?? ""} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">전체</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="q" className="block text-xs text-stone-500">
            검색
          </label>
          <input id="q" name="q" defaultValue={sp.q ?? ""} className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-stone-600">
          <input type="checkbox" name="sort" value="random" defaultChecked={sp.sort === "random"} /> 무작위
        </label>
        <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">
          적용
        </button>
      </form>

      {cards.length === 0 ? (
        <EmptyState title="아직 게시된 작품이 없습니다" description="교사가 승인한 작품이 이곳에 공개됩니다." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ work, thumbUrl }) => (
            <li key={work.id}>
              <Link href={`/works/${work.id}`}>
                <Card className="h-full transition hover:border-brand">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge>{work.kind === "review" ? "서평" : "북포스터"}</Badge>
                    {work.featured_at ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        ★ 우수작
                      </span>
                    ) : null}
                    <span className="text-xs text-stone-400">{work.authorName}</span>
                  </div>
                  {work.kind === "poster" ? (
                    thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl} alt="" className="mt-1 max-h-56 w-full rounded object-contain" />
                    ) : (
                      <p className="text-sm text-stone-400">이미지 미리보기를 불러올 수 없습니다.</p>
                    )
                  ) : (
                    <>
                      <p className="font-semibold text-stone-800">
                        {work.title || "(제목 없는 서평)"}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-stone-600">
                        {work.mode === "free" ? work.body : work.sections?.one_line}
                      </p>
                    </>
                  )}
                  <p className="mt-2 text-xs text-stone-400">{work.book?.title ?? ""}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
