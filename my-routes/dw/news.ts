import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import cache from '@/utils/cache';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/news/:lang?/:id?',
    categories: ['traditional-media'],
    example: '/dw/news/en/9097',
    parameters: {
        lang: 'Language code, default is en',
        id: 'Category ID, default is 9097 (Top Stories)',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['dw.com/'],
            target: '/news',
        },
    ],
    name: 'DW News (德国之声)',
    maintainers: ['lhteen'],
    handler: async (ctx) => {
        const lang = ctx.req.param('lang') || 'en';
        let id = ctx.req.param('id') || '9097';

        // Support passing the category string e.g., 's-9097'
        if (/^s-\d+$/.test(id)) {
            id = id.replace('s-', '');
        }

        const navUrl = `https://www.dw.com/graph-api/${lang}/content/navigation/${id}`;

        // 1. Fetch the index data
        const navData = await ofetch(navUrl);
        const feed = navData?.data?.content;

        if (!feed || !feed.contentComposition) {
            throw new Error(`未能获取到数据，请检查 lang: ${lang} 和 id: ${id} 是否正确`);
        }

        // 2. Extract article list from content blocks
        const list = feed.contentComposition.informationSpaces
            .flatMap((space) => Object.values(space).flatMap((comp: any) => comp[0]?.contents || []))
            .filter((item) => item.id && ['Article', 'Liveblog', 'Video'].includes(item.__typename));

        // Deduplicate
        const uniqueItems = Array.from(new Map(list.map((item) => [item.id, item])).values());

        // 3. Fetch full text using cache
        const items = await Promise.all(
            uniqueItems.map((item: any) =>
                cache.tryGet(`dw:content:${lang}:${item.id}`, async () => {
                    const itemType = item.__typename.toLowerCase();
                    const detailUrl = `https://www.dw.com/graph-api/${lang}/content/${itemType}/${item.id}`;

                    try {
                        const detailData = await ofetch(detailUrl);
                        const content = detailData?.data?.content;

                        if (!content) return item;

                        const pubDate = content.contentDate || item.contentDate;
                        const link = new URL(item.namedUrl, 'https://www.dw.com').href;

                        let description = '';

                        if (content.teaser) {
                            description += `<blockquote><p>${content.teaser}</p></blockquote>`;
                        }

                        // Parse Main Image
                        if (content.mainContentImageLink && content.mainContentImageLink.targetId) {
                            const imgId = content.mainContentImageLink.targetId;
                            const alt = content.mainContentImageLink.description || '';
                            description += `<figure><img src="https://static.dw.com/image/${imgId}_605.jpg" alt="${alt}"></figure>`;
                        }

                        // Parse Body Text
                        if (content.text) {
                            const $text = load(content.text);
                            // Process DW graph-api internal images
                            $text('img').each((_, elem) => {
                                const dataId = $text(elem).attr('data-id');
                                if (dataId) {
                                    $text(elem).attr('src', `https://static.dw.com/image/${dataId}_605.jpg`);
                                    $text(elem).removeAttr('style');
                                }
                            });
                            description += $text.html();
                        }

                        return {
                            title: content.title || item.name,
                            description,
                            link,
                            pubDate: parseDate(pubDate),
                            author: content.firstPersonArray ? content.firstPersonArray.map((p: any) => p.fullName).join(', ') : '',
                            category: content.trackingCategories ? content.trackingCategories : [],
                        };
                    } catch (err) {
                        // Fallback
                        return {
                            title: item.name,
                            link: new URL(item.namedUrl, 'https://www.dw.com').href,
                            description: item.teaser,
                            pubDate: parseDate(item.contentDate),
                        };
                    }
                })
            )
        );

        // 4. Return result
        return {
            title: `DW | ${feed.title || 'News'}`,
            link: feed.canonicalUrl || `https://www.dw.com/${lang}`,
            description: feed.metaDescription || '',
            item: items,
        };
    },
};
